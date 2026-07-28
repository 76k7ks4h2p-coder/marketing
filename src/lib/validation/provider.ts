import { z } from 'zod'

import { SERVICE_CATEGORY_VALUES } from '@/lib/constants/categories'

import {
  emptyToUndefined,
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalText,
  requiredText,
} from './common'

export const providerSchema = z.object({
  name: requiredText('会社名または屋号', 100),
  contactName: optionalText('担当者名', 100),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: optionalText('所在地', 200),
  serviceAreas: z.preprocess(
    (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
    z.array(z.string().trim().min(1).max(50)).max(50),
  ),
  serviceCategories: z.preprocess(
    (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
    z.array(z.enum(SERVICE_CATEGORY_VALUES)).max(SERVICE_CATEGORY_VALUES.length),
  ),
  licenses: optionalText('資格・許可', 500),
  hasLiabilityInsurance: z.preprocess(
    emptyToUndefined,
    z.enum(['yes', 'no', 'unknown']).optional(),
  ),
  notes: optionalText('備考', 2000),
  isActive: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.boolean(),
  ),
})

export type ProviderInput = z.output<typeof providerSchema>

/** フォームの 'yes' | 'no' | 'unknown' を DB の boolean | null へ変換する。 */
export function toLiabilityInsuranceValue(
  value: 'yes' | 'no' | 'unknown' | undefined,
): boolean | null {
  if (value === 'yes') return true
  if (value === 'no') return false
  return null
}

/** DB の boolean | null をフォームの値へ変換する。 */
export function fromLiabilityInsuranceValue(
  value: boolean | null | undefined,
): 'yes' | 'no' | 'unknown' {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'unknown'
}
