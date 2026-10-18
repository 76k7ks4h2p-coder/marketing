import type { CampusData } from './types.ts'
import {
  checkIntegrity,
  parseBuildings,
  parseFacilities,
  parseFloors,
  parseMeta,
  parseRooms,
  parseRouteGraph,
  parseSources,
} from './validate.ts'

/** public/data/*.json を読み込んだままの値（取得に失敗したものは undefined） */
export interface RawCampusFiles {
  meta?: unknown
  buildings?: unknown
  floors?: unknown
  rooms?: unknown
  facilities?: unknown
  routeGraph?: unknown
  sources?: unknown
}

export const DATA_FILES: Record<keyof RawCampusFiles, string> = {
  meta: 'meta.json',
  buildings: 'buildings.json',
  floors: 'floors.json',
  rooms: 'rooms.json',
  facilities: 'facilities.json',
  routeGraph: 'route-graph.json',
  sources: 'sources.json',
}

/**
 * 各ファイルを検証して CampusData にまとめる。
 * 不正なレコードは除外し、理由を issues に返す（画面は壊さない）。
 */
export function assembleCampusData(raw: RawCampusFiles): { data: CampusData; issues: string[] } {
  const meta = parseMeta(raw.meta)
  const buildings = parseBuildings(raw.buildings)
  const floors = parseFloors(raw.floors)
  const rooms = parseRooms(raw.rooms)
  const facilities = parseFacilities(raw.facilities)
  const routeGraph = parseRouteGraph(raw.routeGraph)
  const sources = parseSources(raw.sources)

  const data: CampusData = {
    meta: meta.value,
    buildings: buildings.value,
    floors: floors.value,
    rooms: rooms.value,
    facilities: facilities.value,
    routeGraph: routeGraph.value,
    sources: sources.value,
  }
  const issues = [
    ...meta.issues,
    ...buildings.issues,
    ...floors.issues,
    ...rooms.issues,
    ...facilities.issues,
    ...routeGraph.issues,
    ...sources.issues,
    ...checkIntegrity(data),
  ]
  return { data, issues }
}
