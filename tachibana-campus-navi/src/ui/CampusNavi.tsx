import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { buildCampusIndex, type CampusIndex } from '../domain/campusIndex.ts'
import { searchCampus, type SearchHit } from '../domain/search.ts'
import type { CampusData } from '../domain/types.ts'
import {
  FAVORITES_KEY,
  FAVORITES_MAX,
  HISTORY_KEY,
  HISTORY_MAX,
  isFavorite,
  isHistoryEntry,
  isSelection,
  pushHistory,
  toggleFavorite,
  type Selection,
} from '../state/saved.ts'
import { createListStore } from '../state/storage.ts'
import { parseUrlState, searchForSelection, shareUrlFor, type UrlState } from '../state/urlState.ts'
import { AboutDialog } from './AboutDialog.tsx'
import { BottomSheet, type SheetSnap } from './BottomSheet.tsx'
import { AppHeader, BottomNav, Toast, type Tab } from './Chrome.tsx'
import { describeSelection, hitToSelection, optionId } from './describe.ts'
import { BuildingDetail, FacilityDetail, RoomDetail } from './Details.tsx'
import { useListStore, useMediaQuery } from './hooks.ts'
import { AlertIcon, ChevronLeftIcon } from './icons.tsx'
import { MapArea } from './map/MapArea.tsx'
import { NaviContext, type NaviActions, type NaviContextValue } from './naviContext.ts'
import { FavoritesPanel, HomePanel, SelectionRow } from './Panels.tsx'
import { RoutePanel } from './RoutePanel.tsx'
import { SearchInput } from './SearchInput.tsx'
import { SearchResults } from './SearchResults.tsx'

type PanelView = 'detail' | 'route'

/** 選択を URL に反映する（共有用）。file:// や埋め込み表示で使えない環境では何もしない */
function pushUrl(search: string) {
  try {
    window.history.pushState({ tcn: 1 }, '', search || window.location.pathname)
  } catch {
    // URL を変えられなくても画面の動作には影響しない
  }
}

interface Initial {
  selection: Selection | null
  query: string
  tab: Tab
}

/** URL の内容を、実在するデータに照らして初期状態にする */
function resolveInitial(index: CampusIndex, url: UrlState): Initial {
  if (url.selection) {
    if (describeSelection(index, url.selection)) {
      return { selection: url.selection, query: url.query, tab: 'map' }
    }
    // 存在しない教室番号などは、検索結果（見つからない旨の案内）として表示する
    return { selection: null, query: url.selection.id, tab: 'search' }
  }
  if (url.query.trim()) {
    const exact = searchCampus(index, url.query).exactRoom
    return exact
      ? { selection: { kind: 'room', id: exact.code }, query: url.query, tab: 'map' }
      : { selection: null, query: url.query, tab: 'search' }
  }
  return { selection: null, query: '', tab: 'map' }
}

function DetailContent({
  selection,
  panelView,
  buildingFloor,
  onBackFromRoute,
}: {
  selection: Selection
  panelView: PanelView
  buildingFloor: number | undefined
  onBackFromRoute(): void
}) {
  if (panelView === 'route') {
    return (
      <RoutePanel
        key={`${selection.kind}:${selection.id}`}
        destination={selection}
        onBack={onBackFromRoute}
      />
    )
  }
  switch (selection.kind) {
    case 'room':
      return <RoomDetail key={selection.id} code={selection.id} />
    case 'building':
      return (
        <BuildingDetail
          key={`${selection.id}:${buildingFloor ?? ''}`}
          id={selection.id}
          initialFloor={buildingFloor}
        />
      )
    case 'facility':
      return <FacilityDetail key={selection.id} id={selection.id} />
  }
}

export function CampusNavi({ data, warnings }: { data: CampusData; warnings: string[] }) {
  const index = useMemo(() => buildCampusIndex(data), [data])
  const [stores] = useState(() => ({
    favorites: createListStore(FAVORITES_KEY, isSelection, FAVORITES_MAX),
    history: createListStore(HISTORY_KEY, isHistoryEntry, HISTORY_MAX),
  }))
  const favorites = useListStore(stores.favorites)
  const history = useListStore(stores.history)

  const [initial] = useState(() => resolveInitial(index, parseUrlState(window.location.search)))
  const [query, setQuery] = useState(initial.query)
  const [selection, setSelection] = useState<Selection | null>(initial.selection)
  const [buildingFloor, setBuildingFloor] = useState<number | undefined>(undefined)
  const [panelView, setPanelView] = useState<PanelView>('detail')
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half')
  const [focusToken, setFocusToken] = useState(initial.selection ? 1 : 0)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [active, setActive] = useState({ query: '', index: -1 })
  const [aboutOpen, setAboutOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [dismissedWarnings, setDismissedWarnings] = useState(false)
  const toastTimer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const listboxId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const outcome = useMemo(() => searchCampus(index, query), [index, query])
  const activeIndex = active.query === query ? active.index : -1
  const hasQuery = query.trim() !== ''

  // URL から開いた教室も「最近の検索」に残す
  useEffect(() => {
    if (initial.selection) {
      stores.history.set(pushHistory(stores.history.getSnapshot(), initial.selection, Date.now()))
    }
  }, [initial, stores])

  // ブラウザの「戻る」「進む」で選択状態を復元する
  useEffect(() => {
    const onPop = () => {
      const url = parseUrlState(window.location.search)
      const sel = url.selection && describeSelection(index, url.selection) ? url.selection : null
      setSelection(sel)
      setPanelView('detail')
      setBuildingFloor(undefined)
      if (sel) setFocusToken((t) => t + 1)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [index])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const select = useCallback<NaviActions['select']>(
    (sel, options) => {
      setSelection(sel)
      setBuildingFloor(sel.kind === 'building' ? options?.floor : undefined)
      setPanelView('detail')
      setResultsOpen(false)
      setTab('map')
      setSheetSnap('half')
      setFocusToken((t) => t + 1)
      stores.history.set(pushHistory(stores.history.getSnapshot(), sel, Date.now()))
      const d = describeSelection(index, sel)
      if (d) setAnnouncement(`${d.title}、${d.subtitle} を表示しました`)
      pushUrl(searchForSelection(sel))
      inputRef.current?.blur()
    },
    [index, stores],
  )

  const closeDetail = useCallback(() => {
    setSelection(null)
    setPanelView('detail')
    pushUrl('')
  }, [])

  const actions = useMemo<NaviActions>(
    () => ({
      select,
      showOnMap(sel) {
        setSelection(sel)
        setResultsOpen(false)
        setTab('map')
        setSheetSnap('peek')
        setFocusToken((t) => t + 1)
      },
      startRoute(sel) {
        setSelection(sel)
        setPanelView('route')
        setResultsOpen(false)
        setTab('map')
        setSheetSnap('full')
      },
      toggleFavorite(sel) {
        const before = stores.favorites.getSnapshot()
        stores.favorites.set(toggleFavorite(before, sel))
        showToast(isFavorite(before, sel) ? 'お気に入りから外しました' : 'お気に入りに追加しました')
      },
      async share(sel) {
        const url = shareUrlFor(sel, window.location)
        const d = describeSelection(index, sel)
        const text = d ? `${d.title}（${d.subtitle}）` : 'Tachibana Campus Navi'
        if (typeof navigator.share === 'function') {
          try {
            await navigator.share({ title: 'Tachibana Campus Navi', text, url })
            return
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
          }
        }
        try {
          await navigator.clipboard.writeText(url)
          showToast('リンクをコピーしました')
        } catch {
          showToast(`共有用リンク：${url}`)
        }
      },
      clearHistory() {
        stores.history.set([])
      },
      openAbout() {
        setAboutOpen(true)
      },
    }),
    [index, select, showToast, stores],
  )

  const contextValue = useMemo<NaviContextValue>(
    () => ({
      index,
      favorites,
      history,
      storagePersistent: stores.favorites.persistent,
      actions,
    }),
    [index, favorites, history, stores, actions],
  )

  const pick = (hit: SearchHit) => select(hitToSelection(hit))

  const onQueryChange = (value: string) => {
    setQuery(value)
    setResultsOpen(true)
    if (tab === 'favorites') setTab('search')
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 日本語入力の変換確定の Enter では検索結果を選ばない
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const n = outcome.hits.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResultsOpen(true)
      setActive({ query, index: n === 0 ? -1 : (activeIndex + 1) % n })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive({ query, index: n === 0 ? -1 : activeIndex <= 0 ? n - 1 : activeIndex - 1 })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = outcome.hits[activeIndex >= 0 ? activeIndex : 0]
      if (hit) pick(hit)
    } else if (e.key === 'Escape') {
      if (resultsOpen && hasQuery) setResultsOpen(false)
      else setQuery('')
    }
  }

  const results = (
    <SearchResults
      outcome={outcome}
      listboxId={listboxId}
      activeIndex={activeIndex}
      onPick={pick}
      onHover={(i) => setActive({ query, index: i })}
    />
  )

  const detail = selection && (
    <DetailContent
      selection={selection}
      panelView={panelView}
      buildingFloor={buildingFloor}
      onBackFromRoute={() => setPanelView('detail')}
    />
  )

  const warningBar = warnings.length > 0 && !dismissedWarnings && (
    <div
      role="alert"
      className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn"
    >
      <AlertIcon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{warnings.join(' ')}</p>
      <button
        type="button"
        onClick={() => setDismissedWarnings(true)}
        className="font-semibold underline"
      >
        閉じる
      </button>
    </div>
  )

  const showOverlay = !isDesktop && tab === 'map' && resultsOpen && (hasQuery || history.length > 0)
  const showDesktopResults = isDesktop && hasQuery && (resultsOpen || !selection)
  const expanded = isDesktop ? showDesktopResults : tab === 'search' ? hasQuery : showOverlay

  const searchInput = (
    <SearchInput
      ref={inputRef}
      value={query}
      onChange={onQueryChange}
      onFocus={() => setResultsOpen(true)}
      onKeyDown={onSearchKeyDown}
      listboxId={listboxId}
      expanded={expanded}
      activeOptionId={expanded && activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined}
    />
  )

  const shared = (
    <>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <Toast message={toast} />
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </>
  )

  if (isDesktop) {
    return (
      <NaviContext.Provider value={contextValue}>
        <div className="flex h-dvh overflow-clip">
          <aside className="flex w-[420px] shrink-0 flex-col border-r border-line bg-canvas">
            <AppHeader onAbout={actions.openAbout}>{searchInput}</AppHeader>
            {warningBar}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-10">
              {showDesktopResults ? (
                results
              ) : selection ? (
                <div className="space-y-3">
                  {panelView === 'detail' && (
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-accent hover:bg-accent-soft"
                    >
                      <ChevronLeftIcon size={18} />
                      一覧に戻る
                    </button>
                  )}
                  {detail}
                </div>
              ) : (
                <HomePanel />
              )}
            </div>
          </aside>
          <main className="relative min-w-0 flex-1 overflow-clip" aria-label="地図">
            <MapArea
              selection={selection}
              focusToken={focusToken}
              onSelect={select}
              focusAnchorY={0.5}
            />
          </main>
        </div>
        {shared}
      </NaviContext.Provider>
    )
  }

  return (
    <NaviContext.Provider value={contextValue}>
      <div className="flex h-dvh flex-col overflow-clip">
        <AppHeader onAbout={actions.openAbout}>{searchInput}</AppHeader>
        {warningBar}
        <main className="relative min-h-0 flex-1 overflow-clip">
          {tab === 'map' && (
            <>
              <MapArea
                selection={selection}
                focusToken={focusToken}
                onSelect={select}
                focusAnchorY={0.3}
              />
              {showOverlay && (
                <div className="absolute inset-0 z-40 flex flex-col">
                  <div className="max-h-[78%] overflow-y-auto overscroll-contain border-b border-line bg-canvas px-4 pt-1 pb-4 shadow-lg">
                    {hasQuery ? (
                      results
                    ) : (
                      <section>
                        <h2 className="mb-1 text-sm font-bold text-muted">最近の検索</h2>
                        <ul className="-mx-2">
                          {history.slice(0, 6).map((h) => (
                            <SelectionRow key={`${h.kind}:${h.id}`} selection={h} />
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex-1 bg-black/15"
                    onClick={() => setResultsOpen(false)}
                    aria-label="検索結果を閉じる"
                  />
                </div>
              )}
              {selection && (
                <BottomSheet
                  snap={sheetSnap}
                  onSnapChange={setSheetSnap}
                  onClose={closeDetail}
                  label="選択中の教室・建物の詳細"
                  contentKey={`${selection.kind}:${selection.id}:${panelView}:${buildingFloor ?? ''}`}
                >
                  {detail}
                </BottomSheet>
              )}
            </>
          )}
          {tab === 'search' && (
            <div className="h-full overflow-y-auto px-4 pt-2 pb-10">
              {hasQuery ? results : <HomePanel />}
            </div>
          )}
          {tab === 'favorites' && (
            <div className="h-full overflow-y-auto px-4 pt-2 pb-10">
              <FavoritesPanel />
            </div>
          )}
        </main>
        <BottomNav
          tab={tab}
          onTab={(t) => {
            setTab(t)
            setResultsOpen(false)
            if (t === 'search') inputRef.current?.focus()
          }}
        />
      </div>
      {shared}
    </NaviContext.Provider>
  )
}
