import { describe, expect, it } from 'vitest'

import { ASSESSMENT_LABELS, assess, gradeSession, isCorrect, toRate } from '@/lib/takken/grading'
import {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  isFlagged,
  normalizeProgress,
  recordAnswer,
  recordAnswers,
  resetProgress,
  toggleFlag,
} from '@/lib/takken/progress'
import { findQuestion } from '@/lib/takken/questions'
import { overallStats, reviewCount, topicBreakdowns, weakTopics } from '@/lib/takken/stats'
import type { AnswerRecord, ProgressState, Question } from '@/lib/takken/types'

function question(id: string): Question {
  const found = findQuestion(id)
  if (!found) throw new Error(`テストの前提が壊れている: ${id} が見つからない`)
  return found
}

function answer(id: string, correct: boolean, answeredAt = 1000): AnswerRecord {
  const target = question(id)
  const selected = correct ? target.answer : (target.answer % 4) + 1
  return { questionId: id, selected: selected as 1 | 2 | 3 | 4, correct, answeredAt }
}

describe('recordAnswer', () => {
  it('初回の解答を記録する', () => {
    const state = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    const entry = state.questions['r07-01']

    expect(entry.attempts).toBe(1)
    expect(entry.corrects).toBe(1)
    expect(entry.lastCorrect).toBe(true)
    expect(entry.flagged).toBe(false)
  })

  it('2回目以降は回数を積み上げ、直近の正誤で上書きする', () => {
    let state = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true, 1000))
    state = recordAnswer(state, answer('r07-01', false, 2000))

    const entry = state.questions['r07-01']
    expect(entry.attempts).toBe(2)
    expect(entry.corrects).toBe(1)
    expect(entry.lastCorrect).toBe(false)
    expect(entry.lastAnsweredAt).toBe(2000)
  })

  it('元の状態を変更しない', () => {
    const before = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    const after = recordAnswer(before, answer('r07-02', true))

    expect(Object.keys(before.questions)).toEqual(['r07-01'])
    expect(Object.keys(after.questions).sort()).toEqual(['r07-01', 'r07-02'])
  })

  it('チェックを付けた状態は解答後も維持される', () => {
    let state = toggleFlag(EMPTY_PROGRESS, 'r07-03')
    state = recordAnswer(state, answer('r07-03', true))

    expect(isFlagged(state, 'r07-03')).toBe(true)
  })

  it('複数の解答をまとめて記録できる', () => {
    const state = recordAnswers(EMPTY_PROGRESS, [
      answer('r07-01', true),
      answer('r07-02', false),
      answer('r07-03', true),
    ])

    expect(Object.keys(state.questions)).toHaveLength(3)
    expect(state.questions['r07-02'].lastCorrect).toBe(false)
  })
})

describe('toggleFlag', () => {
  it('未解答の問題にもチェックを付けられる', () => {
    const state = toggleFlag(EMPTY_PROGRESS, 'h28-01')

    expect(isFlagged(state, 'h28-01')).toBe(true)
    expect(state.questions['h28-01'].attempts).toBe(0)
    // 未解答を「正解済み」として扱わない
    expect(state.questions['h28-01'].lastCorrect).toBe(false)
  })

  it('もう一度呼ぶと外れる', () => {
    const state = toggleFlag(toggleFlag(EMPTY_PROGRESS, 'h28-01'), 'h28-01')
    expect(isFlagged(state, 'h28-01')).toBe(false)
  })

  it('解答済みの成績を壊さない', () => {
    let state = recordAnswer(EMPTY_PROGRESS, answer('r06-01', true))
    state = toggleFlag(state, 'r06-01')

    expect(state.questions['r06-01'].attempts).toBe(1)
    expect(state.questions['r06-01'].corrects).toBe(1)
    expect(state.questions['r06-01'].flagged).toBe(true)
  })
})

describe('resetProgress', () => {
  it('履歴を空にする', () => {
    const state = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    expect(Object.keys(resetProgress().questions)).toHaveLength(0)
    expect(Object.keys(state.questions)).toHaveLength(1)
  })
})

describe('normalizeProgress', () => {
  it('保存された正常な値を読み戻せる', () => {
    const saved = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    const restored = normalizeProgress(JSON.parse(JSON.stringify(saved)))

    expect(restored).toEqual(saved)
  })

  it('null や文字列は空の履歴にする', () => {
    expect(normalizeProgress(null)).toEqual(EMPTY_PROGRESS)
    expect(normalizeProgress('こわれた値')).toEqual(EMPTY_PROGRESS)
    expect(normalizeProgress(undefined)).toEqual(EMPTY_PROGRESS)
  })

  it('バージョンが違うデータは捨てる', () => {
    const stale = { version: PROGRESS_VERSION + 1, questions: { 'r07-01': { attempts: 1 } } }
    expect(normalizeProgress(stale)).toEqual(EMPTY_PROGRESS)
  })

  it('壊れたエントリを安全な値に整える', () => {
    const broken = {
      version: PROGRESS_VERSION,
      questions: {
        'r07-01': { attempts: -5, corrects: 'あ', lastCorrect: 'yes', lastAnsweredAt: null },
        'r07-02': null,
        'r07-03': { attempts: 2, corrects: 99, lastCorrect: true, lastAnsweredAt: 5 },
      },
    }

    const state = normalizeProgress(broken)

    expect(state.questions['r07-01']).toEqual({
      questionId: 'r07-01',
      attempts: 0,
      corrects: 0,
      lastCorrect: false,
      lastAnsweredAt: 0,
      flagged: false,
    })
    expect(state.questions['r07-02']).toBeUndefined()
    // 正解数が試行回数を超えないよう切り詰める
    expect(state.questions['r07-03'].corrects).toBe(2)
  })
})

describe('gradeSession', () => {
  const questions = [question('r07-01'), question('r07-02'), question('r07-03')]

  it('正解数と正答率を出す', () => {
    const answers = {
      'r07-01': answer('r07-01', true),
      'r07-02': answer('r07-02', false),
      'r07-03': answer('r07-03', true),
    }

    const result = gradeSession(questions, answers)

    expect(result.total).toBe(3)
    expect(result.correct).toBe(2)
    expect(result.unanswered).toBe(0)
    expect(result.rate).toBe(67)
    expect(result.missed.map((item) => item.id)).toEqual(['r07-02'])
  })

  it('記録のない問題は未解答として不正解に数える', () => {
    const result = gradeSession(questions, { 'r07-01': answer('r07-01', true) })

    expect(result.correct).toBe(1)
    expect(result.unanswered).toBe(2)
    expect(result.missed).toHaveLength(2)
  })

  it('時間切れ（selected が null）も未解答として扱う', () => {
    const timedOut: AnswerRecord = {
      questionId: 'r07-01',
      selected: null,
      correct: false,
      answeredAt: 1,
    }

    const result = gradeSession([question('r07-01')], { 'r07-01': timedOut })

    expect(result.unanswered).toBe(1)
    expect(result.correct).toBe(0)
  })

  it('出題が0問でも落ちない', () => {
    const result = gradeSession([], {})
    expect(result.rate).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe('isCorrect / toRate / assess', () => {
  it('正解番号と一致したときだけ正解になる', () => {
    const target = question('r07-01')
    expect(isCorrect(target, target.answer)).toBe(true)
    expect(isCorrect(target, ((target.answer % 4) + 1) as 1 | 2 | 3 | 4)).toBe(false)
    expect(isCorrect(target, null)).toBe(false)
  })

  it('正答率を四捨五入した整数で返す', () => {
    expect(toRate(1, 3)).toBe(33)
    expect(toRate(2, 3)).toBe(67)
    expect(toRate(0, 0)).toBe(0)
    expect(toRate(10, 10)).toBe(100)
  })

  it('正答率を3段階で評価する', () => {
    expect(assess(70)).toBe('good')
    expect(assess(69)).toBe('fair')
    expect(assess(50)).toBe('fair')
    expect(assess(49)).toBe('poor')
    expect(ASSESSMENT_LABELS[assess(80)]).toBe('合格圏')
  })
})

describe('集計', () => {
  function buildProgress(entries: Array<[string, boolean]>): ProgressState {
    return entries.reduce(
      (state, [id, correct]) => recordAnswer(state, answer(id, correct)),
      EMPTY_PROGRESS,
    )
  }

  it('全体の学習状況を集計する', () => {
    const progress = buildProgress([
      ['r07-01', true],
      ['r07-02', false],
    ])

    const stats = overallStats(progress)
    expect(stats.total).toBe(100)
    expect(stats.answered).toBe(2)
    expect(stats.correct).toBe(1)
    expect(stats.rate).toBe(50)
  })

  it('未着手なら正答率は0で、割り算で落ちない', () => {
    const stats = overallStats(EMPTY_PROGRESS)
    expect(stats.answered).toBe(0)
    expect(stats.rate).toBe(0)
  })

  it('分野別の集計は収録問題数と対応する', () => {
    const breakdowns = topicBreakdowns(EMPTY_PROGRESS)
    const sum = breakdowns.reduce((total, entry) => total + entry.total, 0)
    expect(sum).toBe(100)
  })

  it('弱点分野は解答数が少ない分野を拾わない', () => {
    // 1問だけ間違えた分野は、まだ判断材料が足りないので弱点に出さない
    const progress = buildProgress([['r07-06', false]])
    expect(weakTopics(progress)).toHaveLength(0)
  })

  it('2問以上解いて正答率が低い分野を弱点として返す', () => {
    const progress = buildProgress([
      ['r07-06', false],
      ['r06-05', false],
    ])

    const weak = weakTopics(progress)
    expect(weak.map((entry) => entry.topic)).toContain('teitoken')
    expect(weak[0].rate).toBe(0)
  })

  it('復習対象は直近で間違えた問題とチェックした問題を数える', () => {
    let progress = buildProgress([
      ['r07-01', false],
      ['r07-02', true],
    ])
    progress = toggleFlag(progress, 'r07-03')

    expect(reviewCount(progress)).toBe(2)
  })

  it('間違えた問題を解き直して正解すれば復習対象から外れる', () => {
    let progress = buildProgress([['r07-01', false]])
    expect(reviewCount(progress)).toBe(1)

    progress = recordAnswer(progress, answer('r07-01', true, 3000))
    expect(reviewCount(progress)).toBe(0)
  })
})
