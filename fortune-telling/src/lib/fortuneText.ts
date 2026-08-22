import type { Element, FourPillarsResult, Stem } from './fourPillars'

// 日主(生まれた日の干)ごとの簡易パーソナリティ紹介文。
const DAY_MASTER_TEXT: Record<Stem, { title: string; body: string }> = {
  甲: {
    title: '大樹のようにまっすぐ伸びる人',
    body: 'まっすぐで誠実、まわりを引っ張るリーダー気質。まっすぐすぎて頑固に見えることも。',
  },
  乙: {
    title: '草花のようにしなやかな人',
    body: '柔軟で協調性があり、環境に合わせて上手に立ち回れるタイプ。芯の強さは内側に秘めている。',
  },
  丙: {
    title: '太陽のように明るい人',
    body: '陽気で情熱的、周囲を明るく照らすムードメーカー。感情の浮き沈みも大きめ。',
  },
  丁: {
    title: '灯火のように温かい人',
    body: '繊細で気配り上手、人の心にそっと寄り添える人。頑張りすぎて燃え尽きに注意。',
  },
  戊: {
    title: '山のようにどっしりした人',
    body: '安定感があり信頼される存在。変化よりも着実な積み上げを好むタイプ。',
  },
  己: {
    title: '大地のように育む人',
    body: '面倒見が良く、人を支えることに喜びを感じるタイプ。自分のことは後回しにしがち。',
  },
  庚: {
    title: '鉄のように意志が強い人',
    body: '決断力があり、白黒はっきりさせたい性格。正義感が強く、曲がったことが嫌い。',
  },
  辛: {
    title: '宝石のように洗練された人',
    body: '美意識が高く繊細な感性の持ち主。プライドが高く、傷つきやすい一面も。',
  },
  壬: {
    title: '大河のように自由な人',
    body: '発想力豊かでスケールの大きな考え方をするタイプ。束縛を嫌い、自由を求める。',
  },
  癸: {
    title: '雨のように静かに染み込む人',
    body: '直感力に優れ、物事の本質を静かに見抜くタイプ。控えめだが芯はしっかりしている。',
  },
}

const ELEMENT_ADVICE: Record<Element, string> = {
  木: '新しいことを始めるチャレンジ精神が、今のあなたの追い風になりそう。',
  火: '情熱や行動力が高まっている時期。思い切って一歩踏み出すと運が開ける。',
  土: '足元を固める堅実さが、今のあなたを支えるカギ。焦らずコツコツと。',
  金: '判断力とけじめのある行動が吉。迷ったらシンプルな選択を選ぶと良い。',
  水: '柔軟な発想と情報収集が力になる時期。人との会話からヒントが得られそう。',
}

const LUCKY_DIRECTIONS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'] as const
const LUCKY_ITEMS = [
  '青いペン',
  '木製の小物',
  '観葉植物',
  '赤いアクセサリー',
  'キャンドル',
  '陶器のマグカップ',
  '黄色いハンカチ',
  'シルバーのアクセサリー',
  '腕時計',
  '青か黒の飲み物ボトル',
  '手鏡',
]

function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

export interface FortuneReading {
  dayMasterTitle: string
  dayMasterBody: string
  strongestElement: Element
  weakestElement: Element
  advice: string
  luckyDirection: string
  luckyItem: string
}

export function buildFortuneReading(result: FourPillarsResult): FortuneReading {
  const entries = Object.entries(result.elementCounts) as [Element, number][]
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))
  const dayMasterText = DAY_MASTER_TEXT[result.dayMaster.stem]

  // 出生地は計算そのものには使わず、ちょっとした運試し要素(ラッキー方位・アイテム)の
  // 種として使うことで、入力した意味を持たせている。
  const seed = hashText(result.birthPlace || result.day.label)

  return {
    dayMasterTitle: dayMasterText.title,
    dayMasterBody: dayMasterText.body,
    strongestElement: strongest[0],
    weakestElement: weakest[0],
    advice: ELEMENT_ADVICE[result.dayMaster.element],
    luckyDirection: LUCKY_DIRECTIONS[seed % LUCKY_DIRECTIONS.length],
    luckyItem: LUCKY_ITEMS[(seed >>> 3) % LUCKY_ITEMS.length],
  }
}
