import Dexie, { type Table } from 'dexie';

export interface StoredBlob {
  storageKey: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

class VaultlyDB extends Dexie {
  blobs!: Table<StoredBlob, string>;

  constructor() {
    super('vaultly');
    this.version(1).stores({
      blobs: 'storageKey, fileName, createdAt',
    });
  }
}

export const db = new VaultlyDB();

export async function storeBlob(
  storageKey: string,
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  await db.blobs.put({
    storageKey,
    blob,
    fileName,
    mimeType,
    size: blob.size,
    createdAt: new Date(),
  });
}

export async function getBlob(storageKey: string): Promise<Blob | null> {
  const record = await db.blobs.get(storageKey);
  return record?.blob ?? null;
}

export async function deleteBlob(storageKey: string): Promise<void> {
  await db.blobs.delete(storageKey);
}

export function generateStorageKey(): string {
  return `blob_${crypto.randomUUID()}`;
}
