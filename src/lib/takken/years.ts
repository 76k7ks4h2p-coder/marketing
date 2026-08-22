import type { Year, YearId } from './types'

/**
 * 収録年度。新しい順に並べる。
 *
 * 2020 年 4 月 1 日施行の改正民法（債権法改正）が試験に反映されたのは
 * 令和 2 年度から。それ以前の年度の問題は、当時の条文を前提にしている点に
 * 注意が必要なので `postRevision` で区別している。
 */
export const YEARS: readonly Year[] = [
  { id: 'r07', label: '令和7年度', seireki: 2025, postRevision: true },
  { id: 'r06', label: '令和6年度', seireki: 2024, postRevision: true },
  { id: 'r05', label: '令和5年度', seireki: 2023, postRevision: true },
  { id: 'r04', label: '令和4年度', seireki: 2022, postRevision: true },
  {
    id: 'r03',
    label: '令和3年度',
    seireki: 2021,
    postRevision: true,
    note: '10月実施分を収録（12月にも実施された年）',
  },
  {
    id: 'r02',
    label: '令和2年度',
    seireki: 2020,
    postRevision: true,
    note: '10月実施分を収録（12月にも実施された年）。改正民法が反映された最初の年度',
  },
  { id: 'r01', label: '令和元年度', seireki: 2019, postRevision: false },
  { id: 'h30', label: '平成30年度', seireki: 2018, postRevision: false },
  { id: 'h29', label: '平成29年度', seireki: 2017, postRevision: false },
  { id: 'h28', label: '平成28年度', seireki: 2016, postRevision: false },
]

export const YEAR_IDS = YEARS.map((year) => year.id)

const YEAR_BY_ID = new Map<YearId, Year>(YEARS.map((year) => [year.id, year]))

export function findYear(id: string): Year | undefined {
  return YEAR_BY_ID.get(id as YearId)
}

export function yearLabel(id: YearId): string {
  return YEAR_BY_ID.get(id)?.label ?? id
}

/** 「令和7年度（2025年）」のような表記。 */
export function yearFullLabel(id: YearId): string {
  const year = YEAR_BY_ID.get(id)
  if (!year) return id
  return `${year.label}（${year.seireki}年）`
}

export function isYearId(value: string): value is YearId {
  return YEAR_BY_ID.has(value as YearId)
}
