-- =============================================================================
-- OwnerBase — RLS 検証スクリプト
-- -----------------------------------------------------------------------------
-- ⚠️ ローカル開発環境専用です。本番データベースでは絶対に実行しないでください。
--
-- 実行方法:
--   supabase start
--   supabase db reset
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
--     -v ON_ERROR_STOP=1 -f tests/rls/rls-verification.sql
--
-- 最後に ROLLBACK するため、データは残りません。
-- すべての検証を通過すると "ALL RLS CHECKS PASSED" が出力されます。
-- いずれかが失敗した場合は例外で停止します。
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- -----------------------------------------------------------------------------
-- テストユーザーの作成
-- （auth.users への直接 INSERT はローカル検証用の手段です。
--   アプリからの登録は /signup を使用してください）
-- -----------------------------------------------------------------------------

\set owner_a '\'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\''
\set owner_b '\'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\''
\set admin_u '\'cccccccc-cccc-4ccc-8ccc-cccccccccccc\''

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (:owner_a::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-owner-a@example.com', 'x', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"検証 オーナーA"}'::jsonb),
  (:owner_b::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-owner-b@example.com', 'x', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"検証 オーナーB"}'::jsonb),
  (:admin_u::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-admin@example.com', 'x', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"検証 管理者"}'::jsonb);

-- profiles はトリガーで自動作成される。role が owner であることを確認する。
do $$
begin
  if (select count(*) from public.profiles
      where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                   'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
        and role = 'owner') <> 3 then
    raise exception 'FAILED: handle_new_user() が profiles を role=owner で作成していません';
  end if;
  raise notice 'OK  1: 新規ユーザーの profiles が role=owner で自動作成される';
end $$;

-- 管理者を手動付与（README に記載している運用と同じ）
update public.profiles set role = 'admin' where id = :admin_u::uuid;

-- -----------------------------------------------------------------------------
-- テストデータ（postgres ロールで作成。RLS を通さず素早く用意する）
-- -----------------------------------------------------------------------------

insert into public.properties (id, owner_id, name, postal_code, prefecture, city, address_line1, property_type)
values
  ('d0000000-0000-4000-8000-000000000001', :owner_a::uuid, 'A棟', '720-0001', '広島県', '福山市', '1-1-1', 'apartment_building'),
  ('d0000000-0000-4000-8000-000000000002', :owner_b::uuid, 'B棟', '720-0002', '広島県', '福山市', '2-2-2', 'house');

insert into public.service_requests (id, owner_id, property_id, category, title, description, urgency, status, admin_notes)
values
  ('e0000000-0000-4000-8000-000000000001', :owner_a::uuid, 'd0000000-0000-4000-8000-000000000001',
   'vacant_cleaning', 'A の依頼', 'A の詳細', 'normal', 'quotes_ready', '管理者専用メモ A'),
  ('e0000000-0000-4000-8000-000000000002', :owner_b::uuid, 'd0000000-0000-4000-8000-000000000002',
   'mowing', 'B の依頼', 'B の詳細', 'normal', 'quotes_ready', '管理者専用メモ B');

insert into public.providers (id, name, phone, email, notes)
values ('f0000000-0000-4000-8000-000000000001', '検証クリーンサービス', '090-5000-9999', 'verify@example.com', '内部メモ');

insert into public.quotes (id, request_id, provider_id, total_yen, publication_status, created_by)
values
  -- A の依頼: 公開済み
  ('a1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 55000, 'published', :admin_u::uuid),
  -- A の依頼: 下書き（オーナーには見えてはいけない）
  ('a1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 48000, 'draft', :admin_u::uuid),
  -- B の依頼: 公開済み（A が選択できてはいけない）
  ('a1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002',
   'f0000000-0000-4000-8000-000000000001', 30000, 'published', :admin_u::uuid);

insert into public.quote_items (quote_id, item_name, amount_yen, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', '公開明細', 55000, 0),
  ('a1000000-0000-4000-8000-000000000002', '下書き明細', 48000, 0);

insert into public.work_reports (request_id, completion_summary, created_by)
values ('e0000000-0000-4000-8000-000000000002', 'B の完了報告', :admin_u::uuid);

-- =============================================================================
-- ここから RLS の検証（authenticated ロール + JWT クレームを設定して実行）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- owner A として検証
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

do $$
begin
  -- 2: owner A は owner B の物件を取得できない
  if (select count(*) from public.properties where owner_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 then
    raise exception 'FAILED: owner A が owner B の物件を取得できています';
  end if;
  if (select count(*) from public.properties) <> 1 then
    raise exception 'FAILED: owner A に見える物件が 1 件ではありません';
  end if;
  raise notice 'OK  2: owner A は owner B の物件を取得できない';

  -- 3: owner A は owner B の案件を取得できない
  if (select count(*) from public.service_requests where owner_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 then
    raise exception 'FAILED: owner A が owner B の案件を取得できています';
  end if;
  raise notice 'OK  3: owner A は owner B の案件を取得できない';

  -- 4: owner は draft の見積もりを取得できない
  if (select count(*) from public.quotes where publication_status = 'draft') <> 0 then
    raise exception 'FAILED: owner が draft の見積もりを取得できています';
  end if;
  if (select count(*) from public.quotes) <> 1 then
    raise exception 'FAILED: owner A に見える見積もりが 1 件（自分の published）ではありません';
  end if;
  raise notice 'OK  4: owner は draft の見積もりを取得できない';

  -- 5: owner は draft 見積もりの明細を取得できない
  if (select count(*) from public.quote_items
      where quote_id = 'a1000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'FAILED: owner が draft 見積もりの明細を取得できています';
  end if;
  raise notice 'OK  5: owner は draft 見積もりの明細を取得できない';

  -- 6: owner は業者テーブル（連絡先・内部メモを含む）を取得できない
  if (select count(*) from public.providers) <> 0 then
    raise exception 'FAILED: owner が providers テーブルを取得できています';
  end if;
  raise notice 'OK  6: owner は providers テーブルを取得できない';

  -- 7: owner はビュー経由で業者名のみ取得できる
  if (select count(*) from public.provider_public) <> 1 then
    raise exception 'FAILED: owner が provider_public から業者名を取得できません';
  end if;
  if (select name from public.provider_public limit 1) <> '検証クリーンサービス' then
    raise exception 'FAILED: provider_public の業者名が想定と異なります';
  end if;
  raise notice 'OK  7: owner は provider_public から業者名のみ取得できる';

  -- 8: owner は owner B の完了報告を取得できない
  if (select count(*) from public.work_reports) <> 0 then
    raise exception 'FAILED: owner A が owner B の完了報告を取得できています';
  end if;
  raise notice 'OK  8: owner A は owner B の完了報告を取得できない';
end $$;

-- 9: owner は他人の物件を property_id に指定して案件を作成できない
do $$
begin
  begin
    insert into public.service_requests (owner_id, property_id, category, title, description, urgency)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'd0000000-0000-4000-8000-000000000002',
            'other', '不正な依頼', '他人の物件を指定', 'normal');
    raise exception 'FAILED: owner A が owner B の物件で案件を作成できています';
  exception
    when insufficient_privilege then
      raise notice 'OK  9: owner は他人の物件を property_id に指定できない';
  end;
end $$;

-- 10: owner は他人になりすまして案件を作成できない
do $$
begin
  begin
    insert into public.service_requests (owner_id, property_id, category, title, description, urgency)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'd0000000-0000-4000-8000-000000000002',
            'other', 'なりすまし', 'owner_id 偽装', 'normal');
    raise exception 'FAILED: owner A が owner_id を偽装して案件を作成できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 10: owner は owner_id を偽装して案件を作成できない';
  end;
end $$;

-- 11: owner は completion 写真を登録できない
do $$
begin
  begin
    insert into public.request_files
      (request_id, uploaded_by, storage_path, original_name, mime_type, file_size, file_kind)
    values
      ('e0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'owner/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/e0000000-0000-4000-8000-000000000001/completion/11111111-1111-4111-8111-111111111111.jpg',
       'done.jpg', 'image/jpeg', 1024, 'completion');
    raise exception 'FAILED: owner が completion 写真を登録できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 11: owner は completion 写真を登録できない';
  end;
end $$;

-- 12: owner は自分の依頼写真を登録できる
insert into public.request_files
  (request_id, uploaded_by, storage_path, original_name, mime_type, file_size, file_kind)
values
  ('e0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'owner/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/e0000000-0000-4000-8000-000000000001/request/22222222-2222-4222-8222-222222222222.jpg',
   'before.jpg', 'image/jpeg', 2048, 'request');

do $$
begin
  raise notice 'OK 12: owner は自分の案件の依頼写真を登録できる';
end $$;

-- 13: owner は他人の案件の見積もりを選択できない
do $$
begin
  begin
    perform public.select_quote(
      'e0000000-0000-4000-8000-000000000002',  -- owner B の案件
      'a1000000-0000-4000-8000-000000000003'
    );
    raise exception 'FAILED: owner A が owner B の案件の見積もりを選択できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 13: owner は他人の案件の見積もりを選択できない';
  end;
end $$;

-- 14: 異なる案件に紐づく見積もりを選択できない
do $$
begin
  begin
    perform public.select_quote(
      'e0000000-0000-4000-8000-000000000001',  -- A の案件
      'a1000000-0000-4000-8000-000000000003'   -- B の案件の見積もり
    );
    raise exception 'FAILED: 異なる案件の見積もりを選択できています';
  exception
    when check_violation then
      raise notice 'OK 14: 異なる案件に紐づく見積もりは選択できない';
  end;
end $$;

-- 15: 公開されていない見積もりは選択できない
do $$
begin
  begin
    perform public.select_quote(
      'e0000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000002'   -- draft
    );
    raise exception 'FAILED: draft の見積もりを選択できています';
  exception
    when check_violation then
      raise notice 'OK 15: draft の見積もりは選択できない';
    when no_data_found then
      -- RLS により draft が見えないため QUOTE_NOT_FOUND になる場合もある
      raise notice 'OK 15: draft の見積もりは選択できない（見積もりが見つからない扱い）';
  end;
end $$;

-- 16: 正しい選択は成功し、案件ステータスが provider_selected になる
do $$
declare
  v_status text;
begin
  perform public.select_quote(
    'e0000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
  );

  select status into v_status
    from public.service_requests
   where id = 'e0000000-0000-4000-8000-000000000001';

  if v_status <> 'provider_selected' then
    raise exception 'FAILED: 選択後の案件ステータスが provider_selected ではありません (%)', v_status;
  end if;
  raise notice 'OK 16: 見積もり選択が成功し、ステータスが provider_selected になる';
end $$;

-- 17: 1 案件で 2 件目の見積もりを選択できない
do $$
begin
  begin
    perform public.select_quote(
      'e0000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: 2 件目の見積もり選択ができています';
  exception
    when unique_violation then
      raise notice 'OK 17: 1 案件につき 2 件目の見積もりは選択できない';
  end;
end $$;

-- 18: owner は自分の role を変更できない
do $$
begin
  begin
    update public.profiles set role = 'admin' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'FAILED: owner が自分の role を admin に変更できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 18: owner は role を変更できない';
  end;
end $$;

-- 19: owner は案件ステータスを直接変更できない（UPDATE ポリシーが無い）
do $$
declare
  v_count integer;
begin
  update public.service_requests set status = 'completed'
   where id = 'e0000000-0000-4000-8000-000000000001';
  get diagnostics v_count = row_count;

  if v_count <> 0 then
    raise exception 'FAILED: owner が案件ステータスを変更できています';
  end if;
  raise notice 'OK 19: owner は案件ステータスを直接変更できない';
end $$;

-- 20: owner は見積もりを作成・変更できない
do $$
declare
  v_count integer;
begin
  begin
    insert into public.quotes (request_id, provider_id, total_yen, created_by)
    values ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
            1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'FAILED: owner が見積もりを作成できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 20a: owner は見積もりを作成できない';
  end;

  update public.quotes set total_yen = 1 where id = 'a1000000-0000-4000-8000-000000000001';
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'FAILED: owner が見積もりを変更できています';
  end if;
  raise notice 'OK 20b: owner は見積もりを変更できない';
end $$;

-- -----------------------------------------------------------------------------
-- owner B として検証（他人の依頼写真が見えないこと）
-- -----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

do $$
begin
  -- 21: owner B は owner A の案件のファイルを取得できない
  if (select count(*) from public.request_files) <> 0 then
    raise exception 'FAILED: owner B が owner A の案件のファイルを取得できています';
  end if;
  raise notice 'OK 21: owner B は owner A の案件のファイルを取得できない';

  -- 22: owner B は owner A の選択結果を取得できない
  if (select count(*) from public.quote_selections) <> 0 then
    raise exception 'FAILED: owner B が owner A の選択結果を取得できています';
  end if;
  raise notice 'OK 22: owner B は owner A の選択結果を取得できない';

  -- 23: owner B は owner A のプロフィールを取得できない
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAILED: owner B に見えるプロフィールが自分の 1 件ではありません';
  end if;
  raise notice 'OK 23: owner は自分のプロフィールのみ取得できる';
end $$;

-- -----------------------------------------------------------------------------
-- admin として検証
-- -----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';

do $$
begin
  -- 24: admin は全案件を取得できる
  if (select count(*) from public.service_requests) <> 2 then
    raise exception 'FAILED: admin が全案件を取得できません';
  end if;
  raise notice 'OK 24: admin は全案件を取得できる';

  -- 25: admin は全物件・全業者・全見積もり（draft 含む）を取得できる
  -- 業者は seed.sql の架空業者も存在しうるため、件数ではなく
  -- 「検証用の業者が admin に見えること」と「1 件以上見えること」で判定する。
  if (select count(*) from public.properties) <> 2 then
    raise exception 'FAILED: admin が全物件を取得できません';
  end if;
  if not exists (
    select 1 from public.providers where id = 'f0000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'FAILED: admin が業者を取得できません';
  end if;
  if (select count(*) from public.providers) < 1 then
    raise exception 'FAILED: admin に業者が 1 件も見えません';
  end if;
  if (select count(*) from public.quotes) <> 3 then
    raise exception 'FAILED: admin が draft を含む全見積もりを取得できません';
  end if;
  raise notice 'OK 25: admin は全物件・全業者・draft を含む全見積もりを取得できる';

  -- 26: admin は管理者メモを取得できる
  if (select admin_notes from public.service_requests
      where id = 'e0000000-0000-4000-8000-000000000001') <> '管理者専用メモ A' then
    raise exception 'FAILED: admin が管理者メモを取得できません';
  end if;
  raise notice 'OK 26: admin は管理者メモを取得できる';

  -- 27: admin はオーナーのメールアドレスを取得できる
  if (select public.admin_request_owner_email('e0000000-0000-4000-8000-000000000001'))
     <> 'rls-owner-a@example.com' then
    raise exception 'FAILED: admin がオーナーのメールアドレスを取得できません';
  end if;
  raise notice 'OK 27: admin はオーナーのメールアドレスを取得できる';
end $$;

-- 28: 公開済み見積もりが無い案件は quotes_ready にできない
do $$
begin
  -- B の案件から公開済み見積もりを取り下げる
  update public.quotes set publication_status = 'withdrawn'
   where id = 'a1000000-0000-4000-8000-000000000003';

  update public.service_requests set status = 'reviewing'
   where id = 'e0000000-0000-4000-8000-000000000002';

  begin
    update public.service_requests set status = 'quotes_ready'
     where id = 'e0000000-0000-4000-8000-000000000002';
    raise exception 'FAILED: 公開済み見積もりが無いのに quotes_ready にできています';
  exception
    when check_violation then
      raise notice 'OK 28: 公開済み見積もりが無い案件は quotes_ready にできない';
  end;
end $$;

-- -----------------------------------------------------------------------------
-- owner として、admin 専用関数が拒否されること
-- -----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

do $$
begin
  begin
    perform public.admin_request_owner_email('e0000000-0000-4000-8000-000000000001');
    raise exception 'FAILED: owner がオーナーのメールアドレス取得関数を実行できています';
  exception
    when insufficient_privilege then
      raise notice 'OK 29: owner は admin 専用のメールアドレス取得関数を実行できない';
  end;
end $$;

-- -----------------------------------------------------------------------------
-- Storage（storage.objects）のポリシー
-- 依頼写真: owner/{owner_id}/requests/{request_id}/request/{uuid}.{ext}
-- -----------------------------------------------------------------------------

-- 30: owner は自分の案件の依頼写真をアップロードできる
insert into storage.objects (bucket_id, name)
values (
  'request-files',
  'owner/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/e0000000-0000-4000-8000-000000000001/request/44444444-4444-4444-8444-444444444444.jpg'
);

do $$
begin
  raise notice 'OK 30: owner は自分の案件の依頼写真を Storage へアップロードできる';
end $$;

-- 31: owner は完了写真をアップロードできない
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'request-files',
      'owner/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/e0000000-0000-4000-8000-000000000001/completion/55555555-5555-4555-8555-555555555555.jpg'
    );
    raise exception 'FAILED: owner が完了写真を Storage へアップロードできています';
  exception
    when insufficient_privilege then
      raise notice 'OK 31: owner は完了写真を Storage へアップロードできない';
  end;
end $$;

-- 32: owner は他人のフォルダへアップロードできない
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'request-files',
      'owner/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/requests/e0000000-0000-4000-8000-000000000002/request/66666666-6666-4666-8666-666666666666.jpg'
    );
    raise exception 'FAILED: owner が他人のフォルダへアップロードできています';
  exception
    when insufficient_privilege then
      raise notice 'OK 32: owner は他人のフォルダへアップロードできない';
  end;
end $$;

-- 33: パストラバーサルを含むパスはアップロードできない
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('request-files', 'owner/../../etc/passwd.jpg');
    raise exception 'FAILED: パストラバーサルを含むパスがアップロードできています';
  exception
    when insufficient_privilege then
      raise notice 'OK 33: パストラバーサルを含むパスはアップロードできない';
  end;
end $$;

-- 34: 許可されていない拡張子はアップロードできない
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'request-files',
      'owner/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/e0000000-0000-4000-8000-000000000001/request/77777777-7777-4777-8777-777777777777.exe'
    );
    raise exception 'FAILED: 許可されていない拡張子がアップロードできています';
  exception
    when insufficient_privilege then
      raise notice 'OK 34: 許可されていない拡張子はアップロードできない';
  end;
end $$;

-- 35: owner B は owner A の Storage オブジェクトを閲覧できない
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

do $$
begin
  if (select count(*) from storage.objects where bucket_id = 'request-files') <> 0 then
    raise exception 'FAILED: owner B が owner A の Storage オブジェクトを閲覧できています';
  end if;
  raise notice 'OK 35: owner B は owner A の Storage オブジェクトを閲覧できない';
end $$;

-- 36: バケットは非公開である
set local role postgres;

do $$
begin
  if (select public from storage.buckets where id = 'request-files') is not false then
    raise exception 'FAILED: request-files バケットが公開になっています';
  end if;
  raise notice 'OK 36: request-files バケットは非公開である';
end $$;

set local role authenticated;

-- -----------------------------------------------------------------------------
-- 匿名（anon）ロールからは一切見えないこと
-- -----------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  v_denied boolean := false;
begin
  begin
    if (select count(*) from public.service_requests) <> 0 then
      raise exception 'FAILED: anon が案件を取得できています';
    end if;
  exception
    when insufficient_privilege then
      v_denied := true;
  end;
  raise notice 'OK 37: anon は案件を取得できない（権限剥奪 or 0 件）';
end $$;

set local role postgres;

do $$
begin
  raise notice '=============================================';
  raise notice ' ALL RLS CHECKS PASSED';
  raise notice '=============================================';
end $$;

-- 検証用データは残さない
rollback;
