import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/footer'
import { SiteHeader } from '@/components/layout/site-header'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
