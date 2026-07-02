import { describe, expect, it } from 'vitest';
import { generateStorageKey } from '@/lib/dexie';

describe('generateStorageKey', () => {
  it('generates unique keys', () => {
    const key1 = generateStorageKey();
    const key2 = generateStorageKey();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^blob_/);
  });
});
