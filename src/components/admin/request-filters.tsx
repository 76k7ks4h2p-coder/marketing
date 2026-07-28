import { Search } from 'lucide-react'
import Link from 'next/link'

import { buttonClasses } from '@/components/ui/button'
import { CONTROL_CLASSES } from '@/components/ui/field'
import { SERVICE_CATEGORY_OPTIONS } from '@/lib/constants/categories'
import { REQUEST_STATUS_OPTIONS } from '@/lib/constants/statuses'
import type { AdminRequestFilters } from '@/lib/queries/admin'

/**
 * 案件一覧の絞り込み。
 * GET フォームなので JavaScript が無くても動作する。
 */
export function RequestFilters({ filters }: { filters: AdminRequestFilters }) {
  return (
    <form
      method="get"
      action="/admin/requests"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="filter-status" className="block text-sm font-medium text-ink-700">
            ステータス
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={filters.status ?? ''}
            className={CONTROL_CLASSES}
          >
            <option value="">すべて</option>
            {REQUEST_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-category" className="block text-sm font-medium text-ink-700">
            カテゴリー
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={filters.category ?? ''}
            className={CONTROL_CLASSES}
          >
            <option value="">すべて</option>
            {SERVICE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-request-number" className="block text-sm font-medium text-ink-700">
            案件番号
          </label>
          <input
            id="filter-request-number"
            name="requestNumber"
            defaultValue={filters.requestNumber ?? ''}
            placeholder="OB-20260728-AB12"
            className={CONTROL_CLASSES}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-owner" className="block text-sm font-medium text-ink-700">
            オーナー名
          </label>
          <input
            id="filter-owner"
            name="ownerName"
            defaultValue={filters.ownerName ?? ''}
            className={CONTROL_CLASSES}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-property" className="block text-sm font-medium text-ink-700">
            物件名
          </label>
          <input
            id="filter-property"
            name="propertyName"
            defaultValue={filters.propertyName ?? ''}
            className={CONTROL_CLASSES}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className={buttonClasses('primary', 'md')}>
          <Search aria-hidden="true" className="h-4 w-4" />
          絞り込む
        </button>
        <Link href="/admin/requests" className={buttonClasses('secondary', 'md')}>
          条件をクリア
        </Link>
      </div>
    </form>
  )
}
