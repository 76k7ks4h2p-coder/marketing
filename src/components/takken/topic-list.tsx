'use client'

import Link from 'next/link'

import { cn } from '@/lib/cn'
import { topicBreakdowns } from '@/lib/takken/stats'
import { TOPIC_DESCRIPTIONS, TOPIC_LABELS } from '@/lib/takken/topics'

import { useProgress } from './use-progress'

/** 分野一覧。各分野の収録問題数と正答率を並べる。 */
export function TopicList() {
  const { progress, loaded } = useProgress()
  const breakdowns = topicBreakdowns(progress)

  return (
    <ul className="space-y-2">
      {breakdowns.map((entry) => {
        const weak = loaded && entry.answered >= 2 && entry.rate < 70

        return (
          <li key={entry.topic}>
            <Link
              href={`/takken/topics/${entry.topic}`}
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors',
                weak
                  ? 'border-amber-300 hover:border-amber-400'
                  : 'border-slate-200 hover:border-brand-300',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">
                    {TOPIC_LABELS[entry.topic]}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-ink-700 tabular-nums">
                    {entry.total}問
                  </span>
                  {weak ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                      苦手
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs leading-relaxed text-ink-700">
                  {TOPIC_DESCRIPTIONS[entry.topic]}
                </p>

                {loaded && entry.answered > 0 ? (
                  <p className="mt-1.5 text-xs text-ink-500 tabular-nums">
                    {entry.answered}問 解答 ・ 正答率 {entry.rate}%
                  </p>
                ) : null}
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
