import { CampusNavi } from './ui/CampusNavi.tsx'
import { BrandMark } from './ui/Chrome.tsx'
import { OFFICIAL_CLASSROOM_LIST_URL } from './ui/format.ts'
import { useCampusData } from './ui/hooks.ts'
import { Button, ExternalLink } from './ui/parts.tsx'

export function App() {
  const { state, retry } = useCampusData()

  if (state.status === 'ready') {
    return <CampusNavi data={state.data} warnings={state.warnings} />
  }

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark size={56} />
      <h1 className="text-xl font-extrabold">Tachibana Campus Navi</h1>
      {state.status === 'loading' ? (
        <p role="status" className="text-muted">
          教室データを読み込んでいます…
        </p>
      ) : (
        <div role="alert" className="max-w-sm space-y-4">
          <p className="font-semibold">{state.message}</p>
          <p className="text-sm text-muted">
            通信状況を確認して、もう一度お試しください。教室は大学の公式ページでも確認できます。
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button variant="primary" onClick={retry}>
              もう一度読み込む
            </Button>
            <ExternalLink href={OFFICIAL_CLASSROOM_LIST_URL}>公式の教室一覧を開く</ExternalLink>
          </div>
        </div>
      )}
    </main>
  )
}
