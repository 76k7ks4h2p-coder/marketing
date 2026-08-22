import type { AnswerRecord, ProgressState, QuestionProgress } from './types'

/**
 * 学習履歴の状態遷移。すべて純粋関数で、元の状態は変更しない。
 * 保存先（localStorage）とのやりとりは storage.ts が担当する。
 */

/** 保存形式のバージョン。互換性のない変更をしたら上げる。 */
export const PROGRESS_VERSION = 1

export const EMPTY_PROGRESS: ProgressState = {
  version: PROGRESS_VERSION,
  questions: {},
}

/** 1 問の解答を履歴に反映する。 */
export function recordAnswer(state: ProgressState, answer: AnswerRecord): ProgressState {
  const previous = state.questions[answer.questionId]

  const next: QuestionProgress = {
    questionId: answer.questionId,
    attempts: (previous?.attempts ?? 0) + 1,
    corrects: (previous?.corrects ?? 0) + (answer.correct ? 1 : 0),
    lastCorrect: answer.correct,
    lastAnsweredAt: answer.answeredAt,
    flagged: previous?.flagged ?? false,
  }

  return {
    version: state.version,
    questions: { ...state.questions, [answer.questionId]: next },
  }
}

/** 複数の解答をまとめて反映する（模試の採点時に使う）。 */
export function recordAnswers(
  state: ProgressState,
  answers: readonly AnswerRecord[],
): ProgressState {
  return answers.reduce(recordAnswer, state)
}

/** 「後で見直す」チェックを切り替える。まだ解いていない問題にも付けられる。 */
export function toggleFlag(state: ProgressState, questionId: string): ProgressState {
  const previous = state.questions[questionId]

  const next: QuestionProgress = previous
    ? { ...previous, flagged: !previous.flagged }
    : {
        questionId,
        attempts: 0,
        corrects: 0,
        // 未解答をいきなり「正解済み」にしないため false から始める
        lastCorrect: false,
        lastAnsweredAt: 0,
        flagged: true,
      }

  return {
    version: state.version,
    questions: { ...state.questions, [questionId]: next },
  }
}

export function isFlagged(state: ProgressState, questionId: string): boolean {
  return state.questions[questionId]?.flagged ?? false
}

/** 履歴をすべて消す。 */
export function resetProgress(): ProgressState {
  return EMPTY_PROGRESS
}

/**
 * 保存されていた値を検証して ProgressState に整える。
 * 壊れた値や別バージョンのデータが入っていても落ちないようにする。
 */
export function normalizeProgress(value: unknown): ProgressState {
  if (typeof value !== 'object' || value === null) return EMPTY_PROGRESS

  const candidate = value as { version?: unknown; questions?: unknown }
  if (candidate.version !== PROGRESS_VERSION) return EMPTY_PROGRESS
  if (typeof candidate.questions !== 'object' || candidate.questions === null) {
    return EMPTY_PROGRESS
  }

  const questions: Record<string, QuestionProgress> = {}

  for (const [id, entry] of Object.entries(candidate.questions as Record<string, unknown>)) {
    const normalized = normalizeEntry(id, entry)
    if (normalized) questions[id] = normalized
  }

  return { version: PROGRESS_VERSION, questions }
}

function normalizeEntry(id: string, value: unknown): QuestionProgress | null {
  if (typeof value !== 'object' || value === null) return null

  const entry = value as Record<string, unknown>
  const attempts = toCount(entry.attempts)
  const corrects = toCount(entry.corrects)

  return {
    questionId: id,
    attempts,
    // 正解数が試行回数を超えている壊れたデータは切り詰める
    corrects: Math.min(corrects, attempts),
    lastCorrect: entry.lastCorrect === true,
    lastAnsweredAt: toCount(entry.lastAnsweredAt),
    flagged: entry.flagged === true,
  }
}

function toCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}
