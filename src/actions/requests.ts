'use server'

import { revalidatePath } from 'next/cache'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { requireOwnerForAction } from '@/lib/auth/session'
import { notifyAdminNewRequest } from '@/lib/email/notifications'
import { handleError, logServerError } from '@/lib/errors'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import { serviceRequestSchema } from '@/lib/validation/request'

export type CreateRequestResult = ActionResult<{
  requestId: string
  requestNumber: string
  ownerId: string
}>

/**
 * 作業依頼の作成。
 *
 * 写真は Storage のパスに request_id が必要なため、依頼を作成したあとに
 * クライアントからアップロードし、registerRequestFilesAction で登録する。
 */
export async function createServiceRequestAction(
  _prevState: CreateRequestResult | null,
  formData: FormData,
): Promise<CreateRequestResult> {
  const raw = formDataToObject(formData)
  const parsed = serviceRequestSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const input = parsed.data

  try {
    const { supabase, user } = await requireOwnerForAction()

    // 対象物件が本当に自分のものかをサーバー側でも確認する（RLS に加えた多層防御）
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', input.propertyId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (propertyError) throw propertyError
    if (!property) {
      return actionFailure('選択された物件が見つかりません。物件を選び直してください。', {
        propertyId: ['選択された物件が見つかりません。'],
      })
    }

    // 補足事項は詳細の末尾に追記する（MVP では専用カラムを設けない）
    const description = input.additionalNotes
      ? `${input.description}\n\n【補足事項】\n${input.additionalNotes}`
      : input.description

    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        owner_id: user.id,
        property_id: input.propertyId,
        category: input.category,
        target_location: input.targetLocation ?? null,
        title: input.title,
        description,
        urgency: input.urgency,
        preferred_timing: input.preferredTiming ?? null,
        budget_min_yen: input.budgetMinYen ?? null,
        budget_max_yen: input.budgetMaxYen ?? null,
        // status / request_number / admin_notes は DB のトリガーが設定する
      })
      .select('id, request_number')
      .single()

    if (error) throw error

    // メール送信の失敗で依頼登録を失敗させない
    try {
      await notifyAdminNewRequest({
        requestId: data.id,
        requestNumber: data.request_number,
        category: input.category,
      })
    } catch (emailError) {
      logServerError('createServiceRequestAction.notify', emailError)
    }

    revalidatePath('/requests')
    revalidatePath('/dashboard')

    return actionSuccess({
      requestId: data.id,
      requestNumber: data.request_number,
      ownerId: user.id,
    })
  } catch (error) {
    return actionFailure(handleError('createServiceRequestAction', error))
  }
}
