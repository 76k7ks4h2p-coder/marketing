/**
 * 日付・日時の表示整形。
 *
 * Supabase の timestamptz は UTC の ISO 文字列で返るため、
 * 表示は必ず Asia/Tokyo に固定する（サーバーとブラウザで表示がずれないようにするため）。
 * date 型（"YYYY-MM-DD"）は UTC 0 時として解釈され、Asia/Tokyo では同日 9 時になるので
 * 日付がずれることはない。
 */

const TIME_ZONE = 'Asia/Tokyo'

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const shortDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 日本語の日付表記。
 * 例: "2026-07-28" -> "2026年7月28日"
 */
export function formatJapaneseDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return dateFormatter.format(date)
}

/**
 * 日本語の日時表記。
 * 例: "2026-07-28T01:30:00Z" -> "2026年7月28日 10:30"
 */
export function formatJapaneseDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return dateTimeFormatter.format(date).replace(/\s+/g, ' ')
}

/**
 * 一覧表示向けの短い日付表記。
 * 例: "2026-07-28" -> "2026/07/28"
 */
export function formatShortDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return shortDateFormatter.format(date)
}

/** <input type="date"> の value 用（Asia/Tokyo の暦日）。 */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  // en-CA ロケールは YYYY-MM-DD 形式を返す
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Asia/Tokyo における「今日」を YYYY-MM-DD で返す。 */
export function todayInTokyo(): string {
  return toDateInputValue(new Date())
}

/** 見積有効期限が切れているか判定する（Asia/Tokyo の暦日で比較）。 */
export function isExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false
  return validUntil < todayInTokyo()
}
