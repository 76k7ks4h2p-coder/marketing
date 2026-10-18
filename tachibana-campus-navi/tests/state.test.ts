import { describe, expect, it } from 'vitest'
import {
  FAVORITES_KEY,
  isHistoryEntry,
  isSelection,
  pushHistory,
  toggleFavorite,
  type Selection,
} from '../src/state/saved.ts'
import { createListStore, type KeyValueStorage } from '../src/state/storage.ts'
import { parseUrlState, searchForSelection, shareUrlFor } from '../src/state/urlState.ts'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

const h301: Selection = { kind: 'room', id: 'H301' }
const j804: Selection = { kind: 'room', id: 'J804' }

describe('お気に入り・履歴の操作', () => {
  it('お気に入りの追加と解除', () => {
    const added = toggleFavorite([], h301)
    expect(added).toEqual([h301])
    expect(toggleFavorite(added, h301)).toEqual([])
    expect(toggleFavorite(added, j804)).toEqual([j804, h301])
  })

  it('履歴は新しい順・重複なし・上限つき', () => {
    let list = pushHistory([], h301, 1)
    list = pushHistory(list, j804, 2)
    list = pushHistory(list, h301, 3)
    expect(list.map((h) => h.id)).toEqual(['H301', 'J804'])
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: 'room' as const, id: `X${i}` }))
    const capped = many.reduce((acc, s, i) => pushHistory(acc, s, i, 20), list)
    expect(capped).toHaveLength(20)
  })
})

describe('端末内ストア', () => {
  it('保存した内容を読み直せる（再読み込みの再現）', () => {
    const storage = memoryStorage()
    const a = createListStore(FAVORITES_KEY, isSelection, 10, storage)
    a.set([h301])
    const b = createListStore(FAVORITES_KEY, isSelection, 10, storage)
    expect(b.getSnapshot()).toEqual([h301])
    expect(b.persistent).toBe(true)
  })

  it('壊れた値や不正な要素は捨てる', () => {
    const storage = memoryStorage({
      broken: '{not json',
      mixed: JSON.stringify([h301, { kind: 'x', id: 'y' }, 'z', { kind: 'room' }]),
    })
    expect(createListStore('broken', isSelection, 10, storage).getSnapshot()).toEqual([])
    expect(createListStore('mixed', isSelection, 10, storage).getSnapshot()).toEqual([h301])
    expect(isHistoryEntry({ kind: 'room', id: 'H301' })).toBe(false)
  })

  it('保存に失敗してもメモリ上で動き続け、保存できないことを示す', () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    const store = createListStore(FAVORITES_KEY, isSelection, 10, storage)
    store.set([h301])
    expect(store.getSnapshot()).toEqual([h301])
    expect(store.persistent).toBe(false)
  })

  it('ストレージがない環境でも使える', () => {
    const store = createListStore(FAVORITES_KEY, isSelection, 10, null)
    store.set([j804])
    expect(store.getSnapshot()).toEqual([j804])
    expect(store.persistent).toBe(false)
  })

  it('変更を購読者に通知する', () => {
    const store = createListStore(FAVORITES_KEY, isSelection, 10, memoryStorage())
    let calls = 0
    const unsubscribe = store.subscribe(() => calls++)
    store.set([h301])
    unsubscribe()
    store.set([])
    expect(calls).toBe(1)
  })
})

describe('共有 URL', () => {
  it('教室・建物・施設を URL にし、読み戻せる', () => {
    expect(searchForSelection(h301)).toBe('?room=H301')
    expect(parseUrlState('?room=H301').selection).toEqual(h301)
    expect(parseUrlState('?building=academic-terrace').selection).toEqual({
      kind: 'building',
      id: 'academic-terrace',
    })
    expect(parseUrlState('?facility=main-gate').selection).toEqual({
      kind: 'facility',
      id: 'main-gate',
    })
    expect(shareUrlFor(j804, { origin: 'https://example.com', pathname: '/navi/' })).toBe(
      'https://example.com/navi/?room=J804',
    )
  })

  it('URL の教室番号の表記揺れも正規化する', () => {
    expect(parseUrlState('?room=h-301').selection).toEqual(h301)
    expect(parseUrlState(`?room=${encodeURIComponent('Ｊ８０４')}`).selection).toEqual(j804)
  })

  it('検索語（q）も読み取る', () => {
    expect(parseUrlState('?q=H3')).toEqual({ selection: null, query: 'H3' })
  })
})
