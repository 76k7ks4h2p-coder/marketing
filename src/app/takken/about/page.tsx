import type { Metadata } from 'next'
import Link from 'next/link'

import { APP_NAME, SOURCE_NOTICE } from '@/lib/takken/meta'
import { TOTAL_QUESTION_COUNT } from '@/lib/takken/questions'
import { TOPIC_IDS } from '@/lib/takken/topics'
import { YEARS } from '@/lib/takken/years'

export const metadata: Metadata = {
  title: '収録データと使い方',
  description: `${APP_NAME}が収録している問題の性質、解答基準、学習履歴の扱いについて説明します。`,
}

const USAGE = [
  {
    title: '年度別演習',
    body: '1年分（10問）を通しで解きます。選択肢を選んだ時点で正誤と解説が出ます。実力の確認に向いています。',
  },
  {
    title: '分野別演習',
    body: `${TOPIC_IDS.length}分野から1つ選び、10年分を横断して同じ論点の問題だけを続けて解きます。苦手つぶしに向いています。`,
  },
  {
    title: '模試モード',
    body: '制限時間つきでランダム出題します。解答中は正誤が出ず、最後にまとめて採点します。時間配分の練習に。',
  },
  {
    title: '復習',
    body: '直近で間違えた問題と「後で見直す」にチェックした問題を、間違えた回数が多い順に出題します。',
  },
] as const

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">収録データと使い方</h1>
        <p className="text-sm text-ink-700">
          {APP_NAME}は宅地建物取引士試験の学習を補助するための非公式アプリです。
        </p>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">{SOURCE_NOTICE.title}</h2>
        <ul className="mt-2 space-y-2">
          {SOURCE_NOTICE.points.map((point) => (
            <li key={point} className="flex gap-2 text-sm leading-relaxed text-amber-900">
              <span aria-hidden>・</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">収録範囲</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">科目</dt>
            <dd className="text-ink-900">
              権利関係のうち民法のみ。借地借家法・区分所有法・不動産登記法は対象外です。
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">年度</dt>
            <dd className="text-ink-900">
              {YEARS[YEARS.length - 1].label}〜{YEARS[0].label}の{YEARS.length}年分
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">問題数</dt>
            <dd className="text-ink-900">全{TOTAL_QUESTION_COUNT}問（1年度あたり10問）</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">分野</dt>
            <dd className="text-ink-900">{TOPIC_IDS.length}分野</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">2020年の民法改正について</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-700">
          <p>
            2020年4月1日に改正民法（債権法改正）が施行され、宅建本試験に反映されたのは令和2年度からです。
            令和元年度以前の出題は改正前の条文を前提にしているため、当時の正解をそのまま覚えると
            現在の試験では誤りになる論点があります。
          </p>
          <p>
            このアプリでは、すべての問題の正解と解説を現行の民法を基準に作成しています。
            そのうえで、出題当時と結論や条文構成が変わった論点には「法改正あり」のラベルと、
            何がどう変わったのかの注記を付けています。
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">4つの演習モード</h2>
        <dl className="mt-3 space-y-3">
          {USAGE.map((item) => (
            <div key={item.title}>
              <dt className="text-sm font-medium text-ink-900">{item.title}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-ink-700">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">学習履歴の保存について</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-700">
          <p>
            解答状況・正答率・チェックは、ご利用の端末のブラウザ（localStorage）にのみ保存されます。
            サーバーには送信されないため、アカウント登録は不要です。
          </p>
          <p>
            その代わり、別の端末やブラウザには履歴が引き継がれません。ブラウザの閲覧データを削除すると
            履歴も消えます。履歴は
            <Link href="/takken/stats" className="mx-1 text-brand-700 underline underline-offset-2">
              成績ページ
            </Link>
            からいつでも削除できます。
          </p>
        </div>
      </section>

      <p className="text-sm">
        <Link href="/takken" className="text-brand-700 underline underline-offset-2">
          ホームに戻る
        </Link>
      </p>
    </div>
  )
}
