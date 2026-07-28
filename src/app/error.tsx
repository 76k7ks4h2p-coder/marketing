'use client'

import { useEffect } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/feedback'

/**
 * 予期しないエラーの画面。
 *
 * 利用者へはスタックトレースや SQL を一切表示しない。
 * 詳細はサーバーログ（および digest）で追跡する。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // ブラウザのコンソールにも記録しておく（本文は表示しない）
    console.error('[OwnerBase] unhandled error', error.digest ?? error.name)
  }, [error])

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-ink-900">問題が発生しました</h1>

        <Alert variant="error" title="処理を完了できませんでした">
          <p>
            一時的な問題の可能性があります。お手数ですが、もう一度お試しください。
            解消しない場合は運営者へお問い合わせください。
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs">
              お問い合わせ番号: <span className="font-mono">{error.digest}</span>
            </p>
          ) : null}
        </Alert>

        <div className="flex flex-col gap-2">
          <Button onClick={reset}>もう一度試す</Button>
          <ButtonLink href="/dashboard" variant="secondary">
            ダッシュボードへ戻る
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
