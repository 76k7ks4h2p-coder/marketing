import type { Metadata } from 'next'

import { TopicList } from '@/components/takken/topic-list'
import { TOTAL_QUESTION_COUNT } from '@/lib/takken/questions'
import { TOPIC_IDS } from '@/lib/takken/topics'

export const metadata: Metadata = {
  title: '分野別演習',
  description: '意思表示・代理・抵当権・相続など、民法の論点ごとに集中して演習します。',
}

export default function TopicsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink-900">分野別演習</h1>
        <p className="text-sm text-ink-700">
          民法の論点を{TOPIC_IDS.length}分野に分けています。全{TOTAL_QUESTION_COUNT}問を横断して、
          選んだ分野の問題だけを解きます。苦手な分野から潰すのが効率的です。
        </p>
      </div>

      <TopicList />
    </div>
  )
}
