'use client'

import { FileText, ImageIcon, X } from 'lucide-react'
import { useId, useRef } from 'react'

import { Alert } from '@/components/ui/feedback'
import {
  ALLOWED_FILE_TYPES_LABEL,
  FILE_INPUT_ACCEPT,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE_LABEL,
} from '@/lib/constants/files'
import { formatFileSize } from '@/lib/format/currency'
import { validateUploadFile } from '@/lib/validation/file'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
  disabled?: boolean
  /** 上限件数。既にアップロード済みのファイルがある場合は残り件数を渡す。 */
  maxFiles?: number
  error?: string | null
  onError: (message: string | null) => void
}

/**
 * ファイル選択 UI。
 * 選択した時点で MIME タイプ・拡張子・サイズ・件数を検証する（サーバー側でも再検証する）。
 */
export function FilePicker({
  files,
  onChange,
  label = '写真・書類',
  disabled = false,
  maxFiles = MAX_FILES_PER_REQUEST,
  error,
  onError,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return

    const incoming = Array.from(selected)
    const accepted: File[] = []

    for (const file of incoming) {
      const result = validateUploadFile({ name: file.name, type: file.type, size: file.size })
      if (!result.ok) {
        onError(result.message)
        resetInput()
        return
      }

      const isDuplicate = files.some(
        (existing) => existing.name === file.name && existing.size === file.size,
      )
      if (!isDuplicate) accepted.push(file)
    }

    const next = [...files, ...accepted]

    if (next.length > maxFiles) {
      onError(`アップロードできるファイルは${maxFiles}件までです。`)
      resetInput()
      return
    }

    onError(null)
    onChange(next)
    resetInput()
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(index: number) {
    onError(null)
    onChange(files.filter((_, i) => i !== index))
  }

  const remaining = maxFiles - files.length

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-700">
          {label}
          <span className="ml-1 text-xs font-normal text-ink-500">（任意）</span>
        </label>
        <p id={`${inputId}-hint`} className="text-xs text-ink-500">
          {ALLOWED_FILE_TYPES_LABEL} / 1ファイル{MAX_FILE_SIZE_LABEL}まで / 最大{maxFiles}件 （あと{' '}
          {Math.max(remaining, 0)} 件）
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={FILE_INPUT_ACCEPT}
          disabled={disabled || remaining <= 0}
          aria-describedby={`${inputId}-hint`}
          onChange={(event) => handleSelect(event.target.files)}
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:text-sm file:font-medium file:text-brand-700 disabled:bg-slate-100"
        />
      </div>

      {error ? (
        <Alert variant="error" title="ファイルを追加できませんでした">
          {error}
        </Alert>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <span aria-hidden="true" className="shrink-0 text-ink-500">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4.5 w-4.5" />
                ) : (
                  <FileText className="h-4.5 w-4.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink-900">{file.name}</span>
                <span className="block text-xs text-ink-500">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-slate-100"
              >
                <X aria-hidden="true" className="h-4.5 w-4.5" />
                <span className="sr-only">{file.name} を削除</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
