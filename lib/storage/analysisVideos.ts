import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'analysis-videos';

export function storageObjectPath(jobId: string, filename: string): string {
  const safe = filename.replace(/^.*[\\/]/, '').replace(/[^\w.\-]+/g, '_') || 'video.mp4';
  return `jobs/${jobId}/${safe}`;
}

export async function uploadAnalysisVideo(
  supabase: SupabaseClient,
  jobId: string,
  file: File
): Promise<{ path: string }> {
  const path = storageObjectPath(jobId, file.name);
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || 'video/mp4',
    upsert: true,
  });
  if (error) throw error;
  return { path };
}

export async function downloadAnalysisVideo(
  supabase: SupabaseClient,
  storagePath: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw error ?? new Error('Download failed');
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export async function removeAnalysisVideo(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
