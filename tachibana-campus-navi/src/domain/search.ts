import type { CampusIndex } from './campusIndex.ts'
import {
  compareNatural,
  correctDigitTypos,
  looksLikeRoomCode,
  normalizeCode,
  normalizeText,
  toNarrow,
} from './normalize.ts'
import { inferRoomCode, type CodeInference } from './roomCode.ts'
import type { Building, Facility, Room } from './types.ts'

export type SearchHit =
  | { kind: 'room'; room: Room; building: Building; score: number }
  | { kind: 'building'; building: Building; score: number }
  | { kind: 'facility'; facility: Facility; building: Building | null; score: number }

export interface SearchOutcome {
  query: string
  /** 教室番号として正規化した入力（例: "ｈ－３０１" → "H301"） */
  code: string
  hits: SearchHit[]
  /** 公式一覧に完全一致した教室 */
  exactRoom: Room | null
  /** O→0 などの打ち間違いを補正して一致した場合の補正後の番号 */
  correctedFrom: string | null
  /** 一致する教室がないとき、番号の規則から読み取れること（未確認の推定） */
  inference: CodeInference | null
  /** 件数上限で切り捨てる前の件数 */
  total: number
}

const SCORE = {
  roomExact: 1000,
  buildingNameExact: 950,
  facilityNameExact: 930,
  buildingCode: 900,
  buildingNamePrefix: 820,
  facilityNamePrefix: 800,
  roomCodePrefix: 700,
  buildingFloor: 680,
  buildingNameContains: 640,
  facilityNameContains: 620,
  roomNamePrefix: 560,
  roomNameContains: 520,
} as const

function hitKey(hit: SearchHit): string {
  switch (hit.kind) {
    case 'room':
      return `room:${hit.room.code}`
    case 'building':
      return `building:${hit.building.id}`
    case 'facility':
      return `facility:${hit.facility.id}`
  }
}

function hitLabel(hit: SearchHit): string {
  switch (hit.kind) {
    case 'room':
      return hit.room.code
    case 'building':
      return hit.building.code ?? hit.building.name
    case 'facility':
      return hit.facility.name
  }
}

const KIND_ORDER = { room: 0, building: 1, facility: 2 } as const

function textScore(keys: string[], text: string, exact: number, prefix: number, contains: number) {
  let best = 0
  for (const key of keys) {
    if (key === text) best = Math.max(best, exact)
    else if (key.startsWith(text)) best = Math.max(best, prefix)
    else if (key.includes(text)) best = Math.max(best, contains)
  }
  return best
}

/** 「清和館3階」「H棟 4F」「啓成館 地下1階」のような 建物＋階 の入力を読み取る */
function parseBuildingFloor(
  index: CampusIndex,
  query: string,
): { building: Building; level: number } | null {
  const s = toNarrow(query).toLowerCase().replace(/\s+/g, '')
  const m = /^(.+?)(地下|b)?(\d{1,2})(階|f)$/u.exec(s)
  if (!m) return null
  const [, namePart = '', basement, digits = ''] = m
  const level = basement ? -Number(digits) : Number(digits)
  const key = normalizeText(namePart)
  for (const building of index.data.buildings) {
    const keys = index.buildingKeys.get(building.id) ?? []
    if (keys.includes(key) || building.code?.toLowerCase() === key) return { building, level }
  }
  return null
}

/**
 * 教室番号・建物名・施設名・教室名をまとめて検索する。入力途中でも候補を返す（インクリメンタル検索）。
 */
export function searchCampus(index: CampusIndex, query: string, limit = 40): SearchOutcome {
  const code = normalizeCode(query)
  const text = normalizeText(query)
  const empty: SearchOutcome = {
    query,
    code,
    hits: [],
    exactRoom: null,
    correctedFrom: null,
    inference: null,
    total: 0,
  }
  if (!code && !text) return empty

  const hits = new Map<string, SearchHit>()
  const add = (hit: SearchHit) => {
    const key = hitKey(hit)
    const prev = hits.get(key)
    if (!prev || prev.score < hit.score) hits.set(key, hit)
  }

  // 1) 教室番号（完全一致・前方一致）
  let exactRoom = index.roomByCode.get(code) ?? null
  let correctedFrom: string | null = null
  if (!exactRoom) {
    const corrected = correctDigitTypos(code)
    const fixed = corrected ? index.roomByCode.get(corrected) : undefined
    if (corrected && fixed) {
      exactRoom = fixed
      correctedFrom = code
    }
  }
  const codeForPrefix = correctedFrom && exactRoom ? exactRoom.code : code
  if (codeForPrefix) {
    for (const room of index.data.rooms) {
      const building = index.buildingById.get(room.buildingId)
      if (!building) continue
      if (room.code === codeForPrefix) {
        add({ kind: 'room', room, building, score: SCORE.roomExact })
      } else if (room.code.startsWith(codeForPrefix)) {
        const remainder = room.code.length - codeForPrefix.length
        add({ kind: 'room', room, building, score: SCORE.roomCodePrefix - remainder * 5 })
      }
    }
  }

  // 2) 建物（建物番号・名称・別名）
  for (const building of index.data.buildings) {
    if (building.code && building.code === code) {
      add({ kind: 'building', building, score: SCORE.buildingCode })
    }
    if (text) {
      const score = textScore(
        index.buildingKeys.get(building.id) ?? [],
        text,
        SCORE.buildingNameExact,
        SCORE.buildingNamePrefix,
        SCORE.buildingNameContains,
      )
      if (score > 0) add({ kind: 'building', building, score })
    }
  }

  // 3) 施設（食堂・図書館・コモンズ・門など）
  if (text) {
    for (const facility of index.data.facilities) {
      const score = textScore(
        index.facilityKeys.get(facility.id) ?? [],
        text,
        SCORE.facilityNameExact,
        SCORE.facilityNamePrefix,
        SCORE.facilityNameContains,
      )
      if (score > 0) {
        const building = facility.buildingId
          ? (index.buildingById.get(facility.buildingId) ?? null)
          : null
        add({ kind: 'facility', facility, building, score })
      }
    }
  }

  // 4) 教室名（「書道」「PC教室」「Media Lab」など）。1 文字だけの入力では広がりすぎるので除外
  if (text.length >= 2) {
    for (const room of index.data.rooms) {
      const key = index.roomNameKeys.get(room.code)
      const building = index.buildingById.get(room.buildingId)
      if (!key || !building) continue
      if (key.startsWith(text)) add({ kind: 'room', room, building, score: SCORE.roomNamePrefix })
      else if (key.includes(text))
        add({ kind: 'room', room, building, score: SCORE.roomNameContains })
    }
  }

  // 5) 建物＋階（「清和館3階」）
  const bf = parseBuildingFloor(index, query)
  if (bf) {
    for (const room of index.roomsByBuilding.get(bf.building.id) ?? []) {
      if (room.floor === bf.level) {
        add({ kind: 'room', room, building: bf.building, score: SCORE.buildingFloor })
      }
    }
  }

  const sorted = [...hits.values()].sort(
    (a, b) =>
      b.score - a.score ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      compareNatural(hitLabel(a), hitLabel(b)),
  )

  const inference = !exactRoom && looksLikeRoomCode(code) ? inferRoomCode(code, index) : null

  return {
    query,
    code,
    hits: sorted.slice(0, limit),
    exactRoom,
    correctedFrom,
    inference,
    total: sorted.length,
  }
}
