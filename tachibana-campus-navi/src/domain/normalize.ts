/**
 * 検索の表記揺れを吸収する正規化処理。
 * 全角英数字・大小文字・ハイフンや空白・「教室」などの接尾辞・カタカナ/ひらがなの違いを吸収する。
 */

/** 区切りとしてよく入力される記号（ハイフン類・長音・中黒・アンダースコア・ドットなど） */
const SEPARATORS = /[\s\u3000\-‐‑‒–—―−ーｰ_.・･/／]+/g

/** 教室番号の前後に付けられがちな語 */
const CODE_SUFFIX = /(番教室|教室|号室|ルーム|室)$/u
const CODE_PREFIX = /^(教室|room|no|#)/iu

/** 全角→半角、半角カナ→全角カナなどをまとめて揃える */
export function toNarrow(input: string): string {
  return input.normalize('NFKC')
}

/** カタカナをひらがなに寄せる（「ミカン」と「みかん」を同一視する） */
export function katakanaToHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

/**
 * 教室番号として比較するための正規化。
 * 例: "ｈ－３０１教室" → "H301"、" j 804 " → "J804"、"2202号室" → "2202"
 */
export function normalizeCode(input: string): string {
  let s = toNarrow(input).trim().toUpperCase()
  s = s.replace(CODE_SUFFIX, '')
  s = s.replace(CODE_PREFIX, '')
  s = s.replace(SEPARATORS, '')
  return s
}

/** 教室番号らしい文字列か（英字1文字以内 + 数字、または数字のみ） */
export function looksLikeRoomCode(normalized: string): boolean {
  return /^[A-Z]?[0-9]{1,5}$/.test(normalized)
}

/**
 * O→0、I/L→1 の打ち間違いを補正した候補を返す（先頭の建物記号は変えない）。
 * 例: "G0O1" → "G001"、"H3O1" → "H301"。補正の必要がなければ null。
 */
export function correctDigitTypos(normalized: string): string | null {
  if (normalized.length < 2) return null
  const head = normalized[0] ?? ''
  const rest = normalized.slice(1)
  const fixed = rest.replace(/O/g, '0').replace(/[IL]/g, '1')
  if (fixed === rest) return null
  const candidate = head + fixed
  return looksLikeRoomCode(candidate) ? candidate : null
}

/**
 * 名称で比較するための正規化。
 * 例: "アカデミック テラス" → "あかでみっくてらす"、"Media Lab3" → "medialab3"
 */
export function normalizeText(input: string): string {
  let s = toNarrow(input).trim().toLowerCase()
  s = s.replace(/[\s\u3000・･\-‐‑‒–—―−_.、。,()（）「」『』［］[\]]+/g, '')
  return katakanaToHiragana(s)
}

/** 自然順で比較（"H302" < "H1001"、"2" < "10"） */
export function compareNatural(a: string, b: string): number {
  return a.localeCompare(b, 'ja', { numeric: true, sensitivity: 'base' })
}
