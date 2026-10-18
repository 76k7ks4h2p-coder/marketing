import { useMemo } from 'react'
import type { Selection } from '../../state/saved.ts'
import { useNavi } from '../naviContext.ts'
import { BuildingDirectory } from './BuildingDirectory.tsx'
import { CampusMap } from './CampusMap.tsx'
import { buildMapItems, mapKeyForSelection } from './mapItems.ts'

interface MapAreaProps {
  selection: Selection | null
  focusToken: number
  onSelect(selection: Selection): void
  focusAnchorY?: number
}

/**
 * 建物の位置が登録されていれば SVG の概略図、なければ建物一覧を表示する。
 * （位置を推測して地図を描くことはしない）
 */
export function MapArea({ selection, focusToken, onSelect, focusAnchorY }: MapAreaProps) {
  const { index } = useNavi()
  const items = useMemo(() => buildMapItems(index), [index])
  const frame = index.data.meta.mapFrame
  const selectedKey = mapKeyForSelection(index, selection)

  if (frame && items.length > 0) {
    const placed = new Set(items.map((i) => i.key))
    const unplaced = index.data.buildings.filter((b) => !placed.has(`building:${b.id}`)).length
    return (
      <CampusMap
        frame={frame}
        items={items}
        selectedKey={selectedKey}
        focusToken={focusToken}
        onSelect={onSelect}
        unplacedCount={unplaced}
        focusAnchorY={focusAnchorY}
      />
    )
  }
  return <BuildingDirectory selectedKey={selectedKey} focusToken={focusToken} onSelect={onSelect} />
}
