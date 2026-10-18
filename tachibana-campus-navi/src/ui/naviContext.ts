import { createContext, useContext } from 'react'
import type { CampusIndex } from '../domain/campusIndex.ts'
import type { HistoryEntry, Selection } from '../state/saved.ts'

export interface NaviActions {
  /** 教室・建物・施設を選んで詳細を開く（建物は最初に開く階を指定できる） */
  select(sel: Selection, options?: { floor?: number }): void
  /** 地図（建物一覧）でその建物を表示する */
  showOnMap(sel: Selection): void
  /** 経路案内を開く */
  startRoute(sel: Selection): void
  toggleFavorite(sel: Selection): void
  share(sel: Selection): void
  clearHistory(): void
  openAbout(): void
}

export interface NaviContextValue {
  index: CampusIndex
  favorites: readonly Selection[]
  history: readonly HistoryEntry[]
  /** お気に入り・履歴を端末に保存できているか */
  storagePersistent: boolean
  actions: NaviActions
}

export const NaviContext = createContext<NaviContextValue | null>(null)

export function useNavi(): NaviContextValue {
  const value = useContext(NaviContext)
  if (!value) throw new Error('NaviContext が見つかりません')
  return value
}
