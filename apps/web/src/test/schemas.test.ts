import { describe, expect, it } from 'vitest';
import { nameSchema } from '@vaultly/trpc';

describe('nameSchema', () => {
  it('accepts valid names', () => {
    expect(nameSchema.parse('My Folder')).toBe('My Folder');
  });

  it('trims whitespace', () => {
    expect(nameSchema.parse('  test  ')).toBe('test');
  });

  it('rejects empty names', () => {
    expect(() => nameSchema.parse('')).toThrow();
    expect(() => nameSchema.parse('   ')).toThrow();
  });

  it('rejects names over 255 characters', () => {
    expect(() => nameSchema.parse('a'.repeat(256))).toThrow();
  });
});
