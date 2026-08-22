import { ALL_QUESTIONS, findQuestions, questionsByTopic, questionsByYear } from './questions'
import type { ProgressState, Question, TopicId, YearId } from './types'

/**
 * 出題セットの組み立て。
 *
 * ここに置く関数はすべて純粋関数にしておく。乱数が必要なものは
 * seed を受け取り、同じ seed なら同じ並びを返すようにして、
 * サーバーとクライアントで結果がずれないようにする。
 */

/**
 * xorshift32 による疑似乱数。
 * Math.random() を使わないのは、サーバーで描画した並びと
 * クライアントで再計算した並びを一致させたいため。
 */
function createRandom(seed: number): () => number {
  // seed が 0 だと以後ずっと 0 になるので 1 に寄せる
  let state = seed >>> 0 || 1

  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }
}

/** 元の配列を壊さずにシャッフルした新しい配列を返す（Fisher-Yates）。 */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items]
  const random = createRandom(seed)

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

export function selectByYear(yearId: YearId): Question[] {
  return [...questionsByYear(yearId)].sort((a, b) => a.questionNumber - b.questionNumber)
}

export function selectByTopic(topic: TopicId): Question[] {
  return questionsByTopic(topic)
}

/** 模試用にランダムな n 問を選ぶ。 */
export function selectRandom(count: number, seed: number): Question[] {
  return shuffle(ALL_QUESTIONS, seed).slice(0, Math.max(0, count))
}

/**
 * 復習セットを組み立てる。
 *
 * 対象は「直近の解答を間違えた問題」と「チェックを付けた問題」。
 * 並びは、間違えた回数が多い順 → 最後に解いたのが古い順にして、
 * 定着していないものから先に出す。
 */
export function selectReview(progress: ProgressState): Question[] {
  const targets = Object.values(progress.questions)
    .filter((entry) => !entry.lastCorrect || entry.flagged)
    .sort((a, b) => {
      const missesA = a.attempts - a.corrects
      const missesB = b.attempts - b.corrects
      if (missesA !== missesB) return missesB - missesA
      return a.lastAnsweredAt - b.lastAnsweredAt
    })

  return findQuestions(targets.map((entry) => entry.questionId))
}

/** まだ一度も解いていない問題。 */
export function selectUnanswered(progress: ProgressState): Question[] {
  return ALL_QUESTIONS.filter((question) => !progress.questions[question.id])
}
