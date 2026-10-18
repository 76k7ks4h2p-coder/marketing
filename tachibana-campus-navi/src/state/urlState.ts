/**
 * 選択中の教室・建物・施設を URL に反映する（検索結果を共有できるようにする）。
 *   ?room=H301 / ?building=academic-links / ?facility=main-gate / ?q=H301（検索語）
 */
import { normalizeCode } from '../domain/normalize.ts'
import type { Selection } from './saved.ts'

export interface UrlState {
  selection: Selection | null
  query: string
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const room = params.get('room')
  const building = params.get('building')
  const facility = params.get('facility')
  const query = params.get('q') ?? ''
  if (room && normalizeCode(room))
    return { selection: { kind: 'room', id: normalizeCode(room) }, query }
  if (building) return { selection: { kind: 'building', id: building }, query }
  if (facility) return { selection: { kind: 'facility', id: facility }, query }
  return { selection: null, query }
}

export function searchForSelection(selection: Selection | null): string {
  if (!selection) return ''
  return `?${new URLSearchParams({ [selection.kind]: selection.id }).toString()}`
}

/** 共有用の URL（現在のページの場所 + 選択） */
export function shareUrlFor(
  selection: Selection,
  location: Pick<Location, 'origin' | 'pathname'>,
): string {
  return `${location.origin}${location.pathname}${searchForSelection(selection)}`
}
