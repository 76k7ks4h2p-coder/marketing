import { BookOpenCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { TakkenNav } from '@/components/takken/takken-nav'
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/takken/meta'

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME}｜${APP_TAGLINE}`,
    template: `%s｜${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
}

export default function TakkenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-3">
          <Link href="/takken" className="inline-flex items-center gap-2">
            <BookOpenCheck className="size-5 text-brand-600" aria-hidden />
            <span className="text-base font-bold text-ink-900">{APP_NAME}</span>
            <span className="hidden text-xs text-ink-500 sm:inline">{APP_TAGLINE}</span>
          </Link>
        </div>
        <TakkenNav />
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-5">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-5 text-xs text-ink-500">
          <p>
            {APP_NAME}は宅地建物取引士試験の学習を補助するための非公式アプリです。収録している問題は
            本試験の出題論点に基づいて作成したオリジナル問題で、本試験の問題文そのものではありません。
          </p>
          <p className="mt-2">
            <Link href="/takken/about" className="text-brand-700 underline underline-offset-2">
              収録データと使い方について
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
