import { describe, expect, it } from 'vitest'
import { floorLabel } from '../src/domain/floors.ts'
import { searchCampus } from '../src/domain/search.ts'
import { loadRealIndex } from './helpers.ts'

const index = loadRealIndex()

function locate(query: string) {
  const outcome = searchCampus(index, query)
  const room = outcome.exactRoom
  if (!room) return null
  const building = index.buildingById.get(room.buildingId)
  return {
    code: room.code,
    building: building?.name,
    floor: floorLabel(room.floor),
    status: room.status,
  }
}

describe('開発指示書 §8 の必須確認（教室番号 → 建物・階）', () => {
  it.each([
    ['111', '清和館', '1階'],
    ['2202', 'mican', '2階'],
    ['A201', '清優館', '2階'],
    ['G001', '啓成館', '地下1階'],
    ['H301', 'アカデミックリンクス', '3階'],
    ['J804', 'アカデミックテラス', '8階'],
  ])('%s は %s の %s', (code, building, floor) => {
    expect(locate(code)).toEqual({ code, building, floor, status: 'verified' })
  })

  it('建物番号（建物記号）も正しく対応している', () => {
    expect(index.buildingByCode.get('1')?.name).toBe('清和館')
    expect(index.buildingByCode.get('2')?.name).toBe('mican')
    expect(index.buildingByCode.get('A')?.name).toBe('清優館')
    expect(index.buildingByCode.get('G')?.name).toBe('啓成館')
    expect(index.buildingByCode.get('H')?.name).toBe('アカデミックリンクス')
    expect(index.buildingByCode.get('J')?.name).toBe('アカデミックテラス')
  })
})

describe('表記揺れに強い', () => {
  it.each(['h301', 'Ｈ３０１', 'ｈ－３０１', 'H-301', 'H 301', 'H301教室', ' h301 '])(
    '%s で H301 が見つかる',
    (query) => {
      expect(searchCampus(index, query).exactRoom?.code).toBe('H301')
    },
  )

  it('全角数字の 4 桁番号（２２０２）でも見つかる', () => {
    expect(searchCampus(index, '２２０２').exactRoom?.code).toBe('2202')
  })

  it('O と 0 の打ち間違いを補正し、補正したことを返す', () => {
    const outcome = searchCampus(index, 'G0O1')
    expect(outcome.exactRoom?.code).toBe('G001')
    expect(outcome.correctedFrom).toBe('G0O1')
  })
})

describe('インクリメンタル検索（入力途中の候補）', () => {
  it('「H3」で H301・H302 を候補に出す', () => {
    const codes = searchCampus(index, 'H3')
      .hits.filter((h) => h.kind === 'room')
      .map((h) => (h.kind === 'room' ? h.room.code : ''))
    expect(codes).toEqual(['H301', 'H302'])
  })

  it('「22」で mican 2階の教室を候補に出す', () => {
    const codes = searchCampus(index, '22').hits.flatMap((h) =>
      h.kind === 'room' ? [h.room.code] : [],
    )
    expect(codes).toEqual(['2201', '2202', '2203', '2204', '2205'])
  })

  it('完全一致を最上位に出す', () => {
    const top = searchCampus(index, 'J80').hits[0]
    expect(top?.kind).toBe('room')
    const exactTop = searchCampus(index, 'J804').hits[0]
    expect(exactTop?.kind === 'room' && exactTop.room.code).toBe('J804')
  })

  it('建物記号 1 文字（H）では建物を先頭に、続けてその建物の教室を出す', () => {
    const hits = searchCampus(index, 'H').hits
    expect(hits[0]?.kind === 'building' && hits[0].building.name).toBe('アカデミックリンクス')
    expect(hits.filter((h) => h.kind === 'room').length).toBe(16)
  })
})

describe('建物名・施設名・教室名での検索', () => {
  it('建物名（部分一致・ひらがな）で建物が見つかる', () => {
    const top = searchCampus(index, 'アカデミックテラス').hits[0]
    expect(top?.kind === 'building' && top.building.code).toBe('J')
    const kana = searchCampus(index, 'みかん').hits[0]
    expect(kana?.kind === 'building' && kana.building.name).toBe('mican')
    const partial = searchCampus(index, '清和').hits[0]
    expect(partial?.kind === 'building' && partial.building.name).toBe('清和館')
  })

  it('「H棟」「J棟」で建物が見つかる', () => {
    const h = searchCampus(index, 'H棟').hits[0]
    expect(h?.kind === 'building' && h.building.code).toBe('H')
    const j = searchCampus(index, 'Ｊ棟').hits[0]
    expect(j?.kind === 'building' && j.building.code).toBe('J')
  })

  it('「食堂」で食堂がすべて見つかる', () => {
    const ids = searchCampus(index, '食堂').hits.flatMap((h) =>
      h.kind === 'facility' ? [h.facility.id] : [],
    )
    expect(ids).toEqual(
      expect.arrayContaining(['terrace-dining-commons', 'kyoyukan-dining', 'tachibal']),
    )
  })

  it('「図書館」で図書館が見つかる', () => {
    const hits = searchCampus(index, '図書館').hits
    expect(hits.some((h) => h.kind === 'facility' && h.facility.id === 'library')).toBe(true)
  })

  it('教室名（書道・Media Lab）で教室が見つかる', () => {
    const calligraphy = searchCampus(index, '書道').hits.flatMap((h) =>
      h.kind === 'room' ? [h.room.code] : [],
    )
    expect(calligraphy).toEqual(['2402', '2403', '2404', '2405'])
    const lab = searchCampus(index, 'media lab').hits.flatMap((h) =>
      h.kind === 'room' ? [h.room.code] : [],
    )
    expect(lab).toEqual(['J603', 'J703', 'J804'])
  })

  it('「清和館3階」「H棟 4F」「啓成館 地下1階」で、その階の教室が見つかる', () => {
    const rooms = (q: string) =>
      searchCampus(index, q).hits.flatMap((h) => (h.kind === 'room' ? [h.room.code] : []))
    expect(rooms('清和館3階')).toEqual(['131', '132', '133', '134', '135'])
    expect(rooms('H棟 4F')).toEqual(['H401', 'H402', 'H403'])
    expect(rooms('啓成館 地下1階')).toEqual(['G001', 'G002', 'G003', 'G004', 'G005', 'G006'])
  })
})

describe('存在しない・登録されていない教室番号', () => {
  it('建物記号が不明な番号は、候補も推定も返さない', () => {
    const outcome = searchCampus(index, 'Z999')
    expect(outcome.exactRoom).toBeNull()
    expect(outcome.inference).toBeNull()
    expect(outcome.hits).toEqual([])
  })

  it('建物は分かるが公式一覧にない番号は、建物と階だけを「推定」として返す', () => {
    const outcome = searchCampus(index, 'F404')
    expect(outcome.exactRoom).toBeNull()
    expect(outcome.inference).toMatchObject({ level: 4, floorRegistered: true, complete: true })
    expect(outcome.inference?.building.name).toBe('響友館')
  })

  it('教室が登録されていない階の番号では、階が登録済みとはしない', () => {
    const outcome = searchCampus(index, 'H999')
    expect(outcome.exactRoom).toBeNull()
    expect(outcome.inference?.building.code).toBe('H')
    expect(outcome.inference?.floorRegistered).toBe(false)
  })

  it('入力途中（桁が足りない）なら complete=false', () => {
    expect(searchCampus(index, 'H30').inference?.complete).toBe(false)
  })

  it('空の入力では何も返さない', () => {
    expect(searchCampus(index, '   ').hits).toEqual([])
  })
})
