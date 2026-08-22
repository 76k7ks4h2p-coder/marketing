import { describe, expect, it } from 'vitest'

import {
  ALL_QUESTIONS,
  TOTAL_QUESTION_COUNT,
  countByTopic,
  findQuestion,
  findQuestions,
  questionsByYear,
} from '@/lib/takken/questions'
import { TOPIC_IDS, TOPIC_DESCRIPTIONS, TOPIC_LABELS, isTopicId } from '@/lib/takken/topics'
import { YEARS, YEAR_IDS, findYear, isYearId, yearFullLabel } from '@/lib/takken/years'

describe('収録データの構成', () => {
  it('10年分の年度を収録している', () => {
    expect(YEARS).toHaveLength(10)
    expect(YEARS[0].id).toBe('r07')
    expect(YEARS[YEARS.length - 1].id).toBe('h28')
  })

  it('各年度に10問ずつ収録している', () => {
    for (const yearId of YEAR_IDS) {
      expect(questionsByYear(yearId), `${yearId} の問題数`).toHaveLength(10)
    }
  })

  it('合計100問である', () => {
    expect(TOTAL_QUESTION_COUNT).toBe(100)
    expect(ALL_QUESTIONS).toHaveLength(100)
  })

  it('年度は新しい順に並んでいる', () => {
    const years = YEARS.map((year) => year.seireki)
    expect(years).toEqual([...years].sort((a, b) => b - a))
  })

  it('改正民法が適用される年度は令和2年度以降である', () => {
    for (const year of YEARS) {
      expect(year.postRevision, year.label).toBe(year.seireki >= 2020)
    }
  })
})

describe('各問題の妥当性', () => {
  it('IDが重複していない', () => {
    const ids = ALL_QUESTIONS.map((question) => question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('IDが「年度コード-問番号」の形式になっている', () => {
    for (const question of ALL_QUESTIONS) {
      const expected = `${question.yearId}-${String(question.questionNumber).padStart(2, '0')}`
      expect(question.id).toBe(expected)
    }
  })

  it('選択肢が4つあり、番号が1から4まで順に振られている', () => {
    for (const question of ALL_QUESTIONS) {
      expect(question.choices, question.id).toHaveLength(4)
      expect(question.choices.map((choice) => choice.number)).toEqual([1, 2, 3, 4])
    }
  })

  it('正解番号が1から4の範囲にある', () => {
    for (const question of ALL_QUESTIONS) {
      expect(question.answer, question.id).toBeGreaterThanOrEqual(1)
      expect(question.answer, question.id).toBeLessThanOrEqual(4)
    }
  })

  it('問番号が1から10の範囲にあり、年度内で重複しない', () => {
    for (const yearId of YEAR_IDS) {
      const numbers = questionsByYear(yearId).map((question) => question.questionNumber)
      expect(new Set(numbers).size, `${yearId} の問番号`).toBe(numbers.length)
      for (const number of numbers) {
        expect(number).toBeGreaterThanOrEqual(1)
        expect(number).toBeLessThanOrEqual(10)
      }
    }
  })

  it('yearId が収録年度のいずれかである', () => {
    for (const question of ALL_QUESTIONS) {
      expect(isYearId(question.yearId), question.id).toBe(true)
    }
  })

  it('topic が定義済みの論点である', () => {
    for (const question of ALL_QUESTIONS) {
      expect(isTopicId(question.topic), question.id).toBe(true)
    }
  })

  it('本文・解説・選択肢のコメントが空でない', () => {
    for (const question of ALL_QUESTIONS) {
      expect(question.title.length, question.id).toBeGreaterThan(0)
      expect(question.prompt.length, question.id).toBeGreaterThan(0)
      expect(question.explanation.length, question.id).toBeGreaterThan(20)
      for (const choice of question.choices) {
        expect(choice.text.length, `${question.id}-${choice.number}`).toBeGreaterThan(0)
        expect(choice.comment.length, `${question.id}-${choice.number}`).toBeGreaterThan(0)
      }
    }
  })

  it('根拠条文が1つ以上ある', () => {
    for (const question of ALL_QUESTIONS) {
      expect(question.articles.length, question.id).toBeGreaterThan(0)
    }
  })

  it('選択肢の本文が問題内で重複していない', () => {
    for (const question of ALL_QUESTIONS) {
      const texts = question.choices.map((choice) => choice.text)
      expect(new Set(texts).size, question.id).toBe(texts.length)
    }
  })

  it('正解の選択肢だけが「正しい。」で始まり、他は「誤り。」で始まる', () => {
    for (const question of ALL_QUESTIONS) {
      for (const choice of question.choices) {
        const label = `${question.id}-${choice.number}`
        if (choice.number === question.answer) {
          expect(choice.comment.startsWith('正しい。'), label).toBe(true)
        } else {
          expect(choice.comment.startsWith('誤り。'), label).toBe(true)
        }
      }
    }
  })

  it('正解の番号が1〜4に散らばっている', () => {
    const counts = [1, 2, 3, 4].map(
      (number) => ALL_QUESTIONS.filter((question) => question.answer === number).length,
    )
    // どれか1つに偏って「迷ったら3」で解けてしまわないようにする
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(15)
    }
  })

  it('改正前の年度の問題にだけ法改正の注記が付いている', () => {
    for (const question of ALL_QUESTIONS) {
      if (!question.revisionNote) continue
      const year = findYear(question.yearId)
      expect(year?.postRevision, `${question.id} は改正後の年度`).toBe(false)
    }
  })

  it('改正前の年度には法改正の注記が1問以上ある', () => {
    const preRevisionYears = YEARS.filter((year) => !year.postRevision)
    for (const year of preRevisionYears) {
      const notes = questionsByYear(year.id).filter((question) => question.revisionNote)
      expect(notes.length, `${year.label} の改正注記`).toBeGreaterThan(0)
    }
  })
})

describe('論点の定義', () => {
  it('すべての論点にラベルと説明がある', () => {
    for (const topic of TOPIC_IDS) {
      expect(TOPIC_LABELS[topic]?.length ?? 0, topic).toBeGreaterThan(0)
      expect(TOPIC_DESCRIPTIONS[topic]?.length ?? 0, topic).toBeGreaterThan(0)
    }
  })

  it('すべての論点に1問以上の問題がある', () => {
    const counts = countByTopic()
    for (const topic of TOPIC_IDS) {
      expect(counts.get(topic) ?? 0, TOPIC_LABELS[topic]).toBeGreaterThan(0)
    }
  })

  it('論点ごとの問題数の合計が全問題数と一致する', () => {
    const counts = countByTopic()
    const sum = [...counts.values()].reduce((total, count) => total + count, 0)
    expect(sum).toBe(TOTAL_QUESTION_COUNT)
  })
})

describe('検索ヘルパー', () => {
  it('IDで問題を引ける', () => {
    const question = findQuestion('r07-01')
    expect(question?.yearId).toBe('r07')
    expect(question?.questionNumber).toBe(1)
  })

  it('存在しないIDは undefined を返す', () => {
    expect(findQuestion('r99-01')).toBeUndefined()
  })

  it('findQuestions は渡した順序を保ち、存在しないIDを無視する', () => {
    const result = findQuestions(['h28-10', 'nope', 'r07-01'])
    expect(result.map((question) => question.id)).toEqual(['h28-10', 'r07-01'])
  })

  it('年度の表示名を和暦と西暦で返す', () => {
    expect(yearFullLabel('r07')).toBe('令和7年度（2025年）')
    expect(yearFullLabel('h28')).toBe('平成28年度（2016年）')
  })

  it('不正な年度コードは判定で弾ける', () => {
    expect(isYearId('r07')).toBe(true)
    expect(isYearId('s60')).toBe(false)
  })
})
