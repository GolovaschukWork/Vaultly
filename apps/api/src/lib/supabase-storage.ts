import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'vaultly-files';

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        transport: ws as unknown as typeof WebSocket,
      },
    });
  }

  return adminClient;
}

export async function createSignedStorageUrl(
  storageKey: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data.signedUrl) return null;
  return data.signedUrl;
}

export async function removeStorageObject(storageKey: string): Promise<void> {
  const { error } = await getAdminClient().storage.from(BUCKET).remove([storageKey]);
  if (error) throw error;
}
