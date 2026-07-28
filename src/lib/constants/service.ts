/**
 * サービス全体で共有する基本情報。
 * ここ以外に同じ文字列をハードコードしないこと。
 */

export const SERVICE_NAME = 'OwnerBase'

export const SERVICE_TAGLINE = '物件の清掃・修繕業者を、比較して選べる。'

/** MVP の対応エリア。DB の CHECK 制約と Zod スキーマの両方がこの値を参照する。 */
export const SERVICE_AREA = {
  prefecture: '広島県',
  city: '福山市',
} as const

export const SERVICE_AREA_LABEL = `${SERVICE_AREA.prefecture}${SERVICE_AREA.city}`

/** エリア外を入力したときに表示する共通メッセージ。 */
export const OUT_OF_AREA_MESSAGE =
  `${SERVICE_NAME} は現在 ${SERVICE_AREA_LABEL} の物件のみを対象としています。` +
  '対応エリア外の物件は登録・依頼できません。'
