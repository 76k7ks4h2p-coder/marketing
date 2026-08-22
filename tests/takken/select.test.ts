import { describe, expect, it } from 'vitest'

import { EMPTY_PROGRESS, recordAnswer, toggleFlag } from '@/lib/takken/progress'
import { ALL_QUESTIONS, findQuestion } from '@/lib/takken/questions'
import {
  selectByTopic,
  selectByYear,
  selectRandom,
  selectReview,
  selectUnanswered,
  shuffle,
} from '@/lib/takken/select'
import type { AnswerRecord } from '@/lib/takken/types'

function answer(id: string, correct: boolean, answeredAt = 1000): AnswerRecord {
  const target = findQuestion(id)
  if (!target) throw new Error(`テストの前提が壊れている: ${id}`)
  const selected = correct ? target.answer : (target.answer % 4) + 1
  return { questionId: id, selected: selected as 1 | 2 | 3 | 4, correct, answeredAt }
}

describe('shuffle', () => {
  it('元の配列を変更しない', () => {
    const source = [1, 2, 3, 4, 5]
    shuffle(source, 42)
    expect(source).toEqual([1, 2, 3, 4, 5])
  })

  it('要素を落とさず、増やさない', () => {
    const result = shuffle([1, 2, 3, 4, 5], 42)
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('同じ seed なら同じ並びになる', () => {
    expect(shuffle(ALL_QUESTIONS, 7)).toEqual(shuffle(ALL_QUESTIONS, 7))
  })

  it('seed が違えば並びが変わる', () => {
    const a = shuffle(ALL_QUESTIONS, 1).map((question) => question.id)
    const b = shuffle(ALL_QUESTIONS, 2).map((question) => question.id)
    expect(a).not.toEqual(b)
  })

  it('seed が 0 でも並びが壊れない', () => {
    const result = shuffle([1, 2, 3, 4, 5], 0)
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('空配列でも落ちない', () => {
    expect(shuffle([], 1)).toEqual([])
  })
})

describe('selectByYear', () => {
  it('その年度の10問を問番号順に返す', () => {
    const questions = selectByYear('r05')

    expect(questions).toHaveLength(10)
    expect(questions.map((question) => question.questionNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(questions.every((question) => question.yearId === 'r05')).toBe(true)
  })
})

describe('selectByTopic', () => {
  it('その論点の問題だけを返す', () => {
    const questions = selectByTopic('teitoken')

    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((question) => question.topic === 'teitoken')).toBe(true)
  })
})

describe('selectRandom', () => {
  it('指定した問題数を返す', () => {
    expect(selectRandom(10, 1)).toHaveLength(10)
  })

  it('同じ問題を重複して出さない', () => {
    const questions = selectRandom(20, 3)
    const ids = questions.map((question) => question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('収録数より多く要求されても収録数までしか返さない', () => {
    expect(selectRandom(500, 1)).toHaveLength(100)
  })

  it('0問や負の数を渡しても落ちない', () => {
    expect(selectRandom(0, 1)).toHaveLength(0)
    expect(selectRandom(-3, 1)).toHaveLength(0)
  })
})

describe('selectReview', () => {
  it('履歴がなければ空を返す', () => {
    expect(selectReview(EMPTY_PROGRESS)).toHaveLength(0)
  })

  it('直近で間違えた問題を拾う', () => {
    const progress = recordAnswer(EMPTY_PROGRESS, answer('r07-01', false))
    expect(selectReview(progress).map((question) => question.id)).toEqual(['r07-01'])
  })

  it('正解した問題は含めない', () => {
    const progress = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    expect(selectReview(progress)).toHaveLength(0)
  })

  it('チェックを付けた問題は正解していても含める', () => {
    let progress = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    progress = toggleFlag(progress, 'r07-01')

    expect(selectReview(progress).map((question) => question.id)).toEqual(['r07-01'])
  })

  it('間違えた回数が多い問題を先に出す', () => {
    let progress = EMPTY_PROGRESS
    progress = recordAnswer(progress, answer('r07-01', false, 1000))
    progress = recordAnswer(progress, answer('r07-02', false, 1000))
    progress = recordAnswer(progress, answer('r07-02', false, 2000))
    progress = recordAnswer(progress, answer('r07-02', false, 3000))

    expect(selectReview(progress).map((question) => question.id)).toEqual(['r07-02', 'r07-01'])
  })

  it('間違えた回数が同じなら、最後に解いたのが古い問題を先に出す', () => {
    let progress = EMPTY_PROGRESS
    progress = recordAnswer(progress, answer('r07-01', false, 5000))
    progress = recordAnswer(progress, answer('r07-02', false, 1000))

    expect(selectReview(progress).map((question) => question.id)).toEqual(['r07-02', 'r07-01'])
  })
})

describe('selectUnanswered', () => {
  it('未着手なら全問を返す', () => {
    expect(selectUnanswered(EMPTY_PROGRESS)).toHaveLength(100)
  })

  it('解いた問題を除く', () => {
    const progress = recordAnswer(EMPTY_PROGRESS, answer('r07-01', true))
    const remaining = selectUnanswered(progress)

    expect(remaining).toHaveLength(99)
    expect(remaining.some((question) => question.id === 'r07-01')).toBe(false)
  })
})
