-- =============================================================================
-- OwnerBase MVP — 通知用ヘルパー
-- -----------------------------------------------------------------------------
-- メール通知の宛先としてオーナーのメールアドレスが必要になるが、
-- auth.users は PostgREST から直接参照できない。
-- service_role キーをアプリへ持ち込まずに済ませるため、
-- admin だけが実行できる SECURITY DEFINER 関数で 1 件だけ取得できるようにする。
-- =============================================================================

create or replace function public.admin_request_owner_email(p_request_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text;
begin
  -- 関数内部で権限を検証する（引数で owner を指定させない）
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  select u.email
    into v_email
    from public.service_requests sr
    join auth.users u on u.id = sr.owner_id
   where sr.id = p_request_id;

  return v_email;
end;
$$;

comment on function public.admin_request_owner_email(uuid) is
  '案件のオーナーのメールアドレスを返す。admin のみ実行可能。メール通知の宛先取得に使用する。';

revoke all on function public.admin_request_owner_email(uuid) from public;
grant execute on function public.admin_request_owner_email(uuid) to authenticated;
