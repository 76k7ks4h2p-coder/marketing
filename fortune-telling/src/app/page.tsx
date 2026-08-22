'use client'

import { useState } from 'react'

import { calculateFourPillars, type FourPillarsResult } from '@/lib/fourPillars'
import { buildFortuneReading, type FortuneReading } from '@/lib/fortuneText'

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '時柱'] as const

function parseBirthDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function parseBirthTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  return Number(match[1])
}

export default function Home() {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [birthPlace, setBirthPlace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FourPillarsResult | null>(null)
  const [reading, setReading] = useState<FortuneReading | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const date = parseBirthDate(birthDate)
    if (!date) {
      setError('生年月日を入力してください。')
      return
    }
    const hour = timeUnknown ? null : parseBirthTime(birthTime)
    if (!timeUnknown && hour === null) {
      setError('出生時刻を入力するか、「時刻がわからない」を選んでください。')
      return
    }

    const calculated = calculateFourPillars({
      ...date,
      hour,
      birthPlace: birthPlace.trim(),
    })
    setResult(calculated)
    setReading(buildFortuneReading(calculated))
  }

  const pillars = result ? [result.year, result.month, result.day, result.hour] : null

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="text-center">
        <p className="text-brand-600 text-sm font-semibold tracking-wide">四柱推命(簡易版)</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">生まれ星占い</h1>
        <p className="mt-2 text-sm text-ink-500">
          生年月日・出生地・出生時刻から、あなたの性格と運気のヒントを占います。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="birthDate" className="text-sm font-medium text-ink-700">
            生年月日
          </label>
          <input
            id="birthDate"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2.5 text-base text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="birthTime" className="text-sm font-medium text-ink-700">
              出生時刻
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              わからない
            </label>
          </div>
          <input
            id="birthTime"
            type="time"
            disabled={timeUnknown}
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2.5 text-base text-ink-900 focus:border-brand-500 focus:outline-none disabled:bg-surface-muted disabled:text-ink-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="birthPlace" className="text-sm font-medium text-ink-700">
            出生地
          </label>
          <input
            id="birthPlace"
            type="text"
            placeholder="例: 広島県福山市"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2.5 text-base text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
        >
          占う
        </button>
      </form>

      {result && reading && pillars && (
        <section className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-sm">
          <div className="grid grid-cols-4 gap-2 text-center">
            {pillars.map((p, i) => (
              <div key={PILLAR_LABELS[i]} className="rounded-lg bg-surface-muted p-2">
                <p className="text-xs text-ink-500">{PILLAR_LABELS[i]}</p>
                <p className="mt-1 text-lg font-bold text-brand-700">{p ? p.label : '不明'}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-brand-600">あなたの日主(本質)</p>
            <h2 className="mt-1 text-lg font-bold text-ink-900">{reading.dayMasterTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-700">{reading.dayMasterBody}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-brand-600">五行バランス</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(Object.entries(result.elementCounts) as [string, number][]).map(
                ([element, count]) => (
                  <span
                    key={element}
                    className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
                  >
                    {element} × {count}
                  </span>
                ),
              )}
            </div>
            <p className="mt-2 text-sm text-ink-700">
              いちばん強いのは「{reading.strongestElement}」、控えめなのは「{reading.weakestElement}
              」の気です。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-brand-600">今のあなたへのアドバイス</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-700">{reading.advice}</p>
          </div>

          <div className="rounded-lg bg-surface-muted p-3 text-sm text-ink-700">
            <p>
              ラッキー方位: <span className="font-semibold text-brand-700">{reading.luckyDirection}</span>
            </p>
            <p className="mt-1">
              ラッキーアイテム: <span className="font-semibold text-brand-700">{reading.luckyItem}</span>
            </p>
          </div>

          <p className="text-xs leading-relaxed text-ink-500">
            ※ この結果は簡易的な計算によるエンタメ目的の占いです。節入り(月の切り替わり)や真太陽時の補正は行っていないため、実際の四柱推命の鑑定結果と異なる場合があります。
          </p>
        </section>
      )}
    </main>
  )
}
