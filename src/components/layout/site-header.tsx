import Link from 'next/link'

import { ButtonLink } from '@/components/ui/button'
import { SERVICE_NAME } from '@/lib/constants/service'

/** 公開ページ用のヘッダー。 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          {SERVICE_NAME}
        </Link>

        <nav aria-label="メイン" className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            ログイン
          </ButtonLink>
          <ButtonLink href="/signup" variant="primary" size="sm">
            無料で始める
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}
