import type { CampusIndex } from '../../domain/campusIndex.ts'
import type { MapPlacement } from '../../domain/types.ts'
import type { Selection } from '../../state/saved.ts'

/** 地図に描くもの（位置が登録された建物と、建物に属さない施設） */
export interface MapItem {
  key: string
  selection: Selection
  label: string
  code: string | null
  academic: boolean
  shape: 'rect' | 'point'
  placement: MapPlacement
}

export function buildMapItems(index: CampusIndex): MapItem[] {
  const items: MapItem[] = []
  for (const b of index.data.buildings) {
    if (!b.map) continue
    items.push({
      key: `building:${b.id}`,
      selection: { kind: 'building', id: b.id },
      label: b.name,
      code: b.code,
      academic: b.kind === 'academic',
      shape: 'rect',
      placement: b.map,
    })
  }
  for (const f of index.data.facilities) {
    if (!f.map || f.buildingId) continue
    items.push({
      key: `facility:${f.id}`,
      selection: { kind: 'facility', id: f.id },
      label: f.name,
      code: null,
      academic: false,
      shape: 'point',
      placement: f.map,
    })
  }
  return items
}

/** 選択中のものに対応する地図上のキー（教室ならその建物） */
export function mapKeyForSelection(index: CampusIndex, sel: Selection | null): string | null {
  if (!sel) return null
  switch (sel.kind) {
    case 'building':
      return `building:${sel.id}`
    case 'room': {
      const room = index.roomByCode.get(sel.id)
      return room ? `building:${room.buildingId}` : null
    }
    case 'facility': {
      const f = index.facilityById.get(sel.id)
      if (!f) return null
      return f.buildingId ? `building:${f.buildingId}` : `facility:${f.id}`
    }
  }
}
