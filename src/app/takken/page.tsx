import { CalendarDays, ClipboardCheck, Info, Layers, RotateCcw } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { HomeSummary } from '@/components/takken/home-summary'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  MOCK_QUESTION_COUNT,
  MOCK_TIME_LIMIT_SECONDS,
} from '@/lib/takken/meta'
import { TOTAL_QUESTION_COUNT } from '@/lib/takken/questions'
import { TOPIC_IDS } from '@/lib/takken/topics'
import { YEARS } from '@/lib/takken/years'

export const metadata: Metadata = {
  // absolute にしないと、ルートレイアウトの `%s｜OwnerBase` が後ろに付いてしまう
  title: { absolute: `${APP_NAME}｜${APP_TAGLINE}` },
  description: APP_DESCRIPTION,
}

const MODES = [
  {
    href: '/takken/years',
    title: '年度別演習',
    body: `令和7年度から平成28年度まで、1年分（10問）をまとめて解きます。本試験の出題順に沿って力試しをしたいときに。`,
    Icon: CalendarDays,
  },
  {
    href: '/takken/topics',
    title: '分野別演習',
    body: `意思表示・代理・抵当権・相続など、${TOPIC_IDS.length}分野から選んで集中的に解きます。苦手つぶしに向いています。`,
    Icon: Layers,
  },
  {
    href: '/takken/mock',
    title: '模試モード',
    body: `全100問からランダムに${MOCK_QUESTION_COUNT}問、制限時間${MOCK_TIME_LIMIT_SECONDS / 60}分。解説は最後にまとめて表示します。`,
    Icon: ClipboardCheck,
  },
  {
    href: '/takken/review',
    title: '復習',
    body: '間違えた問題とチェックを付けた問題だけを、定着していない順に出題します。',
    Icon: RotateCcw,
  },
] as const

export default function TakkenHomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-200 bg-white p-5">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">宅建の民法だけを、過去10年分</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          宅地建物取引士試験の「権利関係」のうち、民法の論点だけを集めた4択演習アプリです。
          {YEARS[YEARS.length - 1].label}から{YEARS[0].label}までの
          {YEARS.length}年分・全{TOTAL_QUESTION_COUNT}問を、年度別と分野別のどちらからでも解けます。
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs text-brand-700">収録年度</dt>
            <dd className="text-xl font-bold text-brand-800 tabular-nums">{YEARS.length}年分</dd>
          </div>
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs text-brand-700">総問題数</dt>
            <dd className="text-xl font-bold text-brand-800 tabular-nums">
              {TOTAL_QUESTION_COUNT}問
            </dd>
          </div>
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs text-brand-700">分野</dt>
            <dd className="text-xl font-bold text-brand-800 tabular-nums">
              {TOPIC_IDS.length}分野
            </dd>
          </div>
        </dl>
      </section>

      <HomeSummary />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-900">演習モード</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MODES.map(({ href, title, body, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300"
              >
                <Icon className="size-5 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-700">{body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-ink-500" aria-hidden />
          <div className="min-w-0 space-y-2 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">はじめに読んでください</p>
            <p className="leading-relaxed">
              収録しているのは、各年度の本試験で実際に問われた論点に基づいて作成したオリジナル問題です。
              本試験の問題文をそのまま転載したものではありません。また、解答と解説は現行の民法を基準にしており、
              2020年4月の改正で結論が変わった論点には「法改正あり」の注記を付けています。
            </p>
            <Link
              href="/takken/about"
              className="inline-block text-brand-700 underline underline-offset-2"
            >
              収録データと使い方について
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
