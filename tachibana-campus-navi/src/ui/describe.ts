import {
  buildingLabel,
  floorRangeLabel,
  roomTitle,
  type CampusIndex,
} from '../domain/campusIndex.ts'
import { floorLabel } from '../domain/floors.ts'
import type { RoutePlace } from '../domain/routing.ts'
import type { SearchHit } from '../domain/search.ts'
import type { Building, Facility, FacilityCategory, Room } from '../domain/types.ts'
import type { Selection } from '../state/saved.ts'
import { CATEGORY_LABEL } from './format.ts'

export function hitToSelection(hit: SearchHit): Selection {
  switch (hit.kind) {
    case 'room':
      return { kind: 'room', id: hit.room.code }
    case 'building':
      return { kind: 'building', id: hit.building.id }
    case 'facility':
      return { kind: 'facility', id: hit.facility.id }
  }
}

export function hitKey(hit: SearchHit): string {
  const sel = hitToSelection(hit)
  return `${sel.kind}:${sel.id}`
}

/** combobox の候補の DOM id */
export function optionId(listboxId: string, i: number): string {
  return `${listboxId}-opt-${i}`
}

export interface Described {
  title: string
  subtitle: string
  building: Building | null
  room: Room | null
  facility: Facility | null
  category: FacilityCategory | null
}

/** 選択対象を画面表示用の文字列にする。データから消えていれば null */
export function describeSelection(index: CampusIndex, sel: Selection): Described | null {
  switch (sel.kind) {
    case 'room': {
      const room = index.roomByCode.get(sel.id)
      const building = room ? index.buildingById.get(room.buildingId) : undefined
      if (!room || !building) return null
      return {
        title: roomTitle(room),
        subtitle: `${building.name}・${floorLabel(room.floor)}`,
        building,
        room,
        facility: null,
        category: null,
      }
    }
    case 'building': {
      const building = index.buildingById.get(sel.id)
      if (!building) return null
      const rooms = index.roomsByBuilding.get(building.id)?.length ?? 0
      const range = floorRangeLabel(index, building.id)
      const parts = [
        building.code ? `建物番号 ${building.code}` : null,
        rooms > 0 ? `教室 ${rooms}室` : null,
        rooms > 0 && range ? range : null,
      ].filter(Boolean)
      return {
        title: building.name,
        subtitle: parts.join('・') || '建物',
        building,
        room: null,
        facility: null,
        category: null,
      }
    }
    case 'facility': {
      const facility = index.facilityById.get(sel.id)
      if (!facility) return null
      const building = facility.buildingId
        ? (index.buildingById.get(facility.buildingId) ?? null)
        : null
      const where = building
        ? `${building.name}${facility.floor !== null ? ` ${floorLabel(facility.floor)}` : ''}`
        : null
      return {
        title: facility.name,
        subtitle: [CATEGORY_LABEL[facility.category], where].filter(Boolean).join('・'),
        building,
        room: null,
        facility,
        category: facility.category,
      }
    }
  }
}

/** 「H アカデミックリンクス・3階」のような、場所の短い説明 */
export function placeSummary(index: CampusIndex, sel: Selection): string {
  const d = describeSelection(index, sel)
  if (!d) return ''
  if (d.room && d.building) return `${buildingLabel(d.building)}・${floorLabel(d.room.floor)}`
  return d.subtitle
}

export function selectionToPlace(sel: Selection): RoutePlace {
  return sel.kind === 'room' ? { kind: 'room', code: sel.id } : { kind: sel.kind, id: sel.id }
}

export function placeToKey(place: RoutePlace): string {
  return place.kind === 'room' ? `room:${place.code}` : `${place.kind}:${place.id}`
}

export function keyToPlace(key: string): RoutePlace | null {
  const [kind, ...rest] = key.split(':')
  const id = rest.join(':')
  if (!id) return null
  if (kind === 'room') return { kind: 'room', code: id }
  if (kind === 'building' || kind === 'facility') return { kind, id }
  return null
}

/** 選択対象のある建物（地図でフォーカスする対象） */
export function buildingOfSelection(index: CampusIndex, sel: Selection | null): Building | null {
  return sel ? (describeSelection(index, sel)?.building ?? null) : null
}
