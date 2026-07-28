import 'server-only'

import type { TypedSupabaseClient } from '@/lib/supabase/server'
import type {
  ProfileRow,
  PropertyRow,
  ProviderRow,
  QuoteSelectionRow,
  ServiceRequestRow,
} from '@/lib/types/database'
import type { WorkReportForDisplay } from '@/lib/types/display'

import {
  ADMIN_REQUEST_COLUMNS,
  ADMIN_REQUEST_LIST_COLUMNS,
  PROFILE_COLUMNS,
  PROPERTY_COLUMNS,
  QUOTE_SELECTION_COLUMNS,
  REQUEST_FILE_COLUMNS,
  WORK_REPORT_COLUMNS,
} from './columns'
import { listQuotesWithDetails, type QuoteWithDetails } from './owner'
import { withSignedUrls, type DisplayFile } from './storage'
import { uniqueIds, unwrapList, unwrapMaybe } from './utils'

export type AdminRequestListItem = {
  id: string
  request_number: string
  owner_id: string
  property_id: string
  category: string
  title: string
  status: string
  created_at: string
  ownerName: string
  propertyName: string
  quoteCount: number
}

export type AdminRequestFilters = {
  status?: string
  category?: string
  ownerName?: string
  propertyName?: string
  requestNumber?: string
}

export type AdminDashboardData = {
  counts: {
    submitted: number
    reviewing: number
    collectingQuotes: number
    quotesReady: number
    inProgress: number
    completed: number
  }
  recentRequests: AdminRequestListItem[]
}

export type AdminRequestDetail = {
  request: ServiceRequestRow
  owner: ProfileRow | null
  property: PropertyRow | null
  requestFiles: DisplayFile[]
  completionFiles: DisplayFile[]
  quotes: QuoteWithDetails[]
  selection: QuoteSelectionRow | null
  workReport: WorkReportForDisplay | null
  hasPublishedQuote: boolean
}

// -----------------------------------------------------------------------------
// 案件一覧
// -----------------------------------------------------------------------------

async function loadOwnerNames(
  supabase: TypedSupabaseClient,
  ownerIds: readonly string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (ownerIds.length === 0) return names

  const result = await supabase
    .from('profiles')
    .select('id, full_name, organization_name')
    .in('id', ownerIds)

  for (const row of unwrapList(result, 'loadOwnerNames')) {
    names.set(row.id, row.full_name ?? row.organization_name ?? '（氏名未登録）')
  }

  return names
}

async function loadPropertyNames(
  supabase: TypedSupabaseClient,
  propertyIds: readonly string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (propertyIds.length === 0) return names

  const result = await supabase.from('properties').select('id, name').in('id', propertyIds)

  for (const row of unwrapList(result, 'loadPropertyNames')) {
    names.set(row.id, row.name)
  }

  return names
}

async function loadQuoteCounts(
  supabase: TypedSupabaseClient,
  requestIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (requestIds.length === 0) return counts

  const result = await supabase.from('quotes').select('id, request_id').in('request_id', requestIds)

  for (const row of unwrapList(result, 'loadQuoteCounts')) {
    counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1)
  }

  return counts
}

/**
 * 管理者向け案件一覧。
 *
 * オーナー名・物件名での絞り込みは、先に該当する profiles / properties を引いてから
 * ID で絞り込む（PostgREST の埋め込みフィルタに依存しない素直な実装）。
 */
export async function listAdminRequests(
  supabase: TypedSupabaseClient,
  filters: AdminRequestFilters = {},
  options: { limit?: number } = {},
): Promise<AdminRequestListItem[]> {
  let query = supabase
    .from('service_requests')
    .select(ADMIN_REQUEST_LIST_COLUMNS)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.requestNumber) {
    query = query.ilike('request_number', `%${escapeLikePattern(filters.requestNumber)}%`)
  }

  if (filters.ownerName) {
    const pattern = `%${escapeLikePattern(filters.ownerName)}%`
    const matched = unwrapList(
      await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.${pattern},organization_name.ilike.${pattern}`),
      'listAdminRequests.ownerFilter',
    )
    if (matched.length === 0) return []
    query = query.in(
      'owner_id',
      matched.map((row) => row.id),
    )
  }

  if (filters.propertyName) {
    const matched = unwrapList(
      await supabase
        .from('properties')
        .select('id')
        .ilike('name', `%${escapeLikePattern(filters.propertyName)}%`),
      'listAdminRequests.propertyFilter',
    )
    if (matched.length === 0) return []
    query = query.in(
      'property_id',
      matched.map((row) => row.id),
    )
  }

  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapList(await query, 'listAdminRequests')
  if (rows.length === 0) return []

  const [ownerNames, propertyNames, quoteCounts] = await Promise.all([
    loadOwnerNames(supabase, uniqueIds(rows.map((row) => row.owner_id))),
    loadPropertyNames(supabase, uniqueIds(rows.map((row) => row.property_id))),
    loadQuoteCounts(
      supabase,
      rows.map((row) => row.id),
    ),
  ])

  return rows.map((row) => ({
    ...row,
    ownerName: ownerNames.get(row.owner_id) ?? '（不明なオーナー）',
    propertyName: propertyNames.get(row.property_id) ?? '（削除された物件）',
    quoteCount: quoteCounts.get(row.id) ?? 0,
  }))
}

/** ILIKE パターンのメタ文字をエスケープする。 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/[(),]/g, '')
}

// -----------------------------------------------------------------------------
// ダッシュボード
// -----------------------------------------------------------------------------

export async function getAdminDashboard(
  supabase: TypedSupabaseClient,
): Promise<AdminDashboardData> {
  const [statusRowsResult, recentRequests] = await Promise.all([
    supabase.from('service_requests').select('id, status'),
    listAdminRequests(supabase, {}, { limit: 8 }),
  ])

  const rows = unwrapList(statusRowsResult, 'getAdminDashboard.statuses')
  const countOf = (status: string) => rows.filter((row) => row.status === status).length

  return {
    counts: {
      submitted: countOf('submitted'),
      reviewing: countOf('reviewing'),
      collectingQuotes: countOf('collecting_quotes'),
      quotesReady: countOf('quotes_ready'),
      inProgress: countOf('in_progress') + countOf('scheduling') + countOf('provider_selected'),
      completed: countOf('completed'),
    },
    recentRequests,
  }
}

// -----------------------------------------------------------------------------
// 案件詳細
// -----------------------------------------------------------------------------

export async function getAdminRequestDetail(
  supabase: TypedSupabaseClient,
  requestId: string,
): Promise<AdminRequestDetail | null> {
  const request = unwrapMaybe(
    await supabase
      .from('service_requests')
      .select(ADMIN_REQUEST_COLUMNS)
      .eq('id', requestId)
      .maybeSingle(),
    'getAdminRequestDetail.request',
  )

  if (!request) return null

  const [ownerResult, propertyResult, filesResult, quotes, selectionResult, workReportResult] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', request.owner_id).maybeSingle(),
      supabase
        .from('properties')
        .select(PROPERTY_COLUMNS)
        .eq('id', request.property_id)
        .maybeSingle(),
      supabase
        .from('request_files')
        .select(REQUEST_FILE_COLUMNS)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true }),
      listQuotesWithDetails(supabase, requestId, { publishedOnly: false }),
      supabase
        .from('quote_selections')
        .select(QUOTE_SELECTION_COLUMNS)
        .eq('request_id', requestId)
        .maybeSingle(),
      supabase
        .from('work_reports')
        .select(WORK_REPORT_COLUMNS)
        .eq('request_id', requestId)
        .maybeSingle(),
    ])

  const files = unwrapList(filesResult, 'getAdminRequestDetail.files')

  const [requestFiles, completionFiles] = await Promise.all([
    withSignedUrls(
      supabase,
      files.filter((file) => file.file_kind === 'request'),
    ),
    withSignedUrls(
      supabase,
      files.filter((file) => file.file_kind === 'completion'),
    ),
  ])

  return {
    request,
    owner: unwrapMaybe(ownerResult, 'getAdminRequestDetail.owner'),
    property: unwrapMaybe(propertyResult, 'getAdminRequestDetail.property'),
    requestFiles,
    completionFiles,
    quotes,
    selection: unwrapMaybe(selectionResult, 'getAdminRequestDetail.selection'),
    workReport: unwrapMaybe(workReportResult, 'getAdminRequestDetail.workReport'),
    hasPublishedQuote: quotes.some((quote) => quote.publication_status === 'published'),
  }
}

// -----------------------------------------------------------------------------
// 業者
// -----------------------------------------------------------------------------

export async function listProviders(supabase: TypedSupabaseClient): Promise<ProviderRow[]> {
  const result = await supabase
    .from('providers')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  return unwrapList(result, 'listProviders')
}

export async function listActiveProviders(supabase: TypedSupabaseClient): Promise<ProviderRow[]> {
  const result = await supabase
    .from('providers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return unwrapList(result, 'listActiveProviders')
}

export async function getProvider(
  supabase: TypedSupabaseClient,
  providerId: string,
): Promise<ProviderRow | null> {
  const result = await supabase.from('providers').select('*').eq('id', providerId).maybeSingle()

  return unwrapMaybe(result, 'getProvider')
}

export async function getQuoteForEdit(supabase: TypedSupabaseClient, quoteId: string) {
  const quote = unwrapMaybe(
    await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle(),
    'getQuoteForEdit.quote',
  )

  if (!quote) return null

  const items = unwrapList(
    await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true }),
    'getQuoteForEdit.items',
  )

  return { quote, items }
}
