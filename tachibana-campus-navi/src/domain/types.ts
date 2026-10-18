/**
 * Tachibana Campus Navi のデータモデル。
 * 表示データ（public/data/*.json）とアプリのロジックはこの型だけを介してつながる。
 */

/**
 * 情報の確認状況。
 * - verified:   公式資料の原本と照合済み
 * - pending:    公式資料に掲載されている情報だが、原本との最終照合が済んでいない
 * - unverified: 根拠を確認できていない（経路案内などには一切使わない）
 */
export type VerificationStatus = 'verified' | 'pending' | 'unverified'

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  'verified',
  'pending',
  'unverified',
]

/** どの資料のどこに基づくか */
export interface SourceRef {
  sourceId: string
  note?: string
}

export type SourceKind =
  'classroom-list' | 'campus-map' | 'accessibility-map' | 'official-page' | 'news' | 'provided'

/**
 * 情報をどう入手したか。
 * - direct:       原本を直接取得して確認
 * - search-index: 原本に直接アクセスできず、検索エンジンの索引に含まれる本文から転記
 * - provided:     開発指示書などで提供された
 * - not-accessed: 未取得（内容は未反映）
 */
export type AccessMethod = 'direct' | 'search-index' | 'provided' | 'not-accessed'

export interface Source {
  id: string
  title: string
  url: string | null
  publisher: string
  kind: SourceKind
  accessedAt: string | null
  accessMethod: AccessMethod
  note?: string
}

/** 地図座標系（公式キャンパスマップ画像のピクセル座標を想定）での配置 */
export interface MapPlacement {
  x: number
  y: number
  width: number
  height: number
  status: VerificationStatus
  source: SourceRef
}

/** 地図の座標系。配置エディタで下図にした画像の大きさを記録する */
export interface MapFrame {
  width: number
  height: number
  source: SourceRef
}

export type BuildingKind = 'academic' | 'facility' | 'sports' | 'other'

/** 教室番号の付け方（例: H301 → prefix "H" + 3 桁。先頭の桁が階） */
export interface RoomCodeRule {
  prefix: string
  digits: number
}

export interface Building {
  id: string
  /** 公式キャンパスマップの建物番号（教室番号の先頭記号と同じ）。不明なら null */
  code: string | null
  name: string
  kind: BuildingKind
  /** 検索用の別名（画面には表示しない） */
  aliases: string[]
  description: string | null
  roomCodeRule: RoomCodeRule | null
  /** 地図上の位置。未登録なら null（推測で埋めない） */
  map: MapPlacement | null
  status: VerificationStatus
  sources: SourceRef[]
  checkedAt: string
}

/** 将来の建物内フロアマップ */
export interface FloorMap {
  kind: 'svg' | 'image'
  url: string
  width: number
  height: number
  status: VerificationStatus
  source: SourceRef
}

export interface Floor {
  buildingId: string
  /** 地下1階 = -1、1階 = 1 */
  level: number
  label: string
  floorMap: FloorMap | null
}

export interface Room {
  code: string
  buildingId: string
  floor: number
  /** 公式一覧の［］内などの名称。ふつうの教室は null */
  name: string | null
  /** 収容人数。公式一覧が「ー」（記載なし）なら null */
  capacity: number | null
  status: VerificationStatus
  sourceId: string
  checkedAt: string
  note: string | null
}

export type FacilityCategory =
  | 'dining'
  | 'cafe'
  | 'library'
  | 'commons'
  | 'office'
  | 'gate'
  | 'transport'
  | 'sports'
  | 'accessibility'
  | 'other'

export interface Facility {
  id: string
  name: string
  category: FacilityCategory
  buildingId: string | null
  floor: number | null
  description: string | null
  aliases: string[]
  /** 建物に属さない施設（門・バス停など）の地図上の位置 */
  map: MapPlacement | null
  status: VerificationStatus
  sources: SourceRef[]
  checkedAt: string
}

export type RouteNodeKind =
  'gate' | 'bus-stop' | 'entrance' | 'junction' | 'elevator' | 'stairs' | 'room' | 'facility'

export interface RouteNode {
  id: string
  kind: RouteNodeKind
  label: string
  buildingId: string | null
  /** 屋外は null */
  floor: number | null
  position: { x: number; y: number } | null
  /** 対応する Room.code / Facility.id / Building.id */
  refId: string | null
  status: VerificationStatus
  sources: SourceRef[]
}

export type RouteEdgeKind =
  'walkway' | 'corridor' | 'stairs' | 'elevator' | 'ramp' | 'bridge' | 'door'

export interface EdgeAccessibility {
  /** 段差がないことを確認済みなら true。未確認は null */
  stepFree: boolean | null
  hasStairs: boolean
  slope: 'flat' | 'gentle' | 'steep' | null
  note: string | null
}

export interface RouteEdge {
  id: string
  from: string
  to: string
  kind: RouteEdgeKind
  bidirectional: boolean
  /** メートル */
  distance: number
  /** 通行可能か（工事中・閉鎖などは false） */
  passable: boolean
  accessibility: EdgeAccessibility
  status: VerificationStatus
  sources: SourceRef[]
}

export interface RouteGraph {
  nodes: RouteNode[]
  edges: RouteEdge[]
}

export interface DatasetMeta {
  version: string
  updatedAt: string
  /** 地図座標系。建物の配置が 1 件もなければ null */
  mapFrame: MapFrame | null
  notes: string[]
}

export interface CampusData {
  meta: DatasetMeta
  buildings: Building[]
  floors: Floor[]
  rooms: Room[]
  facilities: Facility[]
  routeGraph: RouteGraph
  sources: Source[]
}
