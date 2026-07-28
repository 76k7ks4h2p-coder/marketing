const yenFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  currencyDisplay: 'symbol',
  maximumFractionDigits: 0,
})

/**
 * 金額を日本円表記に整形する。
 * 例: 55000 -> "￥55,000"
 */
export function formatYen(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return yenFormatter.format(value)
}

const numberFormatter = new Intl.NumberFormat('ja-JP')

/** 桁区切りのみの数値表記。例: 1234 -> "1,234" */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return numberFormatter.format(value)
}

/**
 * 予算レンジを表示用の文字列にする。
 * 例: (30000, 50000) -> "￥30,000 〜 ￥50,000"
 */
export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const hasMin = typeof min === 'number' && Number.isFinite(min)
  const hasMax = typeof max === 'number' && Number.isFinite(max)

  if (!hasMin && !hasMax) return '未設定'
  if (hasMin && hasMax) return `${formatYen(min)} 〜 ${formatYen(max)}`
  if (hasMin) return `${formatYen(min)} 〜`
  return `〜 ${formatYen(max)}`
}

/** ファイルサイズを人間が読める形式にする。例: 1536 -> "1.5KB" */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
