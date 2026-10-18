import { useId, useMemo, useState } from 'react'
import { buildingLabel, type CampusIndex } from '../domain/campusIndex.ts'
import { floorLabel } from '../domain/floors.ts'
import { compareNatural } from '../domain/normalize.ts'
import { placeLabel, planRoute } from '../domain/routing.ts'
import type { Selection } from '../state/saved.ts'
import { describeSelection, keyToPlace, placeToKey, selectionToPlace } from './describe.ts'
import { OFFICIAL_ACCESSIBILITY_MAP_URL, OFFICIAL_CAMPUS_MAP_URL } from './format.ts'
import { AccessibleIcon, AlertIcon, ChevronLeftIcon, RouteIcon } from './icons.tsx'
import { useNavi } from './naviContext.ts'
import { BuildingBadge, ExternalLink } from './parts.tsx'

interface StartGroup {
  label: string
  options: { key: string; label: string }[]
}

/** 出発地の候補（門・交通 → 主要施設 → 建物 → 教室） */
function startGroups(index: CampusIndex): StartGroup[] {
  const facilities = index.data.facilities
  const entryPoints = facilities.filter((f) => f.category === 'gate' || f.category === 'transport')
  const others = facilities.filter((f) => f.category !== 'gate' && f.category !== 'transport')
  const buildings = [...index.data.buildings].sort((a, b) =>
    compareNatural(a.code ?? `~${a.name}`, b.code ?? `~${b.name}`),
  )
  return [
    {
      label: '門・交通',
      options: entryPoints.map((f) => ({ key: `facility:${f.id}`, label: f.name })),
    },
    {
      label: '主要施設',
      options: others.map((f) => ({ key: `facility:${f.id}`, label: f.name })),
    },
    {
      label: '建物',
      options: buildings.map((b) => ({ key: `building:${b.id}`, label: buildingLabel(b) })),
    },
    ...buildings
      .filter((b) => (index.roomsByBuilding.get(b.id)?.length ?? 0) > 0)
      .map((b) => ({
        label: `教室（${b.name}）`,
        options: (index.roomsByBuilding.get(b.id) ?? []).map((r) => ({
          key: `room:${r.code}`,
          label: `${r.code}（${floorLabel(r.floor)}）`,
        })),
      })),
  ]
}

export function RoutePanel({ destination, onBack }: { destination: Selection; onBack(): void }) {
  const { index } = useNavi()
  const groups = useMemo(() => startGroups(index), [index])
  const [fromKey, setFromKey] = useState(
    () => groups.find((g) => g.options.length > 0)?.options[0]?.key ?? '',
  )
  const [accessible, setAccessible] = useState(false)
  const formId = useId()

  const to = selectionToPlace(destination)
  const plan = useMemo(() => {
    const from = keyToPlace(fromKey)
    return from ? planRoute(index, { from, to: selectionToPlace(destination), accessible }) : null
  }, [index, fromKey, destination, accessible])
  const dest = describeSelection(index, destination)
  const destBuilding = dest?.building ?? null
  const destFloor = dest?.room?.floor ?? dest?.facility?.floor ?? null

  return (
    <section aria-labelledby={`${formId}-title`} className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex size-11 items-center justify-center rounded-full hover:bg-sunken"
          aria-label="詳細に戻る"
        >
          <ChevronLeftIcon />
        </button>
        <h2 id={`${formId}-title`} className="flex items-center gap-2 text-xl font-bold">
          <RouteIcon className="text-accent" />
          ここへ行く
        </h2>
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-sm text-muted">目的地</p>
          <p className="text-lg font-bold">{placeLabel(index, to)}</p>
        </div>
        <div>
          <label htmlFor={`${formId}-from`} className="text-sm text-muted">
            出発地
          </label>
          <select
            id={`${formId}-from`}
            value={fromKey}
            onChange={(e) => setFromKey(e.target.value)}
            className="mt-1 block min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-base font-semibold"
          >
            {groups
              .filter((g) => g.options.length > 0)
              .map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.key} value={o.key} disabled={o.key === placeToKey(to)}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={accessible}
            onChange={(e) => setAccessible(e.target.checked)}
            className="size-5 accent-accent-fill"
          />
          <AccessibleIcon className="text-accent" />
          <span className="font-semibold">階段・段差を避ける（バリアフリー）</span>
        </label>
      </div>

      {plan?.status === 'found' && (
        <div className="space-y-3 rounded-2xl border border-ok/30 bg-ok-soft p-4" role="status">
          <p className="font-bold text-ok">
            検証済みの通路で案内します（約{Math.round(plan.distance)}m）
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-[15px]">
            {plan.steps.map((s) => (
              <li key={s.edge.id}>
                {s.from.label} → {s.to.label}（約{Math.round(s.edge.distance)}m）
                {s.cautions.length > 0 && (
                  <span className="block text-sm text-warn">{s.cautions.join('／')}</span>
                )}
              </li>
            ))}
          </ol>
          {plan.indoorNote && <p className="text-sm">{plan.indoorNote}</p>}
        </div>
      )}

      {plan?.status === 'unavailable' && plan.reason === 'same-place' && (
        <p className="rounded-2xl bg-sunken p-4 text-sm">出発地と目的地が同じです。</p>
      )}

      {plan?.status === 'unavailable' && plan.reason !== 'same-place' && (
        <div className="space-y-4" role="status">
          <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
            <p className="flex items-start gap-2 font-bold text-warn">
              <AlertIcon size={20} className="mt-0.5 shrink-0" />
              道順はまだ表示できません
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              公式資料と照合した通路データがまだ登録されていないため、実際の道順は案内していません。推測した経路は表示しません。
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-bold">代わりに：建物と階の案内</h3>
            <ol className="mt-3 space-y-3">
              {destBuilding && (
                <li className="flex items-center gap-3">
                  <BuildingBadge building={destBuilding} />
                  <span>
                    <span className="block text-sm text-muted">目的の建物</span>
                    <span className="font-bold">
                      {destBuilding.name}
                      {destBuilding.code ? `（建物番号 ${destBuilding.code}）` : ''}
                    </span>
                  </span>
                </li>
              )}
              {destFloor !== null && (
                <li className="flex items-center gap-3">
                  <span
                    className="flex size-9 items-center justify-center rounded-xl bg-sunken font-bold"
                    aria-hidden="true"
                  >
                    階
                  </span>
                  <span>
                    <span className="block text-sm text-muted">目的の階</span>
                    <span className="font-bold">{floorLabel(destFloor)}</span>
                  </span>
                </li>
              )}
              <li className="text-sm leading-relaxed">
                建物の場所は、このアプリにはまだ登録されていません。
                <ExternalLink href={OFFICIAL_CAMPUS_MAP_URL} className="ml-1">
                  公式キャンパスマップ
                </ExternalLink>
                で確認してください。
              </li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              スマートフォンの現在地（GPS）では、建物の中の階や教室の位置までは分かりません。
            </p>
          </div>

          {accessible && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 font-bold">
                <AccessibleIcon className="text-accent" />
                バリアフリー経路について
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                エレベーター・スロープ・段差の情報が未登録のため、安全なバリアフリー経路は保証できません。
                <ExternalLink href={OFFICIAL_ACCESSIBILITY_MAP_URL} className="ml-1">
                  公式バリアフリーマップ（2026年10月版・PDF）
                </ExternalLink>
                で確認してください。
              </p>
            </div>
          )}

          <details className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">道順の案内に必要なデータ</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-muted">
              {plan.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  )
}
