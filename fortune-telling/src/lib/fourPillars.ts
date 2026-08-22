// 四柱推命の簡易計算ロジック。
//
// 本格的な四柱推命は「節入り(二十四節気の切り替わり)」の正確な日時や、
// 出生地の経度による真太陽時補正を使うが、ここではそれらを省いた簡易版として、
// 立春を毎年2月4日固定・各月の節入りも固定の目安日で近似する。
// エンタメ用途の占いとして十分な体験を、依存ライブラリなしで提供することを優先している。

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

export type Stem = (typeof STEMS)[number]
export type Branch = (typeof BRANCHES)[number]
export type Element = '木' | '火' | '土' | '金' | '水'

const STEM_ELEMENT: Record<Stem, Element> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

const BRANCH_ELEMENT: Record<Branch, Element> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

export interface Pillar {
  stem: Stem
  branch: Branch
  label: string // 例: "甲子"
}

export interface FourPillarsInput {
  year: number
  month: number // 1-12
  day: number
  /** 0-23。時刻が不明な場合は null を渡すと時柱を省略する。 */
  hour: number | null
  birthPlace: string
}

export interface FourPillarsResult {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar | null
  dayMaster: { stem: Stem; element: Element }
  elementCounts: Record<Element, number>
  birthPlace: string
}

function makePillar(stemIndex: number, branchIndex: number): Pillar {
  const stem = STEMS[((stemIndex % 10) + 10) % 10]
  const branch = BRANCHES[((branchIndex % 12) + 12) % 12]
  return { stem, branch, label: `${stem}${branch}` }
}

/** グレゴリオ暦の年月日からユリウス通日(JDN)を求める(Fliegel & Van Flandern の式)。 */
function toJulianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

// 各月の節入り(月柱が切り替わる日)の簡易的な目安日。実際は年によって1〜2日前後する。
const MONTH_CUTOFFS: Array<{ month: number; day: number; branchIndex: number }> = [
  { month: 1, day: 6, branchIndex: 1 }, // 丑月 1/6〜
  { month: 2, day: 4, branchIndex: 2 }, // 寅月 立春 2/4〜
  { month: 3, day: 6, branchIndex: 3 }, // 卯月 3/6〜
  { month: 4, day: 5, branchIndex: 4 }, // 辰月 4/5〜
  { month: 5, day: 6, branchIndex: 5 }, // 巳月 5/6〜
  { month: 6, day: 6, branchIndex: 6 }, // 午月 6/6〜
  { month: 7, day: 7, branchIndex: 7 }, // 未月 7/7〜
  { month: 8, day: 8, branchIndex: 8 }, // 申月 8/8〜
  { month: 9, day: 8, branchIndex: 9 }, // 酉月 9/8〜
  { month: 10, day: 8, branchIndex: 10 }, // 戌月 10/8〜
  { month: 11, day: 7, branchIndex: 11 }, // 亥月 11/7〜
  { month: 12, day: 7, branchIndex: 0 }, // 子月 12/7〜
]

function monthBranchIndex(month: number, day: number): number {
  // 前年12/7〜の「子月」が年をまたいで1/5まで続くため、既定値を子月にしておく。
  let result = MONTH_CUTOFFS[MONTH_CUTOFFS.length - 1].branchIndex
  for (const cutoff of MONTH_CUTOFFS) {
    const reached = month > cutoff.month || (month === cutoff.month && day >= cutoff.day)
    if (reached) result = cutoff.branchIndex
  }
  return result
}

/** 立春(2月4日)を基準に、四柱推命上の「年」を決める。1/1〜2/3生まれは前年扱い。 */
function fourPillarsYear(year: number, month: number, day: number): number {
  const beforeRisshun = month < 2 || (month === 2 && day < 4)
  return beforeRisshun ? year - 1 : year
}

function yearPillar(fpYear: number): Pillar {
  const stemIndex = ((fpYear - 4) % 10 + 10) % 10
  const branchIndex = ((fpYear - 4) % 12 + 12) % 12
  return makePillar(stemIndex, branchIndex)
}

function monthPillar(fpYear: number, month: number, day: number): Pillar {
  const branchIndex = monthBranchIndex(month, day)
  const yearStemIndex = ((fpYear - 4) % 10 + 10) % 10
  // 五虎遁: 年干のグループごとに寅月の月干が決まる
  const startStem = ((yearStemIndex % 5) * 2 + 2) % 10
  const monthOffset = (branchIndex - 2 + 12) % 12
  const stemIndex = (startStem + monthOffset) % 10
  return makePillar(stemIndex, branchIndex)
}

function dayPillar(year: number, month: number, day: number): Pillar {
  const jdn = toJulianDayNumber(year, month, day)
  // 2000-01-01 (JDN=2451545) が「戊午」の日であることを基準にした簡易換算式。
  const stemIndex = (jdn + 9) % 10
  const branchIndex = (jdn + 1) % 12
  return makePillar(stemIndex, branchIndex)
}

function hourPillar(dayStemIndex: number, hour: number): Pillar {
  const branchIndex = Math.floor(((hour + 1) % 24) / 2)
  // 五鼠遁: 日干のグループごとに子刻の時干が決まる
  const startStem = ((dayStemIndex % 5) * 2) % 10
  const stemIndex = (startStem + branchIndex) % 10
  return makePillar(stemIndex, branchIndex)
}

export function calculateFourPillars(input: FourPillarsInput): FourPillarsResult {
  const fpYear = fourPillarsYear(input.year, input.month, input.day)

  const year = yearPillar(fpYear)
  const month = monthPillar(fpYear, input.month, input.day)
  const day = dayPillar(input.year, input.month, input.day)
  const dayStemIndex = STEMS.indexOf(day.stem)
  const hour = input.hour === null ? null : hourPillar(dayStemIndex, input.hour)

  const elementCounts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const pillars = [year, month, day, hour].filter((p): p is Pillar => p !== null)
  for (const p of pillars) {
    elementCounts[STEM_ELEMENT[p.stem]] += 1
    elementCounts[BRANCH_ELEMENT[p.branch]] += 1
  }

  return {
    year,
    month,
    day,
    hour,
    dayMaster: { stem: day.stem, element: STEM_ELEMENT[day.stem] },
    elementCounts,
    birthPlace: input.birthPlace,
  }
}

export { STEM_ELEMENT, BRANCH_ELEMENT }
