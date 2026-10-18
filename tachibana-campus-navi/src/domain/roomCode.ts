import type { CampusIndex } from './campusIndex.ts'
import { levelFromCodeDigit } from './floors.ts'
import type { Building } from './types.ts'

/**
 * 公式一覧にない教室番号について、番号の規則（建物番号＋階＋番号）から読み取れることだけを返す。
 * 推定であり、存在を保証するものではない。画面では必ず「未確認」と明示する。
 */
export interface CodeInference {
  code: string
  building: Building
  /** 番号の先頭の桁から読み取れる階。読み取れなければ null */
  level: number | null
  /** その階に公式一覧の教室が 1 室以上登録されているか（false なら階の推定は示さない） */
  floorRegistered: boolean
  /** 桁数が建物の規則どおり（＝入力途中ではない）か */
  complete: boolean
}

export function inferRoomCode(code: string, index: CampusIndex): CodeInference | null {
  // 建物番号が長い順に試す（将来 2 文字の建物番号が増えても誤判定しないように）
  const candidates = index.data.buildings
    .filter((b) => b.roomCodeRule && code.startsWith(b.roomCodeRule.prefix))
    .sort((a, b) => (b.roomCodeRule?.prefix.length ?? 0) - (a.roomCodeRule?.prefix.length ?? 0))

  for (const building of candidates) {
    const rule = building.roomCodeRule
    if (!rule) continue
    const rest = code.slice(rule.prefix.length)
    if (rest.length === 0 || rest.length > rule.digits || !/^\d+$/.test(rest)) continue
    const level = levelFromCodeDigit(rest[0] ?? '')
    const floorRegistered =
      level !== null &&
      (index.roomsByBuilding.get(building.id) ?? []).some((r) => r.floor === level)
    return { code, building, level, floorRegistered, complete: rest.length === rule.digits }
  }
  return null
}
