-- Run in Supabase SQL Editor or via supabase db push
-- analysis_jobs: audit trail + async job state

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  exercise_type text not null,
  video_filename text,
  video_storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  resend_message_id text,
  email_error text,
  result_json jsonb
);

create index if not exists analysis_jobs_recipient_email_idx on public.analysis_jobs (recipient_email);
create index if not exists analysis_jobs_status_idx on public.analysis_jobs (status);
create index if not exists analysis_jobs_created_at_idx on public.analysis_jobs (created_at desc);

alter table public.analysis_jobs enable row level security;

-- No public policies: only service role (server) accesses this table

comment on table public.analysis_jobs is 'Animation analysis jobs: audit + async results';
