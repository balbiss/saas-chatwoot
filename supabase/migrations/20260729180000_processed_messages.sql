create table if not exists public.processed_messages (
  message_id bigint primary key,
  account_id integer not null,
  processed_at timestamptz not null default now()
);
