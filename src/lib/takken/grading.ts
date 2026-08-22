import type { AnswerRecord, Question } from './types'

/** 演習セッション 1 回分の採点結果。 */
export type SessionResult = {
  /** 出題数。 */
  readonly total: number
  /** 正解数。 */
  readonly correct: number
  /** 未解答数。 */
  readonly unanswered: number
  /** 正答率（0〜100 の整数）。出題数が 0 なら 0。 */
  readonly rate: number
  /** 間違えた問題（未解答を含む）。 */
  readonly missed: readonly Question[]
}

export function isCorrect(question: Question, selected: 1 | 2 | 3 | 4 | null): boolean {
  return selected !== null && selected === question.answer
}

/** 正答率を 0〜100 の整数で返す。分母が 0 のときは 0。 */
export function toRate(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * 出題した問題と解答から成績を出す。
 * 解答が記録されていない問題は未解答（不正解）として数える。
 */
export function gradeSession(
  questions: readonly Question[],
  answers: Readonly<Record<string, AnswerRecord>>,
): SessionResult {
  let correct = 0
  let unanswered = 0
  const missed: Question[] = []

  for (const question of questions) {
    const answer = answers[question.id]

    if (!answer || answer.selected === null) {
      unanswered += 1
      missed.push(question)
      continue
    }

    if (answer.correct) {
      correct += 1
    } else {
      missed.push(question)
    }
  }

  return {
    total: questions.length,
    correct,
    unanswered,
    rate: toRate(correct, questions.length),
    missed,
  }
}

/**
 * 宅建本試験の合格ラインは年度によって動くが、おおむね 7 割前後。
 * 民法（権利関係）は難度が高く 5 割前後でも合格圏に届くため、
 * 目安として 3 段階で評価を返す。
 */
export type Assessment = 'good' | 'fair' | 'poor'

export function assess(rate: number): Assessment {
  if (rate >= 70) return 'good'
  if (rate >= 50) return 'fair'
  return 'poor'
}

export const ASSESSMENT_LABELS: Record<Assessment, string> = {
  good: '合格圏',
  fair: 'あと一歩',
  poor: '要復習',
}

export const ASSESSMENT_MESSAGES: Record<Assessment, string> = {
  good: '権利関係としては十分な水準です。間違えた問題の論点だけ確認しておきましょう。',
  fair: '権利関係の目標は7割です。間違えた問題を復習モードで繰り返してください。',
  poor: '解説を読んで論点を押さえ直しましょう。分野別演習で弱い分野から潰すのが近道です。',
}
