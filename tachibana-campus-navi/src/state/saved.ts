/** 画面で選択できるもの（お気に入り・履歴・共有 URL で共通に使う） */
export type Selection =
  { kind: 'room'; id: string } | { kind: 'building'; id: string } | { kind: 'facility'; id: string }

export interface HistoryEntry {
  kind: Selection['kind']
  id: string
  /** 選択した時刻（ミリ秒） */
  at: number
}

export const FAVORITES_KEY = 'tcn:favorites:v1'
export const HISTORY_KEY = 'tcn:history:v1'
export const FAVORITES_MAX = 100
export const HISTORY_MAX = 20

const KINDS = ['room', 'building', 'facility'] as const

export function isSelection(value: unknown): value is Selection {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' && v.id.length > 0 && (KINDS as readonly unknown[]).includes(v.kind)
  )
}

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  return isSelection(value) && typeof (value as unknown as HistoryEntry).at === 'number'
}

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  return !!a && !!b && a.kind === b.kind && a.id === b.id
}

export function isFavorite(list: readonly Selection[], item: Selection): boolean {
  return list.some((s) => sameSelection(s, item))
}

/** お気に入りの追加・解除（新しいものを先頭に） */
export function toggleFavorite(list: readonly Selection[], item: Selection): Selection[] {
  return isFavorite(list, item)
    ? list.filter((s) => !sameSelection(s, item))
    : [{ kind: item.kind, id: item.id }, ...list]
}

/** 履歴の先頭に追加する（同じものは先頭へ移動） */
export function pushHistory(
  list: readonly HistoryEntry[],
  item: Selection,
  now: number,
  max = HISTORY_MAX,
): HistoryEntry[] {
  return [
    { kind: item.kind, id: item.id, at: now },
    ...list.filter((h) => !sameSelection(h, item)),
  ].slice(0, max)
}
