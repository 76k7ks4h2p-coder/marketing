'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { actionFailure, type ActionResult } from '@/lib/action-result'
import { requireOwnerForAction } from '@/lib/auth/session'
import { handleError } from '@/lib/errors'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import { propertySchema } from '@/lib/validation/property'

export type PropertyActionResult = ActionResult<{ propertyId: string }>

/** フォーム入力を DB のカラム名へ変換する。 */
function toRow(input: ReturnType<typeof propertySchema.parse>) {
  return {
    name: input.name,
    postal_code: input.postalCode,
    prefecture: input.prefecture,
    city: input.city,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 ?? null,
    property_type: input.propertyType,
    building_structure: input.buildingStructure ?? null,
    built_year: input.builtYear ?? null,
    unit_count: input.unitCount ?? null,
    area_sqm: input.areaSqm ?? null,
    notes: input.notes ?? null,
  }
}

export async function createPropertyAction(
  _prevState: PropertyActionResult | null,
  formData: FormData,
): Promise<PropertyActionResult> {
  const parsed = propertySchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  let propertyId: string

  try {
    const { supabase, user } = await requireOwnerForAction()

    const { data, error } = await supabase
      .from('properties')
      // owner_id は必ずサーバー側のセッションから設定する。
      // RLS の WITH CHECK でも owner_id = auth.uid() を強制している。
      .insert({ ...toRow(parsed.data), owner_id: user.id })
      .select('id')
      .single()

    if (error) throw error
    propertyId = data.id
  } catch (error) {
    return actionFailure(handleError('createPropertyAction', error))
  }

  revalidatePath('/properties')
  revalidatePath('/dashboard')
  redirect(`/properties/${propertyId}?created=1`)
}

export async function updatePropertyAction(
  _prevState: PropertyActionResult | null,
  formData: FormData,
): Promise<PropertyActionResult> {
  const propertyId = formData.get('propertyId')

  if (typeof propertyId !== 'string' || propertyId === '') {
    return actionFailure('物件が指定されていません。')
  }

  const parsed = propertySchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const { supabase, user } = await requireOwnerForAction()

    const { data, error } = await supabase
      .from('properties')
      .update(toRow(parsed.data))
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return actionFailure('対象の物件が見つかりませんでした。')
    }
  } catch (error) {
    return actionFailure(handleError('updatePropertyAction', error))
  }

  revalidatePath('/properties')
  revalidatePath(`/properties/${propertyId}`)
  redirect(`/properties/${propertyId}?updated=1`)
}

/**
 * 物件の削除。
 * redirect() は内部的に例外を投げるため、try/catch の外側でのみ呼び出す。
 */
export async function deletePropertyAction(formData: FormData): Promise<void> {
  const propertyId = formData.get('propertyId')

  if (typeof propertyId !== 'string' || propertyId === '') {
    redirect('/properties?error=not-found')
  }

  const outcome = await (async (): Promise<
    { kind: 'deleted' } | { kind: 'has-requests' } | { kind: 'error'; message: string }
  > => {
    try {
      const { supabase, user } = await requireOwnerForAction()

      // 依頼が紐づいている物件は削除させない（外部キー違反を分かりやすく伝える）
      const { count, error: countError } = await supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)

      if (countError) throw countError
      if ((count ?? 0) > 0) return { kind: 'has-requests' }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('owner_id', user.id)

      if (error) throw error
      return { kind: 'deleted' }
    } catch (error) {
      return { kind: 'error', message: handleError('deletePropertyAction', error) }
    }
  })()

  if (outcome.kind === 'has-requests') {
    redirect(`/properties/${propertyId}?error=has-requests`)
  }

  if (outcome.kind === 'error') {
    redirect(`/properties/${propertyId}?error=${encodeURIComponent(outcome.message)}`)
  }

  revalidatePath('/properties')
  revalidatePath('/dashboard')
  redirect('/properties?deleted=1')
}
