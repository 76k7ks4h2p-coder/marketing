/**
 * 経路探索（Dijkstra 法）。
 *
 * 安全のための原則:
 * - 公式資料と照合済み（status: "verified"）かつ通行可能なノード・エッジだけを使う
 * - バリアフリー指定時は「段差なし」が確認されたエッジだけを使う（未確認は使わない）
 * - 経路が組めないときは推測で補わず、何のデータが足りないかを返す
 */
import type { CampusIndex } from './campusIndex.ts'
import { floorLabel } from './floors.ts'
import type { RouteEdge, RouteGraph, RouteNode } from './types.ts'

export type RoutePlace =
  | { kind: 'facility'; id: string }
  | { kind: 'building'; id: string }
  | { kind: 'room'; code: string }

export interface RouteRequest {
  from: RoutePlace
  to: RoutePlace
  /** 階段・急勾配・段差未確認の区間を使わない */
  accessible: boolean
}

export interface RouteStep {
  from: RouteNode
  to: RouteNode
  edge: RouteEdge
  /** 注意事項（緩やかな坂など） */
  cautions: string[]
}

export type RoutePlan =
  | {
      status: 'found'
      steps: RouteStep[]
      distance: number
      /** 経路の終点から先、建物内で必要な案内（例: 3階へ） */
      indoorNote: string | null
    }
  | {
      status: 'unavailable'
      reason: 'same-place' | 'start-not-registered' | 'goal-not-registered' | 'no-verified-path'
      /** 経路案内に必要な追加データ */
      missing: string[]
    }

export function placeKey(place: RoutePlace): string {
  return place.kind === 'room' ? `room:${place.code}` : `${place.kind}:${place.id}`
}

export function placeLabel(index: CampusIndex, place: RoutePlace): string {
  switch (place.kind) {
    case 'room': {
      const room = index.roomByCode.get(place.code)
      const building = room ? index.buildingById.get(room.buildingId) : undefined
      return room && building
        ? `${place.code}（${building.name} ${floorLabel(room.floor)}）`
        : place.code
    }
    case 'building':
      return index.buildingById.get(place.id)?.name ?? place.id
    case 'facility':
      return index.facilityById.get(place.id)?.name ?? place.id
  }
}

/** 段差なしで通れることが確認されているエッジか */
export function isStepFree(edge: RouteEdge): boolean {
  return (
    edge.kind !== 'stairs' &&
    !edge.accessibility.hasStairs &&
    edge.accessibility.stepFree === true &&
    edge.accessibility.slope !== 'steep'
  )
}

export function isUsableEdge(edge: RouteEdge, accessible: boolean): boolean {
  if (edge.status !== 'verified' || !edge.passable) return false
  return accessible ? isStepFree(edge) : true
}

interface Adjacent {
  to: string
  edge: RouteEdge
}

export function buildAdjacency(graph: RouteGraph, accessible: boolean): Map<string, Adjacent[]> {
  const verifiedNodes = new Set(graph.nodes.filter((n) => n.status === 'verified').map((n) => n.id))
  const adj = new Map<string, Adjacent[]>()
  const push = (from: string, to: string, edge: RouteEdge) => {
    const list = adj.get(from)
    if (list) list.push({ to, edge })
    else adj.set(from, [{ to, edge }])
  }
  for (const edge of graph.edges) {
    if (!isUsableEdge(edge, accessible)) continue
    if (!verifiedNodes.has(edge.from) || !verifiedNodes.has(edge.to)) continue
    push(edge.from, edge.to, edge)
    if (edge.bidirectional) push(edge.to, edge.from, edge)
  }
  return adj
}

/** 二分ヒープによる優先度付きキュー */
class MinHeap<T> {
  private items: { key: number; value: T }[] = []

  get size(): number {
    return this.items.length
  }

  push(key: number, value: T): void {
    const items = this.items
    items.push({ key, value })
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      const p = items[parent]
      const c = items[i]
      if (!p || !c || p.key <= c.key) break
      items[parent] = c
      items[i] = p
      i = parent
    }
  }

  pop(): { key: number; value: T } | undefined {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length > 0 && last) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let smallest = i
        if ((items[l]?.key ?? Infinity) < (items[smallest]?.key ?? Infinity)) smallest = l
        if ((items[r]?.key ?? Infinity) < (items[smallest]?.key ?? Infinity)) smallest = r
        if (smallest === i) break
        const a = items[i]
        const b = items[smallest]
        if (!a || !b) break
        items[i] = b
        items[smallest] = a
        i = smallest
      }
    }
    return top
  }
}

/**
 * 複数の始点・終点を持つ Dijkstra 法。最短経路のエッジ列を返す（到達できなければ null）。
 */
export function shortestPath(
  adjacency: Map<string, Adjacent[]>,
  starts: string[],
  goals: string[],
): { nodes: string[]; edges: RouteEdge[]; distance: number } | null {
  const goalSet = new Set(goals)
  const dist = new Map<string, number>()
  const prev = new Map<string, { node: string; edge: RouteEdge }>()
  const heap = new MinHeap<string>()
  for (const s of starts) {
    dist.set(s, 0)
    heap.push(0, s)
  }
  while (heap.size > 0) {
    const item = heap.pop()
    if (!item) break
    const { key: d, value: node } = item
    if (d > (dist.get(node) ?? Infinity)) continue
    if (goalSet.has(node)) {
      const nodes = [node]
      const edges: RouteEdge[] = []
      let cur = node
      for (let step = prev.get(cur); step; step = prev.get(cur)) {
        edges.unshift(step.edge)
        nodes.unshift(step.node)
        cur = step.node
      }
      return { nodes, edges, distance: d }
    }
    for (const { to, edge } of adjacency.get(node) ?? []) {
      const nd = d + edge.distance
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, { node, edge })
        heap.push(nd, to)
      }
    }
  }
  return null
}

/** 場所に対応する経路ノード（教室ノードがなければ建物の入口ノード） */
function resolveNodes(
  index: CampusIndex,
  place: RoutePlace,
): { nodes: RouteNode[]; viaBuilding: boolean } {
  const nodes = index.data.routeGraph.nodes.filter((n) => n.status === 'verified')
  switch (place.kind) {
    case 'facility': {
      const direct = nodes.filter((n) => n.refId === place.id)
      if (direct.length > 0) return { nodes: direct, viaBuilding: false }
      const buildingId = index.facilityById.get(place.id)?.buildingId
      const entrances = nodes.filter((n) => n.kind === 'entrance' && n.buildingId === buildingId)
      return { nodes: buildingId ? entrances : [], viaBuilding: true }
    }
    case 'building':
      return {
        nodes: nodes.filter((n) => n.kind === 'entrance' && n.buildingId === place.id),
        viaBuilding: false,
      }
    case 'room': {
      const direct = nodes.filter((n) => n.kind === 'room' && n.refId === place.code)
      if (direct.length > 0) return { nodes: direct, viaBuilding: false }
      const buildingId = index.roomByCode.get(place.code)?.buildingId
      const entrances = nodes.filter((n) => n.kind === 'entrance' && n.buildingId === buildingId)
      return { nodes: buildingId ? entrances : [], viaBuilding: true }
    }
  }
}

function missingFor(index: CampusIndex, place: RoutePlace): string {
  switch (place.kind) {
    case 'room': {
      const room = index.roomByCode.get(place.code)
      const building = room ? index.buildingById.get(room.buildingId) : undefined
      return `${building?.name ?? place.code}の入口（または ${place.code} までの建物内経路）`
    }
    case 'building':
      return `${placeLabel(index, place)}の入口の位置`
    case 'facility':
      return `${placeLabel(index, place)}の位置`
  }
}

export function planRoute(index: CampusIndex, request: RouteRequest): RoutePlan {
  if (placeKey(request.from) === placeKey(request.to)) {
    return { status: 'unavailable', reason: 'same-place', missing: [] }
  }
  const start = resolveNodes(index, request.from)
  const goal = resolveNodes(index, request.to)
  const missing: string[] = []
  if (start.nodes.length === 0)
    missing.push(`出発地: ${missingFor(index, request.from)}（検証済みの経路ノード）`)
  if (goal.nodes.length === 0)
    missing.push(`目的地: ${missingFor(index, request.to)}（検証済みの経路ノード）`)
  const between = `${placeLabel(index, request.from)} から ${placeLabel(index, request.to)} までの通路（公式資料と照合済みの経路エッジ${request.accessible ? '・段差の有無を含む' : ''}）`
  if (start.nodes.length === 0 || goal.nodes.length === 0) {
    return {
      status: 'unavailable',
      reason: start.nodes.length === 0 ? 'start-not-registered' : 'goal-not-registered',
      missing: [...missing, between],
    }
  }

  const adjacency = buildAdjacency(index.data.routeGraph, request.accessible)
  const path = shortestPath(
    adjacency,
    start.nodes.map((n) => n.id),
    goal.nodes.map((n) => n.id),
  )
  if (!path) {
    return { status: 'unavailable', reason: 'no-verified-path', missing: [between] }
  }

  const nodeById = new Map(index.data.routeGraph.nodes.map((n) => [n.id, n]))
  const steps: RouteStep[] = []
  path.edges.forEach((edge, i) => {
    const from = nodeById.get(path.nodes[i] ?? '')
    const to = nodeById.get(path.nodes[i + 1] ?? '')
    if (!from || !to) return
    const cautions: string[] = []
    if (edge.accessibility.slope === 'gentle') cautions.push('ゆるやかな坂があります')
    if (edge.accessibility.slope === 'steep') cautions.push('急な坂があります')
    if (edge.accessibility.hasStairs) cautions.push('階段があります')
    if (edge.accessibility.note) cautions.push(edge.accessibility.note)
    steps.push({ from, to, edge, cautions })
  })

  let indoorNote: string | null = null
  if (goal.viaBuilding && request.to.kind === 'room') {
    const room = index.roomByCode.get(request.to.code)
    if (room) {
      indoorNote = `建物に入ったら ${floorLabel(room.floor)} の ${room.code} へ向かってください（建物内の経路は未登録です）。`
    }
  }

  return { status: 'found', steps, distance: path.distance, indoorNote }
}
