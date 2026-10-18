/** 検索語が空のときのホーム、お気に入り・履歴の一覧 */
import type { ReactNode } from 'react'
import { compareNatural } from '../domain/normalize.ts'
import type { FacilityCategory } from '../domain/types.ts'
import type { Selection } from '../state/saved.ts'
import { describeSelection } from './describe.ts'
import { ChevronRightIcon, ClockIcon, InfoIcon, StarIcon, TrashIcon } from './icons.tsx'
import { useNavi } from './naviContext.ts'
import { BuildingBadge, CategoryIcon, SectionTitle } from './parts.tsx'

/** 選択対象 1 件分の行（お気に入り・履歴・一覧で共通） */
export function SelectionRow({
  selection,
  trailing,
}: {
  selection: Selection
  trailing?: ReactNode
}) {
  const { index, actions } = useNavi()
  const d = describeSelection(index, selection)
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => actions.select(selection)}
        disabled={!d}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-sunken disabled:opacity-60"
      >
        {d?.building && selection.kind !== 'facility' ? (
          <BuildingBadge building={d.building} />
        ) : (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted"
            aria-hidden="true"
          >
            {d?.category ? <CategoryIcon category={d.category} /> : <InfoIcon size={18} />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{d?.title ?? selection.id}</span>
          <span className="block truncate text-sm text-muted">
            {d?.subtitle ?? '現在のデータに見つかりません'}
          </span>
        </span>
        <ChevronRightIcon size={18} className="shrink-0 text-muted" />
      </button>
      {trailing}
    </li>
  )
}

const FACILITY_GROUPS: { label: string; categories: FacilityCategory[] }[] = [
  { label: '食堂・カフェ', categories: ['dining', 'cafe'] },
  { label: '学習スペース', categories: ['commons', 'library'] },
  { label: '窓口・門・交通', categories: ['office', 'gate', 'transport'] },
]

function StorageNotice() {
  const { storagePersistent } = useNavi()
  if (storagePersistent) return null
  return (
    <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
      このブラウザでは端末への保存ができないため、お気に入りと履歴はページを閉じると消えます。
    </p>
  )
}

export function HomePanel() {
  const { index, history, favorites, actions } = useNavi()
  const academic = index.data.buildings
    .filter((b) => b.kind === 'academic')
    .sort((a, b) => compareNatural(a.code ?? '', b.code ?? ''))

  return (
    <div className="space-y-7">
      {history.length > 0 && (
        <section>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={actions.clearHistory}
                className="min-h-9 rounded-lg px-2 text-sm font-semibold text-accent hover:bg-accent-soft"
              >
                履歴を消す
              </button>
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon size={16} />
              最近の検索
            </span>
          </SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((h) => {
              const d = describeSelection(index, h)
              if (!d) return null
              return (
                <li key={`${h.kind}:${h.id}`}>
                  <button
                    type="button"
                    onClick={() => actions.select(h)}
                    className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-sunken"
                  >
                    {h.kind === 'room' ? h.id : d.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {favorites.length > 0 && (
        <section>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <StarIcon size={16} filled />
              お気に入り
            </span>
          </SectionTitle>
          <ul className="-mx-2">
            {favorites.slice(0, 5).map((f) => (
              <SelectionRow key={`${f.kind}:${f.id}`} selection={f} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>建物から探す</SectionTitle>
        <ul className="-mx-2">
          {academic.map((b) => (
            <SelectionRow key={b.id} selection={{ kind: 'building', id: b.id }} />
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>施設から探す</SectionTitle>
        <div className="space-y-4">
          {FACILITY_GROUPS.map((g) => {
            const list = index.data.facilities.filter((f) => g.categories.includes(f.category))
            if (list.length === 0) return null
            return (
              <div key={g.label}>
                <p className="mb-1 px-1 text-xs font-semibold text-muted">{g.label}</p>
                <ul className="-mx-2">
                  {list.map((f) => (
                    <SelectionRow key={f.id} selection={{ kind: 'facility', id: f.id }} />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={actions.openAbout}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left hover:bg-sunken"
      >
        <InfoIcon className="text-accent" />
        <span className="flex-1">
          <span className="block font-bold">このアプリについて・データの出典</span>
          <span className="block text-sm text-muted">
            情報の確認状況と、まだ登録されていないデータ
          </span>
        </span>
        <ChevronRightIcon className="text-muted" />
      </button>
    </div>
  )
}

export function FavoritesPanel() {
  const { favorites, history, actions } = useNavi()
  return (
    <div className="space-y-7">
      <StorageNotice />
      <section>
        <h2 className="mb-2 text-xl font-bold">お気に入り</h2>
        {favorites.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm leading-relaxed text-muted">
            教室や建物の詳細で「☆ お気に入り」を押すと、ここに保存されます。
            <br />
            保存先はこの端末だけです（アカウント登録は不要）。
          </p>
        ) : (
          <ul className="-mx-2">
            {favorites.map((f) => (
              <SelectionRow
                key={`${f.kind}:${f.id}`}
                selection={f}
                trailing={
                  <button
                    type="button"
                    onClick={() => actions.toggleFavorite(f)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-danger"
                    aria-label={`${f.id} をお気に入りから外す`}
                  >
                    <TrashIcon size={18} />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">最近の検索</h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={actions.clearHistory}
              className="min-h-9 rounded-lg px-2 text-sm font-semibold text-accent hover:bg-accent-soft"
            >
              履歴を消す
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted">まだ履歴はありません。</p>
        ) : (
          <ul className="-mx-2">
            {history.map((h) => (
              <SelectionRow key={`${h.kind}:${h.id}`} selection={h} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
