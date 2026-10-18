import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { loadCampusData, type LoadedCampusData } from '../data/loadCampusData.ts'
import type { ListStore } from '../state/storage.ts'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useListStore<T>(store: ListStore<T>): readonly T[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export type CampusDataState =
  | { status: 'loading' }
  | ({ status: 'ready' } & LoadedCampusData)
  | { status: 'error'; message: string }

export function useCampusData(): { state: CampusDataState; retry: () => void } {
  const [state, setState] = useState<CampusDataState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadCampusData(import.meta.env.BASE_URL)
      .then((loaded) => {
        if (!cancelled) setState({ status: 'ready', ...loaded })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'データを読み込めませんでした。',
        })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
