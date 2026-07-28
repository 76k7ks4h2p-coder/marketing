import { describe, expect, it } from 'vitest'

import {
  formatJapaneseDate,
  formatJapaneseDateTime,
  formatShortDate,
  isExpired,
  toDateInputValue,
} from '@/lib/format/date'

describe('formatJapaneseDate', () => {
  it('date 型の文字列を日本語表記にする', () => {
    expect(formatJapaneseDate('2026-07-28')).toBe('2026年7月28日')
  })

  it('月初・月末でも日付がずれない（Asia/Tokyo 固定）', () => {
    expect(formatJapaneseDate('2026-01-01')).toBe('2026年1月1日')
    expect(formatJapaneseDate('2026-12-31')).toBe('2026年12月31日')
  })

  it('UTC の timestamptz を日本時間の日付で表示する', () => {
    // UTC 2026-07-27 16:00 は JST では 2026-07-28 01:00
    expect(formatJapaneseDate('2026-07-27T16:00:00Z')).toBe('2026年7月28日')
  })

  it('null / 空文字はダッシュを返す', () => {
    expect(formatJapaneseDate(null)).toBe('—')
    expect(formatJapaneseDate('')).toBe('—')
    expect(formatJapaneseDate(undefined)).toBe('—')
  })

  it('不正な日付文字列でも例外を投げない', () => {
    expect(formatJapaneseDate('not-a-date')).toBe('—')
  })
})

describe('formatJapaneseDateTime', () => {
  it('日本時間の日時を表示する', () => {
    const result = formatJapaneseDateTime('2026-07-28T01:30:00Z')
    expect(result).toContain('2026年7月28日')
    expect(result).toContain('10:30')
  })

  it('null はダッシュを返す', () => {
    expect(formatJapaneseDateTime(null)).toBe('—')
  })
})

describe('formatShortDate', () => {
  it('一覧向けのスラッシュ区切りで表示する', () => {
    expect(formatShortDate('2026-07-28')).toBe('2026/07/28')
  })
})

describe('toDateInputValue', () => {
  it('input[type=date] 用の YYYY-MM-DD を返す', () => {
    expect(toDateInputValue('2026-07-28T01:30:00Z')).toBe('2026-07-28')
  })

  it('null は空文字を返す', () => {
    expect(toDateInputValue(null)).toBe('')
  })
})

describe('isExpired', () => {
  it('過去の日付は期限切れ', () => {
    expect(isExpired('2000-01-01')).toBe(true)
  })

  it('十分に未来の日付は期限切れではない', () => {
    expect(isExpired('2999-12-31')).toBe(false)
  })

  it('未設定は期限切れとして扱わない', () => {
    expect(isExpired(null)).toBe(false)
    expect(isExpired(undefined)).toBe(false)
  })
})
