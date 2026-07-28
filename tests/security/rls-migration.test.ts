import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * マイグレーション SQL に対する静的な回帰テスト。
 *
 * 実際の RLS の挙動確認には稼働中の Postgres が必要なため、
 * ここでは「必要な保護が SQL から消えていないこと」を検証する。
 * 実データでの確認手順は tests/rls/README.md を参照。
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  expect(files.length).toBeGreaterThan(0)

  return files.map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8')).join('\n')
}

const sql = readAllMigrations()

const TABLES = [
  'profiles',
  'properties',
  'service_requests',
  'request_files',
  'providers',
  'quotes',
  'quote_items',
  'quote_selections',
  'work_reports',
] as const

describe('RLS の有効化', () => {
  it('すべてのテーブルで RLS を有効化している', () => {
    for (const table of TABLES) {
      expect(sql).toContain(`alter table public.${table}`)
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'),
      )
    }
  })
})

describe('admin 判定', () => {
  it('is_admin() は SECURITY DEFINER かつ search_path を固定している', () => {
    const match = /create or replace function public\.is_admin\(\)[\s\S]*?\$\$;/.exec(sql)
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain('security definer')
    expect(body).toContain('set search_path = public, pg_temp')
  })

  it('メールアドレスの文字列比較で admin を判定していない', () => {
    // auth.users.email を使った admin 判定が無いこと
    expect(sql).not.toMatch(/role\s*=\s*'admin'[\s\S]{0,80}email\s*=/i)
    expect(sql).not.toMatch(/email\s*(=|like|ilike)\s*'[^']*@/i)
  })
})

describe('新規ユーザーの profiles 自動作成', () => {
  it('auth.users への INSERT トリガーが存在する', () => {
    expect(sql).toContain('create trigger on_auth_user_created')
    expect(sql).toContain('after insert on auth.users')
    expect(sql).toContain('public.handle_new_user()')
  })

  it('role は owner で固定されており、メタデータから昇格できない', () => {
    const match = /create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$;/.exec(sql)
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain("'owner'")
    // raw_user_meta_data から role を読んでいないこと
    expect(body).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/)
  })
})

describe('service_requests のポリシー', () => {
  it('オーナーは自分の案件のみ SELECT できる', () => {
    expect(sql).toContain('create policy service_requests_owner_select')
    expect(sql).toMatch(/service_requests_owner_select[\s\S]*?using \(owner_id = auth\.uid\(\)\)/)
  })

  it('オーナーは自分が所有する物件に対してのみ INSERT できる', () => {
    const match =
      /create policy service_requests_owner_insert[\s\S]*?with check \(([\s\S]*?)\);/.exec(sql)
    expect(match).not.toBeNull()
    const check = match?.[1] ?? ''
    expect(check).toContain('owner_id = auth.uid()')
    expect(check).toContain('from public.properties')
    expect(check).toContain('p.owner_id = auth.uid()')
  })

  it('オーナーには UPDATE / DELETE ポリシーを与えていない', () => {
    expect(sql).not.toContain('create policy service_requests_owner_update')
    expect(sql).not.toContain('create policy service_requests_owner_delete')
  })
})

describe('quotes のポリシー', () => {
  it('オーナーは published の見積もりのみ SELECT できる', () => {
    const match = /create policy quotes_owner_select[\s\S]*?using \(([\s\S]*?)\);/.exec(sql)
    expect(match).not.toBeNull()
    const using = match?.[1] ?? ''
    expect(using).toContain("publication_status = 'published'")
    expect(using).toContain('sr.owner_id = auth.uid()')
  })

  it('オーナーには INSERT / UPDATE / DELETE ポリシーを与えていない', () => {
    expect(sql).not.toContain('create policy quotes_owner_insert')
    expect(sql).not.toContain('create policy quotes_owner_update')
    expect(sql).not.toContain('create policy quotes_owner_delete')
  })
})

describe('quote_items のポリシー', () => {
  it('オーナーは published の見積もりの明細のみ SELECT できる', () => {
    const match = /create policy quote_items_owner_select[\s\S]*?using \(([\s\S]*?)\);/.exec(sql)
    expect(match).not.toBeNull()
    const using = match?.[1] ?? ''
    expect(using).toContain("q.publication_status = 'published'")
    expect(using).toContain('sr.owner_id = auth.uid()')
  })
})

describe('providers のポリシー', () => {
  it('admin のみが操作できる', () => {
    expect(sql).toContain('create policy providers_admin_all')
    expect(sql).not.toContain('create policy providers_owner_select')
  })

  it('オーナー向けビューは id と name のみを公開する', () => {
    const match = /create or replace view public\.provider_public[\s\S]*?;/.exec(sql)
    expect(match).not.toBeNull()
    const view = match?.[0] ?? ''
    expect(view).toContain('p.id')
    expect(view).toContain('p.name')
    // 連絡先・内部メモは列に含めない
    expect(view).not.toContain('p.phone')
    expect(view).not.toContain('p.email')
    expect(view).not.toContain('p.notes')
    expect(view).not.toContain('p.address')
  })

  it('ビューは公開済み見積もりに紐づく案件のオーナーだけに絞っている', () => {
    const match = /create or replace view public\.provider_public[\s\S]*?;/.exec(sql)
    const view = match?.[0] ?? ''
    expect(view).toContain("q.publication_status = 'published'")
    expect(view).toContain('sr.owner_id = auth.uid()')
  })
})

describe('quote_selections のポリシー', () => {
  it('request_id に UNIQUE 制約があり 1 案件 1 件に限定される', () => {
    expect(sql).toMatch(/request_id\s+uuid\s+not null unique references public\.service_requests/)
  })

  it('オーナーには UPDATE / DELETE ポリシーを与えていない', () => {
    expect(sql).not.toContain('create policy quote_selections_owner_update')
    expect(sql).not.toContain('create policy quote_selections_owner_delete')
  })

  it('INSERT ポリシーが公開済み・同一案件・未選択・オーナー本人を検証している', () => {
    const match =
      /create policy quote_selections_owner_insert[\s\S]*?with check \(([\s\S]*?)\);/.exec(sql)
    expect(match).not.toBeNull()
    const check = match?.[1] ?? ''
    expect(check).toContain('owner_id = auth.uid()')
    expect(check).toContain('public.is_owner()')
    expect(check).toContain("q.publication_status = 'published'")
    expect(check).toContain('q.request_id = quote_selections.request_id')
    expect(check).toContain('not exists')
    expect(check).toContain("sr.status not in ('completed', 'cancelled')")
  })
})

describe('select_quote() 関数', () => {
  it('SECURITY DEFINER で search_path を固定している', () => {
    const match =
      /create or replace function public\.select_quote\(p_request_id uuid, p_quote_id uuid\)[\s\S]*?\$\$;/.exec(
        sql,
      )
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain('security definer')
    expect(body).toContain('set search_path = public, pg_temp')
  })

  it('関数内部で auth.uid() を検証し、owner_id を引数で受け取らない', () => {
    const match =
      /create or replace function public\.select_quote\(p_request_id uuid, p_quote_id uuid\)[\s\S]*?\$\$;/.exec(
        sql,
      )
    const body = match?.[0] ?? ''
    expect(body).toMatch(/v_uid\s+uuid\s*:=\s*auth\.uid\(\)/)
    expect(body).toContain('v_request.owner_id <> v_uid')
    // 引数は request_id と quote_id のみ（owner_id を受け取らない）
    expect(body).not.toContain('p_owner_id')
  })

  it('必要な条件をすべて検証している', () => {
    const match =
      /create or replace function public\.select_quote\(p_request_id uuid, p_quote_id uuid\)[\s\S]*?\$\$;/.exec(
        sql,
      )
    const body = match?.[0] ?? ''
    expect(body).toContain('NOT_OWNER')
    expect(body).toContain('QUOTE_REQUEST_MISMATCH')
    expect(body).toContain('QUOTE_NOT_PUBLISHED')
    expect(body).toContain('ALREADY_SELECTED')
    expect(body).toContain('REQUEST_CLOSED')
    // 選択成功時に案件ステータスを provider_selected へ更新する
    expect(body).toContain("set status = 'provider_selected'")
    // 同時実行を直列化する
    expect(body).toContain('for update')
  })

  it('最小限の権限だけを GRANT している', () => {
    expect(sql).toContain('revoke all on function public.select_quote(uuid, uuid) from public')
    expect(sql).toContain(
      'grant execute on function public.select_quote(uuid, uuid) to authenticated',
    )
  })
})

describe('request_files のポリシー', () => {
  it('オーナーは request 種別のみ INSERT できる（completion は不可）', () => {
    const match = /create policy request_files_owner_insert[\s\S]*?with check \(([\s\S]*?)\);/.exec(
      sql,
    )
    expect(match).not.toBeNull()
    const check = match?.[1] ?? ''
    expect(check).toContain("file_kind = 'request'")
    expect(check).toContain('uploaded_by = auth.uid()')
    expect(check).toContain('sr.owner_id = auth.uid()')
    expect(check).toContain('public.request_file_path_owner(storage_path) = auth.uid()')
  })

  it('オーナーは自分の案件のファイルのみ SELECT できる', () => {
    const match = /create policy request_files_owner_select[\s\S]*?using \(([\s\S]*?)\);/.exec(sql)
    expect(match).not.toBeNull()
    expect(match?.[1] ?? '').toContain('sr.owner_id = auth.uid()')
  })
})

describe('Storage の設定', () => {
  it('バケットは非公開で作成される', () => {
    expect(sql).toContain("'request-files'")
    expect(sql).toMatch(/insert into storage\.buckets[\s\S]*?false,/)
  })

  it('許可 MIME タイプとサイズ上限が設定されている', () => {
    expect(sql).toContain("array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']")
    expect(sql).toContain('10485760')
  })

  it('パス検証関数が完全一致の正規表現でパストラバーサルを防いでいる', () => {
    const match =
      /create or replace function public\.request_file_path_is_valid\(p_path text\)[\s\S]*?\$\$;/.exec(
        sql,
      )
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain("'^owner/'")
    expect(body).toContain('(request|completion)')
    expect(body).toContain('(jpg|jpeg|png|webp|pdf)$')
  })

  it('オーナーの Storage への INSERT は request 種別かつ自分の案件に限られる', () => {
    const match =
      /create policy "request_files_owner_insert" on storage\.objects[\s\S]*?with check \(([\s\S]*?)\);/.exec(
        sql,
      )
    expect(match).not.toBeNull()
    const check = match?.[1] ?? ''
    expect(check).toContain("public.request_file_path_kind(name) = 'request'")
    expect(check).toContain('public.request_file_path_owner(name) = auth.uid()')
    expect(check).toContain('sr.owner_id = auth.uid()')
  })
})

describe('その他の保護', () => {
  it('quotes_ready へは公開済み見積もりがある場合のみ遷移できる', () => {
    expect(sql).toContain('PUBLISHED_QUOTE_REQUIRED')
    expect(sql).toMatch(/new\.status = 'quotes_ready'[\s\S]*?publication_status = 'published'/)
  })

  it('role 変更は admin 以外拒否される', () => {
    expect(sql).toContain('ROLE_CHANGE_FORBIDDEN')
    expect(sql).toContain('create trigger profiles_protect_update')
  })

  it('オーナーは status / admin_notes を指定できない', () => {
    const match =
      /create or replace function public\.protect_service_request_fields\(\)[\s\S]*?\$\$;/.exec(sql)
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain("new.status := 'submitted'")
    expect(body).toContain('new.admin_notes := null')
  })

  it('案件番号はサーバー側で採番される', () => {
    expect(sql).toContain('new.request_number := public.generate_request_number()')
    expect(sql).toContain("'^OB-[0-9]{8}-[0-9A-HJ-NP-Z]{4}$'")
  })

  it('updated_at の自動更新トリガーが全対象テーブルに設定されている', () => {
    for (const table of [
      'profiles',
      'properties',
      'service_requests',
      'providers',
      'quotes',
      'work_reports',
    ]) {
      expect(sql).toContain(`create trigger ${table}_set_updated_at`)
    }
  })

  it('admin 専用のメール取得関数は関数内で権限を検証している', () => {
    const match =
      /create or replace function public\.admin_request_owner_email\(p_request_id uuid\)[\s\S]*?\$\$;/.exec(
        sql,
      )
    expect(match).not.toBeNull()
    const body = match?.[0] ?? ''
    expect(body).toContain('security definer')
    expect(body).toContain('set search_path = public, auth, pg_temp')
    expect(body).toContain('if not public.is_admin() then')
  })
})
