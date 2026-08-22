'use client'

import Link from 'next/link'

import { buttonClasses } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/cn'
import { ASSESSMENT_LABELS, assess } from '@/lib/takken/grading'
import { TARGET_RATE } from '@/lib/takken/meta'
import { overallStats, reviewCount, topicBreakdowns, yearBreakdowns } from '@/lib/takken/stats'
import type { Breakdown } from '@/lib/takken/stats'
import { TOPIC_LABELS } from '@/lib/takken/topics'
import { yearLabel } from '@/lib/takken/years'

import { useProgress } from './use-progress'

export function StatsView() {
  const { progress, loaded, reset } = useProgress()

  if (!loaded) {
    return (
      <div aria-busy="true" className="space-y-3">
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const overall = overallStats(progress)
  const years = yearBreakdowns(progress)
  const topics = topicBreakdowns(progress)
  const toReview = reviewCount(progress)
  const started = overall.answered > 0

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">全体</h2>

        {started ? (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-3xl font-bold text-ink-900 tabular-nums">
                {overall.rate}
                <span className="text-base font-medium text-ink-500">%</span>
              </p>
              <p className="text-sm text-ink-700">
                解答した {overall.answered} 問のうち {overall.correct} 問正解
              </p>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  assess(overall.rate) === 'good' && 'bg-emerald-100 text-emerald-900',
                  assess(overall.rate) === 'fair' && 'bg-amber-100 text-amber-900',
                  assess(overall.rate) === 'poor' && 'bg-red-100 text-red-900',
                )}
              >
                {ASSESSMENT_LABELS[assess(overall.rate)]}
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>進捗</span>
                <span className="tabular-nums">
                  {overall.answered} / {overall.total} 問
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${Math.round((overall.answered / overall.total) * 100)}%` }}
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-ink-500">
              権利関係の目標は正答率{TARGET_RATE}%です。復習対象は現在 {toReview} 問あります。
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-700">
            まだ解答がありません。
            <Link href="/takken/years" className="ml-1 text-brand-700 underline underline-offset-2">
              年度別演習
            </Link>
            から始めてみてください。
          </p>
        )}
      </section>

      <BreakdownTable
        title="年度別"
        rows={years.map((entry) => ({
          key: entry.yearId,
          label: yearLabel(entry.yearId),
          href: `/takken/years/${entry.yearId}`,
          ...entry,
        }))}
      />

      <BreakdownTable
        title="分野別"
        rows={topics.map((entry) => ({
          key: entry.topic,
          label: TOPIC_LABELS[entry.topic],
          href: `/takken/topics/${entry.topic}`,
          ...entry,
        }))}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">学習履歴の削除</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-700">
          履歴はこの端末のブラウザにのみ保存されています。削除すると解答状況・正答率・
          チェックがすべて消え、元に戻せません。
        </p>
        <div className="mt-3">
          <ConfirmDialog
            triggerLabel="履歴をすべて削除する"
            triggerVariant="danger"
            triggerDisabled={!started && toReview === 0}
            title="学習履歴を削除しますか？"
            message="これまでの解答状況・正答率・チェックがすべて消えます。この操作は元に戻せません。"
          >
            {/* method="dialog" にすると送信でダイアログが閉じる */}
            <form method="dialog" onSubmit={() => reset()}>
              <button type="submit" className={buttonClasses('danger', 'md')}>
                削除する
              </button>
            </form>
          </ConfirmDialog>
        </div>
      </section>
    </div>
  )
}

type Row = Breakdown & { key: string; label: string; href: string }

function BreakdownTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-ink-900">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{row.label}</span>

              <span className="w-20 shrink-0 text-right text-xs text-ink-500 tabular-nums">
                {row.answered} / {row.total}問
              </span>

              <span className="hidden w-24 shrink-0 sm:block">
                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <span
                    className={cn(
                      'block h-full',
                      row.answered === 0
                        ? 'bg-slate-300'
                        : row.rate >= TARGET_RATE
                          ? 'bg-emerald-500'
                          : row.rate >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                    )}
                    style={{ width: `${row.answered === 0 ? 0 : row.rate}%` }}
                  />
                </span>
              </span>

              <span
                className={cn(
                  'w-12 shrink-0 text-right text-sm font-semibold tabular-nums',
                  row.answered === 0 ? 'text-ink-500' : 'text-ink-900',
                )}
              >
                {row.answered === 0 ? '—' : `${row.rate}%`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
