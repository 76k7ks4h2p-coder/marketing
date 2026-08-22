import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as HistoryModule from './history'

function createMemoryLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
}

const sampleInput = { year: 1990, month: 6, day: 15, hour: 14, birthPlace: '広島県福山市' }

// history.ts はモジュール内にキャッシュを持つため、テストごとに resetModules で
// クリーンな状態から読み込み直す。
async function freshHistoryModule(): Promise<typeof HistoryModule> {
  vi.resetModules()
  return import('./history')
}

describe('history (localStorage)', () => {
  beforeEach(() => {
    // @ts-expect-error テスト用に window をブラウザ相当にモックする
    globalThis.window = { localStorage: createMemoryLocalStorage() }
  })

  afterEach(() => {
    // @ts-expect-error テスト後にモックを外す(Node環境に戻す)
    delete globalThis.window
  })

  it('保存した内容が履歴として読み出せる', async () => {
    const { saveToHistory, getHistorySnapshot } = await freshHistoryModule()
    saveToHistory(sampleInput)
    const history = getHistorySnapshot()
    expect(history).toHaveLength(1)
    expect(history[0].input).toEqual(sampleInput)
  })

  it('新しい順に並ぶ', async () => {
    const { saveToHistory, getHistorySnapshot } = await freshHistoryModule()
    saveToHistory({ ...sampleInput, year: 1990 })
    saveToHistory({ ...sampleInput, year: 2000 })
    const history = getHistorySnapshot()
    expect(history[0].input.year).toBe(2000)
    expect(history[1].input.year).toBe(1990)
  })

  it('削除すると履歴から消える', async () => {
    const { saveToHistory, deleteFromHistory, getHistorySnapshot } = await freshHistoryModule()
    const saved = saveToHistory(sampleInput)
    deleteFromHistory(saved.id)
    expect(getHistorySnapshot()).toHaveLength(0)
  })

  it('20件を超えると古いものから消える', async () => {
    const { saveToHistory, getHistorySnapshot } = await freshHistoryModule()
    for (let i = 0; i < 25; i++) {
      saveToHistory({ ...sampleInput, year: 1980 + i })
    }
    const history = getHistorySnapshot()
    expect(history).toHaveLength(20)
    expect(history[0].input.year).toBe(2004)
  })

  it('保存・削除のたびに購読しているリスナーへ通知する', async () => {
    const { saveToHistory, deleteFromHistory, subscribeHistory } = await freshHistoryModule()
    const listener = vi.fn()
    const unsubscribe = subscribeHistory(listener)

    const saved = saveToHistory(sampleInput)
    expect(listener).toHaveBeenCalledTimes(1)

    deleteFromHistory(saved.id)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    saveToHistory(sampleInput)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('サーバースナップショットは常に空配列', async () => {
    const { getHistoryServerSnapshot } = await freshHistoryModule()
    expect(getHistoryServerSnapshot()).toEqual([])
  })
})
