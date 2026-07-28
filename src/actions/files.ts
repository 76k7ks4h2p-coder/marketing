'use server'

import { revalidatePath } from 'next/cache'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { requireAdminForAction, requireOwnerForAction } from '@/lib/auth/session'
import { REQUEST_FILES_BUCKET } from '@/lib/constants/files'
import { handleError, logServerError } from '@/lib/errors'
import { firstErrorMessage, toFieldErrors } from '@/lib/validation/common'
import { registerFilesSchema, type RegisterFilesInput } from '@/lib/validation/file'

export type RegisterFilesResult = ActionResult<{ registered: number }>

type FilePayload = RegisterFilesInput['files'][number]

/**
 * オーナーがアップロードした依頼写真のメタデータを登録する。
 *
 * 流れ:
 *   1. クライアントが Storage へ直接アップロード（Storage の RLS で本人確認）
 *   2. このアクションで request_files へ登録
 *   3. 登録に失敗した場合、呼び出し側が Storage のファイルを削除する
 *      （このアクション内でも、部分的に登録された行を取り消す）
 */
export async function registerRequestFilesAction(input: unknown): Promise<RegisterFilesResult> {
  const parsed = registerFilesSchema.safeParse(input)

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors, 'ファイル情報が不正です。'), fieldErrors)
  }

  const { requestId, files } = parsed.data

  if (files.some((file) => file.fileKind !== 'request')) {
    return actionFailure('オーナーは完了写真を登録できません。')
  }

  try {
    const { supabase, user } = await requireOwnerForAction()

    // 案件が自分のものであることをサーバー側でも確認する
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('id')
      .eq('id', requestId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) return actionFailure('対象の依頼が見つかりませんでした。')

    // パスに含まれる owner セグメントが自分自身であることを確認する
    // （DB の CHECK 制約と RLS でも検証されるが、早めに分かりやすく弾く）
    const invalidPath = files.find(
      (file) => !file.storagePath.startsWith(`owner/${user.id}/requests/${requestId}/request/`),
    )
    if (invalidPath) {
      return actionFailure('ファイルの保存先が不正です。')
    }

    const rows = files.map((file) => toRow(file, requestId, user.id))

    const { data, error } = await supabase.from('request_files').insert(rows).select('id')

    if (error) throw error

    revalidatePath(`/requests/${requestId}`)
    return actionSuccess({ registered: data.length })
  } catch (error) {
    return actionFailure(handleError('registerRequestFilesAction', error))
  }
}

/** 管理者が完了写真のメタデータを登録する。 */
export async function registerCompletionFilesAction(input: unknown): Promise<RegisterFilesResult> {
  const parsed = registerFilesSchema.safeParse(input)

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors, 'ファイル情報が不正です。'), fieldErrors)
  }

  const { requestId, files } = parsed.data

  if (files.some((file) => file.fileKind !== 'completion')) {
    return actionFailure('完了写真として登録してください。')
  }

  try {
    const { supabase, user } = await requireAdminForAction()

    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('id, owner_id')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) return actionFailure('対象の依頼が見つかりませんでした。')

    // 完了写真もオーナーのフォルダ配下に保存する（パス仕様どおりか確認）
    const expectedPrefix = `owner/${request.owner_id}/requests/${requestId}/completion/`
    if (files.some((file) => !file.storagePath.startsWith(expectedPrefix))) {
      return actionFailure('ファイルの保存先が不正です。')
    }

    const rows = files.map((file) => toRow(file, requestId, user.id))

    const { data, error } = await supabase.from('request_files').insert(rows).select('id')

    if (error) throw error

    revalidatePath(`/admin/requests/${requestId}`)
    revalidatePath(`/requests/${requestId}`)
    return actionSuccess({ registered: data.length })
  } catch (error) {
    return actionFailure(handleError('registerCompletionFilesAction', error))
  }
}

function toRow(file: FilePayload, requestId: string, uploadedBy: string) {
  return {
    request_id: requestId,
    uploaded_by: uploadedBy,
    storage_path: file.storagePath,
    original_name: file.originalName,
    mime_type: file.mimeType,
    file_size: file.fileSize,
    file_kind: file.fileKind,
  }
}

/**
 * 依頼写真の削除（DB と Storage の両方）。
 *
 * DB 登録に失敗したときの Storage 側の後始末は、アップロードしたブラウザ側が
 * `removeUploadedPaths()` で行う（Storage の RLS が本人の request 種別のみ削除を許可する）。
 */
export async function deleteRequestFileAction(fileId: unknown): Promise<ActionResult<undefined>> {
  if (typeof fileId !== 'string' || fileId === '') {
    return actionFailure('削除対象が指定されていません。')
  }

  try {
    const { supabase, user } = await requireOwnerForAction()

    const { data: file, error: fetchError } = await supabase
      .from('request_files')
      .select('id, request_id, storage_path, file_kind')
      .eq('id', fileId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!file) return actionFailure('対象のファイルが見つかりませんでした。')

    if (file.file_kind !== 'request') {
      return actionFailure('完了写真はオーナーからは削除できません。')
    }

    if (!file.storage_path.startsWith(`owner/${user.id}/`)) {
      return actionFailure('このファイルを削除する権限がありません。')
    }

    // 先に DB を消す。Storage の削除が失敗しても孤児ファイルが残るだけで、
    // 権限のない相手に見えるわけではない（バケットは非公開）。
    const { error: deleteError } = await supabase.from('request_files').delete().eq('id', fileId)
    if (deleteError) throw deleteError

    const { error: storageError } = await supabase.storage
      .from(REQUEST_FILES_BUCKET)
      .remove([file.storage_path])

    if (storageError) {
      logServerError('deleteRequestFileAction.storage', storageError)
    }

    revalidatePath(`/requests/${file.request_id}`)
    return actionSuccess()
  } catch (error) {
    return actionFailure(handleError('deleteRequestFileAction', error))
  }
}
