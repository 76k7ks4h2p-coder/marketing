import type { Metadata } from 'next'

import { YearList } from '@/components/takken/year-list'
import { TOTAL_QUESTION_COUNT } from '@/lib/takken/questions'
import { YEARS } from '@/lib/takken/years'

export const metadata: Metadata = {
  title: '年度別演習',
  description: '宅建本試験の民法を年度ごとにまとめて演習します。',
}

export default function YearsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">年度別演習</h1>
        <p className="text-sm text-ink-700">
          1年分（10問）をまとめて解きます。全{YEARS.length}年度・{TOTAL_QUESTION_COUNT}問。
          1問ごとに正誤と解説が出るモードです。
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs leading-relaxed text-amber-900">
          令和元年度以前は2020年4月の改正民法より前の出題です。解答・解説は現行民法を基準にしており、
          出題当時と結論が変わった論点には「法改正あり」の注記を付けています。
        </p>
      </div>

      <YearList />
    </div>
  )
}
