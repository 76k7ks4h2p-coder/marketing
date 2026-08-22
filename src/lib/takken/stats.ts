import { toRate } from './grading'
import { QUESTION_INDEX, type QuestionIndexEntry } from './question-index'
import { TOPIC_IDS } from './topics'
import type { ProgressState, TopicId, YearId } from './types'
import { YEAR_IDS } from './years'

/**
 * 学習履歴の集計。
 *
 * 履歴はブラウザの localStorage にあるので集計もブラウザ側で走る。
 * そのため、問題文や解説まで含んだ全データではなく、
 * 軽い索引（question-index.ts）だけを参照している。
 */

/** 集計の 1 行分。分野別・年度別で共通の形にしておく。 */
export type Breakdown = {
  /** 収録問題数。 */
  readonly total: number
  /** 一度でも解いた問題数。 */
  readonly answered: number
  /** 直近の解答が正解だった問題数。 */
  readonly correct: number
  /** answered に対する correct の割合（0〜100）。 */
  readonly rate: number
}

export type TopicBreakdown = Breakdown & { readonly topic: TopicId }
export type YearBreakdown = Breakdown & { readonly yearId: YearId }

function summarize(entries: readonly QuestionIndexEntry[], progress: ProgressState): Breakdown {
  let answered = 0
  let correct = 0

  for (const entry of entries) {
    const record = progress.questions[entry.id]
    if (!record || record.attempts === 0) continue

    answered += 1
    if (record.lastCorrect) correct += 1
  }

  return {
    total: entries.length,
    answered,
    correct,
    rate: toRate(correct, answered),
  }
}

/** 全体の学習状況。 */
export function overallStats(progress: ProgressState): Breakdown {
  return summarize(QUESTION_INDEX, progress)
}

export function topicBreakdowns(progress: ProgressState): TopicBreakdown[] {
  return TOPIC_IDS.map((topic) => ({
    topic,
    ...summarize(
      QUESTION_INDEX.filter((entry) => entry.topic === topic),
      progress,
    ),
  }))
}

export function yearBreakdowns(progress: ProgressState): YearBreakdown[] {
  return YEAR_IDS.map((yearId) => ({
    yearId,
    ...summarize(
      QUESTION_INDEX.filter((entry) => entry.yearId === yearId),
      progress,
    ),
  }))
}

/**
 * 弱点分野を返す。
 *
 * まだ解いていない分野は正答率 0% として上位に来てしまうので除外し、
 * ある程度解いたうえで正答率が低いものだけを対象にする。
 */
export function weakTopics(progress: ProgressState, limit = 3): TopicBreakdown[] {
  return topicBreakdowns(progress)
    .filter((entry) => entry.answered >= 2 && entry.rate < 70)
    .sort((a, b) => {
      if (a.rate !== b.rate) return a.rate - b.rate
      // 正答率が同じなら、解いた数が多いほうが確からしいので先に出す
      return b.answered - a.answered
    })
    .slice(0, limit)
}

/** 復習対象（直近で間違えた、またはチェックを付けた）の問題数。 */
export function reviewCount(progress: ProgressState): number {
  return Object.values(progress.questions).filter(
    (entry) => (entry.attempts > 0 && !entry.lastCorrect) || entry.flagged,
  ).length
}
