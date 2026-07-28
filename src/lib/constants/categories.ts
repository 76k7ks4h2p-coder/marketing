/** 作業カテゴリー。DB には英語値を保存し、画面には日本語を表示する。 */

export const SERVICE_CATEGORY_VALUES = [
  'vacant_cleaning',
  'common_area_cleaning',
  'mowing',
  'property_inspection',
  'minor_repair',
  'other',
] as const

export type ServiceCategory = (typeof SERVICE_CATEGORY_VALUES)[number]

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  vacant_cleaning: '空室クリーニング',
  common_area_cleaning: '共用部清掃',
  mowing: '草刈り・植栽管理',
  property_inspection: '物件巡回・写真報告',
  minor_repair: '軽微な修繕',
  other: 'その他の相談',
}

export const SERVICE_CATEGORY_DESCRIPTIONS: Record<ServiceCategory, string> = {
  vacant_cleaning: '退去後の原状回復クリーニング、水回り・エアコンの清掃など。',
  common_area_cleaning: 'エントランス、廊下、階段、ゴミ置き場などの定期清掃。',
  mowing: '敷地内の草刈り、植栽の剪定、除草剤散布など。',
  property_inspection: '遠方オーナー向けの現地確認と写真付きレポート。',
  minor_repair: '建具、給排水、照明、鍵など小規模な修繕。',
  other: '上記に当てはまらない作業のご相談。',
}

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (SERVICE_CATEGORY_VALUES as readonly string[]).includes(value)
}

/** DB 値から表示名を返す。未知の値でも画面を壊さない。 */
export function serviceCategoryLabel(value: string): string {
  return isServiceCategory(value) ? SERVICE_CATEGORY_LABELS[value] : value
}

export const SERVICE_CATEGORY_OPTIONS = SERVICE_CATEGORY_VALUES.map((value) => ({
  value,
  label: SERVICE_CATEGORY_LABELS[value],
}))
