// One entry point for every import: PDF, JSON, .lotd and library backups. It only reads and checks. It never saves.
import { Character } from '../engine/character';
import { EXPORT_FORMAT, LIBRARY_FORMAT, MAX_IMPORT_BYTES, parseImportText, parseLibraryText } from './schema';
import { MAX_PDF_BYTES, PdfJsLike, extractCharacterText, looksLikePdf } from '../pdf/import';

export interface ImportItem {
  character: Character;
  warnings: string[];
  /** Where it came from: pdf, json or library. */
  via: 'pdf' | 'json' | 'library';
}

export type ImportOutcome = { ok: true; items: ImportItem[]; skipped: string[] } | { ok: false; errors: string[] };

export interface FileLike {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function fromText(text: string): ImportOutcome {
  const head = text.slice(0, 400);
  if (head.includes(`"${LIBRARY_FORMAT}"`) || text.includes(`"format":"${LIBRARY_FORMAT}"`)) {
    const lib = parseLibraryText(text);
    if (!lib.ok) return lib;
    return { ok: true, items: lib.items.map((i) => ({ ...i, via: 'library' as const })), skipped: lib.skipped };
  }
  const one = parseImportText(text);
  if (!one.ok) return one;
  return { ok: true, items: [{ character: one.character, warnings: one.warnings, via: 'json' }], skipped: [] };
}

/** Read a file the person picked. The size is checked before the file is read. */
export async function readImportFile(file: FileLike, opts: { pdfjs?: PdfJsLike } = {}): Promise<ImportOutcome> {
  if (file.size > MAX_PDF_BYTES) return { ok: false, errors: [`The file is larger than ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB. It was not read.`] };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, errors: ['The file could not be read.'] };
  }
  if (looksLikePdf(bytes)) {
    const got = await extractCharacterText(bytes, opts);
    if (!got.ok) return got;
    const one = parseImportText(got.text);
    if (!one.ok) return one;
    return { ok: true, items: [{ character: one.character, warnings: one.warnings, via: 'pdf' }], skipped: [] };
  }
  if (bytes.length > MAX_IMPORT_BYTES * 8) return { ok: false, errors: ['The file is too large. It was not read.'] };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, errors: ['The file is not text and not a PDF.'] };
  }
  return fromText(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}

export { EXPORT_FORMAT };
