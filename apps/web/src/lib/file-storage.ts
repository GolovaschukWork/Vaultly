import { PDF_MIME_TYPE } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'vaultly-files';

export function buildStorageKey(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.pdf`;
}

export async function uploadFile(userId: string, file: File): Promise<string> {
  const storageKey = buildStorageKey(userId);
  const { error } = await supabase.storage.from(BUCKET).upload(storageKey, file, {
    contentType: PDF_MIME_TYPE,
    upsert: false,
  });

  if (error) throw error;
  return storageKey;
}

export async function getFileBlob(storageKey: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storageKey);
  if (error || !data) return null;
  return data;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) throw error;
}
