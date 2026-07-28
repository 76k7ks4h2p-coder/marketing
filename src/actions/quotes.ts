'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { requireAdminForAction } from '@/lib/auth/session'
import { notifyOwnerQuotePublished } from '@/lib/email/notifications'
import { handleError, logServerError } from '@/lib/errors'
import type { TypedSupabaseClient } from '@/lib/supabase/server'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import {
  hasTotalMismatch,
  quotePublicationSchema,
  quoteSchema,
  totalMismatchMessage,
  type QuoteInput,
} from '@/lib/validation/quote'

export type QuoteActionResult = ActionResult<{ quoteId: string }> & {
  /** 明細合計と税込総額の不一致を検出したときの警告（保存は続行できる）。 */
  warning?: string
}

/**
 * FormData から明細行を取り出す。
 * 入力欄の name は `items.0.itemName` のような形式にしている。
 */
function readItems(formData: FormData): Record<string, unknown>[] {
  const indexes = new Set<number>()

  for (const key of formData.keys()) {
    const match = /^items\.(\d+)\./.exec(key)
    if (match) indexes.add(Number(match[1]))
  }

  return (
    Array.from(indexes)
      .sort((a, b) => a - b)
      .map((index, position) => ({
        id: formData.get(`items.${index}.id`),
        itemName: formData.get(`items.${index}.itemName`),
        quantity: formData.get(`items.${index}.quantity`),
        unit: formData.get(`items.${index}.unit`),
        unitPriceYen: formData.get(`items.${index}.unitPriceYen`),
        amountYen: formData.get(`items.${index}.amountYen`),
        notes: formData.get(`items.${index}.notes`),
        sortOrder: position,
      }))
      // 完全に空の行は無視する
      .filter((item) => {
        const name = item.itemName
        return typeof name === 'string' && name.trim() !== ''
      })
  )
}

function readQuoteForm(formData: FormData) {
  const base = formDataToObject(formData)
  return { ...base, items: readItems(formData) }
}

/** 作成・更新の両方で使う列。request_id は作成時のみ設定する（案件の付け替えは不可）。 */
function toQuoteRow(input: QuoteInput) {
  return {
    provider_id: input.providerId,
    quote_number: input.quoteNumber ?? null,
    quote_date: input.quoteDate ?? null,
    valid_until: input.validUntil ?? null,
    available_date: input.availableDate ?? null,
    estimated_work_days: input.estimatedWorkDays ?? null,
    subtotal_yen: input.subtotalYen ?? null,
    tax_yen: input.taxYen ?? null,
    total_yen: input.totalYen,
    included_scope: input.includedScope ?? null,
    excluded_scope: input.excludedScope ?? null,
    additional_charge_conditions: input.additionalChargeConditions ?? null,
    warranty: input.warranty ?? null,
    admin_comment: input.adminComment ?? null,
    publication_status: input.publicationStatus,
  }
}

async function replaceQuoteItems(
  supabase: TypedSupabaseClient,
  quoteId: string,
  items: QuoteInput['items'],
): Promise<void> {
  // 明細は「全削除 → 一括登録」で同期する。件数が少ないため差分計算はしない。
  const { error: deleteError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId)
  if (deleteError) throw deleteError

  if (items.length === 0) return

  const { error: insertError } = await supabase.from('quote_items').insert(
    items.map((item, index) => ({
      quote_id: quoteId,
      item_name: item.itemName,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      unit_price_yen: item.unitPriceYen ?? null,
      amount_yen: item.amountYen,
      notes: item.notes ?? null,
      sort_order: item.sortOrder ?? index,
    })),
  )

  if (insertError) throw insertError
}

// -----------------------------------------------------------------------------
// 見積もり作成
// -----------------------------------------------------------------------------

export async function createQuoteAction(
  _prevState: QuoteActionResult | null,
  formData: FormData,
): Promise<QuoteActionResult> {
  const parsed = quoteSchema.safeParse(readQuoteForm(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const input = parsed.data
  const itemsForCheck = input.items.map((item) => ({ amountYen: item.amountYen }))

  // 合計が一致しない場合は一度警告を返し、管理者が了承したら保存を続行する
  if (hasTotalMismatch(itemsForCheck, input.totalYen) && !input.acknowledgeTotalMismatch) {
    return {
      ...actionFailure<{ quoteId: string }>(totalMismatchMessage(itemsForCheck, input.totalYen)),
      warning: totalMismatchMessage(itemsForCheck, input.totalYen),
    }
  }

  let quoteId: string

  try {
    const { supabase, user } = await requireAdminForAction()

    const { data, error } = await supabase
      .from('quotes')
      .insert({ ...toQuoteRow(input), request_id: input.requestId, created_by: user.id })
      .select('id')
      .single()

    if (error) throw error
    quoteId = data.id

    await replaceQuoteItems(supabase, quoteId, input.items)

    if (input.publicationStatus === 'published') {
      await notifyOwnerOfPublication(supabase, input.requestId)
    }
  } catch (error) {
    return actionFailure(handleError('createQuoteAction', error))
  }

  revalidatePath(`/admin/requests/${input.requestId}`)
  revalidatePath(`/requests/${input.requestId}`)
  redirect(`/admin/requests/${input.requestId}?quote=created`)
}

// -----------------------------------------------------------------------------
// 見積もり更新
// -----------------------------------------------------------------------------

export async function updateQuoteAction(
  _prevState: QuoteActionResult | null,
  formData: FormData,
): Promise<QuoteActionResult> {
  const quoteId = formData.get('quoteId')

  if (typeof quoteId !== 'string' || quoteId === '') {
    return actionFailure('見積もりが指定されていません。')
  }

  const parsed = quoteSchema.safeParse(readQuoteForm(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const input = parsed.data
  const itemsForCheck = input.items.map((item) => ({ amountYen: item.amountYen }))

  if (hasTotalMismatch(itemsForCheck, input.totalYen) && !input.acknowledgeTotalMismatch) {
    return {
      ...actionFailure<{ quoteId: string }>(totalMismatchMessage(itemsForCheck, input.totalYen)),
      warning: totalMismatchMessage(itemsForCheck, input.totalYen),
    }
  }

  try {
    const { supabase } = await requireAdminForAction()

    const { data: existing, error: existingError } = await supabase
      .from('quotes')
      .select('id, request_id, publication_status')
      .eq('id', quoteId)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) return actionFailure('対象の見積もりが見つかりませんでした。')

    const { error } = await supabase.from('quotes').update(toQuoteRow(input)).eq('id', quoteId)
    if (error) throw error

    await replaceQuoteItems(supabase, quoteId, input.items)

    const newlyPublished =
      input.publicationStatus === 'published' && existing.publication_status !== 'published'

    if (newlyPublished) {
      await notifyOwnerOfPublication(supabase, input.requestId)
    }
  } catch (error) {
    return actionFailure(handleError('updateQuoteAction', error))
  }

  revalidatePath(`/admin/requests/${input.requestId}`)
  revalidatePath(`/requests/${input.requestId}`)
  redirect(`/admin/requests/${input.requestId}?quote=updated`)
}

// -----------------------------------------------------------------------------
// 公開 / 取り下げ
// -----------------------------------------------------------------------------

export type QuotePublicationResult = ActionResult<undefined>

export async function changeQuotePublicationAction(
  _prevState: QuotePublicationResult | null,
  formData: FormData,
): Promise<QuotePublicationResult> {
  const parsed = quotePublicationSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const { quoteId, publicationStatus, moveRequestToQuotesReady } = parsed.data
  let requestId = ''

  try {
    const { supabase } = await requireAdminForAction()

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, request_id, publication_status')
      .eq('id', quoteId)
      .maybeSingle()

    if (quoteError) throw quoteError
    if (!quote) return actionFailure('対象の見積もりが見つかりませんでした。')

    requestId = quote.request_id

    // すでに選択済みの見積もりは取り下げさせない
    if (publicationStatus !== 'published') {
      const { data: selection, error: selectionError } = await supabase
        .from('quote_selections')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle()

      if (selectionError) throw selectionError
      if (selection) {
        return actionFailure(
          'この見積もりはオーナーが選択済みのため、取り下げできません。運営者内でご確認ください。',
        )
      }
    }

    const { error } = await supabase
      .from('quotes')
      .update({ publication_status: publicationStatus })
      .eq('id', quoteId)

    if (error) throw error

    const newlyPublished =
      publicationStatus === 'published' && quote.publication_status !== 'published'

    if (publicationStatus === 'published' && moveRequestToQuotesReady) {
      const { error: statusError } = await supabase
        .from('service_requests')
        .update({ status: 'quotes_ready' })
        .eq('id', requestId)
        .not('status', 'in', '("completed","cancelled")')

      if (statusError) {
        // ステータス更新の失敗で公開自体を巻き戻さない。理由はログに残す。
        logServerError('changeQuotePublicationAction.status', statusError)
      }
    }

    if (newlyPublished) {
      await notifyOwnerOfPublication(supabase, requestId)
    }
  } catch (error) {
    return actionFailure(handleError('changeQuotePublicationAction', error))
  }

  revalidatePath(`/admin/requests/${requestId}`)
  revalidatePath('/admin/requests')
  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/requests')
  revalidatePath('/dashboard')

  return actionSuccess(
    undefined,
    publicationStatus === 'published' ? '見積もりを公開しました。' : '見積もりを取り下げました。',
  )
}

/** メール送信の失敗で見積もり公開を失敗させない。 */
async function notifyOwnerOfPublication(
  supabase: TypedSupabaseClient,
  requestId: string,
): Promise<void> {
  try {
    const [{ data: request }, { count }, { data: email }] = await Promise.all([
      supabase.from('service_requests').select('request_number').eq('id', requestId).maybeSingle(),
      supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', requestId)
        .eq('publication_status', 'published'),
      supabase.rpc('admin_request_owner_email', { p_request_id: requestId }),
    ])

    if (!email) return

    await notifyOwnerQuotePublished({
      to: email,
      requestId,
      requestNumber: request?.request_number ?? requestId,
      publishedQuoteCount: count ?? 1,
    })
  } catch (error) {
    logServerError('notifyOwnerOfPublication', error)
  }
}

// -----------------------------------------------------------------------------
// 見積もり削除
// -----------------------------------------------------------------------------

export async function deleteQuoteAction(formData: FormData): Promise<void> {
  const quoteId = formData.get('quoteId')
  const requestId = formData.get('requestId')

  if (typeof quoteId !== 'string' || typeof requestId !== 'string') {
    redirect('/admin/requests')
  }

  const outcome = await (async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
      const { supabase } = await requireAdminForAction()

      const { data: selection, error: selectionError } = await supabase
        .from('quote_selections')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle()

      if (selectionError) throw selectionError
      if (selection) {
        return { ok: false, message: '選択済みの見積もりは削除できません。' }
      }

      const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
      if (error) throw error

      return { ok: true }
    } catch (error) {
      return { ok: false, message: handleError('deleteQuoteAction', error) }
    }
  })()

  if (!outcome.ok) {
    redirect(`/admin/requests/${requestId}?error=${encodeURIComponent(outcome.message)}`)
  }

  revalidatePath(`/admin/requests/${requestId}`)
  revalidatePath(`/requests/${requestId}`)
  redirect(`/admin/requests/${requestId}?quote=deleted`)
}
