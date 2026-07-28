/** 物件種別。DB には英語値を保存し、画面には日本語を表示する。 */

export const PROPERTY_TYPE_VALUES = [
  'apartment_building',
  'mansion_building',
  'condo_unit',
  'house',
  'shop',
  'office',
  'land',
  'other',
] as const

export type PropertyType = (typeof PROPERTY_TYPE_VALUES)[number]

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment_building: '一棟アパート',
  mansion_building: '一棟マンション',
  condo_unit: '区分マンション',
  house: '戸建て',
  shop: '店舗',
  office: '事務所',
  land: '土地',
  other: 'その他',
}

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === 'string' && (PROPERTY_TYPE_VALUES as readonly string[]).includes(value)
}

export function propertyTypeLabel(value: string): string {
  return isPropertyType(value) ? PROPERTY_TYPE_LABELS[value] : value
}

export const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPE_VALUES.map((value) => ({
  value,
  label: PROPERTY_TYPE_LABELS[value],
}))

/** 建物構造は自由入力だが、よく使う選択肢を候補として提示する。 */
export const BUILDING_STRUCTURE_SUGGESTIONS = [
  '木造',
  '軽量鉄骨造',
  '重量鉄骨造',
  '鉄筋コンクリート造（RC）',
  '鉄骨鉄筋コンクリート造（SRC）',
] as const

/** 築年として妥当と見なす下限（明治元年）。 */
export const MIN_BUILT_YEAR = 1868
