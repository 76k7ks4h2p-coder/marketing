import { FileText, ImageOff } from 'lucide-react'

import { formatFileSize } from '@/lib/format/currency'
import { formatJapaneseDateTime } from '@/lib/format/date'
import type { DisplayFile } from '@/lib/queries/storage'

import { EmptyState } from './feedback'

/**
 * 依頼写真・完了写真の一覧。
 * 非公開バケットのため、サーバー側で発行した署名付き URL を使う。
 */
export function FileGallery({
  files,
  emptyMessage,
  captionPrefix,
}: {
  files: DisplayFile[]
  emptyMessage: string
  captionPrefix: string
}) {
  if (files.length === 0) {
    return <EmptyState title={emptyMessage} icon={<ImageOff className="h-8 w-8" />} />
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {files.map((file, index) => (
        <li key={file.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {file.signedUrl === null ? (
            <div className="flex aspect-square items-center justify-center bg-slate-100 p-2 text-center text-xs text-ink-500">
              表示用リンクを取得できませんでした
            </div>
          ) : file.isImage ? (
            <a
              href={file.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="block focus-visible:outline-offset-0"
            >
              {/*
                署名付き URL はリクエストごとに変わるため next/image の最適化対象にしない。
                そのため <img> を使う（eslint-disable ではなく意図の説明として記載）。
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.signedUrl}
                alt={`${captionPrefix} ${index + 1}枚目（${file.original_name}）`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <a
              href={file.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center hover:bg-slate-50"
            >
              <FileText aria-hidden="true" className="h-8 w-8 text-ink-500" />
              <span className="line-clamp-2 text-xs break-all text-ink-700">
                {file.original_name}
              </span>
              <span className="sr-only">を新しいタブで開く</span>
            </a>
          )}

          <div className="space-y-0.5 border-t border-slate-100 p-2">
            <p className="truncate text-xs text-ink-700" title={file.original_name}>
              {file.original_name}
            </p>
            <p className="text-[11px] text-ink-500">
              {formatFileSize(file.file_size)} / {formatJapaneseDateTime(file.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
