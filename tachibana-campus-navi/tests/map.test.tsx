import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCampusIndex } from '../src/domain/campusIndex.ts'
import { checkIntegrity } from '../src/domain/validate.ts'
import {
  applyPlacements,
  draftsFromData,
  pointPlacement,
  rectFromDrag,
} from '../src/editor/placements.ts'
import { CampusMap } from '../src/ui/map/CampusMap.tsx'
import { buildMapItems, mapKeyForSelection } from '../src/ui/map/mapItems.ts'
import { clampView, fitView, zoomAround } from '../src/ui/map/view.ts'
import { loadRealData } from './helpers.ts'

const frame = { width: 1000, height: 600 }
const source = { sourceId: 'official-campus-map', note: 'テスト用の配置' }

/** テスト用に 2 棟だけ配置したデータ（実在の位置ではない） */
function placedData() {
  const { data } = loadRealData()
  const drafts = new Map([
    ['building:academic-links', { x: 100, y: 100, width: 200, height: 120 }],
    ['building:academic-terrace', { x: 500, y: 300, width: 160, height: 160 }],
    ['facility:main-gate', pointPlacement({ x: 900, y: 550 })],
  ])
  return applyPlacements(data, drafts, {
    frame: { ...frame, source },
    status: 'pending',
    source,
  })
}

describe('地図の表示計算', () => {
  const size = { w: 400, h: 300 }

  it('全体表示は地図全体を画面内に収める', () => {
    const v = fitView(frame, size)
    expect(frame.width * v.k).toBeLessThanOrEqual(size.w)
    expect(frame.height * v.k).toBeLessThanOrEqual(size.h)
  })

  it('拡大縮小の中心にした点は画面上で動かない', () => {
    const v = { x: 10, y: 20, k: 0.5 }
    const p = { x: 150, y: 120 }
    const z = zoomAround(v, p, 2, { min: 0.1, max: 10 })
    const before = { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k }
    const after = { x: (p.x - z.x) / z.k, y: (p.y - z.y) / z.k }
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(zoomAround(v, p, 1000, { min: 0.1, max: 3 }).k).toBe(3)
  })

  it('地図を画面の外へ飛ばさない', () => {
    const v = clampView({ x: 5000, y: -5000, k: 0.4 }, frame, size)
    expect(v.x).toBeLessThanOrEqual(size.w / 2)
    expect(v.y).toBeGreaterThanOrEqual(size.h / 2 - frame.height * 0.4)
  })
})

describe('配置エディタの処理', () => {
  it('逆向きのドラッグでも矩形を作り、地図の外ははみ出さない', () => {
    expect(rectFromDrag({ x: 300, y: 200 }, { x: 100, y: 50 }, frame)).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 150,
    })
    expect(rectFromDrag({ x: -50, y: 10 }, { x: 1200, y: 20 }, frame)).toMatchObject({
      x: 0,
      width: 1000,
    })
  })

  it('書き出したデータは整合性チェックを通り、読み戻せる', () => {
    const data = placedData()
    expect(checkIntegrity(data)).toEqual([])
    expect(data.meta.mapFrame).toMatchObject(frame)
    expect(draftsFromData(data).get('building:academic-links')).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 120,
    })
  })
})

describe('CampusMap（SVG の概略図）', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
  })
  afterEach(() => vi.restoreAllMocks())

  it('位置が登録された建物だけを描き、選択・キーボード操作ができる', async () => {
    const index = buildCampusIndex(placedData())
    const items = buildMapItems(index)
    expect(items.map((i) => i.key)).toEqual([
      'building:academic-links',
      'building:academic-terrace',
      'facility:main-gate',
    ])
    const onSelect = vi.fn()
    render(
      <CampusMap
        frame={frame}
        items={items}
        selectedKey={mapKeyForSelection(index, { kind: 'room', id: 'H301' })}
        focusToken={1}
        onSelect={onSelect}
        unplacedCount={index.data.buildings.length - 2}
      />,
    )

    const links = await screen.findByRole('button', { name: 'H アカデミックリンクス' })
    expect(links.getAttribute('aria-pressed')).toBe('true')
    const terrace = screen.getByRole('button', { name: 'J アカデミックテラス' })
    expect(terrace.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(terrace)
    expect(onSelect).toHaveBeenCalledWith({ kind: 'building', id: 'academic-terrace' })
    fireEvent.keyDown(screen.getByRole('button', { name: '正門' }), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith({ kind: 'facility', id: 'main-gate' })

    expect(screen.getByText('キャンパス概略図（測量図ではありません）')).toBeTruthy()
    expect(screen.getByText('破線の建物は位置の照合待ちです')).toBeTruthy()
    expect(screen.getByText(/位置未登録の建物：21棟/)).toBeTruthy()
    for (const name of ['拡大', '縮小', '全体を表示']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })
})
