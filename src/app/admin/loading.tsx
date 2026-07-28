import { PageContainer } from '@/components/ui/page'
import { SkeletonList } from '@/components/ui/feedback'

export default function AdminLoading() {
  return (
    <PageContainer>
      <div className="mb-5 h-8 w-56 animate-pulse rounded bg-slate-200" />
      <SkeletonList rows={4} />
    </PageContainer>
  )
}
