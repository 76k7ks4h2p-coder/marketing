import type { Question, TopicId, YearId } from '../types'
import { YEAR_IDS } from '../years'

import { H28_QUESTIONS } from './h28'
import { H29_QUESTIONS } from './h29'
import { H30_QUESTIONS } from './h30'
import { R01_QUESTIONS } from './r01'
import { R02_QUESTIONS } from './r02'
import { R03_QUESTIONS } from './r03'
import { R04_QUESTIONS } from './r04'
import { R05_QUESTIONS } from './r05'
import { R06_QUESTIONS } from './r06'
import { R07_QUESTIONS } from './r07'

const BY_YEAR: Record<YearId, readonly Question[]> = {
  r07: R07_QUESTIONS,
  r06: R06_QUESTIONS,
  r05: R05_QUESTIONS,
  r04: R04_QUESTIONS,
  r03: R03_QUESTIONS,
  r02: R02_QUESTIONS,
  r01: R01_QUESTIONS,
  h30: H30_QUESTIONS,
  h29: H29_QUESTIONS,
  h28: H28_QUESTIONS,
}

/** 全問題。年度の新しい順、同一年度内は問番号順。 */
export const ALL_QUESTIONS: readonly Question[] = YEAR_IDS.flatMap((yearId) =>
  [...BY_YEAR[yearId]].sort((a, b) => a.questionNumber - b.questionNumber),
)

const BY_ID = new Map<string, Question>(ALL_QUESTIONS.map((question) => [question.id, question]))

export function findQuestion(id: string): Question | undefined {
  return BY_ID.get(id)
}

/** 指定した ID の問題を、渡された順序のまま返す。存在しない ID は無視する。 */
export function findQuestions(ids: readonly string[]): Question[] {
  return ids
    .map((id) => BY_ID.get(id))
    .filter((question): question is Question => Boolean(question))
}

export function questionsByYear(yearId: YearId): readonly Question[] {
  return BY_YEAR[yearId] ?? []
}

export function questionsByTopic(topic: TopicId): Question[] {
  return ALL_QUESTIONS.filter((question) => question.topic === topic)
}

/** 論点ごとの収録問題数。分野一覧の表示に使う。 */
export function countByTopic(): Map<TopicId, number> {
  const counts = new Map<TopicId, number>()
  for (const question of ALL_QUESTIONS) {
    counts.set(question.topic, (counts.get(question.topic) ?? 0) + 1)
  }
  return counts
}

export const TOTAL_QUESTION_COUNT = ALL_QUESTIONS.length
