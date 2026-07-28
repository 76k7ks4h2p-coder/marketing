'use server'

import { revalidatePath } from 'next/cache'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { requireAdminForAction } from '@/lib/auth/session'
import { notifyOwnerWorkCompleted } from '@/lib/email/notifications'
import { handleError, logServerError } from '@/lib/errors'
import type { TypedSupabaseClient } from '@/lib/supabase/server'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import {
  updateAdminNotesSchema,
  updateRequestStatusSchema,
  workReportSchema,
} from '@/lib/validation/request'

export type AdminRequestActionResult = ActionResult<undefined>

/** 案件のオーナーのメールアドレスを取得する（admin 専用の DB 関数を利用）。 */
async function fetchOwnerEmail(
  supabase: TypedSupabaseClient,
  requestId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_request_owner_email', {
    p_request_id: requestId,
  })

  if (error) {
    logServerError('fetchOwnerEmail', error)
    return null
  }

  return data ?? null
}

// -----------------------------------------------------------------------------
// ステータス変更
// -----------------------------------------------------------------------------

export async function updateRequestStatusAction(
  _prevState: AdminRequestActionResult | null,
  formData: FormData,
): Promise<AdminRequestActionResult> {
  const parsed = updateRequestStatusSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const { requestId, status } = parsed.data

  try {
    const { supabase } = await requireAdminForAction()

    // quotes_ready へは公開済み見積もりがある場合のみ。
    // DB のトリガーでも拒否されるが、先に分かりやすいメッセージを返す。
    if (status === 'quotes_ready') {
      const { count, error: countError } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', requestId)
        .eq('publication_status', 'published')

      if (countError) throw countError
      if ((count ?? 0) === 0) {
        return actionFailure(
          '公開済みの見積もりが 1 件もありません。先に見積もりを公開してください。',
        )
      }
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', requestId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return actionFailure('対象の案件が見つかりませんでした。')
  } catch (error) {
    return actionFailure(handleError('updateRequestStatusAction', error))
  }

  revalidatePath(`/admin/requests/${requestId}`)
  revalidatePath('/admin/requests')
  revalidatePath('/admin')
  revalidatePath(`/requests/${requestId}`)

  return actionSuccess(undefined, 'ステータスを更新しました。')
}

// -----------------------------------------------------------------------------
// 管理者メモ
// -----------------------------------------------------------------------------

export async function updateAdminNotesAction(
  _prevState: AdminRequestActionResult | null,
  formData: FormData,
): Promise<AdminRequestActionResult> {
  const parsed = updateAdminNotesSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const { requestId, adminNotes } = parsed.data

  try {
    const { supabase } = await requireAdminForAction()

    const { data, error } = await supabase
      .from('service_requests')
      .update({ admin_notes: adminNotes ?? null })
      .eq('id', requestId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return actionFailure('対象の案件が見つかりませんでした。')
  } catch (error) {
    return actionFailure(handleError('updateAdminNotesAction', error))
  }

  revalidatePath(`/admin/requests/${requestId}`)
  return actionSuccess(undefined, '管理者メモを保存しました。')
}

// -----------------------------------------------------------------------------
// 完了報告
// -----------------------------------------------------------------------------

export async function saveWorkReportAction(
  _prevState: AdminRequestActionResult | null,
  formData: FormData,
): Promise<AdminRequestActionResult> {
  const parsed = workReportSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const { requestId, completionSummary, completedAt, markCompleted } = parsed.data

  try {
    const { supabase, user } = await requireAdminForAction()

    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('id, request_number, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) return actionFailure('対象の案件が見つかりませんでした。')

    const completedAtIso = completedAt
      ? new Date(`${completedAt}T00:00:00+09:00`).toISOString()
      : null

    const { data: existing, error: existingError } = await supabase
      .from('work_reports')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { error } = await supabase
        .from('work_reports')
        .update({ completion_summary: completionSummary, completed_at: completedAtIso })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('work_reports').insert({
        request_id: requestId,
        completion_summary: completionSummary,
        completed_at: completedAtIso,
        created_by: user.id,
      })

      if (error) throw error
    }

    const shouldNotify = markCompleted && request.status !== 'completed'

    if (markCompleted && request.status !== 'completed') {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'completed' })
        .eq('id', requestId)

      if (error) throw error
    }

    if (shouldNotify) {
      // メール送信の失敗で完了登録を失敗させない
      try {
        const to = await fetchOwnerEmail(supabase, requestId)
        if (to) {
          await notifyOwnerWorkCompleted({
            to,
            requestId,
            requestNumber: request.request_number,
          })
        }
      } catch (emailError) {
        logServerError('saveWorkReportAction.notify', emailError)
      }
    }
  } catch (error) {
    return actionFailure(handleError('saveWorkReportAction', error))
  }

  revalidatePath(`/admin/requests/${requestId}`)
  revalidatePath('/admin/requests')
  revalidatePath('/admin')
  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/requests')

  return actionSuccess(undefined, '完了報告を保存しました。')
}
