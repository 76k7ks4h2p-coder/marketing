'use client'

import Link from 'next/link'

import { cn } from '@/lib/cn'
import { TARGET_RATE } from '@/lib/takken/meta'
import { TOPIC_LABELS } from '@/lib/takken/topics'
import { overallStats, reviewCount, weakTopics } from '@/lib/takken/stats'

import { useProgress } from './use-progress'

/**
 * ホームに出す学習状況のまとめ。
 * localStorage を読むのでクライアント側で描画する。
 */
export function HomeSummary() {
  const { progress, loaded } = useProgress()

  if (!loaded) {
    return (
      <section
        aria-busy="true"
        className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    )
  }

  const stats = overallStats(progress)
  const toReview = reviewCount(progress)
  const weak = weakTopics(progress)
  const started = stats.answered > 0

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-900">学習状況</h2>
          <Link
            href="/takken/stats"
            className="text-xs text-brand-700 underline underline-offset-2"
          >
            くわしく見る
          </Link>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="解答済み" value={`${stats.answered}`} suffix={`/ ${stats.total}問`} />
          <Stat
            label="正答率"
            value={started ? `${stats.rate}` : '—'}
            suffix={started ? '%' : undefined}
            highlight={started && stats.rate >= TARGET_RATE}
          />
          <Stat label="復習対象" value={`${toReview}`} suffix="問" />
        </dl>

        {started ? (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${Math.round((stats.answered / stats.total) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              全100問のうち {stats.answered} 問を解きました。
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-500">
            まだ解答がありません。年度別演習か分野別演習から始めてみてください。
          </p>
        )}
      </div>

      {weak.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">苦手な分野</h2>
          <ul className="mt-2 space-y-1.5">
            {weak.map((entry) => (
              <li key={entry.topic} className="flex items-center justify-between gap-3 text-sm">
                <Link
                  href={`/takken/topics/${entry.topic}`}
                  className="text-amber-900 underline underline-offset-2"
                >
                  {TOPIC_LABELS[entry.topic]}
                </Link>
                <span className="shrink-0 text-amber-900 tabular-nums">
                  {entry.correct} / {entry.answered}問 正解（{entry.rate}%）
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {toReview > 0 ? (
        <Link
          href="/takken/review"
          className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 transition-colors hover:border-brand-300"
        >
          <div>
            <p className="text-sm font-semibold text-brand-800">
              復習が {toReview} 問たまっています
            </p>
            <p className="mt-0.5 text-xs text-brand-700">
              間違えた問題とチェックした問題をまとめて解き直せます。
            </p>
          </div>
          <span aria-hidden className="shrink-0 text-brand-700">
            →
          </span>
        </Link>
      ) : null}
    </section>
  )
}

function Stat({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string
  value: string
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-surface-muted p-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-2xl font-bold tabular-nums',
          highlight ? 'text-emerald-700' : 'text-ink-900',
        )}
      >
        {value}
        {suffix ? <span className="ml-1 text-xs font-medium text-ink-500">{suffix}</span> : null}
      </dd>
    </div>
  )
}
