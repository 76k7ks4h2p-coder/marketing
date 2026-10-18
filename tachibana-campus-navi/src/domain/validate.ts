/**
 * データファイルの検証。
 * - 実行時: 取得した JSON の不正なレコードを捨てて画面が壊れないようにする
 * - ビルド時: scripts/build-data.ts とテストで、参照の整合性まで厳密に確認する
 */
import { floorLabel, levelFromCodeDigit } from './floors.ts'
import {
  VERIFICATION_STATUSES,
  type AccessMethod,
  type Building,
  type BuildingKind,
  type CampusData,
  type DatasetMeta,
  type EdgeAccessibility,
  type Facility,
  type FacilityCategory,
  type Floor,
  type FloorMap,
  type MapFrame,
  type MapPlacement,
  type Room,
  type RouteEdge,
  type RouteEdgeKind,
  type RouteGraph,
  type RouteNode,
  type RouteNodeKind,
  type Source,
  type SourceKind,
  type SourceRef,
  type VerificationStatus,
} from './types.ts'

export interface Parsed<T> {
  value: T
  issues: string[]
}

type Obj = Record<string, unknown>

class Invalid extends Error {}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function obj(v: unknown, path: string): Obj {
  if (!isObj(v)) throw new Invalid(`${path}: オブジェクトではありません`)
  return v
}

function str(o: Obj, key: string, path: string): string {
  const v = o[key]
  if (typeof v !== 'string' || v.trim() === '')
    throw new Invalid(`${path}.${key}: 文字列が必要です`)
  return v
}

function optStr(o: Obj, key: string, path: string): string | null {
  const v = o[key]
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') throw new Invalid(`${path}.${key}: 文字列または null が必要です`)
  return v
}

function num(o: Obj, key: string, path: string): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Invalid(`${path}.${key}: 数値が必要です`)
  return v
}

function optNum(o: Obj, key: string, path: string): number | null {
  const v = o[key]
  if (v === undefined || v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Invalid(`${path}.${key}: 数値または null が必要です`)
  }
  return v
}

function bool(o: Obj, key: string, path: string): boolean {
  const v = o[key]
  if (typeof v !== 'boolean') throw new Invalid(`${path}.${key}: true/false が必要です`)
  return v
}

function optBool(o: Obj, key: string, path: string): boolean | null {
  const v = o[key]
  if (v === undefined || v === null) return null
  if (typeof v !== 'boolean') throw new Invalid(`${path}.${key}: true/false または null が必要です`)
  return v
}

function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T {
  const v = o[key]
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new Invalid(`${path}.${key}: ${allowed.join(' / ')} のいずれかが必要です`)
  }
  return v as T
}

function strList(o: Obj, key: string, path: string): string[] {
  const v = o[key]
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    throw new Invalid(`${path}.${key}: 文字列の配列が必要です`)
  }
  return v as string[]
}

function sourceRef(v: unknown, path: string): SourceRef {
  const o = obj(v, path)
  const note = optStr(o, 'note', path)
  return note
    ? { sourceId: str(o, 'sourceId', path), note }
    : { sourceId: str(o, 'sourceId', path) }
}

function sourceRefs(o: Obj, key: string, path: string): SourceRef[] {
  const v = o[key]
  if (!Array.isArray(v)) throw new Invalid(`${path}.${key}: 出典の配列が必要です`)
  return v.map((x, i) => sourceRef(x, `${path}.${key}[${i}]`))
}

const STATUSES = VERIFICATION_STATUSES
const DATE = /^\d{4}-\d{2}-\d{2}$/

function date(o: Obj, key: string, path: string): string {
  const v = str(o, key, path)
  if (!DATE.test(v)) throw new Invalid(`${path}.${key}: YYYY-MM-DD 形式の日付が必要です`)
  return v
}

function placement(v: unknown, path: string): MapPlacement | null {
  if (v === null || v === undefined) return null
  const o = obj(v, path)
  const p: MapPlacement = {
    x: num(o, 'x', path),
    y: num(o, 'y', path),
    width: num(o, 'width', path),
    height: num(o, 'height', path),
    status: oneOf(o, 'status', STATUSES, path),
    source: sourceRef(o.source, `${path}.source`),
  }
  if (p.width <= 0 || p.height <= 0) throw new Invalid(`${path}: 幅と高さは正の数が必要です`)
  return p
}

/** 配列の各要素を検証し、不正な要素は捨てて理由を issues に積む */
function each<T>(raw: unknown, path: string, parseItem: (v: unknown, p: string) => T): Parsed<T[]> {
  if (!Array.isArray(raw)) return { value: [], issues: [`${path}: 配列ではありません`] }
  const value: T[] = []
  const issues: string[] = []
  raw.forEach((item, i) => {
    try {
      value.push(parseItem(item, `${path}[${i}]`))
    } catch (e) {
      if (e instanceof Invalid) issues.push(e.message)
      else throw e
    }
  })
  return { value, issues }
}

const BUILDING_KINDS: readonly BuildingKind[] = ['academic', 'facility', 'sports', 'other']

export function parseBuilding(v: unknown, path: string): Building {
  const o = obj(v, path)
  const rule = o.roomCodeRule
  let roomCodeRule: Building['roomCodeRule'] = null
  if (rule !== null && rule !== undefined) {
    const r = obj(rule, `${path}.roomCodeRule`)
    roomCodeRule = {
      prefix: str(r, 'prefix', `${path}.roomCodeRule`),
      digits: num(r, 'digits', `${path}.roomCodeRule`),
    }
  }
  return {
    id: str(o, 'id', path),
    code: optStr(o, 'code', path),
    name: str(o, 'name', path),
    kind: oneOf(o, 'kind', BUILDING_KINDS, path),
    aliases: strList(o, 'aliases', path),
    description: optStr(o, 'description', path),
    roomCodeRule,
    map: placement(o.map, `${path}.map`),
    status: oneOf(o, 'status', STATUSES, path),
    sources: sourceRefs(o, 'sources', path),
    checkedAt: date(o, 'checkedAt', path),
  }
}

export function parseFloor(v: unknown, path: string): Floor {
  const o = obj(v, path)
  let floorMap: FloorMap | null = null
  if (o.floorMap !== null && o.floorMap !== undefined) {
    const f = obj(o.floorMap, `${path}.floorMap`)
    floorMap = {
      kind: oneOf(f, 'kind', ['svg', 'image'] as const, `${path}.floorMap`),
      url: str(f, 'url', `${path}.floorMap`),
      width: num(f, 'width', `${path}.floorMap`),
      height: num(f, 'height', `${path}.floorMap`),
      status: oneOf(f, 'status', STATUSES, `${path}.floorMap`),
      source: sourceRef(f.source, `${path}.floorMap.source`),
    }
  }
  const level = num(o, 'level', path)
  return {
    buildingId: str(o, 'buildingId', path),
    level,
    label: optStr(o, 'label', path) ?? floorLabel(level),
    floorMap,
  }
}

export function parseRoom(v: unknown, path: string): Room {
  const o = obj(v, path)
  const capacity = optNum(o, 'capacity', path)
  if (capacity !== null && (capacity <= 0 || !Number.isInteger(capacity))) {
    throw new Invalid(`${path}.capacity: 正の整数または null が必要です`)
  }
  const name = optStr(o, 'name', path)
  const note = optStr(o, 'note', path)
  return {
    code: str(o, 'code', path),
    buildingId: str(o, 'buildingId', path),
    floor: num(o, 'floor', path),
    name: name === '' ? null : name,
    capacity,
    status: oneOf(o, 'status', STATUSES, path),
    sourceId: str(o, 'sourceId', path),
    checkedAt: date(o, 'checkedAt', path),
    note: note === '' ? null : note,
  }
}

const FACILITY_CATEGORIES: readonly FacilityCategory[] = [
  'dining',
  'cafe',
  'library',
  'commons',
  'office',
  'gate',
  'transport',
  'sports',
  'accessibility',
  'other',
]

export function parseFacility(v: unknown, path: string): Facility {
  const o = obj(v, path)
  return {
    id: str(o, 'id', path),
    name: str(o, 'name', path),
    category: oneOf(o, 'category', FACILITY_CATEGORIES, path),
    buildingId: optStr(o, 'buildingId', path),
    floor: optNum(o, 'floor', path),
    description: optStr(o, 'description', path),
    aliases: strList(o, 'aliases', path),
    map: placement(o.map, `${path}.map`),
    status: oneOf(o, 'status', STATUSES, path),
    sources: sourceRefs(o, 'sources', path),
    checkedAt: date(o, 'checkedAt', path),
  }
}

const NODE_KINDS: readonly RouteNodeKind[] = [
  'gate',
  'bus-stop',
  'entrance',
  'junction',
  'elevator',
  'stairs',
  'room',
  'facility',
]
const EDGE_KINDS: readonly RouteEdgeKind[] = [
  'walkway',
  'corridor',
  'stairs',
  'elevator',
  'ramp',
  'bridge',
  'door',
]

export function parseRouteNode(v: unknown, path: string): RouteNode {
  const o = obj(v, path)
  let position: RouteNode['position'] = null
  if (o.position !== null && o.position !== undefined) {
    const p = obj(o.position, `${path}.position`)
    position = { x: num(p, 'x', `${path}.position`), y: num(p, 'y', `${path}.position`) }
  }
  return {
    id: str(o, 'id', path),
    kind: oneOf(o, 'kind', NODE_KINDS, path),
    label: str(o, 'label', path),
    buildingId: optStr(o, 'buildingId', path),
    floor: optNum(o, 'floor', path),
    position,
    refId: optStr(o, 'refId', path),
    status: oneOf(o, 'status', STATUSES, path),
    sources: sourceRefs(o, 'sources', path),
  }
}

export function parseRouteEdge(v: unknown, path: string): RouteEdge {
  const o = obj(v, path)
  const a = obj(o.accessibility, `${path}.accessibility`)
  const ap = `${path}.accessibility`
  const slope = a.slope === null || a.slope === undefined ? null : a.slope
  const accessibility: EdgeAccessibility = {
    stepFree: optBool(a, 'stepFree', ap),
    hasStairs: bool(a, 'hasStairs', ap),
    slope: slope === null ? null : oneOf(a, 'slope', ['flat', 'gentle', 'steep'] as const, ap),
    note: optStr(a, 'note', ap),
  }
  const distance = num(o, 'distance', path)
  if (distance < 0) throw new Invalid(`${path}.distance: 0 以上が必要です`)
  return {
    id: str(o, 'id', path),
    from: str(o, 'from', path),
    to: str(o, 'to', path),
    kind: oneOf(o, 'kind', EDGE_KINDS, path),
    bidirectional: bool(o, 'bidirectional', path),
    distance,
    passable: bool(o, 'passable', path),
    accessibility,
    status: oneOf(o, 'status', STATUSES, path),
    sources: sourceRefs(o, 'sources', path),
  }
}

const SOURCE_KINDS: readonly SourceKind[] = [
  'classroom-list',
  'campus-map',
  'accessibility-map',
  'official-page',
  'news',
  'provided',
]
const ACCESS_METHODS: readonly AccessMethod[] = [
  'direct',
  'search-index',
  'provided',
  'not-accessed',
]

export function parseSource(v: unknown, path: string): Source {
  const o = obj(v, path)
  const note = optStr(o, 'note', path)
  const accessedAt = optStr(o, 'accessedAt', path)
  if (accessedAt !== null && !DATE.test(accessedAt)) {
    throw new Invalid(`${path}.accessedAt: YYYY-MM-DD 形式の日付が必要です`)
  }
  const source: Source = {
    id: str(o, 'id', path),
    title: str(o, 'title', path),
    url: optStr(o, 'url', path),
    publisher: str(o, 'publisher', path),
    kind: oneOf(o, 'kind', SOURCE_KINDS, path),
    accessedAt,
    accessMethod: oneOf(o, 'accessMethod', ACCESS_METHODS, path),
  }
  if (note) source.note = note
  return source
}

export function parseMeta(raw: unknown): Parsed<DatasetMeta> {
  const fallback: DatasetMeta = { version: 'unknown', updatedAt: '', mapFrame: null, notes: [] }
  try {
    const o = obj(raw, 'meta')
    let mapFrame: MapFrame | null = null
    if (o.mapFrame !== null && o.mapFrame !== undefined) {
      const f = obj(o.mapFrame, 'meta.mapFrame')
      mapFrame = {
        width: num(f, 'width', 'meta.mapFrame'),
        height: num(f, 'height', 'meta.mapFrame'),
        source: sourceRef(f.source, 'meta.mapFrame.source'),
      }
    }
    return {
      value: {
        version: str(o, 'version', 'meta'),
        updatedAt: date(o, 'updatedAt', 'meta'),
        mapFrame,
        notes: strList(o, 'notes', 'meta'),
      },
      issues: [],
    }
  } catch (e) {
    if (e instanceof Invalid) return { value: fallback, issues: [e.message] }
    throw e
  }
}

export const parseBuildings = (raw: unknown) => each(raw, 'buildings', parseBuilding)
export const parseFloors = (raw: unknown) => each(raw, 'floors', parseFloor)
export const parseRooms = (raw: unknown) => each(raw, 'rooms', parseRoom)
export const parseFacilities = (raw: unknown) => each(raw, 'facilities', parseFacility)
export const parseSources = (raw: unknown) => each(raw, 'sources', parseSource)

export function parseRouteGraph(raw: unknown): Parsed<RouteGraph> {
  if (!isObj(raw))
    return { value: { nodes: [], edges: [] }, issues: ['routeGraph: オブジェクトではありません'] }
  const nodes = each(raw.nodes, 'routeGraph.nodes', parseRouteNode)
  const edges = each(raw.edges, 'routeGraph.edges', parseRouteEdge)
  return {
    value: { nodes: nodes.value, edges: edges.value },
    issues: [...nodes.issues, ...edges.issues],
  }
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const v of values) {
    if (seen.has(v)) dup.add(v)
    seen.add(v)
  }
  return [...dup]
}

/**
 * 参照の整合性チェック。存在しない建物・階・出典を参照していないか、
 * 教室番号の規則（建物記号＋階＋番号）と登録された階が食い違っていないかを確認する。
 */
export function checkIntegrity(data: CampusData): string[] {
  const issues: string[] = []
  const buildingById = new Map(data.buildings.map((b) => [b.id, b]))
  const sourceIds = new Set(data.sources.map((s) => s.id))
  const floorKeys = new Set(data.floors.map((f) => `${f.buildingId}@${f.level}`))
  const nodeIds = new Set(data.routeGraph.nodes.map((n) => n.id))

  for (const d of duplicates(data.buildings.map((b) => b.id))) issues.push(`建物IDが重複: ${d}`)
  for (const d of duplicates(data.buildings.flatMap((b) => (b.code ? [b.code] : [])))) {
    issues.push(`建物番号が重複: ${d}`)
  }
  for (const d of duplicates(data.rooms.map((r) => r.code))) issues.push(`教室番号が重複: ${d}`)
  for (const d of duplicates(data.facilities.map((f) => f.id))) issues.push(`施設IDが重複: ${d}`)
  for (const d of duplicates(data.sources.map((s) => s.id))) issues.push(`出典IDが重複: ${d}`)
  for (const d of duplicates(data.floors.map((f) => `${f.buildingId}@${f.level}`))) {
    issues.push(`階が重複: ${d}`)
  }

  const checkRefs = (refs: SourceRef[], where: string) => {
    for (const ref of refs) {
      if (!sourceIds.has(ref.sourceId)) issues.push(`${where}: 未登録の出典 ${ref.sourceId}`)
    }
  }

  for (const b of data.buildings) {
    checkRefs(b.sources, `建物 ${b.id}`)
    if (b.map) checkRefs([b.map.source], `建物 ${b.id} の地図配置`)
    if (b.roomCodeRule && b.code && b.roomCodeRule.prefix !== b.code) {
      issues.push(
        `建物 ${b.id}: 教室番号の先頭 ${b.roomCodeRule.prefix} が建物番号 ${b.code} と一致しません`,
      )
    }
  }

  for (const f of data.floors) {
    if (!buildingById.has(f.buildingId)) issues.push(`階 ${f.buildingId}@${f.level}: 未登録の建物`)
  }

  for (const r of data.rooms) {
    const b = buildingById.get(r.buildingId)
    if (!b) {
      issues.push(`教室 ${r.code}: 未登録の建物 ${r.buildingId}`)
      continue
    }
    if (!sourceIds.has(r.sourceId)) issues.push(`教室 ${r.code}: 未登録の出典 ${r.sourceId}`)
    if (!floorKeys.has(`${r.buildingId}@${r.floor}`)) {
      issues.push(`教室 ${r.code}: floors に ${b.name} の ${floorLabel(r.floor)} がありません`)
    }
    const rule = b.roomCodeRule
    if (rule) {
      const rest = r.code.slice(rule.prefix.length)
      if (!r.code.startsWith(rule.prefix) || rest.length !== rule.digits || !/^\d+$/.test(rest)) {
        issues.push(
          `教室 ${r.code}: ${b.name} の番号規則（${rule.prefix} + ${rule.digits}桁）に合いません`,
        )
      } else if (levelFromCodeDigit(rest[0] ?? '') !== r.floor) {
        issues.push(
          `教室 ${r.code}: 番号の階（${rest[0]}）と登録された階（${floorLabel(r.floor)}）が食い違います`,
        )
      }
    }
  }

  for (const f of data.facilities) {
    checkRefs(f.sources, `施設 ${f.id}`)
    if (f.map) checkRefs([f.map.source], `施設 ${f.id} の地図配置`)
    if (f.buildingId && !buildingById.has(f.buildingId)) {
      issues.push(`施設 ${f.id}: 未登録の建物 ${f.buildingId}`)
    }
    if (f.buildingId && f.floor !== null && !floorKeys.has(`${f.buildingId}@${f.floor}`)) {
      issues.push(`施設 ${f.id}: floors に ${f.buildingId} の ${floorLabel(f.floor)} がありません`)
    }
  }

  for (const d of duplicates(data.routeGraph.nodes.map((n) => n.id)))
    issues.push(`経路ノードIDが重複: ${d}`)
  for (const d of duplicates(data.routeGraph.edges.map((e) => e.id)))
    issues.push(`経路エッジIDが重複: ${d}`)
  for (const n of data.routeGraph.nodes) {
    checkRefs(n.sources, `経路ノード ${n.id}`)
    if (n.buildingId && !buildingById.has(n.buildingId)) {
      issues.push(`経路ノード ${n.id}: 未登録の建物 ${n.buildingId}`)
    }
  }
  for (const e of data.routeGraph.edges) {
    checkRefs(e.sources, `経路エッジ ${e.id}`)
    if (!nodeIds.has(e.from)) issues.push(`経路エッジ ${e.id}: 未登録のノード ${e.from}`)
    if (!nodeIds.has(e.to)) issues.push(`経路エッジ ${e.id}: 未登録のノード ${e.to}`)
    if (e.status === 'verified' && e.sources.length === 0) {
      issues.push(`経路エッジ ${e.id}: 検証済みなのに出典がありません`)
    }
  }

  return issues
}

export function isVerificationStatus(v: string): v is VerificationStatus {
  return (STATUSES as readonly string[]).includes(v)
}
