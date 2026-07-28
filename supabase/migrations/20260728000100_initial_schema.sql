-- =============================================================================
-- OwnerBase MVP — 初期スキーマ
-- -----------------------------------------------------------------------------
-- 対象: 広島県福山市の不動産オーナー向け 業者比較・発注サービス
-- 方針: コンシェルジュ型 MVP（業者は直接ログインしない）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 共通ヘルパー関数
-- -----------------------------------------------------------------------------

-- updated_at を自動更新する共通トリガー関数
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'updated_at 列を持つテーブル共通の BEFORE UPDATE トリガー関数。';

-- 例外を投げずに uuid へキャストする。ストレージパス解析で使用する。
create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception
  when others then
    return null;
end;
$$;

comment on function public.try_uuid(text) is
  'uuid としてパースできない場合に例外ではなく null を返す安全なキャスト。';

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  role              text        not null default 'owner',
  full_name         text,
  phone             text,
  organization_name text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint profiles_role_check check (role in ('owner', 'admin')),
  constraint profiles_phone_length_check
    check (phone is null or char_length(phone) between 10 and 20)
);

comment on table public.profiles is
  'auth.users と 1:1 のアプリケーションプロフィール。role は owner / admin のみ。';
comment on column public.profiles.role is
  'owner または admin。新規登録時は必ず owner。admin は SQL Editor で手動付与する。';

create index if not exists profiles_role_idx on public.profiles (role);

-- -----------------------------------------------------------------------------
-- ロール判定ヘルパー
-- profiles を参照する `language sql` 関数は、作成時に本体が検証されるため
-- テーブル定義より後に置く必要がある。
-- -----------------------------------------------------------------------------

-- 現在のユーザーが admin かどうかを判定する。
-- SECURITY DEFINER にすることで profiles の RLS ポリシー内から呼び出しても
-- 再帰しないようにしている。search_path は固定。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

comment on function public.is_admin() is
  '呼び出しユーザーの profiles.role が admin なら true。RLS ポリシーから利用する。';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- 現在のユーザーが owner かどうかを判定する。
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
  );
$$;

comment on function public.is_owner() is
  '呼び出しユーザーの profiles.role が owner なら true。';

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- properties
-- -----------------------------------------------------------------------------

create table if not exists public.properties (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid        not null references public.profiles (id) on delete cascade,
  name               text        not null,
  postal_code        text        not null,
  prefecture         text        not null,
  city               text        not null,
  address_line1      text        not null,
  address_line2      text,
  property_type      text        not null,
  building_structure text,
  built_year         integer,
  unit_count         integer,
  area_sqm           numeric(10, 2),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint properties_name_not_blank check (char_length(btrim(name)) > 0),
  constraint properties_postal_code_format check (postal_code ~ '^[0-9]{3}-[0-9]{4}$'),
  -- MVP は広島県福山市限定。対応エリアを広げる際はこの制約を変更する。
  constraint properties_prefecture_check check (prefecture = '広島県'),
  constraint properties_city_check check (city = '福山市'),
  constraint properties_address_line1_not_blank
    check (char_length(btrim(address_line1)) > 0),
  constraint properties_property_type_check check (
    property_type in (
      'apartment_building',
      'mansion_building',
      'condo_unit',
      'house',
      'shop',
      'office',
      'land',
      'other'
    )
  ),
  -- 上限は現在年に依存させられない（CHECK は immutable のみ）ため広めに取り、
  -- 「現在年 + 1 以下」という厳密な検証はアプリ側 (Zod) で行う。
  constraint properties_built_year_check
    check (built_year is null or built_year between 1868 and 2100),
  constraint properties_unit_count_check check (unit_count is null or unit_count > 0),
  constraint properties_area_sqm_check check (area_sqm is null or area_sqm > 0)
);

comment on table public.properties is 'オーナーが登録する所有物件。MVP は広島県福山市限定。';

create index if not exists properties_owner_id_idx on public.properties (owner_id);
create index if not exists properties_owner_created_idx
  on public.properties (owner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- service_requests
-- -----------------------------------------------------------------------------

create table if not exists public.service_requests (
  id               uuid primary key default gen_random_uuid(),
  request_number   text        not null unique,
  owner_id         uuid        not null references public.profiles (id),
  property_id      uuid        not null references public.properties (id),
  category         text        not null,
  target_location  text,
  title            text        not null,
  description      text        not null,
  urgency          text        not null,
  preferred_timing text,
  budget_min_yen   integer,
  budget_max_yen   integer,
  status           text        not null default 'submitted',
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- 利用者に提示する短い案件番号。個人情報を含まず衝突しにくい形式。
  -- 例: OB-20260728-AB12（英数字から紛らわしい I / O を除外）
  constraint service_requests_number_format
    check (request_number ~ '^OB-[0-9]{8}-[0-9A-HJ-NP-Z]{4}$'),
  constraint service_requests_category_check check (
    category in (
      'vacant_cleaning',
      'common_area_cleaning',
      'mowing',
      'property_inspection',
      'minor_repair',
      'other'
    )
  ),
  constraint service_requests_urgency_check check (urgency in ('normal', 'soon', 'urgent')),
  constraint service_requests_status_check check (
    status in (
      'submitted',
      'reviewing',
      'collecting_quotes',
      'quotes_ready',
      'provider_selected',
      'scheduling',
      'in_progress',
      'completed',
      'cancelled'
    )
  ),
  constraint service_requests_title_not_blank check (char_length(btrim(title)) > 0),
  constraint service_requests_description_not_blank
    check (char_length(btrim(description)) > 0),
  constraint service_requests_budget_min_check
    check (budget_min_yen is null or budget_min_yen >= 0),
  constraint service_requests_budget_max_check
    check (budget_max_yen is null or budget_max_yen >= 0),
  constraint service_requests_budget_range_check check (
    budget_min_yen is null
    or budget_max_yen is null
    or budget_min_yen <= budget_max_yen
  )
);

comment on table public.service_requests is 'オーナーからの作業依頼（案件）。';
comment on column public.service_requests.admin_notes is
  '運営管理者専用メモ。オーナー向けの取得処理では必ず SELECT 対象から除外すること。';
comment on column public.service_requests.request_number is
  '利用者向けの案件番号。BEFORE INSERT トリガーがサーバー側で採番する。';

create index if not exists service_requests_owner_id_idx on public.service_requests (owner_id);
create index if not exists service_requests_property_id_idx
  on public.service_requests (property_id);
create index if not exists service_requests_status_idx on public.service_requests (status);
create index if not exists service_requests_created_at_idx
  on public.service_requests (created_at desc);
create index if not exists service_requests_owner_created_idx
  on public.service_requests (owner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- ストレージパス検証ヘルパー
--   形式: owner/{owner_id}/requests/{request_id}/{request|completion}/{uuid}.{ext}
-- -----------------------------------------------------------------------------

create or replace function public.request_file_path_is_valid(p_path text)
returns boolean
language sql
immutable
as $$
  select p_path ~ (
    '^owner/'
    || '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    || '/requests/'
    || '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    || '/(request|completion)/'
    || '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    || '\.(jpg|jpeg|png|webp|pdf)$'
  );
$$;

comment on function public.request_file_path_is_valid(text) is
  'Storage パスが規定形式か検証する。".." などのパストラバーサルはこの正規表現で弾かれる。';

create or replace function public.request_file_path_owner(p_path text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid(split_part(p_path, '/', 2));
$$;

create or replace function public.request_file_path_request(p_path text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid(split_part(p_path, '/', 4));
$$;

create or replace function public.request_file_path_kind(p_path text)
returns text
language sql
immutable
as $$
  select split_part(p_path, '/', 5);
$$;

-- -----------------------------------------------------------------------------
-- request_files
-- -----------------------------------------------------------------------------

create table if not exists public.request_files (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid        not null references public.service_requests (id) on delete cascade,
  uploaded_by   uuid        not null references public.profiles (id),
  storage_path  text        not null unique,
  original_name text        not null,
  mime_type     text        not null,
  file_size     integer     not null,
  file_kind     text        not null,
  created_at    timestamptz not null default now(),

  constraint request_files_kind_check check (file_kind in ('request', 'completion')),
  constraint request_files_mime_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  -- 1 ファイル最大 10MB
  constraint request_files_size_check check (file_size > 0 and file_size <= 10485760),
  constraint request_files_original_name_not_blank
    check (char_length(btrim(original_name)) > 0),
  constraint request_files_path_format_check check (public.request_file_path_is_valid(storage_path)),
  -- Storage パスの kind セグメントと file_kind の不一致を防ぐ
  constraint request_files_path_kind_matches
    check (public.request_file_path_kind(storage_path) = file_kind),
  -- Storage パスの request セグメントと request_id の不一致を防ぐ
  constraint request_files_path_request_matches
    check (public.request_file_path_request(storage_path) = request_id)
);

comment on table public.request_files is
  '依頼写真 (request) と完了写真 (completion) のメタデータ。実体は Storage の request-files バケット。';

create index if not exists request_files_request_id_idx on public.request_files (request_id);
create index if not exists request_files_request_kind_idx
  on public.request_files (request_id, file_kind, created_at);

-- 1 案件・1 種別あたり最大 5 ファイル
create or replace function public.enforce_request_file_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  select count(*)
    into v_count
    from public.request_files f
   where f.request_id = new.request_id
     and f.file_kind = new.file_kind;

  if v_count >= 5 then
    raise exception 'FILE_LIMIT_EXCEEDED'
      using detail = '1 案件につきアップロードできるファイルは種別ごとに 5 件までです。',
            errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists request_files_limit_trigger on public.request_files;
create trigger request_files_limit_trigger
  before insert on public.request_files
  for each row execute function public.enforce_request_file_limit();

-- -----------------------------------------------------------------------------
-- providers（運営管理者のみが扱う。オーナーへは業者名のみをビュー経由で公開）
-- -----------------------------------------------------------------------------

create table if not exists public.providers (
  id                      uuid primary key default gen_random_uuid(),
  name                    text        not null,
  contact_name            text,
  email                   text,
  phone                   text,
  address                 text,
  service_areas           text[],
  service_categories      text[],
  licenses                text,
  has_liability_insurance boolean,
  notes                   text,
  is_active               boolean     not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint providers_name_not_blank check (char_length(btrim(name)) > 0),
  constraint providers_email_format
    check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint providers_categories_check check (
    service_categories is null
    or service_categories <@ array[
      'vacant_cleaning',
      'common_area_cleaning',
      'mowing',
      'property_inspection',
      'minor_repair',
      'other'
    ]::text[]
  )
);

comment on table public.providers is
  '協力業者マスタ。連絡先・内部メモを含むため一般公開しない。オーナーへは public.provider_public ビューで業者名のみ公開する。';

create index if not exists providers_is_active_idx on public.providers (is_active);

-- -----------------------------------------------------------------------------
-- quotes
-- -----------------------------------------------------------------------------

create table if not exists public.quotes (
  id                           uuid primary key default gen_random_uuid(),
  request_id                   uuid        not null references public.service_requests (id) on delete cascade,
  provider_id                  uuid        not null references public.providers (id),
  quote_number                 text,
  quote_date                   date,
  valid_until                  date,
  available_date               date,
  estimated_work_days          integer,
  subtotal_yen                 integer,
  tax_yen                      integer,
  total_yen                    integer     not null,
  included_scope               text,
  excluded_scope               text,
  additional_charge_conditions text,
  warranty                     text,
  admin_comment                text,
  publication_status           text        not null default 'draft',
  created_by                   uuid        not null references public.profiles (id),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  constraint quotes_publication_status_check
    check (publication_status in ('draft', 'published', 'withdrawn')),
  constraint quotes_subtotal_check check (subtotal_yen is null or subtotal_yen >= 0),
  constraint quotes_tax_check check (tax_yen is null or tax_yen >= 0),
  constraint quotes_total_check check (total_yen >= 0),
  constraint quotes_work_days_check
    check (estimated_work_days is null or estimated_work_days > 0),
  constraint quotes_valid_until_check
    check (valid_until is null or quote_date is null or valid_until >= quote_date)
);

comment on table public.quotes is
  '運営管理者が業者から取得して手入力する見積もり。publication_status = published のみオーナーに公開される。';
comment on column public.quotes.admin_comment is
  '運営者コメント。オーナーにも表示される（内部メモではない）。';

create index if not exists quotes_request_id_idx on public.quotes (request_id);
create index if not exists quotes_provider_id_idx on public.quotes (provider_id);
create index if not exists quotes_publication_status_idx on public.quotes (publication_status);
create index if not exists quotes_request_publication_idx
  on public.quotes (request_id, publication_status);

-- -----------------------------------------------------------------------------
-- quote_items
-- -----------------------------------------------------------------------------

create table if not exists public.quote_items (
  id             uuid primary key default gen_random_uuid(),
  quote_id       uuid    not null references public.quotes (id) on delete cascade,
  item_name      text    not null,
  quantity       numeric(12, 2),
  unit           text,
  unit_price_yen integer,
  amount_yen     integer not null,
  notes          text,
  sort_order     integer not null default 0,

  constraint quote_items_name_not_blank check (char_length(btrim(item_name)) > 0),
  constraint quote_items_quantity_check check (quantity is null or quantity > 0),
  constraint quote_items_unit_price_check check (unit_price_yen is null or unit_price_yen >= 0),
  constraint quote_items_amount_check check (amount_yen >= 0),
  constraint quote_items_sort_order_check check (sort_order >= 0)
);

comment on table public.quote_items is '見積明細。合計と税込総額の不一致は許容し、UI で警告する。';

create index if not exists quote_items_quote_id_idx on public.quote_items (quote_id, sort_order);

-- -----------------------------------------------------------------------------
-- quote_selections（1 案件につき 1 件）
-- -----------------------------------------------------------------------------

create table if not exists public.quote_selections (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid        not null unique references public.service_requests (id) on delete cascade,
  quote_id    uuid        not null references public.quotes (id),
  owner_id    uuid        not null references public.profiles (id),
  selected_at timestamptz not null default now()
);

comment on table public.quote_selections is
  'オーナーが選択した見積もり。request_id の UNIQUE 制約により 1 案件 1 件に限定される。';

create index if not exists quote_selections_quote_id_idx on public.quote_selections (quote_id);
create index if not exists quote_selections_owner_id_idx on public.quote_selections (owner_id);

-- 選択された見積もりが同じ案件に属することを DB 側でも保証する
create or replace function public.enforce_quote_selection_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_quote_request_id uuid;
  v_publication      text;
  v_request_owner    uuid;
  v_request_status   text;
begin
  select q.request_id, q.publication_status
    into v_quote_request_id, v_publication
    from public.quotes q
   where q.id = new.quote_id;

  if not found then
    raise exception 'QUOTE_NOT_FOUND' using errcode = 'foreign_key_violation';
  end if;

  if v_quote_request_id <> new.request_id then
    raise exception 'QUOTE_REQUEST_MISMATCH' using errcode = 'check_violation';
  end if;

  if v_publication <> 'published' then
    raise exception 'QUOTE_NOT_PUBLISHED' using errcode = 'check_violation';
  end if;

  select sr.owner_id, sr.status
    into v_request_owner, v_request_status
    from public.service_requests sr
   where sr.id = new.request_id;

  if v_request_owner <> new.owner_id then
    raise exception 'SELECTION_OWNER_MISMATCH' using errcode = 'check_violation';
  end if;

  if v_request_status in ('completed', 'cancelled') then
    raise exception 'REQUEST_CLOSED' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists quote_selections_consistency_trigger on public.quote_selections;
create trigger quote_selections_consistency_trigger
  before insert on public.quote_selections
  for each row execute function public.enforce_quote_selection_consistency();

-- -----------------------------------------------------------------------------
-- work_reports
-- -----------------------------------------------------------------------------

create table if not exists public.work_reports (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid        not null unique references public.service_requests (id) on delete cascade,
  completion_summary text        not null,
  completed_at       timestamptz,
  created_by         uuid        not null references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint work_reports_summary_not_blank
    check (char_length(btrim(completion_summary)) > 0)
);

comment on table public.work_reports is '運営管理者が登録する完了報告。1 案件 1 件。';

-- -----------------------------------------------------------------------------
-- 案件番号の採番
-- -----------------------------------------------------------------------------

create or replace function public.generate_request_number()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  -- 紛らわしい I / O を除外した 34 文字
  v_alphabet constant text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_suffix   text;
  v_candidate text;
  v_attempt  integer;
  v_i        integer;
begin
  for v_attempt in 1..20 loop
    v_suffix := '';
    for v_i in 1..4 loop
      v_suffix := v_suffix
        || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    v_candidate := 'OB-'
      || to_char((now() at time zone 'Asia/Tokyo')::date, 'YYYYMMDD')
      || '-' || v_suffix;

    if not exists (
      select 1 from public.service_requests sr where sr.request_number = v_candidate
    ) then
      return v_candidate;
    end if;
  end loop;

  raise exception 'REQUEST_NUMBER_GENERATION_FAILED';
end;
$$;

comment on function public.generate_request_number() is
  '個人情報を含まない案件番号 OB-YYYYMMDD-XXXX を採番する。衝突時は最大 20 回再試行。';

revoke all on function public.generate_request_number() from public;

-- -----------------------------------------------------------------------------
-- service_requests の項目保護トリガー
-- -----------------------------------------------------------------------------

create or replace function public.protect_service_request_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    -- 案件番号は必ずサーバー側で採番する（クライアントからの指定を無効化）。
    -- auth.uid() が null のケース（seed / service_role / psql）では
    -- 明示的に指定された値を尊重する。
    if new.request_number is null
       or (auth.uid() is not null and not public.is_admin()) then
      new.request_number := public.generate_request_number();
    end if;

    -- 一般オーナーは status と admin_notes を指定できない。
    if auth.uid() is not null and not public.is_admin() then
      new.status := 'submitted';
      new.admin_notes := null;
    end if;

    return new;
  end if;

  -- UPDATE: 不変項目を維持する
  new.request_number := old.request_number;
  new.owner_id := old.owner_id;
  new.property_id := old.property_id;
  new.created_at := old.created_at;

  -- 公開済み見積もりが 1 件も無い状態で quotes_ready にはできない
  if new.status = 'quotes_ready' and old.status is distinct from 'quotes_ready' then
    if not exists (
      select 1
      from public.quotes q
      where q.request_id = new.id
        and q.publication_status = 'published'
    ) then
      raise exception 'PUBLISHED_QUOTE_REQUIRED'
        using detail = '公開済みの見積もりが 1 件以上必要です。',
              errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists service_requests_protect_insert on public.service_requests;
create trigger service_requests_protect_insert
  before insert on public.service_requests
  for each row execute function public.protect_service_request_fields();

drop trigger if exists service_requests_protect_update on public.service_requests;
create trigger service_requests_protect_update
  before update on public.service_requests
  for each row execute function public.protect_service_request_fields();

-- -----------------------------------------------------------------------------
-- profiles の項目保護トリガー（role 昇格の防止）
-- -----------------------------------------------------------------------------

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;

  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'ROLE_CHANGE_FORBIDDEN'
      using detail = 'ロールを変更する権限がありません。',
            errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_update on public.profiles;
create trigger profiles_protect_update
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- 新規ユーザー登録時に profiles を自動作成する
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role, full_name, phone, organization_name)
  values (
    new.id,
    -- role は常に owner。ユーザーメタデータからの昇格は不可。
    'owner',
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users への INSERT 時に public.profiles を role = owner で自動作成する。';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at トリガーの適用
-- -----------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

drop trigger if exists work_reports_set_updated_at on public.work_reports;
create trigger work_reports_set_updated_at
  before update on public.work_reports
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 見積もり選択（トランザクション内で選択と案件ステータス更新を実行）
-- -----------------------------------------------------------------------------

create or replace function public.select_quote(p_request_id uuid, p_quote_id uuid)
returns public.quote_selections
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_quote     public.quotes%rowtype;
  v_request   public.service_requests%rowtype;
  v_selection public.quote_selections%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'insufficient_privilege';
  end if;

  -- 呼び出しユーザーが owner であること
  if not exists (
    select 1 from public.profiles p where p.id = v_uid and p.role = 'owner'
  ) then
    raise exception 'NOT_OWNER' using errcode = 'insufficient_privilege';
  end if;

  -- 案件行をロックして同時実行を直列化する
  select * into v_request
    from public.service_requests sr
   where sr.id = p_request_id
   for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- auth.uid() と案件の owner_id が一致すること（引数の owner_id は受け取らない）
  if v_request.owner_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if v_request.status in ('completed', 'cancelled') then
    raise exception 'REQUEST_CLOSED' using errcode = 'check_violation';
  end if;

  select * into v_quote from public.quotes q where q.id = p_quote_id;

  if not found then
    raise exception 'QUOTE_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- 見積もりが同じ案件に属すること
  if v_quote.request_id <> p_request_id then
    raise exception 'QUOTE_REQUEST_MISMATCH' using errcode = 'check_violation';
  end if;

  -- 公開済みであること
  if v_quote.publication_status <> 'published' then
    raise exception 'QUOTE_NOT_PUBLISHED' using errcode = 'check_violation';
  end if;

  -- 既存の選択が無いこと（UNIQUE 制約が最終的な保証）
  if exists (
    select 1 from public.quote_selections qs where qs.request_id = p_request_id
  ) then
    raise exception 'ALREADY_SELECTED' using errcode = 'unique_violation';
  end if;

  insert into public.quote_selections (request_id, quote_id, owner_id)
  values (p_request_id, p_quote_id, v_uid)
  returning * into v_selection;

  update public.service_requests
     set status = 'provider_selected'
   where id = p_request_id;

  return v_selection;
end;
$$;

comment on function public.select_quote(uuid, uuid) is
  'オーナーが見積もりを 1 件選択し、案件ステータスを provider_selected に更新する。'
  'owner_id はクライアントから受け取らず auth.uid() のみを信頼する。';

revoke all on function public.select_quote(uuid, uuid) from public;
grant execute on function public.select_quote(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- オーナー向け業者ビュー（業者名のみを公開）
-- -----------------------------------------------------------------------------

-- security_invoker = false（既定）のためビュー所有者の権限で providers を読む。
-- 列は id と name に限定し、WHERE 句で行を呼び出しユーザーの案件に限定する。
create or replace view public.provider_public
with (security_barrier = true) as
select
  p.id,
  p.name
from public.providers p
where public.is_admin()
   or exists (
     select 1
     from public.quotes q
     join public.service_requests sr on sr.id = q.request_id
     where q.provider_id = p.id
       and q.publication_status = 'published'
       and sr.owner_id = auth.uid()
   );

comment on view public.provider_public is
  'オーナー向けの安全な業者ビュー。自分の案件に紐づく公開済み見積もりの業者名のみを返す。'
  '電話番号・メールアドレス・内部メモは列自体を含めていない。';

alter view public.provider_public set (security_invoker = false);

revoke all on public.provider_public from anon, authenticated;
grant select on public.provider_public to authenticated;
