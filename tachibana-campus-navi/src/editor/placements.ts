/**
 * 配置エディタの純粋な処理（テスト対象）。
 * 公式キャンパスマップの画像を下図にして、建物・門などの位置を地図座標で登録する。
 */
import type {
  CampusData,
  MapFrame,
  MapPlacement,
  SourceRef,
  VerificationStatus,
} from '../domain/types.ts'

export type Target = { kind: 'building' | 'facility'; id: string }

export interface DraftPlacement {
  x: number
  y: number
  width: number
  height: number
}

/** ドラッグの始点・終点から正規化した矩形を作る（逆方向のドラッグにも対応） */
export function rectFromDrag(
  a: { x: number; y: number },
  b: { x: number; y: number },
  frame: { width: number; height: number },
): DraftPlacement {
  const clampX = (v: number) => Math.min(frame.width, Math.max(0, v))
  const clampY = (v: number) => Math.min(frame.height, Math.max(0, v))
  const x1 = clampX(Math.min(a.x, b.x))
  const y1 = clampY(Math.min(a.y, b.y))
  const x2 = clampX(Math.max(a.x, b.x))
  const y2 = clampY(Math.max(a.y, b.y))
  return {
    x: Math.round(x1),
    y: Math.round(y1),
    width: Math.round(x2 - x1),
    height: Math.round(y2 - y1),
  }
}

/** 門・バス停のような点は 1×1 の矩形として保存する */
export function pointPlacement(p: { x: number; y: number }): DraftPlacement {
  return { x: Math.round(p.x), y: Math.round(p.y), width: 1, height: 1 }
}

/** 編集結果を CampusData に反映した新しいデータを作る（元のデータは変更しない） */
export function applyPlacements(
  data: CampusData,
  drafts: Map<string, DraftPlacement>,
  options: { frame: MapFrame; status: VerificationStatus; source: SourceRef },
): CampusData {
  const toPlacement = (d: DraftPlacement): MapPlacement => ({
    ...d,
    status: options.status,
    source: options.source,
  })
  return {
    ...data,
    meta: { ...data.meta, mapFrame: options.frame },
    buildings: data.buildings.map((b) => {
      const d = drafts.get(`building:${b.id}`)
      return d ? { ...b, map: toPlacement(d) } : b
    }),
    facilities: data.facilities.map((f) => {
      const d = drafts.get(`facility:${f.id}`)
      return d ? { ...f, map: toPlacement(d) } : f
    }),
  }
}

/** 既存データに登録済みの配置を、編集用の下書きとして取り出す */
export function draftsFromData(data: CampusData): Map<string, DraftPlacement> {
  const drafts = new Map<string, DraftPlacement>()
  for (const b of data.buildings) {
    if (b.map)
      drafts.set(`building:${b.id}`, {
        x: b.map.x,
        y: b.map.y,
        width: b.map.width,
        height: b.map.height,
      })
  }
  for (const f of data.facilities) {
    if (f.map)
      drafts.set(`facility:${f.id}`, {
        x: f.map.x,
        y: f.map.y,
        width: f.map.width,
        height: f.map.height,
      })
  }
  return drafts
}

export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
