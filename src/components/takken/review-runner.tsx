'use client'

import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { selectReview } from '@/lib/takken/select'
import type { Question } from '@/lib/takken/types'

import { QuizRunner } from './quiz-runner'
import { useProgress } from './use-progress'

/**
 * 復習セット。
 *
 * どの問題を出すかは localStorage の履歴から決まるので、この画面は
 * クライアント側で組み立てる。
 *
 * 開始時に出題を確定させて state に持たせているのは、解答するたびに
 * 履歴が更新されるため。毎回履歴から作り直すと、正解した問題が
 * 解いている最中にリストから消えてしまう。
 */
export function ReviewRunner() {
  const { progress, loaded } = useProgress()
  const [session, setSession] = useState<readonly Question[] | null>(null)

  if (session) {
    return (
      <QuizRunner
        questions={session}
        title="復習"
        eyebrow={`間違えた問題・チェックした問題 ${session.length}問（定着していない順）`}
        immediateFeedback
        backHref="/takken"
        backLabel="ホームに戻る"
      />
    )
  }

  if (!loaded) {
    return (
      <div aria-busy="true" className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const pending = selectReview(progress)

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-emerald-500" aria-hidden />
        <h1 className="mt-3 text-base font-semibold text-ink-900">復習する問題はありません</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
          間違えた問題と「後で見直す」にチェックした問題が、ここにたまります。
          まずは年度別演習か分野別演習から解いてみてください。
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/takken/years">年度別演習へ</ButtonLink>
          <ButtonLink href="/takken/topics" variant="secondary">
            分野別演習へ
          </ButtonLink>
        </div>
      </div>
    )
  }

  const wrong = pending.filter((question) => {
    const entry = progress.questions[question.id]
    return entry && entry.attempts > 0 && !entry.lastCorrect
  }).length
  const flaggedOnly = pending.length - wrong

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">復習</h1>
        <p className="text-sm text-ink-700">
          間違えた問題とチェックを付けた問題を、定着していない順にまとめて解き直します。
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <RotateCcw className="size-6 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-2xl font-bold text-ink-900 tabular-nums">
                {pending.length}
                <span className="ml-1 text-sm font-medium text-ink-500">問</span>
              </p>
              <p className="mt-1 text-sm text-ink-700">
                直近で間違えた問題 {wrong}問
                {flaggedOnly > 0 ? ` ・ チェックのみ ${flaggedOnly}問` : ''}
              </p>
            </div>

            <p className="text-xs leading-relaxed text-ink-500">
              間違えた回数が多い問題から順に出題します。正解できた問題は次回から外れます。
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => setSession(pending)}>復習を始める</Button>
              <ButtonLink href="/takken/stats" variant="secondary">
                成績を見る
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
