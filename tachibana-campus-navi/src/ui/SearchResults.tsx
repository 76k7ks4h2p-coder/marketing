import { buildingLabel, roomTitle } from '../domain/campusIndex.ts'
import { floorLabel, floorShortLabel } from '../domain/floors.ts'
import type { SearchHit, SearchOutcome } from '../domain/search.ts'
import { describeSelection, hitKey, optionId } from './describe.ts'
import { CATEGORY_LABEL, cx } from './format.ts'
import { AlertIcon, ChevronRightIcon, InfoIcon } from './icons.tsx'
import { useNavi } from './naviContext.ts'
import { BuildingBadge, CategoryIcon } from './parts.tsx'

interface SearchResultsProps {
  outcome: SearchOutcome
  listboxId: string
  activeIndex: number
  onPick(hit: SearchHit): void
  onHover?(index: number): void
}

function HitRow({ hit, exact }: { hit: SearchHit; exact: boolean }) {
  const { index } = useNavi()
  switch (hit.kind) {
    case 'room':
      return (
        <>
          <BuildingBadge building={hit.building} size={exact ? 'lg' : 'md'} />
          <span className="min-w-0 flex-1">
            <span className={cx('block truncate font-bold', exact ? 'text-xl' : 'text-[17px]')}>
              {roomTitle(hit.room)}
            </span>
            <span
              className={cx(
                'block truncate',
                exact ? 'text-base font-semibold text-ink' : 'text-sm text-muted',
              )}
            >
              {hit.building.name}・{floorLabel(hit.room.floor)}
            </span>
          </span>
          <span
            className={cx(
              'shrink-0 rounded-lg px-2 py-1 text-sm font-bold',
              exact ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-muted',
            )}
            aria-hidden="true"
          >
            {floorShortLabel(hit.room.floor)}
          </span>
        </>
      )
    case 'building': {
      const d = describeSelection(index, { kind: 'building', id: hit.building.id })
      return (
        <>
          <BuildingBadge building={hit.building} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold">{hit.building.name}</span>
            <span className="block truncate text-sm text-muted">{d?.subtitle}</span>
          </span>
          <ChevronRightIcon className="shrink-0 text-muted" />
        </>
      )
    }
    case 'facility':
      return (
        <>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted"
            aria-hidden="true"
          >
            <CategoryIcon category={hit.facility.category} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold">{hit.facility.name}</span>
            <span className="block truncate text-sm text-muted">
              {CATEGORY_LABEL[hit.facility.category]}
              {hit.building ? `・${hit.building.name}` : ''}
              {hit.facility.floor !== null ? ` ${floorLabel(hit.facility.floor)}` : ''}
            </span>
          </span>
          <ChevronRightIcon className="shrink-0 text-muted" />
        </>
      )
  }
}

/** 一致する教室がないときの案内（推定は「未確認」と明示する） */
function NotFound({ outcome }: { outcome: SearchOutcome }) {
  const { actions } = useNavi()
  const inf = outcome.inference
  const shown = outcome.code || outcome.query.trim()

  if (inf && inf.complete) {
    const floorText = inf.level !== null ? floorLabel(inf.level) : null
    return (
      <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn" role="status">
        <p className="flex items-start gap-2 font-bold">
          <AlertIcon size={20} className="mt-0.5 shrink-0" />「{shown}
          」は公式教室一覧のデータに見つかりません
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          番号の先頭「{inf.building.code}」は <strong>{buildingLabel(inf.building)}</strong>{' '}
          の建物番号です。
          {inf.floorRegistered && floorText
            ? `番号の規則では ${floorText} にあたりますが、公式一覧に掲載がないため確認できません。`
            : floorText
              ? `ただし ${floorText} の教室は公式一覧に登録されていません。`
              : ''}
          時間割の教室番号をもう一度確認してください。
        </p>
        <button
          type="button"
          onClick={() =>
            actions.select(
              { kind: 'building', id: inf.building.id },
              inf.floorRegistered && inf.level !== null ? { floor: inf.level } : undefined,
            )
          }
          className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-xl bg-surface px-3 text-sm font-semibold text-accent shadow-sm"
        >
          {inf.building.name}
          {inf.floorRegistered && floorText ? ` ${floorText}` : ''}の教室一覧を見る
          <ChevronRightIcon size={16} />
        </button>
      </div>
    )
  }

  if (outcome.hits.length > 0) return null

  return (
    <div className="rounded-2xl border border-line bg-surface p-4" role="status">
      <p className="font-bold">
        「{outcome.query.trim()}」に一致する教室・建物・施設は見つかりませんでした
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
        <li>教室番号は時間割の表記どおりに入力してください（例: H301、2202、G001）</li>
        <li>建物名（例: 清和館、アカデミックテラス）や施設名（例: 食堂、図書館）でも探せます</li>
      </ul>
    </div>
  )
}

export function SearchResults({
  outcome,
  listboxId,
  activeIndex,
  onPick,
  onHover,
}: SearchResultsProps) {
  const exactCode = outcome.exactRoom?.code
  return (
    <div className="space-y-3">
      <p className="sr-only" aria-live="polite">
        {outcome.exactRoom
          ? `${roomTitle(outcome.exactRoom)} が見つかりました`
          : `候補 ${outcome.total} 件`}
      </p>
      {outcome.correctedFrom && outcome.exactRoom && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <InfoIcon size={16} />「{outcome.correctedFrom}」を「{outcome.exactRoom.code}
          」として検索しました
        </p>
      )}
      {!outcome.exactRoom && <NotFound outcome={outcome} />}
      {outcome.hits.length > 0 && (
        <ul id={listboxId} role="listbox" aria-label="検索結果" className="space-y-1.5">
          {outcome.hits.map((hit, i) => {
            const exact = hit.kind === 'room' && hit.room.code === exactCode
            const active = i === activeIndex
            return (
              <li
                key={hitKey(hit)}
                id={optionId(listboxId, i)}
                role="option"
                aria-selected={active}
                onClick={() => onPick(hit)}
                onMouseMove={() => onHover?.(i)}
                className={cx(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                  exact
                    ? 'border-2 border-accent-fill bg-accent-soft'
                    : 'border border-transparent bg-surface',
                  active && !exact && 'border-line-strong bg-sunken',
                  active && exact && 'ring-3 ring-accent-line',
                )}
              >
                <HitRow hit={hit} exact={exact} />
              </li>
            )
          })}
        </ul>
      )}
      {outcome.total > outcome.hits.length && (
        <p className="text-center text-sm text-muted">
          ほか {outcome.total - outcome.hits.length} 件。入力を続けると絞り込めます
        </p>
      )}
    </div>
  )
}
