/** アップロードファイルに関する共通定数。DB の CHECK 制約・Storage 設定と一致させること。 */

export const REQUEST_FILE_KIND_VALUES = ['request', 'completion'] as const

export type RequestFileKind = (typeof REQUEST_FILE_KIND_VALUES)[number]

export const REQUEST_FILE_KIND_LABELS: Record<RequestFileKind, string> = {
  request: '依頼写真',
  completion: '完了写真',
}

/** 1 案件・1 種別あたりの最大ファイル数。 */
export const MAX_FILES_PER_REQUEST = 5

/** 1 ファイルあたりの最大サイズ（10MB）。 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const MAX_FILE_SIZE_LABEL = '10MB'

/** 許可する MIME タイプと、それに対応する拡張子。 */
export const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
} as const satisfies Record<string, readonly string[]>

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_FILE_TYPES) as AllowedMimeType[]

export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_FILE_TYPES).flat() as string[]

export const ALLOWED_FILE_TYPES_LABEL = 'JPEG / PNG / WebP / PDF'

/** <input type="file" accept="..."> に渡す値。 */
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(',')

/** Supabase Storage のバケット名。 */
export const REQUEST_FILES_BUCKET = 'request-files'

/** 署名付き URL の有効期間（秒）。 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60

export function isAllowedMimeType(value: unknown): value is AllowedMimeType {
  return typeof value === 'string' && (ALLOWED_MIME_TYPES as string[]).includes(value)
}

export function isRequestFileKind(value: unknown): value is RequestFileKind {
  return (
    typeof value === 'string' && (REQUEST_FILE_KIND_VALUES as readonly string[]).includes(value)
  )
}

/** MIME タイプに対して正規化された拡張子を返す。 */
export function canonicalExtensionFor(mimeType: AllowedMimeType): string {
  return ALLOWED_FILE_TYPES[mimeType][0]
}
