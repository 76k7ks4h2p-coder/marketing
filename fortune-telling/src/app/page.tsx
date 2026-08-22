'use client'

import { useState, useSyncExternalStore } from 'react'
import { Clock3, History, MapPin, Moon, Sparkles, Trash2 } from 'lucide-react'

import { calculateFourPillars, type Element, type FourPillarsResult } from '@/lib/fourPillars'
import { buildFortuneReading, type FortuneReading } from '@/lib/fortuneText'
import {
  deleteFromHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  saveToHistory,
  subscribeHistory,
  type SavedReading,
} from '@/lib/history'

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '時柱'] as const

const ELEMENT_STYLES: Record<Element, string> = {
  木: 'bg-emerald-900/40 text-emerald-200 ring-1 ring-emerald-400/30',
  火: 'bg-rose-900/40 text-rose-200 ring-1 ring-rose-400/30',
  土: 'bg-amber-900/40 text-amber-200 ring-1 ring-amber-400/30',
  金: 'bg-slate-700/40 text-slate-200 ring-1 ring-slate-300/30',
  水: 'bg-sky-900/40 text-sky-200 ring-1 ring-sky-400/30',
}

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

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatBirthLabel(input: SavedReading['input']): string {
  const timePart = input.hour === null ? '' : ` ${String(input.hour).padStart(2, '0')}時`
  const placePart = input.birthPlace ? ` / ${input.birthPlace}` : ''
  return `${input.year}/${input.month}/${input.day}${timePart}${placePart}`
}

export default function Home() {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [birthPlace, setBirthPlace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FourPillarsResult | null>(null)
  const [reading, setReading] = useState<FortuneReading | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  )

  function runFortune(input: { year: number; month: number; day: number; hour: number | null; birthPlace: string }) {
    const calculated = calculateFourPillars(input)
    setResult(calculated)
    setReading(buildFortuneReading(calculated))
    saveToHistory(input)
    setJustSaved(true)
    window.setTimeout(() => setJustSaved(false), 2500)
  }

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

    runFortune({ ...date, hour, birthPlace: birthPlace.trim() })
  }

  function handleReplay(entry: SavedReading) {
    const { input } = entry
    setBirthDate(`${String(input.year).padStart(4, '0')}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`)
    setTimeUnknown(input.hour === null)
    setBirthTime(input.hour === null ? '' : `${String(input.hour).padStart(2, '0')}:00`)
    setBirthPlace(input.birthPlace)
    const calculated = calculateFourPillars(input)
    setResult(calculated)
    setReading(buildFortuneReading(calculated))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(id: string) {
    deleteFromHistory(id)
  }

  const pillars = result ? [result.year, result.month, result.day, result.hour] : null

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="relative text-center">
        <Sparkles className="twinkle absolute -top-2 left-6 h-4 w-4 text-gold-300" />
        <Sparkles className="twinkle twinkle-delay absolute top-1 right-8 h-3 w-3 text-mystic-300" />
        <div className="mb-2 flex items-center justify-center gap-2 text-mystic-300">
          <Moon className="h-5 w-5" />
          <p className="text-sm font-semibold tracking-widest">四柱推命(簡易版)</p>
        </div>
        <h1 className="font-display glow-text text-3xl font-bold text-gold-300">生まれ星占い</h1>
        <p className="mt-2 text-sm text-night-300">
          生年月日・出生地・出生時刻から、あなたの性格と運気のヒントを占います。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card-mystic flex flex-col gap-5 rounded-2xl p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="birthDate" className="text-sm font-medium text-night-100">
            生年月日
          </label>
          <input
            id="birthDate"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-lg border border-mystic-700 bg-night-900/60 px-3 py-2.5 text-base text-night-100 focus:border-gold-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="birthTime" className="text-sm font-medium text-night-100">
              出生時刻
            </label>
            <label className="flex items-center gap-1.5 text-xs text-night-300">
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
            className="rounded-lg border border-mystic-700 bg-night-900/60 px-3 py-2.5 text-base text-night-100 focus:border-gold-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="birthPlace" className="text-sm font-medium text-night-100">
            出生地
          </label>
          <input
            id="birthPlace"
            type="text"
            placeholder="例: 広島県福山市"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            className="rounded-lg border border-mystic-700 bg-night-900/60 px-3 py-2.5 text-base text-night-100 placeholder:text-night-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-mystic-600 to-gold-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-mystic-900/40 transition hover:brightness-110"
        >
          占う
        </button>
      </form>

      {result && reading && pillars && (
        <section className="card-mystic flex flex-col gap-5 rounded-2xl p-5">
          {justSaved && (
            <p className="text-xs text-gold-300">✧ 占い結果を履歴に保存しました</p>
          )}
          <div className="grid grid-cols-4 gap-2 text-center">
            {pillars.map((p, i) => (
              <div
                key={PILLAR_LABELS[i]}
                className="rounded-lg border border-mystic-700/60 bg-night-900/50 p-2"
              >
                <p className="text-xs text-night-300">{PILLAR_LABELS[i]}</p>
                <p className="font-display mt-1 text-lg font-bold text-gold-300">
                  {p ? p.label : '不明'}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-mystic-300">あなたの日主(本質)</p>
            <h2 className="font-display mt-1 text-lg font-bold text-night-100">
              {reading.dayMasterTitle}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-night-300">{reading.dayMasterBody}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-mystic-300">五行バランス</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(Object.entries(result.elementCounts) as [Element, number][]).map(
                ([element, count]) => (
                  <span
                    key={element}
                    className={`rounded-full px-3 py-1 text-sm ${ELEMENT_STYLES[element]}`}
                  >
                    {element} × {count}
                  </span>
                ),
              )}
            </div>
            <p className="mt-2 text-sm text-night-300">
              いちばん強いのは「{reading.strongestElement}」、控えめなのは「{reading.weakestElement}
              」の気です。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-mystic-300">今のあなたへのアドバイス</p>
            <p className="mt-1 text-sm leading-relaxed text-night-300">{reading.advice}</p>
          </div>

          <div className="rounded-lg border border-gold-600/30 bg-night-900/50 p-3 text-sm text-night-100">
            <p>
              ラッキー方位: <span className="font-semibold text-gold-300">{reading.luckyDirection}</span>
            </p>
            <p className="mt-1">
              ラッキーアイテム: <span className="font-semibold text-gold-300">{reading.luckyItem}</span>
            </p>
          </div>

          <p className="text-xs leading-relaxed text-night-500">
            ※ この結果は簡易的な計算によるエンタメ目的の占いです。節入り(月の切り替わり)や真太陽時の補正は行っていないため、実際の四柱推命の鑑定結果と異なる場合があります。
          </p>
        </section>
      )}

      <section className="card-mystic flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-mystic-300">
          <History className="h-4 w-4" />
          <p className="text-xs font-semibold">占い履歴(この端末のブラウザに保存)</p>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-night-500">まだ占い履歴がありません。占うと自動で保存されます。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-mystic-700/50 bg-night-900/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => handleReplay(entry)}
                  className="flex flex-1 flex-col items-start text-left"
                >
                  <span className="flex items-center gap-1 text-sm text-night-100">
                    <Clock3 className="h-3.5 w-3.5 text-night-500" />
                    {formatSavedAt(entry.savedAt)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-night-400">
                    <MapPin className="h-3 w-3 text-night-500" />
                    {formatBirthLabel(entry.input)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="この履歴を削除"
                  className="rounded p-1.5 text-night-500 transition hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
