'use client'

import { REQUEST_FILES_BUCKET } from '@/lib/constants/files'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { buildStoragePath, extensionOf, validateUploadFiles } from '@/lib/validation/file'
import type { AllowedMimeType } from '@/lib/constants/files'

export type UploadedFileMeta = {
  storagePath: string
  originalName: string
  mimeType: AllowedMimeType
  fileSize: number
  fileKind: 'request' | 'completion'
}

export type UploadOutcome = { ok: true; files: UploadedFileMeta[] } | { ok: false; message: string }

/**
 * Storage へ直接アップロードする。
 *
 * - 保存パスは UUID で生成し、元のファイル名は使わない
 * - 途中で失敗した場合は、それまでにアップロードしたファイルを削除して
 *   中途半端な状態を残さない
 * - アクセス制御は Storage の RLS ポリシーが行う（クライアントを信頼しない）
 */
export async function uploadRequestFiles(input: {
  ownerId: string
  requestId: string
  kind: 'request' | 'completion'
  files: File[]
}): Promise<UploadOutcome> {
  const { ownerId, requestId, kind, files } = input

  if (files.length === 0) return { ok: true, files: [] }

  const validation = validateUploadFiles(
    files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
  )

  if (!validation.ok) return { ok: false, message: validation.message }

  const supabase = getSupabaseBrowserClient()
  const uploaded: UploadedFileMeta[] = []

  for (const file of files) {
    const extension = extensionOf(file.name)

    let storagePath: string
    try {
      storagePath = buildStoragePath({
        ownerId,
        requestId,
        kind,
        fileId: crypto.randomUUID(),
        extension,
      })
    } catch {
      await removeUploaded(uploaded)
      return { ok: false, message: 'ファイルの保存先を作成できませんでした。' }
    }

    const { error } = await supabase.storage
      .from(REQUEST_FILES_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (error) {
      console.error('[OwnerBase] storage.upload', error)
      // 途中まで成功した分を片付けてから失敗を返す
      await removeUploaded(uploaded)
      return {
        ok: false,
        message: `「${file.name}」のアップロードに失敗しました。通信環境をご確認のうえ、もう一度お試しください。`,
      }
    }

    uploaded.push({
      storagePath,
      originalName: file.name,
      mimeType: file.type as AllowedMimeType,
      fileSize: file.size,
      fileKind: kind,
    })
  }

  return { ok: true, files: uploaded }
}

/** アップロード済みファイルを削除する（DB 登録に失敗したときの後始末）。 */
export async function removeUploadedPaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  try {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.storage.from(REQUEST_FILES_BUCKET).remove(paths)
    if (error) console.error('[OwnerBase] storage.remove', error)
  } catch (error) {
    console.error('[OwnerBase] storage.remove', error)
  }
}

async function removeUploaded(uploaded: UploadedFileMeta[]): Promise<void> {
  await removeUploadedPaths(uploaded.map((file) => file.storagePath))
}
