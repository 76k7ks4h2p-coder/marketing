/**
 * 宅建（宅地建物取引士資格試験）民法過去問アプリのデータ型。
 *
 * 宅建本試験の「権利関係」は問1〜問14。このアプリはそのうち
 * 民法（問1〜問10 相当）だけを扱う。借地借家法・区分所有法・
 * 不動産登記法は対象外。
 */

/** 民法の論点分類。分野別演習の単位になる。 */
export type TopicId =
  | 'ishi-hyoji' // 意思表示
  | 'seigen-koi-noryoku' // 制限行為能力者
  | 'dairi' // 代理
  | 'jiko' // 時効
  | 'bukken-hendo' // 物権変動・対抗要件
  | 'kyoyu' // 共有
  | 'teitoken' // 抵当権・根抵当権
  | 'sonota-tanpo' // 留置権・質権・先取特権
  | 'saiken-jitsugen' // 債権者代位権・詐害行為取消権
  | 'saimu-furiko' // 債務不履行・解除・危険負担
  | 'rentai-hosho' // 連帯債務・保証
  | 'saiken-joto' // 債権譲渡・債務引受
  | 'bensai-sosai' // 弁済・相殺
  | 'baibai' // 売買・手付・契約不適合責任
  | 'chintaishaku' // 賃貸借
  | 'shiyo-taishaku' // 使用貸借
  | 'ukeoi-inin' // 請負・委任
  | 'fuho-koi' // 不法行為
  | 'sozoku' // 相続
  | 'sonota' // その他（条件・期限・組合・事務管理など）

/** 4 択の選択肢。宅建本試験と同じく必ず 4 つ。 */
export type Choice = {
  /** 選択肢番号（1〜4）。 */
  readonly number: 1 | 2 | 3 | 4
  /** 選択肢の本文。 */
  readonly text: string
  /** その選択肢が正しい／誤りである理由。選択後に表示する。 */
  readonly comment: string
}

/** 1 問分のデータ。 */
export type Question = {
  /**
   * 問題 ID。`{年度コード}-{問番号}` 形式（例: `r07-01`）。
   * 学習履歴のキーになるので、一度公開したら変更しない。
   */
  readonly id: string
  /** 出題年度コード（例: `r07`）。 */
  readonly yearId: YearId
  /** 本試験での問番号（問1なら 1）。 */
  readonly questionNumber: number
  /** 論点。 */
  readonly topic: TopicId
  /** 何を問うているかの短い見出し（一覧表示用）。 */
  readonly title: string
  /** 問題文（リード文）。 */
  readonly prompt: string
  /** 4 つの選択肢。 */
  readonly choices: readonly [Choice, Choice, Choice, Choice]
  /** 正解の選択肢番号。 */
  readonly answer: 1 | 2 | 3 | 4
  /** 全体の解説。 */
  readonly explanation: string
  /** 根拠条文（例: `民法 96 条 3 項`）。 */
  readonly articles: readonly string[]
  /** 体感的な難易度。 */
  readonly difficulty: Difficulty
  /**
   * 2020 年 4 月施行の改正民法（債権法改正）で結論や用語が変わった論点に付ける注記。
   * 出題当時と現在で答えが変わる問題を、そのまま覚えてしまわないための警告。
   */
  readonly revisionNote?: string
}

export type Difficulty = 'basic' | 'standard' | 'advanced'

/** 年度コード。令和 7 年度〜平成 28 年度の 10 年分。 */
export type YearId = 'r07' | 'r06' | 'r05' | 'r04' | 'r03' | 'r02' | 'r01' | 'h30' | 'h29' | 'h28'

export type Year = {
  readonly id: YearId
  /** 和暦の年度表記（例: `令和7年度`）。 */
  readonly label: string
  /** 西暦（例: 2025）。 */
  readonly seireki: number
  /** 2020 年 4 月施行の改正民法が適用される年度かどうか。 */
  readonly postRevision: boolean
  /** 実施回に関する補足（同一年度に複数回実施された年など）。 */
  readonly note?: string
}

/** 1 問に対する解答結果。 */
export type AnswerRecord = {
  readonly questionId: string
  /** 選んだ選択肢番号。時間切れなどで未解答なら null。 */
  readonly selected: 1 | 2 | 3 | 4 | null
  readonly correct: boolean
  /** 解答時刻（epoch ミリ秒）。 */
  readonly answeredAt: number
}

/** 1 問ごとの累積成績。 */
export type QuestionProgress = {
  readonly questionId: string
  /** 解答した回数。 */
  readonly attempts: number
  /** 正解した回数。 */
  readonly corrects: number
  /** 直近の解答が正解だったか。 */
  readonly lastCorrect: boolean
  /** 直近の解答時刻（epoch ミリ秒）。 */
  readonly lastAnsweredAt: number
  /** ユーザーが付けたチェック（後で見直す）。 */
  readonly flagged: boolean
}

/** localStorage に保存する学習履歴全体。 */
export type ProgressState = {
  /** 保存形式のバージョン。読み込み時の互換性判定に使う。 */
  readonly version: number
  readonly questions: Readonly<Record<string, QuestionProgress>>
}

/** 演習モード。 */
export type PracticeMode = 'year' | 'topic' | 'mock' | 'review'

/** 演習セッションの設定。 */
export type SessionConfig = {
  readonly mode: PracticeMode
  /** 出題する問題（順序込み）。 */
  readonly questions: readonly Question[]
  /** 見出し（例: `令和7年度`）。 */
  readonly title: string
  /**
   * 1 問ごとに即座に正誤と解説を出すか。
   * 年度別・分野別・復習は true、模試は false（最後にまとめて採点）。
   */
  readonly immediateFeedback: boolean
  /** 制限時間（秒）。null なら無制限。 */
  readonly timeLimitSeconds: number | null
}
