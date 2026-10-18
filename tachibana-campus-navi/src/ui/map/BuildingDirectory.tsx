import { useEffect, useRef, type ReactNode } from 'react'
import { floorRangeLabel } from '../../domain/campusIndex.ts'
import { compareNatural } from '../../domain/normalize.ts'
import type { Building, Facility } from '../../domain/types.ts'
import type { Selection } from '../../state/saved.ts'
import { cx, OFFICIAL_CAMPUS_MAP_URL } from '../format.ts'
import { usePrefersReducedMotion } from '../hooks.ts'
import { InfoIcon } from '../icons.tsx'
import { useNavi } from '../naviContext.ts'
import { BuildingBadge, CategoryIcon, ExternalLink } from '../parts.tsx'

interface BuildingDirectoryProps {
  selectedKey: string | null
  focusToken: number
  onSelect(selection: Selection): void
  className?: string
}

const KIND_LABEL: Record<Building['kind'], string> = {
  academic: '教室棟',
  facility: '施設',
  sports: 'スポーツ施設',
  other: '建物',
}

function byCode(a: Building, b: Building) {
  return compareNatural(a.code ?? `~${a.name}`, b.code ?? `~${b.name}`)
}

/**
 * 建物の位置データがないときに地図の代わりに表示する建物一覧。
 * 実際の配置ではないことを明示し、位置は公式キャンパスマップへ案内する。
 */
export function BuildingDirectory({
  selectedKey,
  focusToken,
  onSelect,
  className,
}: BuildingDirectoryProps) {
  const { index } = useNavi()
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    if (focusToken === 0 || !selectedKey || !container) return
    const el = container.querySelector<HTMLElement>(`[data-key="${selectedKey}"]`)
    if (!el) return
    // scrollIntoView は外側の要素までスクロールさせてしまうため、一覧の中だけを動かす
    const top =
      container.scrollTop +
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      12
    container.scrollTo?.({ top, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [focusToken, selectedKey, reducedMotion])

  const academic = index.data.buildings.filter((b) => b.kind === 'academic').sort(byCode)
  const others = index.data.buildings.filter((b) => b.kind !== 'academic').sort(byCode)
  const points = index.data.facilities.filter((f) => !f.buildingId)

  const card = (key: string, selection: Selection, body: ReactNode) => {
    const selected = key === selectedKey
    return (
      <li key={key}>
        <button
          type="button"
          data-key={key}
          aria-current={selected ? 'true' : undefined}
          onClick={() => onSelect(selection)}
          className={cx(
            'flex h-full w-full scroll-mt-3 flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors',
            selected
              ? 'border-accent-fill bg-accent-soft ring-2 ring-accent-fill'
              : 'border-line bg-surface hover:bg-sunken',
          )}
        >
          {body}
        </button>
      </li>
    )
  }

  const buildingCard = (b: Building) => {
    const rooms = index.roomsByBuilding.get(b.id)?.length ?? 0
    const range = floorRangeLabel(index, b.id)
    return card(
      `building:${b.id}`,
      { kind: 'building', id: b.id },
      <>
        <span className="flex w-full items-center gap-2">
          <BuildingBadge building={b} />
          <span className="min-w-0 text-[15px] leading-tight font-bold">{b.name}</span>
        </span>
        <span className="text-xs text-muted">
          {rooms > 0 ? `教室 ${rooms}室${range ? `・${range}` : ''}` : KIND_LABEL[b.kind]}
        </span>
      </>,
    )
  }

  const pointCard = (f: Facility) =>
    card(
      `facility:${f.id}`,
      { kind: 'facility', id: f.id },
      <span className="flex w-full items-center gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-xl bg-sunken text-muted"
          aria-hidden="true"
        >
          <CategoryIcon category={f.category} />
        </span>
        <span className="text-[15px] font-bold">{f.name}</span>
      </span>,
    )

  return (
    <div ref={containerRef} className={cx('h-full overflow-y-auto overscroll-contain', className)}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pt-4 pb-48 lg:px-8 lg:pt-6 lg:pb-12">
        <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
          <InfoIcon className="mt-0.5 shrink-0 text-accent" />
          <div className="text-sm leading-relaxed">
            <p className="font-bold">建物の配置図はまだありません</p>
            <p className="mt-1 text-muted">
              このアプリには建物の位置が未登録のため、建物を一覧で表示しています（実際の配置ではありません）。場所は公式キャンパスマップで確認してください。
            </p>
            <ExternalLink href={OFFICIAL_CAMPUS_MAP_URL} className="mt-2">
              公式キャンパスマップを開く
            </ExternalLink>
          </div>
        </div>

        <section aria-labelledby="dir-academic">
          <h2 id="dir-academic" className="mb-2 text-sm font-bold text-muted">
            教室のある建物
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {academic.map(buildingCard)}
          </ul>
        </section>

        <section aria-labelledby="dir-others">
          <h2 id="dir-others" className="mb-2 text-sm font-bold text-muted">
            その他の建物・施設
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {others.map(buildingCard)}
          </ul>
        </section>

        {points.length > 0 && (
          <section aria-labelledby="dir-points">
            <h2 id="dir-points" className="mb-2 text-sm font-bold text-muted">
              門・交通
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {points.map(pointCard)}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
