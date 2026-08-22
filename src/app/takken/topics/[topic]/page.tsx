import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { QuizRunner } from '@/components/takken/quiz-runner'
import { selectByTopic } from '@/lib/takken/select'
import { TOPIC_DESCRIPTIONS, TOPIC_IDS, TOPIC_LABELS, isTopicId } from '@/lib/takken/topics'

/** 全分野を静的に生成する。 */
export function generateStaticParams() {
  return TOPIC_IDS.map((topic) => ({ topic }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>
}): Promise<Metadata> {
  const { topic } = await params
  if (!isTopicId(topic)) return { title: '分野別演習' }

  return {
    title: TOPIC_LABELS[topic],
    description: `宅建 民法「${TOPIC_LABELS[topic]}」の演習。${TOPIC_DESCRIPTIONS[topic]}`,
  }
}

export default async function TopicPracticePage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params

  if (!isTopicId(topic)) notFound()

  const questions = selectByTopic(topic)

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-ink-700">
        {TOPIC_DESCRIPTIONS[topic]}
      </p>

      <QuizRunner
        questions={questions}
        title={TOPIC_LABELS[topic]}
        eyebrow={`分野別演習 ・ 全${questions.length}問`}
        immediateFeedback
        backHref="/takken/topics"
        backLabel="分野一覧に戻る"
      />
    </div>
  )
}
