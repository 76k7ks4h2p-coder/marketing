import type { Metadata } from 'next'

import { SERVICE_AREA_LABEL } from '@/lib/constants/service'

import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: '新規登録',
}

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900">オーナー新規登録</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          登録は無料です。{SERVICE_AREA_LABEL}の物件をお持ちの方がご利用いただけます。
        </p>
      </div>

      <SignupForm />
    </div>
  )
}
