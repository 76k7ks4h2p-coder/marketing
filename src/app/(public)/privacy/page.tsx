import type { Metadata } from 'next'

import { Alert } from '@/components/ui/feedback'
import { SERVICE_NAME } from '@/lib/constants/service'

export const metadata: Metadata = {
  title: 'プライバシーポリシー（ドラフト）',
}

const SECTIONS = [
  {
    heading: '1. 取得する情報',
    paragraphs: [
      `${SERVICE_NAME}（以下「本サービス」といいます）は、サービスの提供にあたり次の情報を取得します。`,
    ],
    list: [
      'アカウント情報（メールアドレス、氏名、電話番号、会社名・屋号）',
      '物件情報（物件名、所在地、種別、構造、築年、戸数、面積、備考）',
      '依頼情報（作業カテゴリー、対象箇所、依頼内容、希望時期、予算、アップロードされた写真）',
      '認証および利用に関する記録（ログイン日時、操作日時など）',
    ],
  },
  {
    heading: '2. 利用目的',
    paragraphs: ['取得した情報は、次の目的の範囲内で利用します。'],
    list: [
      '本サービスの提供、維持、改善',
      '事業者への見積もり依頼および作業手配',
      '依頼状況、見積もり、完了報告に関するご連絡',
      'お問い合わせへの対応',
      '不正利用の防止',
    ],
  },
  {
    heading: '3. 第三者への提供',
    paragraphs: [
      '運営者は、見積もりの取得および作業の実施に必要な範囲で、依頼内容・物件所在地・写真等を協力事業者へ提供します。',
      '上記のほか、法令に基づく場合を除き、あらかじめご本人の同意を得ることなく個人情報を第三者へ提供することはありません。',
      '運営者は、事業者に対して、提供した情報を当該作業の目的以外に利用しないよう求めます。',
    ],
  },
  {
    heading: '4. 業務委託先',
    paragraphs: [
      '本サービスは、システムの運用のために次の外部サービスを利用しています。各サービスの取扱いについては、それぞれの提供者が定める規定に従います。',
    ],
    list: [
      'ホスティングおよび配信基盤',
      'データベース、認証、ファイル保管の基盤（Supabase）',
      'メール配信サービス（Resend。設定されている場合のみ）',
    ],
  },
  {
    heading: '5. 写真の取扱い',
    paragraphs: [
      'アップロードされた写真は非公開のストレージに保管され、一般には公開されません。閲覧は、当該依頼のオーナーおよび運営者に限られ、都度発行される有効期限付きの URL を通じて行われます。',
      '依頼者以外のオーナーが他人の依頼の写真を閲覧することはできません。',
    ],
  },
  {
    heading: '6. 保管期間',
    paragraphs: [
      '取得した情報は、利用目的の達成に必要な期間、および法令で定められた期間、保管します。',
      'アカウントを削除した場合、当該アカウントに紐づく情報は、法令上保管が必要なものを除き削除されます。',
    ],
  },
  {
    heading: '7. 安全管理',
    paragraphs: [
      '運営者は、取得した情報について、アクセス権限の制御、通信の暗号化その他の合理的な安全管理措置を講じます。',
      'データベースでは行単位のアクセス制御（Row Level Security）を有効にし、利用者が自身に関係のないデータへアクセスできないようにしています。',
    ],
  },
  {
    heading: '8. 開示・訂正・削除の請求',
    paragraphs: [
      'ご本人からの求めにより、保有する個人情報の開示、訂正、利用停止、削除に応じます。ご希望の場合は運営者までご連絡ください。',
    ],
  },
  {
    heading: '9. Cookie の利用',
    paragraphs: [
      '本サービスは、ログイン状態を維持するために Cookie を使用します。この Cookie は認証のために必要なものであり、広告目的の追跡には使用しません。',
    ],
  },
  {
    heading: '10. 本ポリシーの変更',
    paragraphs: [
      '運営者は、必要に応じて本ポリシーを変更することがあります。変更後の内容は、本サービス上に掲載した時点から適用されます。',
    ],
  },
  {
    heading: '11. お問い合わせ',
    paragraphs: [
      '本ポリシーに関するお問い合わせ先は、正式公開時に記載します。（MVP 段階のため未記載）',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-900">プライバシーポリシー</h1>
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
