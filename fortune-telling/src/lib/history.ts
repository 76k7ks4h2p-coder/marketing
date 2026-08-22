import type { FourPillarsInput } from './fourPillars'

const STORAGE_KEY = 'fortune-telling:history'
const MAX_ENTRIES = 20

export interface SavedReading {
  id: string
  savedAt: string // ISO文字列
  input: FourPillarsInput
}

type Listener = () => void

const listeners = new Set<Listener>()
let cache: SavedReading[] = []
let cacheLoaded = false

function notify(): void {
  for (const listener of listeners) listener()
}

function readRaw(): SavedReading[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    // プライベートブラウジングでのアクセス拒否や、壊れたJSONを保存済みの場合に備える
    return []
  }
}

function writeRaw(entries: SavedReading[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ストレージ容量超過などは無視する(保存できなくても占い自体は継続できる)
  }
}

function ensureLoaded(): void {
  if (cacheLoaded) return
  cache = readRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  cacheLoaded = true
}

/** useSyncExternalStore 用の subscribe 関数。 */
export function subscribeHistory(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** useSyncExternalStore 用のクライアント側スナップショット。 */
export function getHistorySnapshot(): SavedReading[] {
  ensureLoaded()
  return cache
}

// useSyncExternalStore は getServerSnapshot が毎回同じ参照を返すことを要求するため、
// 空配列を使い回す(呼び出しのたびに新しい配列を作ると無限ループ警告になる)。
const EMPTY_HISTORY: SavedReading[] = []

/** useSyncExternalStore 用のサーバー側スナップショット(SSR時は常に空)。 */
export function getHistoryServerSnapshot(): SavedReading[] {
  return EMPTY_HISTORY
}

export function saveToHistory(input: FourPillarsInput): SavedReading {
  ensureLoaded()
  const entry: SavedReading = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    input,
  }
  cache = [entry, ...cache].slice(0, MAX_ENTRIES)
  writeRaw(cache)
  notify()
  return entry
}

export function deleteFromHistory(id: string): void {
  ensureLoaded()
  cache = cache.filter((entry) => entry.id !== id)
  writeRaw(cache)
  notify()
}
