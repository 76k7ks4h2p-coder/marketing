'use client'

import { LogOut } from 'lucide-react'

import { signOutAction } from '@/actions/auth'
import { SubmitButton } from '@/components/ui/submit-button'

export function LogoutForm({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <SubmitButton variant="ghost" size="sm" pendingLabel="ログアウト中…">
        <LogOut aria-hidden="true" className="h-4 w-4" />
        ログアウト
      </SubmitButton>
    </form>
  )
}
