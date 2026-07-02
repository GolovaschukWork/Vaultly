import { describe, expect, it } from 'vitest';
import { buildStorageKey } from '@/lib/file-storage';

describe('buildStorageKey', () => {
  it('creates a unique path per user', () => {
    const key1 = buildStorageKey('user-1');
    const key2 = buildStorageKey('user-1');

    expect(key1).toMatch(/^user-1\/.+\.pdf$/);
    expect(key2).toMatch(/^user-1\/.+\.pdf$/);
    expect(key1).not.toBe(key2);
  });
});
