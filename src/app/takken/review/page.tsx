import type { Metadata } from 'next'

import { ReviewRunner } from '@/components/takken/review-runner'

export const metadata: Metadata = {
  title: '復習',
  description: '間違えた問題とチェックを付けた問題だけを、定着していない順に解き直します。',
}

export default function ReviewPage() {
  return <ReviewRunner />
}
