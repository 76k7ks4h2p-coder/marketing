import { describe, expect, it } from 'vitest'

import { formatBudgetRange, formatFileSize, formatNumber, formatYen } from '@/lib/format/currency'

describe('formatYen', () => {
  it('日本円の記号と桁区切りで整形する', () => {
    expect(formatYen(55000)).toBe('￥55,000')
  })

  it('0 円を表示できる', () => {
    expect(formatYen(0)).toBe('￥0')
  })

  it('小数は円未満を丸める', () => {
    expect(formatYen(1234.6)).toBe('￥1,235')
  })

  it('100 万円以上も桁区切りされる', () => {
    expect(formatYen(1234567)).toBe('￥1,234,567')
  })

  it('null / undefined はダッシュを返す', () => {
    expect(formatYen(null)).toBe('—')
    expect(formatYen(undefined)).toBe('—')
  })

  it('NaN や Infinity で例外を投げない', () => {
    expect(formatYen(Number.NaN)).toBe('—')
    expect(formatYen(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatNumber', () => {
  it('桁区切りのみを付ける', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('null はダッシュを返す', () => {
    expect(formatNumber(null)).toBe('—')
  })
})

describe('formatBudgetRange', () => {
  it('上限と下限の両方がある場合はレンジ表示する', () => {
    expect(formatBudgetRange(30000, 50000)).toBe('￥30,000 〜 ￥50,000')
  })

  it('下限のみの場合', () => {
    expect(formatBudgetRange(30000, null)).toBe('￥30,000 〜')
  })

  it('上限のみの場合', () => {
    expect(formatBudgetRange(null, 50000)).toBe('〜 ￥50,000')
  })

  it('どちらも無い場合は未設定と表示する', () => {
    expect(formatBudgetRange(null, null)).toBe('未設定')
  })
})

describe('formatFileSize', () => {
  it('バイト単位', () => {
    expect(formatFileSize(512)).toBe('512B')
  })

  it('キロバイト単位', () => {
    expect(formatFileSize(1536)).toBe('1.5KB')
  })

  it('メガバイト単位', () => {
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0MB')
  })

  it('不正な値はダッシュを返す', () => {
    expect(formatFileSize(-1)).toBe('—')
  })
})
