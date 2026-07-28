import 'server-only'

import { REQUEST_FILES_BUCKET, SIGNED_URL_TTL_SECONDS } from '@/lib/constants/files'
import { logServerError } from '@/lib/errors'
import type { TypedSupabaseClient } from '@/lib/supabase/server'

export type StoredFile = {
  id: string
  storage_path: string
  original_name: string
  mime_type: string
  file_size: number
  file_kind: string
  created_at: string
}

export type DisplayFile = StoredFile & {
  /** 署名付き URL。取得に失敗した場合は null（画面ではその旨を表示する）。 */
  signedUrl: string | null
  isImage: boolean
}

/**
 * 非公開バケットのファイルを表示するための署名付き URL を発行する。
 * バケットは public にしていないため、これ以外の方法では参照できない。
 */
export async function withSignedUrls(
  supabase: TypedSupabaseClient,
  files: readonly StoredFile[],
): Promise<DisplayFile[]> {
  if (files.length === 0) return []

  const paths = files.map((file) => file.storage_path)

  const { data, error } = await supabase.storage
    .from(REQUEST_FILES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error) {
    logServerError('createSignedUrls', error)
    return files.map((file) => ({
      ...file,
      signedUrl: null,
      isImage: file.mime_type.startsWith('image/'),
    }))
  }

  const urlByPath = new Map<string, string | null>()
  for (const entry of data ?? []) {
    // path は createSignedUrls に渡した順で返るが、念のため path で突き合わせる
    if (entry.path) urlByPath.set(entry.path, entry.signedUrl ?? null)
  }

  return files.map((file) => ({
    ...file,
    signedUrl: urlByPath.get(file.storage_path) ?? null,
    isImage: file.mime_type.startsWith('image/'),
  }))
}
