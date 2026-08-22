import { ClipboardCheck } from 'lucide-react'
import type { Metadata } from 'next'

import { QuizRunner } from '@/components/takken/quiz-runner'
import { ButtonLink } from '@/components/ui/button'
import { MOCK_QUESTION_COUNT, MOCK_TIME_LIMIT_SECONDS } from '@/lib/takken/meta'
import { TOTAL_QUESTION_COUNT } from '@/lib/takken/questions'
import { selectRandom } from '@/lib/takken/select'

export const metadata: Metadata = {
  title: '模試モード',
  description: `全${TOTAL_QUESTION_COUNT}問からランダムに${MOCK_QUESTION_COUNT}問を出題し、制限時間つきで採点します。`,
}

const MINUTES = MOCK_TIME_LIMIT_SECONDS / 60

/**
 * 出題する問題は seed から決める。
 *
 * クライアント側で乱数を引くと描画がサーバーと食い違うので、
 * seed を URL に持たせてサーバー側で選び、必要な問題だけを送る。
 * こうすると「もう一度別の問題で」も URL を変えるだけで済む。
 */
function parseSeed(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null
  const seed = Number.parseInt(value, 10)
  if (!Number.isFinite(seed) || seed <= 0) return null
  return seed
}

function newSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1
}

export default async function MockPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string | string[] }>
}) {
  const { seed: rawSeed } = await searchParams
  const seed = parseSeed(rawSeed)

  if (seed === null) {
    return <MockStart />
  }

  const questions = selectRandom(MOCK_QUESTION_COUNT, seed)

  return (
    <QuizRunner
      questions={questions}
      title="模試"
      eyebrow={`ランダム${questions.length}問 ・ 制限時間${MINUTES}分`}
      immediateFeedback={false}
      timeLimitSeconds={MOCK_TIME_LIMIT_SECONDS}
      backHref="/takken/mock"
      backLabel="模試のトップに戻る"
    />
  )
}

function MockStart() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">模試モード</h1>
        <p className="text-sm text-ink-700">
          全{TOTAL_QUESTION_COUNT}問からランダムに{MOCK_QUESTION_COUNT}問を出題します。
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="size-6 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">本番に近い形で解く</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-700">
                本試験の権利関係は14問を約30分で処理する必要があります。ここでは民法{' '}
                {MOCK_QUESTION_COUNT}問を{MINUTES}分で解き、時間配分の感覚をつかみます。
              </p>
            </div>

            <ul className="space-y-1.5 text-sm text-ink-700">
              <li className="flex gap-2">
                <span aria-hidden className="text-brand-600">
                  ・
                </span>
                解答中は正誤も解説も表示されません。採点は最後にまとめて行います。
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-brand-600">
                  ・
                </span>
                問題番号のパネルから、飛ばした問題に戻れます。
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-brand-600">
                  ・
                </span>
                制限時間が切れると、その時点の解答で自動的に採点されます。
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              <ButtonLink href={`/takken/mock?seed=${newSeed()}`}>模試を始める</ButtonLink>
              <ButtonLink href="/takken" variant="secondary">
                ホームに戻る
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
