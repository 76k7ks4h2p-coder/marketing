import Link from 'next/link'
import { CalendarHeart, Clock3, History, MapPinned, Moon, Sparkles, Wand2 } from 'lucide-react'

const FEATURES = [
  {
    icon: CalendarHeart,
    title: '生年月日・出生地・出生時刻から占う',
    body: '四柱推命の考え方をベースに、年柱・月柱・日柱・時柱を算出。あなたの生まれ持った性質を紐解きます。',
  },
  {
    icon: Wand2,
    title: '五行バランス診断つき',
    body: '木・火・土・金・水、5つの気のバランスから、今のあなたに合うアドバイスとラッキー方位・アイテムを提案。',
  },
  {
    icon: History,
    title: '占い履歴を自動保存',
    body: '占うたびにこの端末のブラウザに自動保存。過去の結果をいつでも見返せます。会員登録は不要です。',
  },
]

const STEPS = [
  { icon: CalendarHeart, label: '生年月日を入力', body: '出生地・出生時刻もあわせて入力すると、より詳しく占えます。' },
  { icon: Sparkles, label: '「占う」を押す', body: 'その場ですぐに結果が表示されます。難しい操作は一切ありません。' },
  { icon: Clock3, label: '結果を見る・保存される', body: '性格・五行バランス・運気アドバイスが表示され、履歴にも自動保存されます。' },
]

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-16 px-4 py-14">
      {/* ヒーロー */}
      <section className="relative text-center">
        <Sparkles className="twinkle absolute -top-4 left-4 h-4 w-4 text-gold-300" />
        <Sparkles className="twinkle twinkle-delay absolute top-2 right-6 h-3 w-3 text-mystic-300" />
        <div className="mb-3 flex items-center justify-center gap-2 text-mystic-300">
          <Moon className="h-5 w-5" />
          <p className="text-sm font-semibold tracking-widest">四柱推命(簡易版)・無料</p>
        </div>
        <h1 className="font-display glow-text text-4xl leading-snug font-bold text-gold-300">
          生まれ星占い
        </h1>
        <p className="mt-4 text-base leading-relaxed text-night-100">
          生年月日・出生地・出生時刻を入力するだけ。
          <br />
          あなたの本質と、今の運気のヒントがわかります。
        </p>
        <Link
          href="/uranai"
          className="mt-8 inline-block w-full rounded-lg bg-gradient-to-r from-mystic-600 to-gold-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-mystic-900/40 transition hover:brightness-110"
        >
          無料で占ってみる
        </Link>
        <p className="mt-2 text-xs text-night-500">会員登録不要・入力は1分程度</p>
      </section>

      {/* サンプルプレビュー */}
      <section className="card-mystic rounded-2xl p-5">
        <p className="text-center text-xs font-semibold text-mystic-300">占い結果のイメージ</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {['年柱', '月柱', '日柱', '時柱'].map((label, i) => (
            <div key={label} className="rounded-lg border border-mystic-700/60 bg-night-900/50 p-2">
              <p className="text-xs text-night-300">{label}</p>
              <p className="font-display mt-1 text-lg font-bold text-gold-300">
                {['庚午', '壬午', '辛亥', '乙未'][i]}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-night-300">
          「宝石のように洗練された人」— あなたの日主タイプもわかります
        </p>
      </section>

      {/* 特徴 */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-center text-xl font-bold text-night-100">
          生まれ星占いの特徴
        </h2>
        <div className="flex flex-col gap-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-mystic flex gap-3 rounded-2xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mystic-700/40 text-gold-300">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-night-100">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-night-300">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 使い方 */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-center text-xl font-bold text-night-100">使い方は3ステップ</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map(({ icon: Icon, label, body }, i) => (
            <li key={label} className="card-mystic flex gap-3 rounded-2xl p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-600/20 text-sm font-bold text-gold-300">
                {i + 1}
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-night-100">
                  <Icon className="h-4 w-4 text-mystic-300" />
                  {label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-night-300">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 出生地について */}
      <section className="card-mystic flex gap-3 rounded-2xl p-4">
        <MapPinned className="h-5 w-5 shrink-0 text-mystic-300" />
        <p className="text-sm leading-relaxed text-night-300">
          出生地は計算そのものではなく、ラッキー方位・アイテムを決める材料として使われます。わからない場合は空欄でも占えます。
        </p>
      </section>

      {/* 最後のCTA */}
      <section className="text-center">
        <Link
          href="/uranai"
          className="inline-block w-full rounded-lg bg-gradient-to-r from-mystic-600 to-gold-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-mystic-900/40 transition hover:brightness-110"
        >
          さっそく占ってみる
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-night-500">
          ※ 本サービスはエンタメ目的の簡易的な占いです。節入りや真太陽時の補正は行っていないため、実際の四柱推命の鑑定結果と異なる場合があります。
        </p>
      </section>
    </main>
  )
}
