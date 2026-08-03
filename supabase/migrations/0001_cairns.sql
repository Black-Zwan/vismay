create table cairns (
  id uuid primary key,
  bucket_key text not null,
  kind text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create index on cairns (bucket_key, created_at desc);
