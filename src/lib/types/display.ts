/**
 * 画面へ渡すための行型。
 *
 * データ取得層（`src/lib/queries/*`）は `server-only` なので、
 * Client Component からも安全に参照できるようここに型だけを置く。
 * 作成者 (`created_by`) は表示に使わないため型から除外し、
 * うっかり画面へ渡さないようにしている。
 */

import type { QuoteRow, WorkReportRow } from './database'

export type QuoteForDisplay = Omit<QuoteRow, 'created_by'>

export type WorkReportForDisplay = Omit<WorkReportRow, 'created_by'>
