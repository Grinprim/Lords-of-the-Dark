// Remembers the paper size for PDF export. A4 or Letter. Storage may be blocked, so every call is guarded.
import type { Paper } from '../pdf/export';

const KEY = 'lotd-paper';

export function readPaper(): Paper {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'a4' || v === 'letter') return v;
  } catch {
    /* Storage may be blocked. */
  }
  return typeof navigator !== 'undefined' && /en-US|en-CA/i.test(navigator.language) ? 'letter' : 'a4';
}

export function writePaper(p: Paper): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* Ignore. The choice lasts until reload. */
  }
}
