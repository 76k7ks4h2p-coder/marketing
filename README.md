# OwnerBase（MVP）

**物件の清掃・修繕業者を、比較して選べる。**

OwnerBase は、**広島県福山市**の不動産オーナーが、所有物件の管理に必要な作業を依頼し、
運営管理者が地域業者から集めた見積もりを**同じ形式で比較して 1 社を選べる**Web サービスです。

> ⚠️ これは MVP（実用最小限の製品）です。本番運用の前に、下記「[既知の制約](#既知の制約)」と
> 「[MVP で実装していない機能](#mvp-で実装していない機能)」を必ずご確認ください。
> 利用規約・プライバシーポリシーは**専門家の確認前のドラフト**です。

---

## 目次

1. [サービス概要](#サービス概要)
2. [MVP の目的](#mvp-の目的)
3. [技術構成](#技術構成)
4. [必要環境](#必要環境)
5. [セットアップ（上から順に実行してください）](#セットアップ上から順に実行してください)
6. [環境変数](#環境変数)
7. [Supabase の設定](#supabase-の設定)
8. [Storage の設定](#storage-の設定)
9. [ユーザー登録と admin 権限の付与](#ユーザー登録と-admin-権限の付与)
10. [開発コマンド](#開発コマンド)
11. [RLS の確認方法](#rls-の確認方法)
12. [Vercel へのデプロイ](#vercel-へのデプロイ)
13. [Resend の設定（任意）](#resend-の設定任意)
14. [ディレクトリ構成](#ディレクトリ構成)
15. [データベース設計](#データベース設計)
16. [デモデータについて](#デモデータについて)
17. [法的文書について](#法的文書について)
18. [MVP で実装していない機能](#mvp-で実装していない機能)
19. [既知の制約](#既知の制約)

---

## サービス概要

オーナーが依頼できる作業（DB 値 / 表示名）:

| DB 値                  | 表示名             |
| ---------------------- | ------------------ |
| `vacant_cleaning`      | 空室クリーニング   |
| `common_area_cleaning` | 共用部清掃         |
| `mowing`               | 草刈り・植栽管理   |
| `property_inspection`  | 物件巡回・写真報告 |
| `minor_repair`         | 軽微な修繕         |
| `other`                | その他の相談       |

利用の流れ:

1. オーナーが新規登録・ログインし、所有物件を登録する
2. 物件を選んで作業依頼を作成する（3 ステップ、写真は最大 5 枚）
3. 運営管理者が管理画面で依頼を確認する
4. 運営管理者が地域業者に電話・メール・LINE で連絡し、見積もりを取得する
5. 運営管理者が見積もりを標準形式で管理画面に手入力し、公開する
6. オーナーが見積もりを比較し、1 社を選択する
7. 運営管理者が作業状況を更新し、完了報告と完了写真を登録する
8. オーナーが完了報告を確認する

オーナーが比較できる項目:

- 税込総額 / 見積明細 / 作業に含まれる内容 / 作業に含まれない内容
- 対応可能日 / 作業日数 / 追加料金条件 / 保証内容 / 見積有効期限 / 運営者コメント

## MVP の目的

**コンシェルジュ型**で運用します。業者が直接ログインして見積もりを提出する機能は作りません。
業者との連絡・見積もり取得は運営管理者が行い、管理画面から手入力します。

検証したい仮説は次の 2 点です。

1. オーナーは「相見積もりの手間」を代行してもらうことに価値を感じるか
2. 標準化された形式での比較が、価格以外の判断（作業範囲・保証）を助けるか

## 技術構成

| 領域             | 採用技術                                                   |
| ---------------- | ---------------------------------------------------------- |
| フレームワーク   | Next.js 16（App Router / Turbopack）                       |
| UI               | React 19、Tailwind CSS v4、lucide-react                    |
| 言語             | TypeScript（`strict: true`）                               |
| DB / 認証 / 保管 | Supabase（Postgres / Auth / Storage / Row Level Security） |
| Supabase SDK     | `@supabase/supabase-js`、`@supabase/ssr`                   |
| 入力検証         | Zod 4（クライアント・サーバー共通スキーマ）                |
| メール通知       | Resend（任意設定。未設定でも動作します）                   |
| テスト           | Vitest                                                     |
| パッケージ管理   | pnpm                                                       |
| デプロイ想定     | Vercel                                                     |

- ブラウザ用クライアント（`src/lib/supabase/client.ts`）とサーバー用クライアント
  （`src/lib/supabase/server.ts`）を分離しています。
- セッションの更新は Next.js 16 の **`proxy.ts`**（旧 Middleware）で行います
  （`src/proxy.ts` → `src/lib/supabase/proxy.ts`）。
- 旧 `@supabase/auth-helpers-*` は使用していません。

## 必要環境

- **Node.js 20 以上**（開発は 22 系で確認）
- **pnpm 10 以上**（`corepack enable pnpm` でも導入できます）
- **Docker**（ローカル Supabase を使う場合のみ）
- Supabase プロジェクト（ローカル or クラウド）

---

## セットアップ（上から順に実行してください）

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数ファイルの作成

```bash
cp .env.example .env.local
```

値の入れ方は次章「[環境変数](#環境変数)」を参照してください。
`.env.local` は Git 管理対象外です（`.gitignore` 済み）。

### 3. Supabase の準備

ローカルで開発する場合は「[A. ローカル Supabase](#a-ローカル-supabase)」、
クラウドを使う場合は「[B. クラウドの Supabase プロジェクト](#b-クラウドの-supabase-プロジェクト)」へ進んでください。

### 4. 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 を開きます。

### 5. 動作確認

1. `/signup` からオーナーアカウントを登録する
2. `/properties/new` から物件を登録する（広島県福山市のみ）
3. `/requests/new` から依頼を作成する
4. 別途 admin を付与したアカウントで `/admin` を開き、業者と見積もりを登録・公開する
5. オーナーで見積もりを比較・選択する

---

## 環境変数

`.env.example` をコピーして `.env.local` を作成し、以下を設定します。

### 必須

| 変数名                                 | 説明                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase プロジェクトの URL                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase の **Publishable key**（旧 anon key）。ブラウザへ配布されます |

### 任意（メール通知）

| 変数名                     | 説明                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `RESEND_API_KEY`           | Resend の API キー。**サーバー専用の秘密情報**             |
| `NOTIFICATION_FROM_EMAIL`  | 送信元アドレス（例: `OwnerBase <noreply@example.com>`）    |
| `ADMIN_NOTIFICATION_EMAIL` | 新規依頼・見積もり選択の通知を受け取る運営管理者のアドレス |

### 任意（その他）

| 変数名                 | 説明                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL。認証メールのリンク生成に使用。未設定時はリクエストのオリジンを使用 |

### セキュリティ上の注意

- 公開可能なキーには必ず **Publishable key** を使用してください。
- **Secret key / `service_role` キーはこのアプリでは一切使用しません。**
  `.env.local` にも設定しないでください。ブラウザへ渡してはいけません。
- 秘密情報をソースコードに直接記述しないでください。
- 環境変数が不足している場合、開発者が原因を理解できるエラーを表示します
  （不足している**変数名のみ**を表示し、値は表示・ログ出力しません）。

---

## Supabase の設定

### A. ローカル Supabase

Docker が必要です。

```bash
# 1. ローカルスタックを起動（初回はイメージのダウンロードに数分かかります）
pnpm dlx supabase@latest start

# 2. マイグレーションと seed を適用（既存データはリセットされます）
pnpm dlx supabase@latest db reset

# 3. 接続情報を確認
pnpm dlx supabase@latest status
```

`status` の出力から次を `.env.local` へ転記します。

```
NEXT_PUBLIC_SUPABASE_URL=<API URL（例: http://127.0.0.1:54321）>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key / publishable key>
```

停止するには:

```bash
pnpm dlx supabase@latest stop
```

> `supabase/config.toml` はこのリポジトリに含まれています。
> `site_url` は `http://localhost:3000`、リダイレクト許可 URL に `/auth/callback`
> を登録済みです。ローカルではメール確認が無効（`enable_confirmations = false`）なので、
> `/signup` 後すぐにログイン状態になります。

### B. クラウドの Supabase プロジェクト

1. https://supabase.com/dashboard で新規プロジェクトを作成する
   （リージョンは Northeast Asia (Tokyo) を推奨）
2. **Project Settings → Data API** で Project URL を確認する
3. **Project Settings → API Keys** で **Publishable key** をコピーする
4. `.env.local` に転記する

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key>
   ```

5. マイグレーションを適用する

   ```bash
   # プロジェクト参照 ID はダッシュボードの URL に含まれています
   pnpm dlx supabase@latest login
   pnpm dlx supabase@latest link --project-ref <project-ref>
   pnpm dlx supabase@latest db push
   ```

6. **Authentication → URL Configuration** で以下を設定する
   - Site URL: 本番の URL（例: `https://ownerbase.example.com`）
   - Redirect URLs: `https://<あなたのドメイン>/auth/callback`
     （ローカル確認用に `http://localhost:3000/auth/callback` も追加）

7. デモ業者を入れたい場合のみ、`supabase/seed.sql` の内容を **SQL Editor** に
   貼り付けて実行する（`db push` では seed は適用されません）

### マイグレーションの内容

`supabase/migrations/` に、Supabase CLI で適用できる SQL が入っています。

| ファイル                                  | 内容                                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| `20260728000100_initial_schema.sql`       | テーブル、制約、外部キー、インデックス、関数、トリガー |
| `20260728000200_row_level_security.sql`   | 全テーブルの RLS 有効化とポリシー                      |
| `20260728000300_storage.sql`              | `request-files` バケットと Storage のポリシー          |
| `20260728000400_notification_helpers.sql` | メール通知用の admin 専用関数                          |

### 型定義の再生成（任意）

`src/lib/types/database.ts` はマイグレーションと 1:1 で手書きしています。
スキーマを変更した場合は、次のコマンドで生成し直せます。

```bash
pnpm dlx supabase@latest gen types typescript --local > src/lib/types/database.ts
```

---

## Storage の設定

マイグレーション（`20260728000300_storage.sql`）が以下をすべて設定します。
**ダッシュボードでの手作業は不要**です。

- バケット名: **`request-files`**
- **非公開バケット**（`public = false`）
- 1 ファイル最大 **10MB**
- 許可 MIME タイプ: `image/jpeg` / `image/png` / `image/webp` / `application/pdf`

### 保存パス

```
owner/{owner_id}/requests/{request_id}/request/{uuid}.{ext}
owner/{owner_id}/requests/{request_id}/completion/{uuid}.{ext}
```

- ファイル名は **UUID で生成**します。元のファイル名はパスに使用しません
  （元の名前は `request_files.original_name` に保存し、表示にのみ使います）。
- パスは正規表現による完全一致で検証されるため、`../` などのパストラバーサルは
  成立しません。検証は DB の CHECK 制約・RLS ポリシー・アプリの Zod スキーマの
  3 箇所で行います。

### Storage のポリシー（`20260728000300_storage.sql` に定義）

| ロール | 操作     | 条件                                                                  |
| ------ | -------- | --------------------------------------------------------------------- |
| owner  | `SELECT` | パスの `owner_id` が `auth.uid()` と一致（依頼写真・完了写真の両方）  |
| owner  | `INSERT` | 自分の案件かつ `request` 種別のみ                                     |
| owner  | `DELETE` | 自分の案件の `request` 種別のみ（DB 登録失敗時の後始末用）            |
| owner  | `UPDATE` | 不可                                                                  |
| admin  | 全操作   | `public.is_admin()` が true、かつパスが規定形式で案件のオーナーと一致 |
| anon   | 全操作   | 不可（ポリシーが `to authenticated` のみのため既定で拒否）            |

### 表示方法

バケットが非公開のため、画像・PDF はサーバー側で発行する
**署名付き URL**（有効期間 1 時間）で表示します。公開 URL は存在しません。

### 整合性の扱い

1. クライアントが Storage へ直接アップロードする（Storage の RLS が本人性を検証）
2. Server Action で `request_files` にメタデータを登録する
3. 途中でアップロードが失敗した場合は、それまでに成功したファイルを削除する
4. DB 登録が失敗した場合は、アップロード済みファイルを削除する
5. DB から削除するときは Storage 側も削除する（Storage 削除が失敗しても
   非公開バケットのため第三者には見えません。孤児ファイルはログに記録されます）

---

## ユーザー登録と admin 権限の付与

### 新規ユーザーの登録

`/signup` から登録します。`auth.users` への INSERT トリガー
（`public.handle_new_user()`）が `public.profiles` を **`role = 'owner'` で自動作成**します。
ユーザーメタデータから `role` を指定して昇格することはできません。

### admin 権限の付与

admin は Supabase の **SQL Editor**（ローカルなら Studio の SQL Editor、
または `psql`）から手動で付与します。

1. 対象ユーザーの UUID を確認する

   ```sql
   select p.id, p.full_name, p.role, u.email
   from public.profiles p
   join auth.users u on u.id = p.id
   order by p.created_at;
   ```

2. admin を付与する

   ```sql
   update public.profiles
   set role = 'admin'
   where id = '対象ユーザーUUID';
   ```

3. アプリで一度ログアウト → 再ログインし、`/admin` を開く

> 管理者判定は `public.profiles.role` と `public.is_admin()` 関数で行います。
> **メールアドレスの文字列比較では判定していません。**
>
> owner が `/admin` 以下へアクセスすると `/dashboard?denied=admin` へ遷移し、
> 「管理画面へのアクセス権限がありません」と日本語で表示されます。

---

## 開発コマンド

| コマンド            | 内容                                        |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | 開発サーバーを起動（http://localhost:3000） |
| `pnpm build`        | プロダクションビルド                        |
| `pnpm start`        | ビルド結果を起動（要 `pnpm build`）         |
| `pnpm lint`         | ESLint                                      |
| `pnpm typecheck`    | TypeScript の型チェック（`tsc --noEmit`）   |
| `pnpm test`         | Vitest（1 回実行）                          |
| `pnpm test:watch`   | Vitest（watch モード）                      |
| `pnpm format`       | Prettier で整形                             |
| `pnpm format:check` | 整形されているかを確認                      |

変更を提出する前は次を順に実行してください。

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## RLS の確認方法

全テーブルで RLS を有効化しています。UI で非表示にするだけの対策はしていません。

### 1. 自動検証（SQL・ローカル Supabase が必要）

```bash
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset

DB_URL=$(pnpm dlx supabase@latest status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '"')
psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/rls/rls-verification.sql
```

37 項目の権限チェックを実行し、最後に `ALL RLS CHECKS PASSED` を表示します
（最後に `ROLLBACK` するためデータは残りません）。

### 2. 静的検証（DB 不要・`pnpm test` に含まれる）

`tests/security/` が、マイグレーション SQL から RLS の有効化・各ポリシーの条件・
`SECURITY DEFINER` 関数の `search_path` 固定などが消えていないことを検証します。

### 3. 画面からの手動テスト

詳細な手順は **[`tests/rls/README.md`](tests/rls/README.md)** にあります。
未ログイン時のリダイレクト、owner の `/admin` アクセス拒否、他人の URL への
直接アクセス、見積もりの二重選択、ファイル形式・サイズ、完了写真の権限など
9 シナリオを記載しています。

### 権限の要約

| テーブル           | owner                                                                   | admin  |
| ------------------ | ----------------------------------------------------------------------- | ------ |
| `profiles`         | 自分のみ `SELECT` / `UPDATE`（`role` は変更不可）                       | 全操作 |
| `properties`       | 自分のもののみ `SELECT` / `INSERT` / `UPDATE` / `DELETE`                | 全操作 |
| `service_requests` | 自分のみ `SELECT`、自分の物件にのみ `INSERT`（`UPDATE`/`DELETE` 不可）  | 全操作 |
| `request_files`    | 自分の案件のみ `SELECT`、`request` 種別のみ `INSERT`                    | 全操作 |
| `providers`        | **アクセス不可**（`provider_public` ビューで業者名のみ）                | 全操作 |
| `quotes`           | 自分の案件の `published` のみ `SELECT`                                  | 全操作 |
| `quote_items`      | 自分の案件の `published` 見積もりの明細のみ `SELECT`                    | 全操作 |
| `quote_selections` | 自分のみ `SELECT`、条件を満たす `INSERT` のみ（`UPDATE`/`DELETE` 不可） | 全操作 |
| `work_reports`     | 自分の案件のみ `SELECT`                                                 | 全操作 |

`admin_notes` の扱いについては
[`tests/rls/README.md`](tests/rls/README.md#admin_notes-についての補足) を参照してください
（RLS は行単位のためアプリ層で列を明示して除外しています）。

---

## Vercel へのデプロイ

1. リポジトリを GitHub へ push する
2. https://vercel.com/new でリポジトリをインポートする
3. Framework Preset が **Next.js**、Package Manager が **pnpm** になっていることを確認する
4. **Environment Variables** に以下を設定する（Production / Preview の両方）

   | Key                                    | Value                       |
   | -------------------------------------- | --------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Supabase の Project URL     |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase の Publishable key |
   | `NEXT_PUBLIC_SITE_URL`                 | 割り当てられた本番 URL      |
   | `RESEND_API_KEY`（任意）               | Resend の API キー          |
   | `NOTIFICATION_FROM_EMAIL`（任意）      | 送信元アドレス              |
   | `ADMIN_NOTIFICATION_EMAIL`（任意）     | 運営管理者の通知先アドレス  |

5. Deploy する
6. Supabase の **Authentication → URL Configuration** に、Vercel の本番 URL と
   `https://<ドメイン>/auth/callback` を登録する
7. Supabase 側にマイグレーションを適用する（未実施の場合）

   ```bash
   pnpm dlx supabase@latest link --project-ref <project-ref>
   pnpm dlx supabase@latest db push
   ```

> `service_role` キーは Vercel にも設定しないでください。このアプリは使用しません。

---

## Resend の設定（任意）

Resend が設定されている場合のみ、次の 4 通を送信します。

1. 新規依頼作成時 → 運営管理者へ
2. 見積もり公開時 → オーナーへ
3. 見積もり選択時 → 運営管理者へ
4. 作業完了時 → オーナーへ

### 設定手順

1. https://resend.com でアカウントを作成する
2. **Domains** で送信ドメインを追加し、DNS レコードを設定して検証を完了する
3. **API Keys** でキーを作成する
4. 環境変数を設定する

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   NOTIFICATION_FROM_EMAIL=OwnerBase <noreply@あなたのドメイン>
   ADMIN_NOTIFICATION_EMAIL=admin@あなたのドメイン
   ```

### 未設定の場合

処理は失敗しません。送信内容（宛先・件名・本文）がサーバーログへ出力されます。

```
[OwnerBase] メール通知はスキップされました（RESEND_API_KEY / NOTIFICATION_FROM_EMAIL が未設定）。
  宛先: owner@example.com
  件名: 【OwnerBase】見積もりのご確認をお願いします（OB-20260728-AB12）
  本文:
    ...
```

**メール送信の失敗によって、依頼登録・見積もり公開・見積もり選択・完了登録が
失敗することはありません。** 失敗はログに記録し、業務処理は継続します。

メール本文には不要な個人情報を含めません。案件番号・カテゴリーとログイン後の
リンクのみを記載し、詳細は画面で確認してもらう方針です。

> オーナーのメールアドレスは、`auth.users` を直接参照する代わりに admin のみ
> 実行できる `public.admin_request_owner_email(uuid)`
> （`SECURITY DEFINER`・`search_path` 固定・関数内で `is_admin()` を検証）で
> 取得します。これにより `service_role` キーをアプリへ持ち込む必要がありません。

---

## ディレクトリ構成

```
src/
  app/
    (public)/          # /, /terms, /privacy
    (auth)/            # /login, /signup, /forgot-password, /reset-password
    (owner)/           # /dashboard, /properties, /requests, /profile
    admin/             # /admin 以下
    auth/callback/     # 認証コールバック（Route Handler）
    error.tsx, global-error.tsx, not-found.tsx
  actions/             # Server Actions
  components/
    ui/                # Button, Field, Badge, Alert, ConfirmDialog, FileGallery, ...
    layout/            # Header, MobileNav, AdminSidebar, Footer
    owner/             # PropertyForm, RequestWizard, FilePicker, ProfileForm
    admin/             # ProviderForm, QuoteForm, StatusForm, WorkReportForm, ...
    quotes/            # QuoteCard, QuoteComparison, SelectQuoteButton
  lib/
    supabase/          # browser / server クライアント、proxy、env
    auth/              # セッションと権限確認
    validation/        # Zod スキーマ（クライアント・サーバー共通）
    email/             # Resend クライアントと通知
    constants/         # カテゴリー・ステータス・物件種別・緊急度・ファイル制限
    format/            # 金額（Intl.NumberFormat）・日本語日付
    queries/           # データ取得（列定義、owner / admin、Storage 署名付き URL）
    types/             # Database 型
  proxy.ts             # Next.js 16 の Proxy（旧 Middleware）

supabase/
  migrations/          # 本番用マイグレーション
  seed.sql             # 開発用シード（架空業者）
  config.toml          # ローカル Supabase の設定

tests/
  format/ validation/ constants/ security/   # Vitest
  rls/                 # RLS 検証 SQL と手動テスト手順
```

## データベース設計

| テーブル           | 役割                                             | 主な制約                                                                             |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `profiles`         | `auth.users` と 1:1。`role` は `owner` / `admin` | `role` の CHECK、トリガーで昇格を防止                                                |
| `properties`       | オーナーの所有物件                               | 都道府県 = 広島県、市区町村 = 福山市、郵便番号形式、築年・戸数・面積                 |
| `service_requests` | 作業依頼（案件）                                 | 案件番号 `OB-YYYYMMDD-XXXX`、カテゴリー・緊急度・ステータスの CHECK、予算下限 ≦ 上限 |
| `request_files`    | 依頼写真・完了写真のメタデータ                   | 種別・MIME・サイズ・パス形式、1 種別あたり 5 件まで                                  |
| `providers`        | 協力業者マスタ（非公開）                         | メール形式、対応カテゴリーの値チェック                                               |
| `quotes`           | 見積もり                                         | 公開状態の CHECK、金額は 0 以上の整数、有効期限 ≧ 作成日                             |
| `quote_items`      | 見積明細                                         | 金額は 0 以上、数量・単価は正                                                        |
| `quote_selections` | オーナーの選択結果                               | `request_id` に UNIQUE（1 案件 1 件）                                                |
| `work_reports`     | 完了報告                                         | `request_id` に UNIQUE（1 案件 1 件）                                                |

### 案件番号

利用者に提示する短い番号です。個人情報を含まず、衝突しにくい形式にしています。

```
OB-20260728-AB12
```

- 日付部分は Asia/Tokyo の暦日
- 末尾 4 文字は紛らわしい `I` / `O` を除いた 34 文字から生成（約 133 万通り／日）
- 採番は DB の BEFORE INSERT トリガーが行い、衝突時は最大 20 回再試行します
- クライアントから任意の番号を指定することはできません

### 見積もり選択のトランザクション

`public.select_quote(p_request_id, p_quote_id)` が 1 トランザクションで処理します。

DB 側で確認する条件:

- `auth.uid()` と案件の `owner_id` が一致する
- 呼び出しユーザーの `role` が `owner` である
- `quote_id` が同じ `request_id` に属している
- 見積もりが `published` である
- 既存の選択が無い（`FOR UPDATE` で直列化 + UNIQUE 制約）
- 案件が `completed` / `cancelled` ではない

成功時に `service_requests.status` を `provider_selected` へ更新します。

この関数は `SECURITY DEFINER` ですが、

- `search_path` を `public, pg_temp` に固定
- 関数内部で `auth.uid()` を検証
- `authenticated` にのみ `EXECUTE` を付与（`public` からは剥奪）
- **`owner_id` を引数で受け取らない**（クライアントからの権限奪取が成立しない）

### `updated_at`

`updated_at` を持つ全テーブルに、共通トリガー関数 `public.set_updated_at()` を
BEFORE UPDATE で設定しています。

## デモデータについて

`supabase/seed.sql` は開発用のシードです。本番マイグレーション
（`supabase/migrations/`）とは分離しています。

登録される業者:

- 福山クリーンサービス
- 備後メンテナンス
- 瀬戸内プロパティケア

> ⚠️ **これらの業者はすべて架空です。** 会社名・担当者名・電話番号・
> メールアドレス・住所はいずれも実在しません。実在する企業の情報は一切
> 使用していません。電話番号はドラマ・小説用の番号帯（`0X0-5XXX-XXXX`）、
> メールアドレスは RFC 2606 の予約ドメイン `example.com` を使用しています。

適用方法:

```bash
# ローカル（マイグレーション + seed をまとめて再適用）
pnpm dlx supabase@latest db reset
```

クラウドでは `db push` で seed は適用されません。必要な場合は
`supabase/seed.sql` の内容を SQL Editor に貼り付けて実行してください。

## 法的文書について

`/terms`（利用規約）と `/privacy`（プライバシーポリシー）は、
**MVP 開発のために用意した開発用ドラフト**です。

> ⚠️ **正式公開の前に、弁護士等の専門家による確認が必要です。**
> 現時点の内容は法的に完成した文書ではなく、法的効力を持つものとして
> 扱わないでください。画面上にもその旨を明示しています。

特に次の項目は、実際の運営体制に合わせて確定させる必要があります。

- 運営者の名称・所在地・連絡先（現在は未記載）
- 特定商取引法に基づく表記の要否
- 個人情報の取扱いに関する開示・訂正・削除の請求窓口
- 運営者と事業者の責任分担、免責の範囲
- 業務委託先（Supabase / Vercel / Resend）の記載内容

## MVP で実装していない機能

意図的に実装していません。

- Stripe / サイト内決済
- 業者専用ログイン（見積もり提出は運営管理者が代行）
- リアルタイムチャット
- 口コミ・評価
- AI 価格査定 / 自動マッチング
- Google Maps 連携
- 入居者アカウント / 管理会社アカウント
- 電子契約 / 工事保証 / 損害補償
- 会計ソフト連携 / 賃貸管理システム連携
- 全国対応（現在は福山市限定）
- ネイティブアプリ
- 実在業者のスクレイピング
- 本番用の正式な法的文書

## 既知の制約

### 対応エリア

広島県福山市に限定しています。DB の CHECK 制約と Zod スキーマの両方で固定して
いるため、エリアを広げるにはマイグレーションが必要です。

### `admin_notes` の列制御

RLS は行単位の制御であり、列単位の制御はできません。`admin_notes` をオーナーへ
返さないようにしているのは**アプリケーション層**です
（`src/lib/queries/columns.ts` の列定義と `OwnerRequest` 型、および
`tests/security/owner-columns.test.ts` の回帰テスト）。
新しい管理者専用列を追加する場合は、必ず同じ仕組みに乗せてください。

### 依頼作成と写真アップロードの順序

Storage のパスに `request_id` が必要なため、依頼を作成したあとに写真を
アップロードします。依頼の作成が成功して写真のアップロードが失敗した場合、
**依頼は残ります**（画面にその旨を表示します）。
現在の MVP では、依頼詳細画面から写真を追加する UI はありません。

### 依頼作成フォームの JavaScript 依存

3 ステップの依頼作成ウィザードは JavaScript を必要とします。
他のフォーム（ログイン、新規登録、物件登録、業者登録、見積もり入力など）は
Server Actions を `<form action>` で使用しており、JavaScript が無くても送信できます。

### 完了写真の件数

依頼写真・完了写真ともに 1 案件あたり **5 件**までです（DB のトリガーで制限）。
完了写真をより多く登録したい場合は、`enforce_request_file_limit()` と
`MAX_FILES_PER_REQUEST` の両方を変更してください。

### 一覧のページネーション

案件一覧・物件一覧・業者一覧にページネーションはありません。
件数が増えた場合は追加が必要です。

### 見積もりの選び直し

オーナーが選択したあと、画面から選び直すことはできません（仕様どおり）。
変更が必要な場合は、admin が `quote_selections` を直接操作する運用になります
（専用の管理 UI は未実装）。

### 依頼のキャンセル

`cancelled` ステータスは定義済みですが、オーナー側からキャンセルする UI は
ありません。admin がステータスを変更する運用です。

### メールアドレスの変更

アプリからメールアドレスを変更する画面はありません。
Supabase ダッシュボードまたは運営者対応が必要です。

### 検証済みの項目

- `pnpm format` / `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`
- **マイグレーションの適用**: PostgreSQL 16 に対して
  `supabase/migrations/*.sql` を空のデータベースから順に適用し、
  エラーなく完了することを確認済み
- **`supabase/seed.sql` の適用**: 架空業者 3 件が登録されることを確認済み
- **RLS と Storage ポリシー**: `tests/rls/rls-verification.sql` の
  37 項目すべてが通過することを確認済み

> RLS の検証は、`auth` / `storage` スキーマと `anon` / `authenticated` /
> `service_role` ロールを再現したローカルの PostgreSQL 16 上で行いました。
> **Supabase の実インスタンスでの確認ではありません。**
> Supabase 側の実装差（Storage API の挙動、Auth の設定など）が影響しうるため、
> 導入時にもう一度ローカル Supabase で実行してください。

### 未検証の項目

**Supabase / Resend の認証情報を用いた実環境での動作確認は行っていません。**
以下は実環境で確認してください。

- ローカル Supabase（`supabase db reset`）およびクラウド（`db push`）での適用
- ローカル Supabase 上での `tests/rls/rls-verification.sql` の実行
- サインアップ〜完了報告までの一連の画面フロー
- Storage への実アップロード（Storage API 経由）と署名付き URL の表示
- 認証メール（確認メール・パスワード再設定）の受信とコールバック
- Resend からの実メール送信

手順は [`tests/rls/README.md`](tests/rls/README.md) の「3. 画面からの手動テスト手順」に
まとめています。
