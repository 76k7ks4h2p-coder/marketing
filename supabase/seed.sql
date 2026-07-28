-- =============================================================================
-- OwnerBase — 開発用シードデータ
-- -----------------------------------------------------------------------------
-- ⚠️ このファイルは開発環境専用です。本番マイグレーション
--    (supabase/migrations/) には含まれません。
--
-- ⚠️ 以下の業者はすべて【架空】です。
--    会社名・担当者名・電話番号・メールアドレス・住所は実在しません。
--    実在する企業の情報は一切使用していません。
--    電話番号は総務省が定めるドラマ・小説用の番号帯 (0X0-5XXX-XXXX) を、
--    メールアドレスは RFC 2606 の予約ドメイン example.com を使用しています。
--
-- 適用方法:
--   supabase db reset            # マイグレーション + seed.sql を再適用
--   supabase db reset --linked   # リモートに適用する場合（データが消えるので注意）
-- =============================================================================

insert into public.providers (
  id,
  name,
  contact_name,
  email,
  phone,
  address,
  service_areas,
  service_categories,
  licenses,
  has_liability_insurance,
  notes,
  is_active
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '福山クリーンサービス',
    '架空 太郎',
    'demo-provider-1@example.com',
    '090-5000-0001',
    '広島県福山市（架空の住所・デモ用）',
    array['福山市'],
    array['vacant_cleaning', 'common_area_cleaning', 'property_inspection'],
    '（デモ）ハウスクリーニング技能士',
    true,
    'デモ用の架空業者です。実在しません。空室クリーニングを得意とする想定。',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '備後メンテナンス',
    '架空 花子',
    'demo-provider-2@example.com',
    '090-5000-0002',
    '広島県福山市（架空の住所・デモ用）',
    array['福山市'],
    array['minor_repair', 'common_area_cleaning', 'other'],
    '（デモ）建設業許可 第000000号',
    true,
    'デモ用の架空業者です。実在しません。軽微な修繕を得意とする想定。',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '瀬戸内プロパティケア',
    '架空 次郎',
    'demo-provider-3@example.com',
    '090-5000-0003',
    '広島県福山市（架空の住所・デモ用）',
    array['福山市'],
    array['mowing', 'property_inspection', 'common_area_cleaning'],
    '（デモ）造園施工管理技士',
    false,
    'デモ用の架空業者です。実在しません。草刈り・植栽管理を得意とする想定。',
    true
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- テストユーザーについて
-- -----------------------------------------------------------------------------
-- auth.users への直接 INSERT は Supabase のバージョンによって内部スキーマが変わるため、
-- seed では作成しません。次の手順で作成してください。
--
--   1. アプリの /signup からオーナーアカウントを 2 つ登録する
--   2. 管理者にしたいユーザーの UUID を確認する
--        select id, role from public.profiles order by created_at;
--   3. admin を付与する
--        update public.profiles set role = 'admin' where id = '対象ユーザーUUID';
