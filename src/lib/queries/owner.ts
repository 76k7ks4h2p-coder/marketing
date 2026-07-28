import 'server-only'

import { ACTIVE_REQUEST_STATUSES } from '@/lib/constants/statuses'
import type { TypedSupabaseClient } from '@/lib/supabase/server'
import type { PropertyRow, QuoteItemRow, QuoteSelectionRow } from '@/lib/types/database'
import type { QuoteForDisplay, WorkReportForDisplay } from '@/lib/types/display'

import {
  OWNER_REQUEST_COLUMNS,
  OWNER_REQUEST_LIST_COLUMNS,
  PROPERTY_COLUMNS,
  PROPERTY_SUMMARY_COLUMNS,
  QUOTE_COLUMNS,
  QUOTE_ITEM_COLUMNS,
  QUOTE_SELECTION_COLUMNS,
  REQUEST_FILE_COLUMNS,
  WORK_REPORT_COLUMNS,
} from './columns'
import { withSignedUrls, type DisplayFile } from './storage'
import { indexById, uniqueIds, unwrapCount, unwrapList, unwrapMaybe } from './utils'

/**
 * オーナー向けの案件。
 * admin_notes を「型として持たない」ことで、うっかり画面へ渡すことを防ぐ。
 */
export type OwnerRequest = {
  id: string
  request_number: string
  owner_id: string
  property_id: string
  category: string
  target_location: string | null
  title: string
  description: string
  urgency: string
  preferred_timing: string | null
  budget_min_yen: number | null
  budget_max_yen: number | null
  status: string
  created_at: string
  updated_at: string
}

export type PropertySummary = Pick<
  PropertyRow,
  'id' | 'name' | 'property_type' | 'city' | 'address_line1' | 'address_line2'
>

export type OwnerRequestListItem = {
  id: string
  request_number: string
  property_id: string
  category: string
  title: string
  urgency: string
  status: string
  created_at: string
  propertyName: string
  publishedQuoteCount: number
}

export type QuoteWithDetails = QuoteForDisplay & {
  providerName: string
  items: QuoteItemRow[]
}

export type OwnerRequestDetail = {
  request: OwnerRequest
  property: PropertyRow | null
  requestFiles: DisplayFile[]
  completionFiles: DisplayFile[]
  publishedQuotes: QuoteWithDetails[]
  selection: QuoteSelectionRow | null
  workReport: WorkReportForDisplay | null
}

export type OwnerDashboardData = {
  propertyCount: number
  activeRequestCount: number
  quotesReadyCount: number
  completedCount: number
  recentRequests: OwnerRequestListItem[]
}

// -----------------------------------------------------------------------------
// 物件
// -----------------------------------------------------------------------------

export async function listOwnerProperties(
  supabase: TypedSupabaseClient,
  ownerId: string,
): Promise<PropertyRow[]> {
  const result = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  return unwrapList(result, 'listOwnerProperties')
}

export async function listOwnerPropertySummaries(
  supabase: TypedSupabaseClient,
  ownerId: string,
): Promise<PropertySummary[]> {
  const result = await supabase
    .from('properties')
    .select(PROPERTY_SUMMARY_COLUMNS)
    .eq('owner_id', ownerId)
    .order('name', { ascending: true })

  return unwrapList(result, 'listOwnerPropertySummaries')
}

export async function getOwnerProperty(
  supabase: TypedSupabaseClient,
  ownerId: string,
  propertyId: string,
): Promise<PropertyRow | null> {
  const result = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .eq('id', propertyId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  return unwrapMaybe(result, 'getOwnerProperty')
}

// -----------------------------------------------------------------------------
// 案件一覧
// -----------------------------------------------------------------------------

/** 案件 ID ごとの公開済み見積もり件数を取得する。 */
async function countPublishedQuotes(
  supabase: TypedSupabaseClient,
  requestIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (requestIds.length === 0) return counts

  const result = await supabase
    .from('quotes')
    .select('id, request_id')
    .in('request_id', requestIds)
    .eq('publication_status', 'published')

  for (const row of unwrapList(result, 'countPublishedQuotes')) {
    counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1)
  }

  return counts
}

async function attachPropertyNames(
  supabase: TypedSupabaseClient,
  propertyIds: readonly string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (propertyIds.length === 0) return names

  const result = await supabase.from('properties').select('id, name').in('id', propertyIds)

  for (const row of unwrapList(result, 'attachPropertyNames')) {
    names.set(row.id, row.name)
  }

  return names
}

export async function listOwnerRequests(
  supabase: TypedSupabaseClient,
  ownerId: string,
  options: { limit?: number } = {},
): Promise<OwnerRequestListItem[]> {
  let query = supabase
    .from('service_requests')
    .select(OWNER_REQUEST_LIST_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapList(await query, 'listOwnerRequests')
  if (rows.length === 0) return []

  const [propertyNames, quoteCounts] = await Promise.all([
    attachPropertyNames(supabase, uniqueIds(rows.map((row) => row.property_id))),
    countPublishedQuotes(
      supabase,
      rows.map((row) => row.id),
    ),
  ])

  return rows.map((row) => ({
    ...row,
    propertyName: propertyNames.get(row.property_id) ?? '（削除された物件）',
    publishedQuoteCount: quoteCounts.get(row.id) ?? 0,
  }))
}

// -----------------------------------------------------------------------------
// ダッシュボード
// -----------------------------------------------------------------------------

export async function getOwnerDashboard(
  supabase: TypedSupabaseClient,
  ownerId: string,
): Promise<OwnerDashboardData> {
  const [propertyCountResult, statusRowsResult, recentRequests] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId),
    supabase.from('service_requests').select('id, status').eq('owner_id', ownerId),
    listOwnerRequests(supabase, ownerId, { limit: 5 }),
  ])

  const propertyCount = unwrapCount(propertyCountResult, 'getOwnerDashboard.propertyCount')
  const statusRows = unwrapList(statusRowsResult, 'getOwnerDashboard.statuses')

  const activeRequestCount = statusRows.filter((row) =>
    (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(row.status),
  ).length
  const quotesReadyCount = statusRows.filter((row) => row.status === 'quotes_ready').length
  const completedCount = statusRows.filter((row) => row.status === 'completed').length

  return {
    propertyCount,
    activeRequestCount,
    quotesReadyCount,
    completedCount,
    recentRequests,
  }
}

// -----------------------------------------------------------------------------
// 案件詳細
// -----------------------------------------------------------------------------

/**
 * 公開済み見積もりを、明細と業者名つきで取得する。
 *
 * 業者名は providers テーブルではなく public.provider_public ビューから取得する。
 * ビューは id と name しか列を持たないため、電話番号・メールアドレス・内部メモが
 * オーナーへ渡ることはない。
 */
export async function listQuotesWithDetails(
  supabase: TypedSupabaseClient,
  requestId: string,
  options: { publishedOnly: boolean },
): Promise<QuoteWithDetails[]> {
  let query = supabase.from('quotes').select(QUOTE_COLUMNS).eq('request_id', requestId)

  if (options.publishedOnly) {
    query = query.eq('publication_status', 'published')
  }

  const quotes = unwrapList(await query.order('total_yen', { ascending: true }), 'listQuotes')
  if (quotes.length === 0) return []

  const quoteIds = quotes.map((quote) => quote.id)
  const providerIds = uniqueIds(quotes.map((quote) => quote.provider_id))

  const [itemsResult, providersResult] = await Promise.all([
    supabase
      .from('quote_items')
      .select(QUOTE_ITEM_COLUMNS)
      .in('quote_id', quoteIds)
      .order('sort_order', { ascending: true }),
    supabase.from('provider_public').select('id, name').in('id', providerIds),
  ])

  const items = unwrapList(itemsResult, 'listQuoteItems')
  const providers = indexById(unwrapList(providersResult, 'listQuoteProviders'))

  const itemsByQuote = new Map<string, QuoteItemRow[]>()
  for (const item of items) {
    const list = itemsByQuote.get(item.quote_id)
    if (list) list.push(item)
    else itemsByQuote.set(item.quote_id, [item])
  }

  return quotes.map((quote) => ({
    ...quote,
    providerName: providers.get(quote.provider_id)?.name ?? '業者名未登録',
    items: itemsByQuote.get(quote.id) ?? [],
  }))
}

export async function getOwnerRequestDetail(
  supabase: TypedSupabaseClient,
  ownerId: string,
  requestId: string,
): Promise<OwnerRequestDetail | null> {
  const request = unwrapMaybe(
    await supabase
      .from('service_requests')
      // admin_notes を含めない
      .select(OWNER_REQUEST_COLUMNS)
      .eq('id', requestId)
      .eq('owner_id', ownerId)
      .maybeSingle(),
    'getOwnerRequestDetail.request',
  )

  if (!request) return null

  const [propertyResult, filesResult, quotes, selectionResult, workReportResult] =
    await Promise.all([
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
      listQuotesWithDetails(supabase, requestId, { publishedOnly: true }),
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

  const files = unwrapList(filesResult, 'getOwnerRequestDetail.files')
  const requestFiles = files.filter((file) => file.file_kind === 'request')
  const completionFiles = files.filter((file) => file.file_kind === 'completion')

  const [signedRequestFiles, signedCompletionFiles] = await Promise.all([
    withSignedUrls(supabase, requestFiles),
    withSignedUrls(supabase, completionFiles),
  ])

  return {
    request,
    property: unwrapMaybe(propertyResult, 'getOwnerRequestDetail.property'),
    requestFiles: signedRequestFiles,
    completionFiles: signedCompletionFiles,
    publishedQuotes: quotes,
    selection: unwrapMaybe(selectionResult, 'getOwnerRequestDetail.selection'),
    workReport: unwrapMaybe(workReportResult, 'getOwnerRequestDetail.workReport'),
  }
}
