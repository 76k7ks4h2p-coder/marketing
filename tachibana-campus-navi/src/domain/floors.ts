/** 階数の表記。地下は負の数で表す（地下1階 = -1） */
export function floorLabel(level: number): string {
  if (level < 0) return `地下${-level}階`
  return `${level}階`
}

/** 短い表記（チップなど）。B1 / 1F */
export function floorShortLabel(level: number): string {
  if (level < 0) return `B${-level}`
  return `${level}F`
}

/**
 * 教室番号の先頭の階の数字を階数に変換する。0 は地下1階として扱う
 * （公式一覧の「G001教室 = 啓成館 地下1階」に基づく）。
 */
export function levelFromCodeDigit(digit: string): number | null {
  if (!/^[0-9]$/.test(digit)) return null
  const n = Number(digit)
  return n === 0 ? -1 : n
}
