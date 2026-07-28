'use client'

import { useEffect } from 'react'

import './globals.css'

/**
 * ルートレイアウト自体が失敗した場合のフォールバック。
 * html / body を自前で描画する必要がある。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[OwnerBase] global error', error.digest ?? error.name)
  }, [error])

  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">問題が発生しました</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            アプリケーションの読み込みに失敗しました。ページを再読み込みしてお試しください。
          </p>
          {error.digest ? (
            <p className="text-xs text-slate-500">お問い合わせ番号: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="min-h-11 w-full rounded-lg bg-slate-900 px-4 font-medium text-white"
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  )
}
