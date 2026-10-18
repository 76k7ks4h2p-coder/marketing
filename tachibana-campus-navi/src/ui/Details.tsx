import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { buildingLabel, facilitiesOnFloor, roomsOnFloor, roomTitle } from '../domain/campusIndex.ts'
import { floorLabel, floorShortLabel } from '../domain/floors.ts'
import type { Building, Source, SourceRef } from '../domain/types.ts'
import { isFavorite, type Selection } from '../state/saved.ts'
import { describeSelection } from './describe.ts'
import {
  CATEGORY_LABEL,
  cx,
  formatCapacity,
  OFFICIAL_CAMPUS_MAP_URL,
  statusText,
} from './format.ts'
import { ChevronRightIcon, LayersIcon, MapIcon, RouteIcon, ShareIcon, StarIcon } from './icons.tsx'
import { useNavi } from './naviContext.ts'
import {
  BuildingBadge,
  Button,
  CategoryIcon,
  ExternalLink,
  SectionTitle,
  SourceList,
  VerificationBadge,
} from './parts.tsx'

function useSources(refs: SourceRef[]): { sources: Source[]; notes: (string | undefined)[] } {
  const { index } = useNavi()
  const found = refs.flatMap((ref) => {
    const source = index.sourceById.get(ref.sourceId)
    return source ? [{ source, note: ref.note }] : []
  })
  return { sources: found.map((f) => f.source), notes: found.map((f) => f.note) }
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line py-3 last:border-b-0">
      <dt className="w-24 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] font-semibold">{children}</dd>
    </div>
  )
}

/** 地図上の位置の表示（未登録なら公式マップへ誘導） */
function MapPositionText({ building }: { building: Building | null }) {
  if (building?.map) {
    return <span>キャンパス概略図に表示できます</span>
  }
  return (
    <span className="font-normal">
      <span className="font-semibold">このアプリには未登録</span>
      <span className="mt-1 block text-sm">
        <ExternalLink href={OFFICIAL_CAMPUS_MAP_URL}>公式キャンパスマップで確認</ExternalLink>
      </span>
    </span>
  )
}

/** 地図で見る・ここへ行く・お気に入り・共有 */
function ActionBar({ sel }: { sel: Selection }) {
  const { favorites, actions } = useNavi()
  const fav = isFavorite(favorites, sel)
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="primary" onClick={() => actions.showOnMap(sel)}>
        <MapIcon size={18} />
        地図で見る
      </Button>
      <Button variant="primary" onClick={() => actions.startRoute(sel)}>
        <RouteIcon size={18} />
        ここへ行く
      </Button>
      <Button onClick={() => actions.toggleFavorite(sel)} aria-pressed={fav}>
        <StarIcon size={18} filled={fav} className={fav ? 'text-accent' : undefined} />
        {fav ? 'お気に入り済み' : 'お気に入り'}
      </Button>
      <Button onClick={() => actions.share(sel)}>
        <ShareIcon size={18} />
        共有
      </Button>
    </div>
  )
}

function MissingDetail() {
  return (
    <p className="rounded-2xl bg-sunken p-4 text-sm">
      この項目は現在のデータに見つかりません。データの更新で変更・削除された可能性があります。
    </p>
  )
}

export function RoomDetail({ code }: { code: string }) {
  const { index, actions } = useNavi()
  const room = index.roomByCode.get(code)
  const building = room ? index.buildingById.get(room.buildingId) : undefined
  const { sources } = useSources(room ? [{ sourceId: room.sourceId }] : [])
  if (!room || !building) return <MissingDetail />

  const sel: Selection = { kind: 'room', id: room.code }
  const sameFloor = roomsOnFloor(index, building.id, room.floor).filter((r) => r.code !== room.code)
  const status = statusText(room.status)

  return (
    <article aria-labelledby="detail-title" className="space-y-5">
      <header className="flex items-start gap-3">
        <BuildingBadge building={building} size="lg" />
        <div className="min-w-0">
          <h2 id="detail-title" className="text-2xl leading-tight font-bold">
            {roomTitle(room)}
          </h2>
          <p className="mt-1 text-lg font-bold text-accent">
            {building.name}・{floorLabel(room.floor)}
          </p>
        </div>
      </header>

      <dl className="rounded-2xl border border-line bg-surface px-4">
        <InfoRow label="建物">
          <button
            type="button"
            onClick={() =>
              actions.select({ kind: 'building', id: building.id }, { floor: room.floor })
            }
            className="inline-flex items-center gap-1 text-left text-accent underline-offset-2 hover:underline"
          >
            {building.name}
            <ChevronRightIcon size={16} />
          </button>
        </InfoRow>
        <InfoRow label="建物番号">{building.code ?? '公式マップに番号なし'}</InfoRow>
        <InfoRow label="階数">{floorLabel(room.floor)}</InfoRow>
        <InfoRow label="収容人数">{formatCapacity(room.capacity)}</InfoRow>
        <InfoRow label="地図上の位置">
          <MapPositionText building={building} />
        </InfoRow>
        <InfoRow label="確認状況">
          <VerificationBadge status={room.status} />
          <span className="mt-1 block text-sm font-normal text-muted">{status.description}</span>
        </InfoRow>
      </dl>

      {room.note && <p className="text-sm leading-relaxed text-muted">備考：{room.note}</p>}

      <ActionBar sel={sel} />

      {sameFloor.length > 0 && (
        <section>
          <SectionTitle>同じ階（{floorLabel(room.floor)}）の教室</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {sameFloor.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => actions.select({ kind: 'room', id: r.code })}
                className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-sunken"
              >
                {r.code}
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => actions.select({ kind: 'building', id: building.id }, { floor: room.floor })}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:bg-sunken"
      >
        <LayersIcon className="text-accent" />
        <span className="flex-1 font-semibold">{buildingLabel(building)} の階別教室一覧</span>
        <ChevronRightIcon className="text-muted" />
      </button>

      <SourceList sources={sources} checkedAt={room.checkedAt} />
    </article>
  )
}

export function BuildingDetail({ id, initialFloor }: { id: string; initialFloor?: number }) {
  const { index, actions } = useNavi()
  const building = index.buildingById.get(id)
  const floors = index.floorsByBuilding.get(id) ?? []
  const rooms = index.roomsByBuilding.get(id) ?? []
  const firstWithRooms = floors.find((f) => rooms.some((r) => r.floor === f.level))?.level
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>(
    initialFloor !== undefined && floors.some((f) => f.level === initialFloor)
      ? initialFloor
      : (firstWithRooms ?? floors[0]?.level),
  )
  const tabsId = useId()
  const { sources, notes } = useSources(building?.sources ?? [])
  if (!building) return <MissingDetail />

  const sel: Selection = { kind: 'building', id: building.id }
  const d = describeSelection(index, sel)
  const floorRooms = selectedFloor !== undefined ? roomsOnFloor(index, id, selectedFloor) : []
  const floorFacilities =
    selectedFloor !== undefined ? facilitiesOnFloor(index, id, selectedFloor) : []
  const otherFacilities = (index.facilitiesByBuilding.get(id) ?? []).filter((f) => f.floor === null)
  const floorObj = floors.find((f) => f.level === selectedFloor)

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const targets: Record<string, number> = {
      ArrowRight: Math.min(i + 1, floors.length - 1),
      ArrowLeft: Math.max(i - 1, 0),
      Home: 0,
      End: floors.length - 1,
    }
    const next = targets[e.key]
    if (next === undefined) return
    e.preventDefault()
    const f = floors[next]
    if (f) {
      setSelectedFloor(f.level)
      document.getElementById(`${tabsId}-tab-${next}`)?.focus()
    }
  }

  return (
    <article aria-labelledby="detail-title" className="space-y-5">
      <header className="flex items-start gap-3">
        <BuildingBadge building={building} size="lg" />
        <div className="min-w-0">
          <h2 id="detail-title" className="text-2xl leading-tight font-bold">
            {building.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted">{d?.subtitle}</p>
          <div className="mt-2">
            <VerificationBadge status={building.status} />
          </div>
        </div>
      </header>

      {building.description && (
        <p className="text-[15px] leading-relaxed">{building.description}</p>
      )}

      {floors.length > 0 ? (
        <section>
          <SectionTitle>階を選ぶ</SectionTitle>
          <div
            role="tablist"
            aria-label={`${building.name}の階`}
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            {floors.map((f, i) => {
              const active = f.level === selectedFloor
              const count = rooms.filter((r) => r.floor === f.level).length
              return (
                <button
                  key={f.level}
                  id={`${tabsId}-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelectedFloor(f.level)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={cx(
                    'flex min-h-12 min-w-14 shrink-0 flex-col items-center justify-center rounded-xl border px-2 leading-tight',
                    active
                      ? 'border-accent-fill bg-accent-fill text-on-accent'
                      : 'border-line bg-surface text-ink hover:bg-sunken',
                  )}
                >
                  <span className="text-base font-bold">{floorShortLabel(f.level)}</span>
                  <span className={cx('text-[11px]', active ? 'text-on-accent' : 'text-muted')}>
                    {count > 0 ? `${count}室` : '施設'}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-tab-${floors.findIndex((f) => f.level === selectedFloor)}`}
            className="mt-3 space-y-3"
          >
            <h3 className="text-lg font-bold">
              {floorObj?.label ?? (selectedFloor !== undefined ? floorLabel(selectedFloor) : '')}
            </h3>
            {floorRooms.length > 0 ? (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {floorRooms.map((r) => (
                  <li key={r.code}>
                    <button
                      type="button"
                      onClick={() => actions.select({ kind: 'room', id: r.code })}
                      className="flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left hover:bg-sunken"
                    >
                      <span className="w-14 shrink-0 text-[17px] font-bold">{r.code}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted">
                        {r.name ?? '教室'}
                      </span>
                      <span className="shrink-0 text-sm text-muted">
                        {r.capacity !== null ? `${r.capacity}人` : ''}
                      </span>
                      <ChevronRightIcon size={16} className="shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">この階に公式一覧の教室は登録されていません。</p>
            )}
            {floorFacilities.length > 0 && (
              <ul className="space-y-1.5">
                {floorFacilities.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => actions.select({ kind: 'facility', id: f.id })}
                      className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-sunken px-4 py-2 text-left"
                    >
                      <CategoryIcon category={f.category} />
                      <span className="flex-1 font-semibold">{f.name}</span>
                      <span className="text-xs text-muted">{CATEGORY_LABEL[f.category]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="rounded-xl bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
              フロアマップ（階の中での教室の位置）は未登録です。公式の平面図が利用できるようになったら追加できる構成になっています。
            </p>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted">この建物の階・教室の情報は登録されていません。</p>
      )}

      {otherFacilities.length > 0 && (
        <section>
          <SectionTitle>この建物の施設</SectionTitle>
          <ul className="space-y-1.5">
            {otherFacilities.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => actions.select({ kind: 'facility', id: f.id })}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-sunken px-4 py-2 text-left"
                >
                  <CategoryIcon category={f.category} />
                  <span className="flex-1 font-semibold">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="rounded-2xl border border-line bg-surface px-4">
        <InfoRow label="建物番号">{building.code ?? '公式マップに番号なし'}</InfoRow>
        <InfoRow label="地図上の位置">
          <MapPositionText building={building} />
        </InfoRow>
        <InfoRow label="バリアフリー">
          <span className="text-sm font-normal">
            エレベーター・スロープなどの情報は未登録です。
          </span>
        </InfoRow>
      </dl>

      <ActionBar sel={sel} />
      <SourceList sources={sources} notes={notes} checkedAt={building.checkedAt} />
    </article>
  )
}

export function FacilityDetail({ id }: { id: string }) {
  const { index, actions } = useNavi()
  const facility = index.facilityById.get(id)
  const { sources, notes } = useSources(facility?.sources ?? [])
  if (!facility) return <MissingDetail />
  const building = facility.buildingId ? index.buildingById.get(facility.buildingId) : undefined
  const sel: Selection = { kind: 'facility', id: facility.id }

  return (
    <article aria-labelledby="detail-title" className="space-y-5">
      <header className="flex items-start gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sunken text-accent"
          aria-hidden="true"
        >
          <CategoryIcon category={facility.category} size={24} />
        </span>
        <div className="min-w-0">
          <h2 id="detail-title" className="text-2xl leading-tight font-bold">
            {facility.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted">
            {CATEGORY_LABEL[facility.category]}
          </p>
          <div className="mt-2">
            <VerificationBadge status={facility.status} />
          </div>
        </div>
      </header>

      {facility.description && (
        <p className="text-[15px] leading-relaxed">{facility.description}</p>
      )}

      <dl className="rounded-2xl border border-line bg-surface px-4">
        <InfoRow label="建物">
          {building ? (
            <button
              type="button"
              onClick={() =>
                actions.select(
                  { kind: 'building', id: building.id },
                  facility.floor !== null ? { floor: facility.floor } : undefined,
                )
              }
              className="inline-flex items-center gap-1 text-left text-accent underline-offset-2 hover:underline"
            >
              {buildingLabel(building)}
              <ChevronRightIcon size={16} />
            </button>
          ) : (
            '屋外'
          )}
        </InfoRow>
        <InfoRow label="階数">
          {facility.floor !== null ? floorLabel(facility.floor) : '未登録'}
        </InfoRow>
        <InfoRow label="地図上の位置">
          {facility.map || building?.map ? (
            'キャンパス概略図に表示できます'
          ) : (
            <MapPositionText building={null} />
          )}
        </InfoRow>
      </dl>

      <ActionBar sel={sel} />
      <SourceList sources={sources} notes={notes} checkedAt={facility.checkedAt} />
    </article>
  )
}
