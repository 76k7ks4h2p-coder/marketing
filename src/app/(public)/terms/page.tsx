import type { Metadata } from 'next'

import { Alert } from '@/components/ui/feedback'
import { SERVICE_AREA_LABEL, SERVICE_NAME } from '@/lib/constants/service'

export const metadata: Metadata = {
  title: '利用規約（ドラフト）',
}

const SECTIONS = [
  {
    heading: '第1条（適用）',
    paragraphs: [
      `本規約は、${SERVICE_NAME}（以下「本サービス」といいます）の提供条件および本サービスの運営者（以下「運営者」といいます）と利用者との間の権利義務関係を定めるものです。`,
      '利用者は、本サービスを利用することにより、本規約に同意したものとみなされます。',
    ],
  },
  {
    heading: '第2条（本サービスの内容）',
    paragraphs: [
      `本サービスは、${SERVICE_AREA_LABEL}に所在する不動産の所有者（以下「オーナー」といいます）が、物件の管理に必要な作業について事業者の見積もりを比較し、発注先を選択するための場を提供するものです。`,
      '運営者は、オーナーからの依頼に基づき、地域の事業者へ連絡して見積もりを取得し、標準化した形式で本サービス上に掲載します。',
    ],
  },
  {
    heading: '第3条（運営者の立場）',
    paragraphs: [
      '運営者は、オーナーと事業者との間の作業請負契約の当事者ではありません。運営者は、見積もりの取得および情報の掲載を行う仲介的な立場にとどまります。',
      '作業の実施、品質、工期、保証その他の履行に関する責任は、当該作業を請け負う事業者が負うものとします。',
    ],
  },
  {
    heading: '第4条（対応エリア）',
    paragraphs: [
      `本サービスの対応エリアは${SERVICE_AREA_LABEL}に限定されます。対応エリア外の物件は登録および依頼を行うことができません。`,
    ],
  },
  {
    heading: '第5条（アカウント）',
    paragraphs: [
      '利用者は、正確かつ最新の情報を用いてアカウントを登録するものとします。',
      '利用者は、自己の責任においてログイン情報を管理するものとし、第三者に利用させ、または貸与、譲渡してはならないものとします。',
    ],
  },
  {
    heading: '第6条（禁止事項）',
    paragraphs: ['利用者は、本サービスの利用にあたり、次の行為を行ってはなりません。'],
    list: [
      '法令または公序良俗に違反する行為',
      '虚偽の情報を登録する行為',
      '他の利用者、事業者または第三者の権利を侵害する行為',
      '本サービスの運営を妨害する行為',
      '本サービスを通じて知り得た事業者の情報を、本サービスの目的外で利用する行為',
      '不正アクセスその他の方法により、権限のない情報へアクセスしようとする行為',
    ],
  },
  {
    heading: '第7条（見積もりおよび発注）',
    paragraphs: [
      '本サービス上に掲載される見積もりは、事業者から提示された内容を運営者が入力したものです。',
      'オーナーは、掲載された見積もりのうち 1 件を選択することができます。選択後の変更は、本サービスの画面上では行えません。変更を希望する場合は運営者へご連絡ください。',
      '見積もりには有効期限が設定される場合があります。有効期限を過ぎた見積もりは、内容が変更される可能性があります。',
    ],
  },
  {
    heading: '第8条（写真および投稿情報）',
    paragraphs: [
      '利用者は、依頼に関連して写真その他の情報を本サービスへアップロードすることができます。',
      '利用者は、アップロードする情報について、必要な権利を有していること、および第三者の権利を侵害しないことを保証するものとします。',
      '運営者は、アップロードされた情報を、見積もりの取得および作業の実施に必要な範囲で事業者へ提供することがあります。',
    ],
  },
  {
    heading: '第9条（免責）',
    paragraphs: [
      '運営者は、本サービスの内容の正確性、完全性、有用性について保証するものではありません。',
      '運営者は、本サービスの利用または利用不能によって利用者に生じた損害について、運営者の故意または重過失による場合を除き、責任を負わないものとします。',
    ],
  },
  {
    heading: '第10条（サービスの変更・中断・終了）',
    paragraphs: [
      '運営者は、利用者への事前の通知なく、本サービスの内容を変更し、または提供を中断もしくは終了することができるものとします。',
    ],
  },
  {
    heading: '第11条（規約の変更）',
    paragraphs: [
      '運営者は、必要と判断した場合、本規約を変更することができるものとします。変更後の規約は、本サービス上に掲載した時点から効力を生じます。',
    ],
  },
  {
    heading: '第12条（準拠法および管轄）',
    paragraphs: [
      '本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-900">利用規約</h1>
      <p className="mt-1 text-sm text-ink-500">開発用ドラフト</p>

      <Alert variant="warning" title="これは開発用のドラフトです" className="mt-4">
        <p>
          本ページの内容は MVP
          開発のために用意した仮の文面であり、法的に完成した文書ではありません。
          正式公開前に弁護士等の専門家による確認が必要です。現時点で法的効力を持つものとして扱わないでください。
        </p>
      </Alert>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-bold text-ink-900">{section.heading}</h2>
            <div className="mt-2 space-y-2">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-700">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-ink-700">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
