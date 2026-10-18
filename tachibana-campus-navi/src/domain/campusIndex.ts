import { floorLabel } from './floors.ts'
import { compareNatural, normalizeText } from './normalize.ts'
import type { Building, CampusData, Facility, Floor, Room, Source } from './types.ts'

/** 検索・表示のために前計算した参照表 */
export interface CampusIndex {
  data: CampusData
  buildingById: Map<string, Building>
  buildingByCode: Map<string, Building>
  roomByCode: Map<string, Room>
  facilityById: Map<string, Facility>
  sourceById: Map<string, Source>
  /** 建物ごとの登録済みの階（低い階から順） */
  floorsByBuilding: Map<string, Floor[]>
  roomsByBuilding: Map<string, Room[]>
  facilitiesByBuilding: Map<string, Facility[]>
  /** 地図上の位置が登録された建物・施設が 1 件でもあるか */
  hasMapPlacements: boolean
  /** 検索用に正規化した名称 */
  buildingKeys: Map<string, string[]>
  facilityKeys: Map<string, string[]>
  roomNameKeys: Map<string, string>
}

function groupBy<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (k === null) continue
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

export function buildCampusIndex(data: CampusData): CampusIndex {
  const floorsByBuilding = groupBy(data.floors, (f) => f.buildingId)
  for (const list of floorsByBuilding.values()) list.sort((a, b) => a.level - b.level)

  const roomsByBuilding = groupBy(data.rooms, (r) => r.buildingId)
  for (const list of roomsByBuilding.values()) list.sort((a, b) => compareNatural(a.code, b.code))

  const facilitiesByBuilding = groupBy(data.facilities, (f) => f.buildingId)

  const buildingKeys = new Map(
    data.buildings.map((b) => [b.id, [b.name, ...b.aliases].map(normalizeText).filter(Boolean)]),
  )
  const facilityKeys = new Map(
    data.facilities.map((f) => [f.id, [f.name, ...f.aliases].map(normalizeText).filter(Boolean)]),
  )
  const roomNameKeys = new Map(
    data.rooms.flatMap((r) => (r.name ? [[r.code, normalizeText(r.name)] as const] : [])),
  )

  return {
    data,
    buildingById: new Map(data.buildings.map((b) => [b.id, b])),
    buildingByCode: new Map(data.buildings.flatMap((b) => (b.code ? [[b.code, b] as const] : []))),
    roomByCode: new Map(data.rooms.map((r) => [r.code, r])),
    facilityById: new Map(data.facilities.map((f) => [f.id, f])),
    sourceById: new Map(data.sources.map((s) => [s.id, s])),
    floorsByBuilding,
    roomsByBuilding,
    facilitiesByBuilding,
    hasMapPlacements:
      data.buildings.some((b) => b.map !== null) || data.facilities.some((f) => f.map !== null),
    buildingKeys,
    facilityKeys,
    roomNameKeys,
  }
}

export function roomsOnFloor(index: CampusIndex, buildingId: string, level: number): Room[] {
  return (index.roomsByBuilding.get(buildingId) ?? []).filter((r) => r.floor === level)
}

export function facilitiesOnFloor(
  index: CampusIndex,
  buildingId: string,
  level: number,
): Facility[] {
  return (index.facilitiesByBuilding.get(buildingId) ?? []).filter((f) => f.floor === level)
}

/** 画面に出す教室名。「H301教室」「J804 Media Lab3」「G001 生理機能実習室」 */
export function roomTitle(room: Room): string {
  return room.name ? `${room.code} ${room.name}` : `${room.code}教室`
}

/** 建物の表示名。「H アカデミックリンクス」のように建物番号を添える */
export function buildingLabel(building: Building): string {
  return building.code ? `${building.code} ${building.name}` : building.name
}

/** 「アカデミックリンクス 3階」 */
export function roomLocationLabel(index: CampusIndex, room: Room): string {
  const building = index.buildingById.get(room.buildingId)
  return `${building?.name ?? '建物不明'} ${floorLabel(room.floor)}`
}

/** 登録されている階の範囲（「地下1階〜4階」） */
export function floorRangeLabel(index: CampusIndex, buildingId: string): string | null {
  const floors = index.floorsByBuilding.get(buildingId)
  if (!floors || floors.length === 0) return null
  const first = floors[0]
  const last = floors[floors.length - 1]
  if (!first || !last) return null
  return first.level === last.level
    ? floorLabel(first.level)
    : `${floorLabel(first.level)}〜${floorLabel(last.level)}`
}
