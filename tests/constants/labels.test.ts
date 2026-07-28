import { describe, expect, it } from 'vitest'

import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_VALUES,
  isServiceCategory,
  serviceCategoryLabel,
} from '@/lib/constants/categories'
import { PROPERTY_TYPE_VALUES, propertyTypeLabel } from '@/lib/constants/properties'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_VALUES,
  isRequestStatus,
  requestStatusLabel,
} from '@/lib/constants/statuses'
import { URGENCY_VALUES, urgencyLabel } from '@/lib/constants/urgency'
import { userRoleLabel } from '@/lib/constants/roles'

describe('作業カテゴリー', () => {
  it('DB に保存する値は仕様どおりの英語値である', () => {
    expect(SERVICE_CATEGORY_VALUES).toEqual([
      'vacant_cleaning',
      'common_area_cleaning',
      'mowing',
      'property_inspection',
      'minor_repair',
      'other',
    ])
  })

  it('仕様どおりの日本語ラベルを返す', () => {
    expect(serviceCategoryLabel('vacant_cleaning')).toBe('空室クリーニング')
    expect(serviceCategoryLabel('common_area_cleaning')).toBe('共用部清掃')
    expect(serviceCategoryLabel('mowing')).toBe('草刈り・植栽管理')
    expect(serviceCategoryLabel('property_inspection')).toBe('物件巡回・写真報告')
    expect(serviceCategoryLabel('minor_repair')).toBe('軽微な修繕')
    expect(serviceCategoryLabel('other')).toBe('その他の相談')
  })

  it('すべての値にラベルが定義されている', () => {
    for (const value of SERVICE_CATEGORY_VALUES) {
      expect(SERVICE_CATEGORY_LABELS[value]).toBeTruthy()
    }
  })

  it('未知の値でも画面を壊さず、値をそのまま返す', () => {
    expect(serviceCategoryLabel('unknown_category')).toBe('unknown_category')
    expect(isServiceCategory('unknown_category')).toBe(false)
  })
})

describe('案件ステータス', () => {
  it('DB に保存する値は仕様どおりの英語値である', () => {
    expect(REQUEST_STATUS_VALUES).toEqual([
      'submitted',
      'reviewing',
      'collecting_quotes',
      'quotes_ready',
      'provider_selected',
      'scheduling',
      'in_progress',
      'completed',
      'cancelled',
    ])
  })

  it('仕様どおりの日本語ラベルを返す', () => {
    expect(requestStatusLabel('submitted')).toBe('依頼受付')
    expect(requestStatusLabel('reviewing')).toBe('内容確認中')
    expect(requestStatusLabel('collecting_quotes')).toBe('見積もり取得中')
    expect(requestStatusLabel('quotes_ready')).toBe('見積もり確認待ち')
    expect(requestStatusLabel('provider_selected')).toBe('業者選択済み')
    expect(requestStatusLabel('scheduling')).toBe('日程調整中')
    expect(requestStatusLabel('in_progress')).toBe('作業中')
    expect(requestStatusLabel('completed')).toBe('完了')
    expect(requestStatusLabel('cancelled')).toBe('キャンセル')
  })

  it('すべての値にラベルが定義されている', () => {
    for (const value of REQUEST_STATUS_VALUES) {
      expect(REQUEST_STATUS_LABELS[value]).toBeTruthy()
    }
  })

  it('未知の値は判定で false になる', () => {
    expect(isRequestStatus('archived')).toBe(false)
    expect(requestStatusLabel('archived')).toBe('archived')
  })
})

describe('緊急度', () => {
  it('DB に保存する値は normal / soon / urgent である', () => {
    expect(URGENCY_VALUES).toEqual(['normal', 'soon', 'urgent'])
  })

  it('仕様どおりの日本語ラベルを返す', () => {
    expect(urgencyLabel('normal')).toBe('通常')
    expect(urgencyLabel('soon')).toBe('できるだけ早く')
    expect(urgencyLabel('urgent')).toBe('緊急')
  })
})

describe('物件種別', () => {
  it('仕様どおりの 8 種類のラベルを返す', () => {
    expect(PROPERTY_TYPE_VALUES).toHaveLength(8)
    expect(propertyTypeLabel('apartment_building')).toBe('一棟アパート')
    expect(propertyTypeLabel('mansion_building')).toBe('一棟マンション')
    expect(propertyTypeLabel('condo_unit')).toBe('区分マンション')
    expect(propertyTypeLabel('house')).toBe('戸建て')
    expect(propertyTypeLabel('shop')).toBe('店舗')
    expect(propertyTypeLabel('office')).toBe('事務所')
    expect(propertyTypeLabel('land')).toBe('土地')
    expect(propertyTypeLabel('other')).toBe('その他')
  })
})

describe('ユーザー区分', () => {
  it('owner / admin のラベルを返す', () => {
    expect(userRoleLabel('owner')).toBe('オーナー')
    expect(userRoleLabel('admin')).toBe('運営管理者')
  })
})
