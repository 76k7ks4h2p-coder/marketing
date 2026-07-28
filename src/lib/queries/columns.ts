/**
 * SELECT する列の定義。
 *
 * RLS は行単位の制御であり列単位の制御はできない。
 * オーナー向けの取得処理では admin_notes を返さないため、
 * 列を明示した以下の定数を必ず使うこと（各画面で個別に列名を書かない）。
 *
 * `as const` を付けているのは、postgrest-js が select 文字列から
 * 戻り値の型を推論できるようにするため。
 */

/** オーナー向け: service_requests から admin_notes を除外した列。 */
export const OWNER_REQUEST_COLUMNS =
  'id, request_number, owner_id, property_id, category, target_location, title, description, urgency, preferred_timing, budget_min_yen, budget_max_yen, status, created_at, updated_at' as const

/** 一覧表示用の軽量な列（オーナー向け・admin_notes を含まない）。 */
export const OWNER_REQUEST_LIST_COLUMNS =
  'id, request_number, property_id, category, title, urgency, status, created_at' as const

/** 管理者向け: admin_notes を含む全列。 */
export const ADMIN_REQUEST_COLUMNS = '*' as const

/** 管理者向け一覧: 必要な列のみ。 */
export const ADMIN_REQUEST_LIST_COLUMNS =
  'id, request_number, owner_id, property_id, category, title, status, created_at' as const

export const PROPERTY_COLUMNS = '*' as const

export const PROPERTY_SUMMARY_COLUMNS =
  'id, name, property_type, city, address_line1, address_line2' as const

/** 見積もり。admin_comment（運営者コメント）はオーナーにも公開する項目。 */
export const QUOTE_COLUMNS =
  'id, request_id, provider_id, quote_number, quote_date, valid_until, available_date, estimated_work_days, subtotal_yen, tax_yen, total_yen, included_scope, excluded_scope, additional_charge_conditions, warranty, admin_comment, publication_status, created_at, updated_at' as const

export const QUOTE_ITEM_COLUMNS =
  'id, quote_id, item_name, quantity, unit, unit_price_yen, amount_yen, notes, sort_order' as const

export const REQUEST_FILE_COLUMNS =
  'id, request_id, storage_path, original_name, mime_type, file_size, file_kind, created_at' as const

export const WORK_REPORT_COLUMNS =
  'id, request_id, completion_summary, completed_at, created_at, updated_at' as const

export const QUOTE_SELECTION_COLUMNS = 'id, request_id, quote_id, owner_id, selected_at' as const

export const PROFILE_COLUMNS =
  'id, role, full_name, phone, organization_name, created_at, updated_at' as const
