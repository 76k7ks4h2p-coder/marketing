'use client'

import { Check, ChevronLeft, ChevronRight, Flag, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import {
  ASSESSMENT_LABELS,
  ASSESSMENT_MESSAGES,
  assess,
  gradeSession,
  isCorrect,
} from '@/lib/takken/grading'
import type { AnswerRecord, Question } from '@/lib/takken/types'

import { Explanation, QuestionMeta } from './question-detail'
import { useProgress } from './use-progress'

type Props = {
  questions: readonly Question[]
  title: string
  /** 見出しの上に出す小さなラベル。 */
  eyebrow?: string
  /**
   * true なら 1 問ごとに正誤と解説を出す（年度別・分野別・復習）。
   * false なら最後にまとめて採点する（模試）。
   */
  immediateFeedback: boolean
  /** 制限時間（秒）。null なら無制限。 */
  timeLimitSeconds?: number | null
  backHref: string
  backLabel: string
}

export function QuizRunner({
  questions,
  title,
  eyebrow,
  immediateFeedback,
  timeLimitSeconds = null,
  backHref,
  backLabel,
}: Props) {
  const { progress, recordAnswer, recordAnswers, toggleFlag } = useProgress()

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(timeLimitSeconds)

  const question = questions[index]
  const total = questions.length
  const answeredCount = Object.keys(answers).length

  const scrollAnchor = useRef<HTMLDivElement>(null)

  const finish = useCallback(() => {
    setFinished(true)
    // まとめ採点のモードでは、ここで初めて履歴に反映する
    if (!immediateFeedback) {
      recordAnswers(Object.values(answers))
    }
  }, [answers, immediateFeedback, recordAnswers])

  // 採点処理は answers に依存して毎回作り直されるので、
  // タイマーからは常に最新版を参照できるよう ref 経由で呼ぶ。
  // こうしないと解答するたびにカウントダウンのタイマーが張り直される。
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  // 制限時間のカウントダウン。0 になった時点でその場で採点する。
  useEffect(() => {
    if (finished || remaining === null || remaining <= 0) return

    const timer = window.setTimeout(() => {
      const next = remaining - 1
      setRemaining(next)
      if (next <= 0) finishRef.current()
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [finished, remaining])

  const select = useCallback(
    (number: 1 | 2 | 3 | 4) => {
      if (!question) return
      // 解説を出した後に選び直せてしまうと正答率が意味を失うので固定する
      if (immediateFeedback && revealed) return

      const record: AnswerRecord = {
        questionId: question.id,
        selected: number,
        correct: isCorrect(question, number),
        answeredAt: Date.now(),
      }

      setAnswers((current) => ({ ...current, [question.id]: record }))

      if (immediateFeedback) {
        setRevealed(true)
        recordAnswer(record)
      }
    },
    [immediateFeedback, question, recordAnswer, revealed],
  )

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return
      setIndex(next)
      setRevealed(false)
      scrollAnchor.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    [total],
  )

  // 数字キーで選択、矢印キーで移動できるようにする
  useEffect(() => {
    if (finished) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        select(Number(event.key) as 1 | 2 | 3 | 4)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(index + 1)
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(index - 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finished, goTo, index, select])

  const result = useMemo(() => gradeSession(questions, answers), [questions, answers])

  const restart = useCallback(() => {
    setIndex(0)
    setAnswers({})
    setRevealed(false)
    setFinished(false)
    setRemaining(timeLimitSeconds)
  }, [timeLimitSeconds])

  if (total === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-ink-700">出題できる問題がありません。</p>
        <ButtonLink href={backHref} variant="secondary" className="mt-4">
          {backLabel}
        </ButtonLink>
      </div>
    )
  }

  if (finished) {
    return (
      <ResultView
        questions={questions}
        answers={answers}
        result={result}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        onRestart={restart}
      />
    )
  }

  if (!question) return null

  const currentAnswer = answers[question.id]
  const flagged = progress.questions[question.id]?.flagged ?? false
  const isLast = index === total - 1

  return (
    <div className="space-y-4">
      <div ref={scrollAnchor} className="scroll-mt-4" />

      <div className="space-y-2">
        {eyebrow ? <p className="text-sm text-ink-500">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-ink-900 sm:text-xl">{title}</h1>
          <div className="flex items-center gap-3 text-sm text-ink-500">
            {remaining !== null ? <Timer remaining={remaining} /> : null}
            <span className="tabular-nums">
              {index + 1} / {total} 問
            </span>
          </div>
        </div>
        <ProgressBar current={index + 1} total={total} />
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <QuestionMeta question={question} />
          <button
            type="button"
            onClick={() => toggleFlag(question.id)}
            aria-pressed={flagged}
            className={cn(
              'flex min-h-9 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors',
              flagged
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-50',
            )}
          >
            <Flag className="size-3.5" aria-hidden />
            {flagged ? 'チェック済み' : '後で見直す'}
          </button>
        </div>

        <h2 className="mt-3 text-base leading-relaxed font-medium text-ink-900">
          {question.prompt}
        </h2>

        <ul className="mt-4 space-y-2">
          {question.choices.map((choice) => {
            const chosen = currentAnswer?.selected === choice.number
            const showResult = immediateFeedback && revealed
            const isAnswer = choice.number === question.answer

            return (
              <li key={choice.number}>
                <button
                  type="button"
                  onClick={() => select(choice.number)}
                  disabled={showResult}
                  aria-pressed={chosen}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    showResult && isAnswer && 'border-emerald-400 bg-emerald-50',
                    showResult && chosen && !isAnswer && 'border-red-400 bg-red-50',
                    showResult && !isAnswer && !chosen && 'border-slate-200 bg-white opacity-70',
                    !showResult &&
                      (chosen
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'),
                    showResult ? 'cursor-default' : 'cursor-pointer',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      showResult && isAnswer && 'bg-emerald-600 text-white',
                      showResult && chosen && !isAnswer && 'bg-red-600 text-white',
                      showResult && !isAnswer && !chosen && 'bg-slate-200 text-ink-700',
                      !showResult &&
                        (chosen ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-700'),
                    )}
                  >
                    {showResult && isAnswer ? (
                      <Check className="size-4" aria-hidden />
                    ) : showResult && chosen && !isAnswer ? (
                      <X className="size-4" aria-hidden />
                    ) : (
                      choice.number
                    )}
                  </span>
                  <span className="min-w-0 text-sm leading-relaxed text-ink-900">
                    {choice.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {immediateFeedback && revealed ? (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            <VerdictBanner correct={currentAnswer?.correct ?? false} answer={question.answer} />
            <Explanation question={question} selected={currentAnswer?.selected ?? null} />
          </div>
        ) : null}
      </article>

      <nav className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="gap-1"
        >
          <ChevronLeft className="size-4" aria-hidden />
          前へ
        </Button>

        {isLast ? (
          <Button onClick={finish} disabled={immediateFeedback && !revealed}>
            {immediateFeedback ? '結果を見る' : '採点する'}
          </Button>
        ) : (
          <Button
            onClick={() => goTo(index + 1)}
            disabled={immediateFeedback && !revealed}
            className="gap-1"
          >
            次へ
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        )}
      </nav>

      {!immediateFeedback ? (
        <QuestionPalette
          questions={questions}
          answers={answers}
          current={index}
          onSelect={goTo}
          answeredCount={answeredCount}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Link href={backHref} className="text-sm text-brand-700 underline underline-offset-2">
          {backLabel}
        </Link>
        <p className="text-xs text-ink-500">キーボードの 1〜4 で選択、← → で移動できます</p>
      </div>
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label="進捗"
    >
      <div className="h-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

function Timer({ remaining }: { remaining: number }) {
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const urgent = remaining <= 60

  return (
    <span
      className={cn('font-medium tabular-nums', urgent ? 'text-red-600' : 'text-ink-700')}
      aria-live={urgent ? 'polite' : 'off'}
    >
      残り {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

function VerdictBanner({ correct, answer }: { correct: boolean; answer: number }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
        correct ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900',
      )}
    >
      {correct ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
      {correct ? '正解' : `不正解（正解は ${answer}）`}
    </div>
  )
}

/** 模試モードで、どの問題を解いたか一覧して飛べるようにする。 */
function QuestionPalette({
  questions,
  answers,
  current,
  onSelect,
  answeredCount,
}: {
  questions: readonly Question[]
  answers: Record<string, AnswerRecord>
  current: number
  onSelect: (index: number) => void
  answeredCount: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs text-ink-500">
        解答済み {answeredCount} / {questions.length} 問
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {questions.map((question, position) => {
          const answered = Boolean(answers[question.id])

          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onSelect(position)}
                aria-current={position === current ? 'true' : undefined}
                aria-label={`${position + 1}問目${answered ? '（解答済み）' : ''}`}
                className={cn(
                  'size-9 rounded-lg border text-sm font-medium tabular-nums transition-colors',
                  position === current
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : answered
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-50',
                )}
              >
                {position + 1}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ResultView({
  questions,
  answers,
  result,
  title,
  backHref,
  backLabel,
  onRestart,
}: {
  questions: readonly Question[]
  answers: Record<string, AnswerRecord>
  result: ReturnType<typeof gradeSession>
  title: string
  backHref: string
  backLabel: string
  onRestart: () => void
}) {
  const assessment = assess(result.rate)

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-center">
        <p className="text-sm text-ink-500">{title}の結果</p>
        <p className="mt-2 text-4xl font-bold text-ink-900 tabular-nums">
          {result.correct}
          <span className="text-xl text-ink-500"> / {result.total} 問</span>
        </p>
        <p className="mt-1 text-lg font-semibold text-brand-700 tabular-nums">
          正答率 {result.rate}%
        </p>

        <p
          className={cn(
            'mx-auto mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold',
            assessment === 'good' && 'bg-emerald-100 text-emerald-900',
            assessment === 'fair' && 'bg-amber-100 text-amber-900',
            assessment === 'poor' && 'bg-red-100 text-red-900',
          )}
        >
          {ASSESSMENT_LABELS[assessment]}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          {ASSESSMENT_MESSAGES[assessment]}
        </p>

        {result.unanswered > 0 ? (
          <p className="mt-2 text-sm text-ink-500">未解答が {result.unanswered} 問ありました。</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart} variant="secondary" className="gap-1">
            <RotateCcw className="size-4" aria-hidden />
            もう一度解く
          </Button>
          {result.missed.length > 0 ? (
            <ButtonLink href="/takken/review">間違えた問題を復習する</ButtonLink>
          ) : null}
          <ButtonLink href={backHref} variant="secondary">
            {backLabel}
          </ButtonLink>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-900">解説（{questions.length}問）</h2>
        {questions.map((question, position) => {
          const answer = answers[question.id]
          const correct = answer?.correct ?? false

          return (
            <article
              key={question.id}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <QuestionMeta question={question} />
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-semibold',
                    correct ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900',
                  )}
                >
                  {correct ? '正解' : answer ? '不正解' : '未解答'}
                </span>
              </div>

              <h3 className="mt-2 text-sm leading-relaxed font-medium text-ink-900">
                <span className="text-ink-500">{position + 1}. </span>
                {question.prompt}
              </h3>

              <div className="mt-4">
                <Explanation question={question} selected={answer?.selected ?? null} />
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
