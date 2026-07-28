import { describe, expect, it } from 'vitest'

import {
  ADMIN_REQUEST_COLUMNS,
  OWNER_REQUEST_COLUMNS,
  OWNER_REQUEST_LIST_COLUMNS,
  QUOTE_COLUMNS,
} from '@/lib/queries/columns'

/**
 * RLS は行単位の制御であり、列単位の制御はできない。
 * オーナー向けの取得処理が admin_notes を含めないことを、
 * 実装が変わっても壊れないようにここで固定する。
 */
describe('オーナー向けの SELECT 列', () => {
  it('admin_notes を含まない', () => {
    expect(OWNER_REQUEST_COLUMNS).not.toContain('admin_notes')
    expect(OWNER_REQUEST_LIST_COLUMNS).not.toContain('admin_notes')
  })

  it('ワイルドカード (*) を使っていない（新しい管理者専用列が漏れないようにする）', () => {
    expect(OWNER_REQUEST_COLUMNS).not.toContain('*')
    expect(OWNER_REQUEST_LIST_COLUMNS).not.toContain('*')
  })

  it('画面表示に必要な列は含まれている', () => {
    for (const column of [
      'id',
      'request_number',
      'property_id',
      'category',
      'title',
      'description',
      'urgency',
      'status',
      'created_at',
    ]) {
      expect(OWNER_REQUEST_COLUMNS).toContain(column)
    }
  })
})

describe('管理者向けの SELECT 列', () => {
  it('全列を取得する（admin_notes を含む）', () => {
    expect(ADMIN_REQUEST_COLUMNS).toBe('*')
  })
})

describe('見積もりの SELECT 列', () => {
  it('運営者コメントは含む（オーナーにも見せる項目）', () => {
    expect(QUOTE_COLUMNS).toContain('admin_comment')
  })

  it('作成者 (created_by) は含めない', () => {
    expect(QUOTE_COLUMNS).not.toContain('created_by')
  })
})
