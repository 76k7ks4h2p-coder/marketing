import { z } from 'zod'

import { MIN_BUILT_YEAR, PROPERTY_TYPE_VALUES } from '@/lib/constants/properties'
import { OUT_OF_AREA_MESSAGE, SERVICE_AREA } from '@/lib/constants/service'

import {
  emptyToUndefined,
  enumSchema,
  optionalPositiveInt,
  optionalPositiveNumber,
  optionalText,
  postalCodeSchema,
  requiredText,
} from './common'

/** 築年の上限は「翌年」まで（新築計画中の物件を許容する）。 */
export function maxBuiltYear(now: Date = new Date()): number {
  return now.getFullYear() + 1
}

export const builtYearSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: '築年は西暦の数値で入力してください。' })
    .int('築年は西暦の数値で入力してください。')
    .min(MIN_BUILT_YEAR, `築年は${MIN_BUILT_YEAR}年以降で入力してください。`)
    .refine((value) => value <= maxBuiltYear(), {
      message: '築年に未来の年は指定できません。',
    })
    .optional(),
)

export const propertySchema = z.object({
  name: requiredText('物件名', 100),
  postalCode: postalCodeSchema,
  // MVP は広島県福山市限定。DB の CHECK 制約とセットで二重に担保する。
  prefecture: z.literal(SERVICE_AREA.prefecture, { error: OUT_OF_AREA_MESSAGE }),
  city: z.literal(SERVICE_AREA.city, { error: OUT_OF_AREA_MESSAGE }),
  addressLine1: requiredText('町名・番地', 200),
  addressLine2: optionalText('建物名・部屋番号', 100),
  propertyType: enumSchema(PROPERTY_TYPE_VALUES, '物件種別'),
  buildingStructure: optionalText('構造', 50),
  builtYear: builtYearSchema,
  unitCount: optionalPositiveInt('戸数', 10_000),
  areaSqm: optionalPositiveNumber('面積', 1_000_000),
  notes: optionalText('備考', 2000),
})

export type PropertyInput = z.output<typeof propertySchema>
