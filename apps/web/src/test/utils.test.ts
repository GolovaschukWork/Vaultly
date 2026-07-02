import { describe, expect, it } from 'vitest';
import { formatFileSize, isPdfFile, ensurePdfExtension } from '@/lib/utils';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});

describe('isPdfFile', () => {
  it('detects PDF by mime type', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    expect(isPdfFile(file)).toBe(true);
  });

  it('detects PDF by extension', () => {
    const file = new File([''], 'test.PDF', { type: '' });
    expect(isPdfFile(file)).toBe(true);
  });

  it('rejects non-PDF files', () => {
    const file = new File([''], 'test.doc', { type: 'application/msword' });
    expect(isPdfFile(file)).toBe(false);
  });
});

describe('ensurePdfExtension', () => {
  it('adds .pdf extension if missing', () => {
    expect(ensurePdfExtension('document')).toBe('document.pdf');
  });

  it('keeps existing .pdf extension', () => {
    expect(ensurePdfExtension('document.pdf')).toBe('document.pdf');
  });
});
