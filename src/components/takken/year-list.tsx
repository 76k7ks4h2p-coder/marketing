'use client'

import Link from 'next/link'

import { cn } from '@/lib/cn'
import { yearBreakdowns } from '@/lib/takken/stats'
import { YEARS } from '@/lib/takken/years'

import { useProgress } from './use-progress'

/** 年度一覧。各年度の到達状況をあわせて表示する。 */
export function YearList() {
  const { progress, loaded } = useProgress()
  const breakdowns = yearBreakdowns(progress)
  const byYear = new Map(breakdowns.map((entry) => [entry.yearId, entry]))

  return (
    <ul className="space-y-2">
      {YEARS.map((year) => {
        const stats = byYear.get(year.id)
        const answered = stats?.answered ?? 0
        const total = stats?.total ?? 0
        const done = total > 0 && answered === total

        return (
          <li key={year.id}>
            <Link
              href={`/takken/years/${year.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{year.label}</span>
                  <span className="text-xs text-ink-500">{year.seireki}年</span>
                  {!year.postRevision ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                      改正前の出題
                    </span>
                  ) : null}
                </div>
                {year.note ? <p className="mt-1 text-xs text-ink-500">{year.note}</p> : null}

                {loaded && answered > 0 ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn('h-full', done ? 'bg-emerald-500' : 'bg-brand-500')}
                        style={{ width: `${Math.round((answered / total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-500 tabular-nums">
                      {answered}/{total}問 解答 ・ 正答率 {stats?.rate ?? 0}%
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-500">
                    {loaded ? '未着手' : ' '}・全{total || 10}問
                  </p>
                )}
              </div>
              <span aria-hidden className="shrink-0 text-ink-500">
                →
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
