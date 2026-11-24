// PDF import. Reads the embedded character.json and nothing else. No script in the file is ever run.
import { ATTACHMENT_NAME, MAX_IMPORT_BYTES } from '../store/schema';

export const MAX_PDF_BYTES = 12 * 1024 * 1024;

interface PdfDocLike {
  getAttachments(): Promise<Record<string, { filename?: string; content: Uint8Array }> | null>;
  destroy?(): Promise<void>;
}

export interface PdfJsLike {
  getDocument(src: Record<string, unknown>): { promise: Promise<PdfDocLike>; destroy?(): Promise<void> };
  GlobalWorkerOptions?: { workerSrc: string };
}

export type PdfText = { ok: true; text: string } | { ok: false; errors: string[] };

/** Load the parser on first use so the rest of the site stays small. */
async function loadPdfjs(): Promise<PdfJsLike> {
  const lib = (await import('pdfjs-dist')) as unknown as PdfJsLike;
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as { default: string };
  if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  // The signature may follow a few bytes of junk. The specification allows the first 1024 bytes.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return head.includes('%PDF-');
}

export async function extractCharacterText(bytes: Uint8Array, opts: { pdfjs?: PdfJsLike } = {}): Promise<PdfText> {
  if (bytes.length > MAX_PDF_BYTES) return { ok: false, errors: [`The PDF is larger than ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB. It was not read.`] };
  if (!looksLikePdf(bytes)) return { ok: false, errors: ['The file is not a PDF.'] };
  let task: ReturnType<PdfJsLike['getDocument']> | undefined;
  try {
    const pdfjs = opts.pdfjs ?? (await loadPdfjs());
    // The parser takes ownership of the buffer it is given, so it gets a copy.
    task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      enableXfa: false,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await task.promise;
    const attachments = await doc.getAttachments();
    await doc.destroy?.();
    const found = attachments ? Object.entries(attachments).find(([key, a]) => (a.filename ?? key) === ATTACHMENT_NAME || key === ATTACHMENT_NAME) : undefined;
    if (!found) {
      return {
        ok: false,
        errors: [
          'This PDF has no embedded character data. It may have been printed, scanned or rewritten by another program. Import a JSON or .lotd backup instead.',
        ],
      };
    }
    const content = found[1].content;
    if (content.length > MAX_IMPORT_BYTES) return { ok: false, errors: ['The embedded character data is too large. It was not read.'] };
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    } catch {
      return { ok: false, errors: ['The embedded character data is not valid text.'] };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, errors: ['The PDF could not be read. It may be damaged or protected.'] };
  } finally {
    try {
      await task?.destroy?.();
    } catch {
      /* The parser is already closed. */
    }
  }
}
