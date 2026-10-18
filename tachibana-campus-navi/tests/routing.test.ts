import { describe, expect, it } from 'vitest'
import { buildCampusIndex } from '../src/domain/campusIndex.ts'
import { buildAdjacency, planRoute, shortestPath } from '../src/domain/routing.ts'
import type { CampusData, RouteEdge, RouteNode } from '../src/domain/types.ts'
import { loadRealData, loadRealIndex } from './helpers.ts'

const src = [{ sourceId: 'test' }]

function node(id: string, extra: Partial<RouteNode> = {}): RouteNode {
  return {
    id,
    kind: 'junction',
    label: id,
    buildingId: null,
    floor: null,
    position: null,
    refId: null,
    status: 'verified',
    sources: src,
    ...extra,
  }
}

function edge(
  id: string,
  from: string,
  to: string,
  distance: number,
  extra: Partial<RouteEdge> = {},
): RouteEdge {
  return {
    id,
    from,
    to,
    kind: 'walkway',
    bidirectional: true,
    distance,
    passable: true,
    accessibility: { stepFree: true, hasStairs: false, slope: 'flat', note: null },
    status: 'verified',
    sources: src,
    ...extra,
  }
}

/**
 * テスト用の架空キャンパス（実データではない）
 *   gate ─100─ a ─100─ X入口
 *   gate ─ 50(階段) ─ X入口
 *   gate ─ 30(未検証) ─ X入口
 */
function fixture(): CampusData {
  const { data } = loadRealData()
  return {
    ...data,
    sources: [
      ...data.sources,
      {
        id: 'test',
        title: 't',
        url: null,
        publisher: 't',
        kind: 'provided',
        accessedAt: null,
        accessMethod: 'provided',
      },
    ],
    routeGraph: {
      nodes: [
        node('gate', { kind: 'gate', refId: 'main-gate', label: '正門' }),
        node('a'),
        node('x-entrance', {
          kind: 'entrance',
          buildingId: 'academic-links',
          label: 'アカデミックリンクス入口',
        }),
        node('x-301', {
          kind: 'room',
          buildingId: 'academic-links',
          floor: 3,
          refId: 'H301',
          label: 'H301',
        }),
      ],
      edges: [
        edge('e1', 'gate', 'a', 100),
        edge('e2', 'a', 'x-entrance', 100),
        edge('stairs', 'gate', 'x-entrance', 50, {
          kind: 'stairs',
          accessibility: { stepFree: false, hasStairs: true, slope: null, note: null },
        }),
        edge('unverified', 'gate', 'x-entrance', 30, { status: 'pending' }),
        edge('elevator', 'x-entrance', 'x-301', 20, { kind: 'elevator' }),
      ],
    },
  }
}

describe('shortestPath（Dijkstra）', () => {
  it('最短距離の経路を返す', () => {
    const adj = buildAdjacency(fixture().routeGraph, false)
    const path = shortestPath(adj, ['gate'], ['x-301'])
    expect(path?.edges.map((e) => e.id)).toEqual(['stairs', 'elevator'])
    expect(path?.distance).toBe(70)
  })

  it('未検証のエッジは距離が短くても使わない', () => {
    const adj = buildAdjacency(fixture().routeGraph, false)
    const used = shortestPath(adj, ['gate'], ['x-entrance'])?.edges.map((e) => e.id)
    expect(used).not.toContain('unverified')
  })

  it('バリアフリー指定では階段を避ける', () => {
    const adj = buildAdjacency(fixture().routeGraph, true)
    const path = shortestPath(adj, ['gate'], ['x-301'])
    expect(path?.edges.map((e) => e.id)).toEqual(['e1', 'e2', 'elevator'])
    expect(path?.distance).toBe(220)
  })

  it('段差の有無が未確認のエッジはバリアフリー経路に使わない', () => {
    const data = fixture()
    data.routeGraph.edges = data.routeGraph.edges.map((e) =>
      e.id === 'e2' ? { ...e, accessibility: { ...e.accessibility, stepFree: null } } : e,
    )
    const adj = buildAdjacency(data.routeGraph, true)
    expect(shortestPath(adj, ['gate'], ['x-301'])).toBeNull()
  })

  it('通行不可のエッジは使わない', () => {
    const data = fixture()
    data.routeGraph.edges = data.routeGraph.edges.map((e) =>
      e.id === 'stairs' ? { ...e, passable: false } : e,
    )
    const path = shortestPath(buildAdjacency(data.routeGraph, false), ['gate'], ['x-301'])
    expect(path?.edges.map((e) => e.id)).toEqual(['e1', 'e2', 'elevator'])
  })
})

describe('planRoute', () => {
  it('検証済みデータがあれば経路を返す', () => {
    const plan = planRoute(buildCampusIndex(fixture()), {
      from: { kind: 'facility', id: 'main-gate' },
      to: { kind: 'room', code: 'H301' },
      accessible: true,
    })
    expect(plan.status).toBe('found')
    if (plan.status === 'found')
      expect(plan.steps.map((s) => s.edge.id)).toEqual(['e1', 'e2', 'elevator'])
  })

  it('教室ノードがなければ建物入口までの経路と、建物内の階の案内を返す', () => {
    const plan = planRoute(buildCampusIndex(fixture()), {
      from: { kind: 'facility', id: 'main-gate' },
      to: { kind: 'room', code: 'H401' },
      accessible: false,
    })
    expect(plan.status).toBe('found')
    if (plan.status === 'found') expect(plan.indoorNote).toContain('4階')
  })

  it('実データでは検証済みの通路がないため、経路を作らず不足データを返す', () => {
    const plan = planRoute(loadRealIndex(), {
      from: { kind: 'facility', id: 'main-gate' },
      to: { kind: 'room', code: 'H301' },
      accessible: false,
    })
    expect(plan.status).toBe('unavailable')
    if (plan.status === 'unavailable') {
      expect(plan.missing.length).toBeGreaterThan(0)
      expect(plan.missing.join('\n')).toContain('アカデミックリンクス')
    }
  })

  it('出発地と目的地が同じなら案内しない', () => {
    const plan = planRoute(loadRealIndex(), {
      from: { kind: 'room', code: 'H301' },
      to: { kind: 'room', code: 'H301' },
      accessible: false,
    })
    expect(plan).toEqual({ status: 'unavailable', reason: 'same-place', missing: [] })
  })
})
