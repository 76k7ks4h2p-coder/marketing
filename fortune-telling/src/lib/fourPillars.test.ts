import { describe, expect, it } from 'vitest'

import { calculateFourPillars } from './fourPillars'
import { buildFortuneReading } from './fortuneText'

describe('calculateFourPillars', () => {
  it('2000-01-01 の日柱は戊午になる(基準日の検証)', () => {
    const result = calculateFourPillars({
      year: 2000,
      month: 1,
      day: 1,
      hour: null,
      birthPlace: '東京都',
    })
    expect(result.day.label).toBe('戊午')
  })

  it('立春(2/4)より前の生まれは前年の年柱になる', () => {
    const before = calculateFourPillars({
      year: 2000,
      month: 2,
      day: 3,
      hour: null,
      birthPlace: '',
    })
    const after = calculateFourPillars({
      year: 2000,
      month: 2,
      day: 4,
      hour: null,
      birthPlace: '',
    })
    expect(before.year.label).not.toBe(after.year.label)
  })

  it('時刻を指定すると時柱が計算される', () => {
    const result = calculateFourPillars({
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      birthPlace: '',
    })
    expect(result.hour).not.toBeNull()
    expect(result.hour?.branch).toBe('未') // 13:00-15:00 は未の刻
  })

  it('時刻が不明な場合は時柱を含めない', () => {
    const result = calculateFourPillars({
      year: 1990,
      month: 6,
      day: 15,
      hour: null,
      birthPlace: '',
    })
    expect(result.hour).toBeNull()
  })

  it('五行の合計は時柱ありなら8、なしなら6になる', () => {
    const withHour = calculateFourPillars({
      year: 1990,
      month: 6,
      day: 15,
      hour: 10,
      birthPlace: '',
    })
    const withoutHour = calculateFourPillars({
      year: 1990,
      month: 6,
      day: 15,
      hour: null,
      birthPlace: '',
    })
    const sum = (counts: Record<string, number>) =>
      Object.values(counts).reduce((a, b) => a + b, 0)
    expect(sum(withHour.elementCounts)).toBe(8)
    expect(sum(withoutHour.elementCounts)).toBe(6)
  })
})

describe('buildFortuneReading', () => {
  it('どんな出生地でもラッキーアイテム・方位が必ず決まる(符号付きシフトで undefined にならない)', () => {
    const places = ['広島県福山市', '', '東京都', 'a', 'Osaka', '北海道札幌市', '沖縄県那覇市']
    for (const birthPlace of places) {
      const result = calculateFourPillars({ year: 1990, month: 6, day: 15, hour: 14, birthPlace })
      const reading = buildFortuneReading(result)
      expect(reading.luckyItem).toBeTruthy()
      expect(reading.luckyDirection).toBeTruthy()
    }
  })
})
