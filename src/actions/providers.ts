'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { actionFailure, type ActionResult } from '@/lib/action-result'
import { requireAdminForAction } from '@/lib/auth/session'
import { handleError } from '@/lib/errors'
import { firstErrorMessage, formDataAll, toFieldErrors } from '@/lib/validation/common'
import { providerSchema, toLiabilityInsuranceValue } from '@/lib/validation/provider'

export type ProviderActionResult = ActionResult<{ providerId: string }>

/** 複数選択（チェックボックス）を含むため FormData から個別に組み立てる。 */
function readProviderForm(formData: FormData) {
  return {
    name: formData.get('name'),
    contactName: formData.get('contactName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    serviceAreas: formDataAll(formData, 'serviceAreas'),
    serviceCategories: formDataAll(formData, 'serviceCategories'),
    licenses: formData.get('licenses'),
    hasLiabilityInsurance: formData.get('hasLiabilityInsurance'),
    notes: formData.get('notes'),
    isActive: formData.get('isActive'),
  }
}

function toRow(input: ReturnType<typeof providerSchema.parse>) {
  return {
    name: input.name,
    contact_name: input.contactName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    service_areas: input.serviceAreas.length > 0 ? input.serviceAreas : null,
    service_categories: input.serviceCategories.length > 0 ? input.serviceCategories : null,
    licenses: input.licenses ?? null,
    has_liability_insurance: toLiabilityInsuranceValue(input.hasLiabilityInsurance),
    notes: input.notes ?? null,
    is_active: input.isActive,
  }
}

export async function createProviderAction(
  _prevState: ProviderActionResult | null,
  formData: FormData,
): Promise<ProviderActionResult> {
  const parsed = providerSchema.safeParse(readProviderForm(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const { supabase } = await requireAdminForAction()

    const { error } = await supabase
      .from('providers')
      .insert(toRow(parsed.data))
      .select('id')
      .single()

    if (error) throw error
  } catch (error) {
    return actionFailure(handleError('createProviderAction', error))
  }

  revalidatePath('/admin/providers')
  redirect('/admin/providers?created=1')
}

export async function updateProviderAction(
  _prevState: ProviderActionResult | null,
  formData: FormData,
): Promise<ProviderActionResult> {
  const providerId = formData.get('providerId')

  if (typeof providerId !== 'string' || providerId === '') {
    return actionFailure('業者が指定されていません。')
  }

  const parsed = providerSchema.safeParse(readProviderForm(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const { supabase } = await requireAdminForAction()

    const { data, error } = await supabase
      .from('providers')
      .update(toRow(parsed.data))
      .eq('id', providerId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return actionFailure('対象の業者が見つかりませんでした。')
  } catch (error) {
    return actionFailure(handleError('updateProviderAction', error))
  }

  revalidatePath('/admin/providers')
  revalidatePath(`/admin/providers/${providerId}/edit`)
  redirect('/admin/providers?updated=1')
}
