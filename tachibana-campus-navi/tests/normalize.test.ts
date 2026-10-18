import { describe, expect, it } from 'vitest'
import {
  compareNatural,
  correctDigitTypos,
  looksLikeRoomCode,
  normalizeCode,
  normalizeText,
} from '../src/domain/normalize.ts'

describe('normalizeCode（教室番号の表記揺れ）', () => {
  it.each([
    ['H301', 'H301'],
    ['h301', 'H301'],
    ['Ｈ３０１', 'H301'],
    ['ｈ－３０１', 'H301'],
    ['H-301', 'H301'],
    ['H 301', 'H301'],
    ['H　301', 'H301'],
    ['Hー301', 'H301'],
    ['H301教室', 'H301'],
    ['Ｈ３０１教室', 'H301'],
    ['2202号室', '2202'],
    ['２２０２', '2202'],
    [' j804 ', 'J804'],
    ['g001', 'G001'],
    ['No.111', '111'],
    ['#A201', 'A201'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCode(input)).toBe(expected)
  })
})

describe('looksLikeRoomCode', () => {
  it('建物記号＋数字、数字のみを教室番号らしいと判定する', () => {
    expect(looksLikeRoomCode('H301')).toBe(true)
    expect(looksLikeRoomCode('2202')).toBe(true)
    expect(looksLikeRoomCode('111')).toBe(true)
    expect(looksLikeRoomCode('H')).toBe(false)
    expect(looksLikeRoomCode('清和館')).toBe(false)
    expect(looksLikeRoomCode('HH301')).toBe(false)
  })
})

describe('correctDigitTypos', () => {
  it('O と 0、I・L と 1 の打ち間違いを補正する（先頭の建物記号は変えない）', () => {
    expect(correctDigitTypos('G0O1')).toBe('G001')
    expect(correctDigitTypos('GOO1')).toBe('G001')
    expect(correctDigitTypos('1I1')).toBe('111')
    expect(correctDigitTypos('H301')).toBeNull()
    expect(correctDigitTypos('HELLO')).toBeNull()
  })
})

describe('normalizeText（名称の表記揺れ）', () => {
  it('カタカナとひらがな、全角と半角、大小文字、空白を同一視する', () => {
    expect(normalizeText('アカデミック テラス')).toBe(normalizeText('あかでみっくてらす'))
    expect(normalizeText('ＭＥＤＩＡ　Ｌａｂ')).toBe('medialab')
    expect(normalizeText('ミカン')).toBe('みかん')
    expect(normalizeText('ラーニング＆リサーチ')).toBe('らーにんぐ&りさーち')
  })
})

describe('compareNatural', () => {
  it('数字を数値として並べる', () => {
    expect(['H1001', 'H302', 'H301'].sort(compareNatural)).toEqual(['H301', 'H302', 'H1001'])
  })
})
