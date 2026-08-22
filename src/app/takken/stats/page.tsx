import type { Metadata } from 'next'

import { StatsView } from '@/components/takken/stats-view'

export const metadata: Metadata = {
  title: '成績',
  description: '年度別・分野別の正答率を確認して、弱い分野を把握します。',
}

export default function StatsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">成績</h1>
        <p className="text-sm text-ink-700">
          解答した問題の直近の正誤をもとに集計しています。学習履歴はこの端末のブラウザにのみ保存され、
          サーバーには送信されません。
        </p>
      </div>

      <StatsView />
    </div>
  )
}
