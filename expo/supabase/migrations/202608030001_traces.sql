-- WONDER WO8: anonymous enum-only wayside traces in the WO5 cairn buckets.
create table if not exists public.cairns (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists cairns_bucket_recent
  on public.cairns (bucket_key, created_at desc);

create or replace function public.is_valid_trace_payload(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  leg_id_value integer;
  day_index_value integer;
  hour_bucket_value integer;
  sign_value integer;
  lens_value integer;
  card_value integer;
begin
  if jsonb_typeof(value) <> 'object'
    or jsonb_object_length(value) <> 6
    or not (value ?& array['leg_id', 'day_index', 'hour_bucket', 'sign', 'lens', 'card'])
    or exists (
      select 1 from jsonb_each(value) entry
      where jsonb_typeof(entry.value) <> 'number'
        or entry.value::text !~ '^-?[0-9]+$'
    )
  then
    return false;
  end if;

  leg_id_value := (value ->> 'leg_id')::integer;
  day_index_value := (value ->> 'day_index')::integer;
  hour_bucket_value := (value ->> 'hour_bucket')::integer;
  sign_value := (value ->> 'sign')::integer;
  lens_value := (value ->> 'lens')::integer;
  card_value := (value ->> 'card')::integer;

  return leg_id_value >= 0 and leg_id_value < 10000
    and day_index_value >= 0 and day_index_value < 100000
    and hour_bucket_value >= 0 and hour_bucket_value < 24
    and sign_value >= 0 and sign_value < 12
    and lens_value >= 0 and lens_value < 18
    and card_value >= 0 and card_value < 78;
exception when others then
  return false;
end;
$$;

alter table public.cairns enable row level security;

drop policy if exists cairns_anon_trace_insert on public.cairns;
create policy cairns_anon_trace_insert on public.cairns
  for insert to anon
  with check (
    kind = 'trace'
    and bucket_key ~ '^[a-z0-9_-]+:[a-z0-9_-]+:[0-9]+$'
    and public.is_valid_trace_payload(payload)
  );

drop policy if exists cairns_anon_trace_select on public.cairns;
create policy cairns_anon_trace_select on public.cairns
  for select to anon
  using (
    kind = 'trace'
    and created_at > now() - interval '48 hours'
    and public.is_valid_trace_payload(payload)
  );

grant select, insert on public.cairns to anon;
do $$
begin
  if to_regclass('public.cairns_id_seq') is not null then
    grant usage, select on sequence public.cairns_id_seq to anon;
  end if;
end;
$$;
revoke update, delete on public.cairns from anon;
