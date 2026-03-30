-- Optional: create private bucket for async video uploads.
-- You can also create "analysis-videos" (private) in Supabase Dashboard → Storage.

insert into storage.buckets (id, name, public)
values ('analysis-videos', 'analysis-videos', false)
on conflict (id) do nothing;
