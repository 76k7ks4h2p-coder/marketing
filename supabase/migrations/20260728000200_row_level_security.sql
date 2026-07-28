-- =============================================================================
-- OwnerBase MVP — Row Level Security
-- -----------------------------------------------------------------------------
-- 方針:
--   * 全テーブルで RLS を有効化する（UI での非表示に依存しない）
--   * ポリシーは `to authenticated` に限定し、anon には一切のアクセスを与えない
--   * admin 判定は public.is_admin()（SECURITY DEFINER / search_path 固定）で行い、
--     メールアドレスの文字列比較は使用しない
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.properties       enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_files    enable row level security;
alter table public.providers        enable row level security;
alter table public.quotes           enable row level security;
alter table public.quote_items      enable row level security;
alter table public.quote_selections enable row level security;
alter table public.work_reports     enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- role の変更は protect_profile_fields() トリガーが拒否する
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- INSERT / DELETE ポリシーは意図的に作成しない。
-- profiles 行は handle_new_user() トリガー（SECURITY DEFINER）が作成し、
-- 削除は auth.users の ON DELETE CASCADE に委ねる。

-- -----------------------------------------------------------------------------
-- properties
-- -----------------------------------------------------------------------------

drop policy if exists properties_owner_select on public.properties;
create policy properties_owner_select on public.properties
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists properties_owner_insert on public.properties;
create policy properties_owner_insert on public.properties
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists properties_owner_update on public.properties;
create policy properties_owner_update on public.properties
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists properties_owner_delete on public.properties;
create policy properties_owner_delete on public.properties
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists properties_admin_all on public.properties;
create policy properties_admin_all on public.properties
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- service_requests
-- -----------------------------------------------------------------------------

drop policy if exists service_requests_owner_select on public.service_requests;
create policy service_requests_owner_select on public.service_requests
  for select to authenticated
  using (owner_id = auth.uid());

-- 自分が所有する物件に対してのみ作成できる。
-- status / admin_notes / request_number は protect_service_request_fields() が上書きする。
drop policy if exists service_requests_owner_insert on public.service_requests;
create policy service_requests_owner_insert on public.service_requests
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.properties p
      where p.id = property_id
        and p.owner_id = auth.uid()
    )
  );

-- オーナーには UPDATE / DELETE ポリシーを与えない。
-- 案件ステータスの変更は admin、もしくは select_quote() 経由でのみ行われる。

drop policy if exists service_requests_admin_all on public.service_requests;
create policy service_requests_admin_all on public.service_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 注意: RLS は行単位の制御であり列単位の制御はできない。
-- admin_notes をオーナーへ返さないために、アプリケーション側のオーナー向け取得処理では
-- 必ず列を明示して SELECT する（src/lib/queries/columns.ts の OWNER_REQUEST_COLUMNS）。

-- -----------------------------------------------------------------------------
-- request_files
-- -----------------------------------------------------------------------------

drop policy if exists request_files_owner_select on public.request_files;
create policy request_files_owner_select on public.request_files
  for select to authenticated
  using (
    exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

-- オーナーは自分の案件の「依頼写真」のみ登録できる（completion は登録不可）
drop policy if exists request_files_owner_insert on public.request_files;
create policy request_files_owner_insert on public.request_files
  for insert to authenticated
  with check (
    file_kind = 'request'
    and uploaded_by = auth.uid()
    and public.request_file_path_owner(storage_path) = auth.uid()
    and public.request_file_path_request(storage_path) = request_id
    and public.request_file_path_kind(storage_path) = 'request'
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

-- Storage へのアップロード後に DB 登録が失敗した場合の後始末を可能にするため、
-- 自分の案件の依頼写真の削除のみ許可する。
drop policy if exists request_files_owner_delete on public.request_files;
create policy request_files_owner_delete on public.request_files
  for delete to authenticated
  using (
    file_kind = 'request'
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

drop policy if exists request_files_admin_all on public.request_files;
create policy request_files_admin_all on public.request_files
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- providers（admin のみ。オーナーは public.provider_public ビューを使う）
-- -----------------------------------------------------------------------------

drop policy if exists providers_admin_all on public.providers;
create policy providers_admin_all on public.providers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- quotes
-- -----------------------------------------------------------------------------

drop policy if exists quotes_owner_select on public.quotes;
create policy quotes_owner_select on public.quotes
  for select to authenticated
  using (
    publication_status = 'published'
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

-- オーナーには INSERT / UPDATE / DELETE ポリシーを与えない。

drop policy if exists quotes_admin_all on public.quotes;
create policy quotes_admin_all on public.quotes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- quote_items
-- -----------------------------------------------------------------------------

drop policy if exists quote_items_owner_select on public.quote_items;
create policy quote_items_owner_select on public.quote_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      join public.service_requests sr on sr.id = q.request_id
      where q.id = quote_id
        and q.publication_status = 'published'
        and sr.owner_id = auth.uid()
    )
  );

drop policy if exists quote_items_admin_all on public.quote_items;
create policy quote_items_admin_all on public.quote_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- quote_selections
-- -----------------------------------------------------------------------------

drop policy if exists quote_selections_owner_select on public.quote_selections;
create policy quote_selections_owner_select on public.quote_selections
  for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

-- 通常は public.select_quote() 経由で選択するが、多層防御として
-- 直接 INSERT された場合も同じ条件を満たすものだけを許可する。
drop policy if exists quote_selections_owner_insert on public.quote_selections;
create policy quote_selections_owner_insert on public.quote_selections
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.is_owner()
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
        and sr.status not in ('completed', 'cancelled')
    )
    and exists (
      select 1
      from public.quotes q
      where q.id = quote_id
        and q.request_id = quote_selections.request_id
        and q.publication_status = 'published'
    )
    and not exists (
      select 1
      from public.quote_selections existing
      where existing.request_id = quote_selections.request_id
    )
  );

-- オーナーには UPDATE / DELETE ポリシーを与えない（選択の変更は運営者対応）。

drop policy if exists quote_selections_admin_all on public.quote_selections;
create policy quote_selections_admin_all on public.quote_selections
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- work_reports
-- -----------------------------------------------------------------------------

drop policy if exists work_reports_owner_select on public.work_reports;
create policy work_reports_owner_select on public.work_reports
  for select to authenticated
  using (
    exists (
      select 1
      from public.service_requests sr
      where sr.id = request_id
        and sr.owner_id = auth.uid()
    )
  );

drop policy if exists work_reports_admin_all on public.work_reports;
create policy work_reports_admin_all on public.work_reports
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- anon ロールからの権限剥奪（RLS に加えた多層防御）
-- -----------------------------------------------------------------------------

revoke all on public.profiles         from anon;
revoke all on public.properties       from anon;
revoke all on public.service_requests from anon;
revoke all on public.request_files    from anon;
revoke all on public.providers        from anon;
revoke all on public.quotes           from anon;
revoke all on public.quote_items      from anon;
revoke all on public.quote_selections from anon;
revoke all on public.work_reports     from anon;

-- providers は authenticated から直接触らせない（admin も PostgREST 経由では
-- RLS ポリシーで保護されるが、オーナーの誤参照を防ぐため列公開はビューに限定する）。
-- ※ admin 用の CRUD は RLS ポリシー providers_admin_all で許可されるため、
--    ここでのテーブル権限は維持する必要がある。
