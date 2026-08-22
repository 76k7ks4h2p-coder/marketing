import { describe, expect, it } from 'vitest'

import { INDEXED_QUESTION_COUNT, QUESTION_INDEX } from '@/lib/takken/question-index'
import { ALL_QUESTIONS } from '@/lib/takken/questions'

/**
 * 軽い索引（question-index.ts）は実データから機械的に作った複製なので、
 * ずれると成績集計だけが静かに間違う。ここで一致を強制する。
 */
describe('question-index と実データの一致', () => {
  it('件数が一致する', () => {
    expect(INDEXED_QUESTION_COUNT).toBe(ALL_QUESTIONS.length)
  })

  it('ID・年度・論点がすべて同じ順序で一致する', () => {
    const expected = ALL_QUESTIONS.map((question) => ({
      id: question.id,
      yearId: question.yearId,
      topic: question.topic,
    }))

    expect(QUESTION_INDEX).toEqual(expected)
  })

  it('索引に重複したIDがない', () => {
    const ids = QUESTION_INDEX.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
