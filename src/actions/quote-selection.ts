'use server'

import { revalidatePath } from 'next/cache'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { requireOwnerForAction } from '@/lib/auth/session'
import { notifyAdminQuoteSelected } from '@/lib/email/notifications'
import { handleError, logServerError } from '@/lib/errors'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import { selectQuoteSchema } from '@/lib/validation/quote'

export type SelectQuoteResult = ActionResult<undefined>

/**
 * オーナーが見積もりを 1 件選択する。
 *
 * 選択と案件ステータス更新は DB 関数 public.select_quote() が
 * 1 トランザクションで行う。owner_id はクライアントから受け取らず、
 * 関数内部の auth.uid() のみを信頼する。
 */
export async function selectQuoteAction(
  _prevState: SelectQuoteResult | null,
  formData: FormData,
): Promise<SelectQuoteResult> {
  const parsed = selectQuoteSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors))
  }

  const { requestId, quoteId } = parsed.data

  try {
    const { supabase } = await requireOwnerForAction()

    const { error } = await supabase.rpc('select_quote', {
      p_request_id: requestId,
      p_quote_id: quoteId,
    })

    if (error) throw error

    const { data: request } = await supabase
      .from('service_requests')
      .select('request_number')
      .eq('id', requestId)
      .maybeSingle()

    // メール送信の失敗で選択処理を失敗させない
    try {
      await notifyAdminQuoteSelected({
        requestId,
        requestNumber: request?.request_number ?? requestId,
      })
    } catch (emailError) {
      logServerError('selectQuoteAction.notify', emailError)
    }
  } catch (error) {
    return actionFailure(handleError('selectQuoteAction', error))
  }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/requests')
  revalidatePath('/dashboard')

  return actionSuccess(undefined, '業者を選択しました。運営者が日程調整のご連絡をいたします。')
}
