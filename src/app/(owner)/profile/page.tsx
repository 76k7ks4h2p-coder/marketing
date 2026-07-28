import type { Metadata } from 'next'

import { ProfileForm } from '@/components/owner/profile-form'
import {
  DescriptionItem,
  DescriptionList,
  PageContainer,
  PageTitle,
  SectionCard,
} from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { userRoleLabel } from '@/lib/constants/roles'
import { formatJapaneseDate } from '@/lib/format/date'

export const metadata: Metadata = {
  title: 'アカウント',
}

export default async function ProfilePage() {
  const { profile, user } = await requireOwner('/profile')

  return (
    <PageContainer>
      <PageTitle title="アカウント" description="ご連絡先の情報を確認・変更できます。" />

      <div className="space-y-4">
        <SectionCard title="アカウント情報">
          <DescriptionList>
            <DescriptionItem label="メールアドレス">{user.email ?? '—'}</DescriptionItem>
            <DescriptionItem label="区分">{userRoleLabel(profile.role)}</DescriptionItem>
            <DescriptionItem label="登録日">
              {formatJapaneseDate(profile.created_at)}
            </DescriptionItem>
          </DescriptionList>
          <p className="mt-3 text-xs text-ink-500">
            メールアドレスの変更は、お手数ですが運営者へご連絡ください。
          </p>
        </SectionCard>

        <SectionCard title="連絡先の変更">
          <ProfileForm profile={profile} />
        </SectionCard>

        <SectionCard title="パスワード">
          <p className="text-sm text-ink-700">
            パスワードを変更する場合は、ログイン画面の「パスワードをお忘れの方」から再設定メールをお送りください。
          </p>
          <p className="mt-2 text-sm">
            <a href="/forgot-password" className="text-brand-700 underline underline-offset-2">
              パスワード再設定メールを送る
            </a>
          </p>
        </SectionCard>
      </div>
    </PageContainer>
  )
}
