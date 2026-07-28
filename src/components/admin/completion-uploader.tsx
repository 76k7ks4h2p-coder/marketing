'use client'

import { Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { registerCompletionFilesAction } from '@/actions/files'
import { FilePicker } from '@/components/owner/file-picker'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/feedback'
import { MAX_FILES_PER_REQUEST } from '@/lib/constants/files'
import { removeUploadedPaths, uploadRequestFiles } from '@/lib/upload-client'

/**
 * 完了写真のアップロード（管理者専用）。
 *
 * Storage へ直接アップロードしたあと、Server Action でメタデータを登録する。
 * 登録に失敗した場合は Storage 上のファイルを削除して整合性を保つ。
 */
export function CompletionUploader({
  requestId,
  ownerId,
  existingCount,
}: {
  requestId: string
  ownerId: string
  existingCount: number
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ variant: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [isUploading, setIsUploading] = useState(false)

  const remaining = Math.max(MAX_FILES_PER_REQUEST - existingCount, 0)

  async function handleUpload() {
    if (isUploading || files.length === 0) return

    setIsUploading(true)
    setMessage(null)

    try {
      const upload = await uploadRequestFiles({
        ownerId,
        requestId,
        kind: 'completion',
        files,
      })

      if (!upload.ok) {
        setMessage({ variant: 'error', text: upload.message })
        return
      }

      const register = await registerCompletionFilesAction({
        requestId,
        files: upload.files,
      })

      if (!register.ok) {
        await removeUploadedPaths(upload.files.map((file) => file.storagePath))
        setMessage({ variant: 'error', text: register.message })
        return
      }

      setFiles([])
      setMessage({
        variant: 'success',
        text: `完了写真を ${register.data.registered} 件登録しました。`,
      })
      router.refresh()
    } catch (error) {
      console.error('[OwnerBase] CompletionUploader', error)
      setMessage({
        variant: 'error',
        text: 'アップロードに失敗しました。通信環境をご確認のうえ、もう一度お試しください。',
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (remaining === 0) {
    return (
      <Alert variant="info" title="上限に達しています">
        完了写真は 1 案件につき {MAX_FILES_PER_REQUEST} 件までです。
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      {message ? (
        <Alert
          variant={message.variant}
          title={message.variant === 'success' ? '登録しました' : '登録できませんでした'}
        >
          {message.text}
        </Alert>
      ) : null}

      <FilePicker
        files={files}
        onChange={setFiles}
        onError={setFileError}
        error={fileError}
        label="完了写真"
        maxFiles={remaining}
        disabled={isUploading}
      />

      <Button
        onClick={handleUpload}
        disabled={isUploading || files.length === 0}
        aria-busy={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            アップロード中…
          </>
        ) : (
          <>
            <Upload aria-hidden="true" className="h-4 w-4" />
            完了写真を登録する
          </>
        )}
      </Button>
    </div>
  )
}
