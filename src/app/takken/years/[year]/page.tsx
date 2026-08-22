import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { QuizRunner } from '@/components/takken/quiz-runner'
import { selectByYear } from '@/lib/takken/select'
import { YEARS, findYear, yearFullLabel } from '@/lib/takken/years'

/** 10 年分すべてを静的に生成する。 */
export function generateStaticParams() {
  return YEARS.map((year) => ({ year: year.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>
}): Promise<Metadata> {
  const { year } = await params
  const found = findYear(year)
  if (!found) return { title: '年度別演習' }

  return {
    title: `${found.label}の民法`,
    description: `宅建本試験 ${yearFullLabel(found.id)}の権利関係から、民法の論点10問を演習します。`,
  }
}

export default async function YearPracticePage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const found = findYear(year)

  if (!found) notFound()

  const questions = selectByYear(found.id)

  return (
    <QuizRunner
      questions={questions}
      title={`${found.label} 民法`}
      eyebrow={`年度別演習 ・ ${found.seireki}年${found.postRevision ? '' : '（改正前の出題）'}`}
      immediateFeedback
      backHref="/takken/years"
      backLabel="年度一覧に戻る"
    />
  )
}
