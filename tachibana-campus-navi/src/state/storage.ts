/**
 * 端末内保存（localStorage）の安全なラッパー。
 * プライベートブラウズやストレージ無効の環境では例外になるため、失敗しても画面は動かし続ける。
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function getDeviceStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage
    const probe = '__tcn_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export interface ListStore<T> {
  getSnapshot(): readonly T[]
  subscribe(listener: () => void): () => void
  set(next: readonly T[]): void
  /** 端末に保存できているか（false ならページを閉じると消える） */
  readonly persistent: boolean
}

/**
 * 端末内に保存される配列ストア。useSyncExternalStore から購読する。
 * 壊れた値や想定外の要素は読み込み時に捨てる。
 */
export function createListStore<T>(
  key: string,
  isItem: (value: unknown) => value is T,
  max: number,
  storage: KeyValueStorage | null = getDeviceStorage(),
): ListStore<T> {
  const read = (): readonly T[] => {
    if (!storage) return []
    try {
      const raw = storage.getItem(key)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(isItem).slice(0, max) : []
    } catch {
      return []
    }
  }

  let snapshot = read()
  let persistent = storage !== null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return
    snapshot = read()
    notify()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (listeners.size === 0 && typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage)
        }
      }
    },
    set(next) {
      snapshot = next.slice(0, max)
      if (storage) {
        try {
          storage.setItem(key, JSON.stringify(snapshot))
        } catch {
          // 容量不足など。メモリ上では動かし続ける
          persistent = false
        }
      }
      notify()
    },
    get persistent() {
      return persistent
    },
  }
}
