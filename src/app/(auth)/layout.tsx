import Link from 'next/link'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/footer'
import { SERVICE_NAME } from '@/lib/constants/service'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-700">
            {SERVICE_NAME}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-8">{children}</div>
      </main>

      <Footer />
    </>
  )
}
