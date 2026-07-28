-- =============================================================================
-- OwnerBase MVP — Supabase Storage
-- -----------------------------------------------------------------------------
-- バケット: request-files（非公開）
-- パス形式:
--   owner/{owner_id}/requests/{request_id}/request/{uuid}.{ext}
--   owner/{owner_id}/requests/{request_id}/completion/{uuid}.{ext}
--
-- 元のファイル名は Storage パスに使用しない（UUID で生成）。
-- 表示は署名付き URL のみ。
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-files',
  'request-files',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- storage.objects ポリシー
-- -----------------------------------------------------------------------------
-- パス形式の検証には public.request_file_path_is_valid() を用いる。
-- 正規表現で完全一致を要求しているため "../" などのパストラバーサルは成立しない。

drop policy if exists "request_files_admin_all" on storage.objects;
create policy "request_files_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'request-files' and public.is_admin())
  with check (
    bucket_id = 'request-files'
    and public.is_admin()
    and public.request_file_path_is_valid(name)
    -- パス中の owner セグメントが、その案件の実際のオーナーと一致すること
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = public.request_file_path_request(name)
        and sr.owner_id = public.request_file_path_owner(name)
    )
  );

-- オーナーは自分のフォルダ配下のみ閲覧できる（依頼写真・完了写真の両方）
drop policy if exists "request_files_owner_select" on storage.objects;
create policy "request_files_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-files'
    and public.request_file_path_is_valid(name)
    and public.request_file_path_owner(name) = auth.uid()
  );

-- オーナーは自分の案件の「依頼写真」のみアップロードできる
drop policy if exists "request_files_owner_insert" on storage.objects;
create policy "request_files_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-files'
    and public.request_file_path_is_valid(name)
    and public.request_file_path_owner(name) = auth.uid()
    and public.request_file_path_kind(name) = 'request'
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = public.request_file_path_request(name)
        and sr.owner_id = auth.uid()
    )
  );

-- DB 登録に失敗した場合の後始末のため、自分の依頼写真の削除のみ許可する
drop policy if exists "request_files_owner_delete" on storage.objects;
create policy "request_files_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'request-files'
    and public.request_file_path_is_valid(name)
    and public.request_file_path_owner(name) = auth.uid()
    and public.request_file_path_kind(name) = 'request'
    and exists (
      select 1
      from public.service_requests sr
      where sr.id = public.request_file_path_request(name)
        and sr.owner_id = auth.uid()
    )
  );

-- オーナーによる UPDATE（上書き）は許可しない。
-- anon には storage.objects への権限を与えない（ポリシーが to authenticated のみのため既定で拒否）。
