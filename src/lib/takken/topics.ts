import type { TopicId } from './types'

/**
 * 民法の論点一覧。分野別演習の並び順は、条文（総則→物権→債権→親族相続）に
 * おおむね沿わせて、学習しやすい順にしている。
 */
export const TOPIC_IDS = [
  'ishi-hyoji',
  'seigen-koi-noryoku',
  'dairi',
  'jiko',
  'bukken-hendo',
  'kyoyu',
  'teitoken',
  'sonota-tanpo',
  'saiken-jitsugen',
  'saimu-furiko',
  'rentai-hosho',
  'saiken-joto',
  'bensai-sosai',
  'baibai',
  'chintaishaku',
  'shiyo-taishaku',
  'ukeoi-inin',
  'fuho-koi',
  'sozoku',
  'sonota',
] as const satisfies readonly TopicId[]

export const TOPIC_LABELS: Record<TopicId, string> = {
  'ishi-hyoji': '意思表示',
  'seigen-koi-noryoku': '制限行為能力者',
  dairi: '代理',
  jiko: '時効',
  'bukken-hendo': '物権変動・対抗要件',
  kyoyu: '共有',
  teitoken: '抵当権・根抵当権',
  'sonota-tanpo': '留置権・質権・先取特権',
  'saiken-jitsugen': '債権者代位権・詐害行為取消権',
  'saimu-furiko': '債務不履行・解除・危険負担',
  'rentai-hosho': '連帯債務・保証',
  'saiken-joto': '債権譲渡・債務引受',
  'bensai-sosai': '弁済・相殺',
  baibai: '売買・手付・契約不適合責任',
  chintaishaku: '賃貸借',
  'shiyo-taishaku': '使用貸借',
  'ukeoi-inin': '請負・委任',
  'fuho-koi': '不法行為',
  sozoku: '相続',
  sonota: 'その他（総則・事務管理など）',
}

/** 分野一覧ページで、その分野が何を扱うのかを一言で示す。 */
export const TOPIC_DESCRIPTIONS: Record<TopicId, string> = {
  'ishi-hyoji': '詐欺・強迫・錯誤・虚偽表示・心裡留保と、第三者保護の要件。',
  'seigen-koi-noryoku': '未成年者・成年被後見人・被保佐人・被補助人の行為の効力と取消し。',
  dairi: '代理権の範囲、無権代理、表見代理、自己契約・双方代理、復代理。',
  jiko: '取得時効の要件、消滅時効の期間、完成猶予と更新。',
  'bukken-hendo': '民法 177 条の「第三者」、二重譲渡、登記がなくても対抗できる場合。',
  kyoyu: '持分の処分、保存・管理・変更行為の区別、共有物分割。',
  teitoken: '抵当権の効力の及ぶ範囲、物上代位、法定地上権、抵当権消滅請求。',
  'sonota-tanpo': '留置権の成立要件、質権の対抗要件、先取特権の順位。',
  'saiken-jitsugen': '債権者代位権と詐害行為取消権の要件・行使方法。',
  'saimu-furiko': '履行遅滞・履行不能、解除の要件、危険負担、損害賠償の範囲。',
  'rentai-hosho': '連帯債務の絶対効・相対効、保証と連帯保証の違い、求償。',
  'saiken-joto': '譲渡制限特約の効力、対抗要件、債務引受の種類。',
  'bensai-sosai': '第三者弁済、受領権者としての外観を有する者、相殺の要件と禁止。',
  baibai: '手付解除、契約不適合責任の内容と期間制限、他人物売買。',
  chintaishaku: '賃借権の対抗要件、賃借権の譲渡・転貸、敷金、原状回復。',
  'shiyo-taishaku': '無償で借りる契約の特徴。賃貸借との違いが問われる。',
  'ukeoi-inin': '請負の契約不適合責任、注文者の解除権、委任の任意解除と善管注意義務。',
  'fuho-koi': '一般不法行為、使用者責任、工作物責任、共同不法行為、消滅時効。',
  sozoku: '法定相続分、遺言、遺留分、相続放棄、遺産分割、配偶者居住権。',
  sonota: '条件・期限、事務管理、不当利得など、他に分類しにくい論点。',
}

export function topicLabel(topic: TopicId): string {
  return TOPIC_LABELS[topic]
}

/** 未知の文字列が TopicId かどうかを判定する（URL パラメータの検証用）。 */
export function isTopicId(value: string): value is TopicId {
  return (TOPIC_IDS as readonly string[]).includes(value)
}
