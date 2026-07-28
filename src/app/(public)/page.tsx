import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  HandCoins,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'

import { ButtonLink } from '@/components/ui/button'
import {
  SERVICE_CATEGORY_DESCRIPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_VALUES,
} from '@/lib/constants/categories'
import { SERVICE_AREA_LABEL, SERVICE_NAME, SERVICE_TAGLINE } from '@/lib/constants/service'

const STEPS = [
  {
    title: '物件と依頼内容を登録',
    body: '所有物件を登録し、作業カテゴリーと状況を入力します。写真は最大 5 枚まで添付できます。',
    Icon: ClipboardList,
  },
  {
    title: '運営者が地域業者から見積もりを取得',
    body: `${SERVICE_AREA_LABEL}の協力業者へ運営者が連絡し、同じ形式に整えた見積もりを揃えます。`,
    Icon: FileText,
  },
  {
    title: '比較して 1 社を選ぶ',
    body: '税込総額・作業範囲・対応可能日・保証内容を同じ並びで比較し、納得できる 1 社を選べます。',
    Icon: HandCoins,
  },
  {
    title: '作業完了まで進捗を確認',
    body: '日程調整から作業完了まで進捗が画面に反映され、完了報告と写真で仕上がりを確認できます。',
    Icon: CheckCircle2,
  },
]

const BENEFITS = [
  {
    title: '相見積もりの手間がなくなる',
    body: '複数の業者へ個別に連絡し、バラバラの書式を読み解く作業を運営者が引き受けます。',
  },
  {
    title: '同じ形式で条件を比較できる',
    body: '含まれる作業・含まれない作業・追加料金条件まで揃えて提示するため、金額だけの比較になりません。',
  },
  {
    title: '遠方でも物件の状態が分かる',
    body: '物件巡回・写真報告に対応。現地に行かなくても状況を把握できます。',
  },
  {
    title: '記録が案件ごとに残る',
    body: '依頼内容・見積もり・完了報告が案件番号ごとにまとまり、後から振り返れます。',
  },
]

const FAQS = [
  {
    q: '利用に費用はかかりますか。',
    a: '依頼の登録と見積もりの比較は無料です。作業費用は、選んでいただいた業者の見積もり金額に基づきます。',
  },
  {
    q: '対応エリアはどこですか。',
    a: `現在は${SERVICE_AREA_LABEL}の物件のみを対象としています。エリア外の物件は登録・依頼できません。`,
  },
  {
    q: '見積もりは必ず複数もらえますか。',
    a: '作業内容や時期によっては 1 社のみになる場合があります。その場合も、内容を確認したうえでご提示します。',
  },
  {
    q: '業者を選んだあとに変更できますか。',
    a: '画面上での選び直しはできません。事情が変わった場合は運営者へご連絡ください。',
  },
  {
    q: '見積もりを見たあとに断ることはできますか。',
    a: 'できます。選択しないまま置いておくことも可能です。運営者から催促の連絡はいたしません。',
  },
  {
    q: '業者から直接営業の連絡が来ることはありますか。',
    a: 'ありません。業者とのやり取りは運営者が窓口となって行います。',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ヒーロー */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {SERVICE_AREA_LABEL}限定
          </p>

          <h1 className="mt-4 text-3xl leading-snug font-bold text-ink-900 sm:text-4xl">
            {SERVICE_TAGLINE}
          </h1>

          <p className="mt-4 max-w-2xl leading-relaxed text-ink-700">
            {SERVICE_NAME} は、{SERVICE_AREA_LABEL}
            の不動産オーナーのための業者比較・発注サービスです。物件の管理に必要な作業をご依頼いただくと、
            運営者が地域の業者から見積もりを集め、同じ形式に整えてご提示します。
            オーナーは条件を並べて比較し、納得できる 1 社を選ぶだけです。
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              無料で依頼を始める
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              ログイン
            </ButtonLink>
          </div>

          <p className="mt-3 text-xs text-ink-500">
            登録は無料です。依頼を送信するまで費用は発生しません。
          </p>
        </div>
      </section>

      {/* 対象業務 */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-xl font-bold text-ink-900">依頼できる作業</h2>
        <p className="mt-1 text-sm text-ink-500">
          物件の管理に必要な作業をまとめてご相談いただけます。
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORY_VALUES.map((category) => (
            <li key={category} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-ink-900">{SERVICE_CATEGORY_LABELS[category]}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                {SERVICE_CATEGORY_DESCRIPTIONS[category]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 利用の流れ */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <h2 className="text-xl font-bold text-ink-900">利用の流れ</h2>

          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"
                >
                  <step.Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900">
                    <span className="mr-1.5 text-brand-600">STEP {index + 1}</span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* エリア */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-700"
          >
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-brand-900">対応エリアは{SERVICE_AREA_LABEL}のみです</h2>
            <p className="mt-1 text-sm leading-relaxed text-brand-800">
              地域の業者と丁寧に連携するため、{SERVICE_NAME} は{SERVICE_AREA_LABEL}
              の物件に限定して運営しています。エリア外の物件は登録・依頼いただけません。
            </p>
          </div>
        </div>
      </section>

      {/* オーナーのメリット */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <h2 className="text-xl font-bold text-ink-900">オーナーのメリット</h2>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="flex gap-2.5 rounded-xl border border-slate-200 p-4"
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-xl font-bold text-ink-900">よくある質問</h2>

        <dl className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {FAQS.map((faq) => (
            <div key={faq.q} className="p-4">
              <dt className="font-semibold text-ink-900">{faq.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-700">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-brand-900">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 text-center">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            まずは 1 件、相談から始めてみませんか。
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-brand-100">
            アカウント登録は無料です。依頼を送信いただいたあと、運営者が内容を確認して見積もりを集めます。
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg" variant="secondary">
              無料で依頼を始める
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <Link
              href="/login"
              className="min-h-11 px-2 py-2 text-sm text-white underline underline-offset-4 hover:text-brand-100"
            >
              すでにアカウントをお持ちの方はこちら
            </Link>
          </div>

          <p className="mt-6 text-xs text-brand-200">
            ご利用の前に
            <Link href="/terms" className="mx-1 underline underline-offset-2">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="mx-1 underline underline-offset-2">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
      </section>
    </>
  )
}
