import { z } from 'zod'

import {
  ALLOWED_EXTENSIONS,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_TYPES_LABEL,
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  REQUEST_FILE_KIND_VALUES,
  isAllowedMimeType,
  type AllowedMimeType,
} from '@/lib/constants/files'

import { requiredText, uuidSchema } from './common'

export type FileValidationResult = { ok: true } | { ok: false; message: string }

/** ファイル名から拡張子（小文字）を取り出す。 */
export function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

/** MIME タイプが許可されているか。 */
export function isMimeTypeAllowed(mimeType: string): boolean {
  return isAllowedMimeType(mimeType)
}

/** 拡張子が許可されているか。 */
export function isExtensionAllowed(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.includes(extensionOf(fileName))
}

/** MIME タイプと拡張子の組み合わせが整合しているか。 */
export function isMimeAndExtensionConsistent(mimeType: string, fileName: string): boolean {
  if (!isAllowedMimeType(mimeType)) return false
  const extensions = ALLOWED_FILE_TYPES[mimeType as AllowedMimeType] as readonly string[]
  return extensions.includes(extensionOf(fileName))
}

/** ファイルサイズが上限以内か。 */
export function isFileSizeAllowed(size: number): boolean {
  return Number.isFinite(size) && size > 0 && size <= MAX_FILE_SIZE_BYTES
}

/**
 * 1 ファイル分の検証。MIME タイプと拡張子の両方を確認する。
 * ブラウザとサーバーの両方から呼ぶ。
 */
export function validateUploadFile(input: {
  name: string
  type: string
  size: number
}): FileValidationResult {
  if (!input.name || input.name.trim() === '') {
    return { ok: false, message: 'ファイル名を取得できませんでした。' }
  }

  if (!isMimeTypeAllowed(input.type)) {
    return {
      ok: false,
      message: `${input.name}: 対応していない形式です。${ALLOWED_FILE_TYPES_LABEL} のいずれかを選択してください。`,
    }
  }

  if (!isExtensionAllowed(input.name)) {
    return {
      ok: false,
      message: `${input.name}: 対応していない拡張子です。${ALLOWED_FILE_TYPES_LABEL} のいずれかを選択してください。`,
    }
  }

  if (!isMimeAndExtensionConsistent(input.type, input.name)) {
    return {
      ok: false,
      message: `${input.name}: ファイルの種類と拡張子が一致していません。`,
    }
  }

  if (input.size <= 0) {
    return { ok: false, message: `${input.name}: 空のファイルはアップロードできません。` }
  }

  if (!isFileSizeAllowed(input.size)) {
    return {
      ok: false,
      message: `${input.name}: ファイルサイズが${MAX_FILE_SIZE_LABEL}を超えています。`,
    }
  }

  return { ok: true }
}

/** ファイル数の検証。 */
export function validateFileCount(count: number): FileValidationResult {
  if (count > MAX_FILES_PER_REQUEST) {
    return {
      ok: false,
      message: `アップロードできるファイルは${MAX_FILES_PER_REQUEST}件までです。`,
    }
  }
  return { ok: true }
}

/** まとめて検証する。 */
export function validateUploadFiles(
  files: readonly { name: string; type: string; size: number }[],
): FileValidationResult {
  const countResult = validateFileCount(files.length)
  if (!countResult.ok) return countResult

  for (const file of files) {
    const result = validateUploadFile(file)
    if (!result.ok) return result
  }

  return { ok: true }
}

/**
 * Storage パスの検証（DB の request_file_path_is_valid() と同じ形式）。
 * 完全一致の正規表現なので "../" などのパストラバーサルは成立しない。
 */
const UUID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

export const STORAGE_PATH_REGEX = new RegExp(
  `^owner/${UUID_PATTERN}/requests/${UUID_PATTERN}/(request|completion)/${UUID_PATTERN}\\.(${ALLOWED_EXTENSIONS.join('|')})$`,
)

export function isValidStoragePath(path: string): boolean {
  return STORAGE_PATH_REGEX.test(path)
}

/** Storage の保存パスを組み立てる。元のファイル名は使わず UUID を使用する。 */
export function buildStoragePath(input: {
  ownerId: string
  requestId: string
  kind: 'request' | 'completion'
  fileId: string
  extension: string
}): string {
  const path = `owner/${input.ownerId}/requests/${input.requestId}/${input.kind}/${input.fileId}.${input.extension.toLowerCase()}`

  if (!isValidStoragePath(path)) {
    throw new Error('STORAGE_PATH_INVALID')
  }

  return path
}

/** Server Action でファイルメタデータを登録する際のスキーマ。 */
export const registerFileSchema = z.object({
  storagePath: z.string().refine(isValidStoragePath, { message: 'ファイルの保存先が不正です。' }),
  originalName: requiredText('ファイル名', 255),
  mimeType: z.enum(ALLOWED_MIME_TYPES as [AllowedMimeType, ...AllowedMimeType[]], {
    error: `対応していない形式です。${ALLOWED_FILE_TYPES_LABEL} のいずれかを選択してください。`,
  }),
  fileSize: z.coerce
    .number({ error: 'ファイルサイズを取得できませんでした。' })
    .int()
    .positive('空のファイルはアップロードできません。')
    .max(MAX_FILE_SIZE_BYTES, `ファイルサイズが${MAX_FILE_SIZE_LABEL}を超えています。`),
  fileKind: z.enum(REQUEST_FILE_KIND_VALUES, { error: 'ファイル種別が不正です。' }),
})

export const registerFilesSchema = z.object({
  requestId: uuidSchema('案件'),
  files: z
    .array(registerFileSchema)
    .min(1, '登録するファイルがありません。')
    .max(MAX_FILES_PER_REQUEST, `アップロードできるファイルは${MAX_FILES_PER_REQUEST}件までです。`),
})

export type RegisterFilesInput = z.output<typeof registerFilesSchema>
