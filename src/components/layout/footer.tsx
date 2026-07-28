import Link from 'next/link'

import { SERVICE_AREA_LABEL, SERVICE_NAME } from '@/lib/constants/service'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-6 text-sm text-ink-500">
        <p className="font-semibold text-ink-700">{SERVICE_NAME}</p>
        <p>{SERVICE_AREA_LABEL}の不動産オーナー向け 業者比較・発注サービス（MVP）</p>
        <nav aria-label="フッター">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li>
              <Link href="/terms" className="underline underline-offset-2 hover:text-brand-700">
                利用規約
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="underline underline-offset-2 hover:text-brand-700">
                プライバシーポリシー
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-xs">
          本サイトは開発中の MVP
          です。利用規約およびプライバシーポリシーは専門家の確認前のドラフトです。
        </p>
      </div>
    </footer>
  )
}
