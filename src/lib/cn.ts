/** クラス名を連結する小さなヘルパー（依存を増やさないための最小実装）。 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
