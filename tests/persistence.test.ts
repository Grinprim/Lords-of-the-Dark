import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { Character, Item, newCharacter, newId } from '../src/engine/character';
import { derive } from '../src/engine/derive';
import { EXPORT_FORMAT, MAX_IMPORT_BYTES, parseImportText, parseLibraryText, serializeEnvelope, serializeLibrary } from '../src/store/schema';
import { buildCharacterPdf, pdfSafe, PAPER_SIZES } from '../src/pdf/export';
import { drawIcon, normalizeSvgPath } from '../src/pdf/icons';
import { ICON_NODES, IconName } from '../src/iconNodes';
import { rgb } from 'pdf-lib';
import { readImportFile, FileLike } from '../src/store/importer';
import type { PdfJsLike } from '../src/pdf/import';
import { openBackend } from '../src/store/db';
import {
  createCharacter, deleteCharacter, flushSaves, getState, importCharacter, initStore, listSnapshots, restoreSnapshot, setActive, updateCharacter,
} from '../src/store/store';

const item = (partial: Partial<Item>): Item => ({ uid: newId('i'), kind: 'custom', name: 'Item', ...partial });

/** A character that uses most of the model: custom gear, notes with odd text, overrides, state. */
function richCharacter(): Character {
  const sword = item({ kind: 'weapon', baseId: 'longsword', tierId: 'developed', name: 'Longsword' });
  const plate = item({ kind: 'armor', baseId: 'reinforced-medium-armor', name: 'Plate of the Marches' });
  const charm = item({ kind: 'accessory', accessoryKind: 'health', accessoryRank: 2, name: 'Health charm' });
  const custom = item({
    kind: 'custom',
    name: 'Ash-grey ring "Hollow" <script>alert(1)</script>',
    w: 1,
    effects: [{ stat: 'hp', v: 4, label: 'Ring' }],
    notes: 'Line one.\nLine two with Latin-1: café, naïve. And other text: 漢字.',
  });
  return newCharacter({
    name: 'Brann of the Ash Marches',
    player: 'Melkor',
    concept: 'A tired knight who keeps a promise.',
    notes: 'Remember the oath.\n\nNarrator note: the ring is cursed. Quotes "like this" and “curly” ones.',
    level: 8,
    classId: 'warrior',
    speciesId: 'human',
    attrs: { VIG: 3, FOR: 3, STR: 2, DEX: 1, INT: 0, ARC: 0, CHA: 0, REF: 1, INS: 1, AWA: 1 },
    items: [sword, plate, charm, custom],
    equipment: { hand1: sword.uid, armor: plate.uid, acc1: charm.uid, acc2: custom.uid },
    traits: { health: [1, 2] },
    profs: ['prof-armor-medium'],
    overrides: [{ id: newId('o'), stat: 'hp', value: 5, reason: 'Narrator granted a blessing after the vigil.' }],
    companions: [{ id: newId('k'), name: 'Ash', kind: 'companion', size: 'minor', abilities: [], notes: 'A grey hound.' }],
    state: {
      hp: 30,
      mana: null,
      grace: 3,
      fatigue: 1,
      finalBlow: null,
      conditions: { bleed: { meter: 2, active: true, timer: null, stacks: 2 } },
      spent: { 'some-use': 1 },
      concentration: null,
      restLocked: true,
    },
  });
}

function fileOf(bytes: Uint8Array, name: string): FileLike {
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
}

let pdfjs: PdfJsLike;
beforeAll(async () => {
  pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsLike;
});

describe('character file format', () => {
  it('round trips exactly through JSON', () => {
    const c = richCharacter();
    const back = parseImportText(serializeEnvelope(c));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.character).toEqual(c);
  });

  it('keeps custom gear and notes byte for byte, including text that looks like markup', () => {
    const c = richCharacter();
    const back = parseImportText(serializeEnvelope(c));
    if (!back.ok) throw new Error(back.errors.join('; '));
    expect(back.character.items[3].name).toBe(c.items[3].name);
    expect(back.character.items[3].notes).toBe(c.items[3].notes);
    expect(back.character.notes).toBe(c.notes);
  });

  it('recomputes totals instead of trusting the file', () => {
    const c = richCharacter();
    const env = JSON.parse(serializeEnvelope(c));
    env.character.derived = { hp: 99999 };
    env.character.maxHp = 99999;
    const back = parseImportText(JSON.stringify(env));
    if (!back.ok) throw new Error(back.errors.join('; '));
    expect(back.character).toEqual(c);
    expect('derived' in back.character).toBe(false);
    expect(derive(back.character).hp.value).toBe(derive(c).hp.value);
  });

  it('rejects text that is not JSON', () => {
    const r = parseImportText('not json {');
    expect(r.ok).toBe(false);
  });

  it('rejects a file of another format', () => {
    const r = parseImportText(JSON.stringify({ format: 'something-else', schemaVersion: 1, character: {} }));
    expect(r.ok).toBe(false);
  });

  it('rejects a newer schema with a clear message', () => {
    const env = JSON.parse(serializeEnvelope(richCharacter()));
    env.schemaVersion = 99;
    const r = parseImportText(JSON.stringify(env));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/newer version/);
  });

  it('rejects oversized files without parsing them', () => {
    const r = parseImportText('x'.repeat(MAX_IMPORT_BYTES + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/larger than/);
  });

  it('rejects values outside their range and unknown item kinds', () => {
    const env = JSON.parse(serializeEnvelope(richCharacter()));
    env.character.level = 5000;
    expect(parseImportText(JSON.stringify(env)).ok).toBe(false);
    const env2 = JSON.parse(serializeEnvelope(richCharacter()));
    env2.character.items[0].kind = 'grenade';
    expect(parseImportText(JSON.stringify(env2)).ok).toBe(false);
    const env3 = JSON.parse(serializeEnvelope(richCharacter()));
    env3.character.name = 'x'.repeat(5000);
    expect(parseImportText(JSON.stringify(env3)).ok).toBe(false);
  });

  it('refuses prototype keys and does not pollute Object', () => {
    const text = serializeEnvelope(richCharacter()).replace('"pathRanks":{}', '"pathRanks":{"__proto__":3,"polluted":2}');
    const r = parseImportText(text);
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strips control characters from text fields', () => {
    const env = JSON.parse(serializeEnvelope(richCharacter()));
    env.character.name = 'Brann\u0000\u0007 the Grey';
    const r = parseImportText(JSON.stringify(env));
    if (!r.ok) throw new Error(r.errors.join('; '));
    expect(r.character.name).toBe('Brann the Grey');
  });

  it('exports and imports a whole library and skips a bad entry by name', () => {
    const a = richCharacter();
    const b = newCharacter({ name: 'Second' });
    const text = serializeLibrary([a, b]);
    const ok = parseLibraryText(text);
    expect(ok.ok && ok.items.length).toBe(2);
    const raw = JSON.parse(text);
    raw.characters[1].level = -4;
    const partial = parseLibraryText(JSON.stringify(raw));
    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(partial.items).toHaveLength(1);
      expect(partial.skipped[0]).toMatch(/Character 2/);
    }
  });
});

describe('PDF export and import', () => {
  it('makes a PDF with the character attached and the page size asked for', async () => {
    for (const paper of ['a4', 'letter'] as const) {
      const bytes = await buildCharacterPdf(richCharacter(), { paper });
      const doc = await PDFDocument.load(bytes);
      const [w, h] = PAPER_SIZES[paper];
      const page = doc.getPage(0);
      expect(Math.round(page.getWidth())).toBe(Math.round(w));
      expect(Math.round(page.getHeight())).toBe(Math.round(h));
      expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('%PDF-');
    }
  });

  it('round trips the exact character through a PDF, including custom gear and notes', async () => {
    const c = richCharacter();
    const bytes = await buildCharacterPdf(c, { paper: 'a4' });
    const out = await readImportFile(fileOf(bytes, 'brann.pdf'), { pdfjs });
    if (!out.ok) throw new Error(out.errors.join('; '));
    expect(out.items).toHaveLength(1);
    expect(out.items[0].via).toBe('pdf');
    expect(out.items[0].character).toEqual(c);
  });

  it('round trips on Letter paper too', async () => {
    const c = richCharacter();
    const out = await readImportFile(fileOf(await buildCharacterPdf(c, { paper: 'letter' }), 'x.pdf'), { pdfjs });
    if (!out.ok) throw new Error(out.errors.join('; '));
    expect(out.items[0].character).toEqual(c);
  });

  it('survives a long character that needs several pages', async () => {
    const c = richCharacter();
    c.notes = Array.from({ length: 220 }, (_, i) => `Line ${i + 1}: a long note about the road and the oath that was sworn.`).join('\n');
    const bytes = await buildCharacterPdf(c);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(2);
    const out = await readImportFile(fileOf(bytes, 'long.pdf'), { pdfjs });
    if (!out.ok) throw new Error(out.errors.join('; '));
    expect(out.items[0].character.notes).toBe(c.notes);
  });

  it('does not throw on characters with unusual text', async () => {
    const c = newCharacter({ name: '漢字 \u{1F409} Name', player: 'a\u0000b', notes: '— … “q”' });
    const bytes = await buildCharacterPdf(c);
    const out = await readImportFile(fileOf(bytes, 'u.pdf'), { pdfjs });
    if (!out.ok) throw new Error(out.errors.join('; '));
    expect(out.items[0].character.name).toBe('漢字 \u{1F409} Name');
  });

  it('says plainly when a PDF has lost its embedded data', async () => {
    const src = await PDFDocument.load(await buildCharacterPdf(richCharacter()));
    const printed = await PDFDocument.create();
    const [page] = await printed.copyPages(src, [0]);
    printed.addPage(page);
    const bytes = await printed.save();
    const out = await readImportFile(fileOf(bytes, 'printed.pdf'), { pdfjs });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors[0]).toMatch(/no embedded character data/);
  });

  it('rejects a PDF whose attachment was tampered into garbage', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    await doc.attach(new TextEncoder().encode('{"format":"lotd-character","schemaVersion":1,"character":'), 'character.json', { mimeType: 'application/json' });
    const out = await readImportFile(fileOf(await doc.save(), 'bad.pdf'), { pdfjs });
    expect(out.ok).toBe(false);
  });

  it('rejects a damaged PDF and a plain text file that is not a character', async () => {
    const junk = new TextEncoder().encode('%PDF-1.7\nthis is not really a pdf');
    expect((await readImportFile(fileOf(junk, 'junk.pdf'), { pdfjs })).ok).toBe(false);
    expect((await readImportFile(fileOf(new TextEncoder().encode('hello'), 'a.txt'), { pdfjs })).ok).toBe(false);
  });

  it('rejects files over the size limit before reading them', async () => {
    const big: FileLike = { name: 'big.pdf', size: 50 * 1024 * 1024, arrayBuffer: async () => { throw new Error('should not read'); } };
    const out = await readImportFile(big, { pdfjs });
    expect(out.ok).toBe(false);
  });

  it('imports a plain JSON backup and a .lotd file the same way', async () => {
    const c = richCharacter();
    const json = new TextEncoder().encode(serializeEnvelope(c));
    for (const name of ['c.json', 'c.lotd']) {
      const out = await readImportFile(fileOf(json, name), { pdfjs });
      if (!out.ok) throw new Error(out.errors.join('; '));
      expect(out.items[0].character).toEqual(c);
    }
  });

  it('maps unsupported characters to question marks and keeps Latin-1', () => {
    expect(pdfSafe('café — “q” 漢')).toBe('café - "q" ?');
  });
});

describe('PDF icons', () => {
  it('reads packed arc flags and relative shorthand', () => {
    expect(normalizeSvgPath('M2 12h20')).toBe('M2 12 L22 12');
    expect(normalizeSvgPath('M0 0a2 2 0 013 5')).toBe('M0 0 A2 2 0 0 1 3 5');
    expect(normalizeSvgPath('m1 1 2 2v3z')).toBe('M1 1 L3 3 L3 6 Z');
  });

  it('draws every icon without throwing', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    for (const name of Object.keys(ICON_NODES) as IconName[]) drawIcon(page, name, 20, 700, 24, rgb(0, 0, 0));
    expect((await doc.save()).length).toBeGreaterThan(500);
  });
});

describe('storage', () => {
  let dbName = 0;
  async function freshStore() {
    dbName += 1;
    const backend = await openBackend(`lotd-test-${dbName}`);
    await initStore(backend);
    return backend;
  }

  it('saves automatically and finds the character again after a reload', async () => {
    const backend = await freshStore();
    const c = await createCharacter({ name: 'Persisted', level: 5 });
    updateCharacter(c.id, (x) => {
      x.notes = 'edited';
      x.state.hp = 12;
    });
    await flushSaves();
    expect(getState().status).toBe('saved');
    await initStore(backend);
    const again = getState().characters.find((x) => x.id === c.id);
    expect(again?.notes).toBe('edited');
    expect(again?.state.hp).toBe(12);
    expect(getState().activeId).toBe(c.id);
  });

  it('keeps several characters and switches between them', async () => {
    await freshStore();
    const a = await createCharacter({ name: 'A' });
    const b = await createCharacter({ name: 'B' });
    expect(getState().characters).toHaveLength(2);
    expect(getState().activeId).toBe(b.id);
    setActive(a.id);
    expect(getState().activeId).toBe(a.id);
  });

  it('does not reset play state when gear changes', async () => {
    await freshStore();
    const c = await createCharacter({ name: 'Gear' });
    updateCharacter(c.id, (x) => {
      x.state.hp = 7;
      x.state.grace = 4;
    });
    const sword = item({ kind: 'weapon', baseId: 'longsword', name: 'Sword' });
    updateCharacter(c.id, (x) => {
      x.items.push(sword);
      x.equipment.hand1 = sword.uid;
    });
    await flushSaves();
    const now = getState().characters.find((x) => x.id === c.id)!;
    expect(now.state.hp).toBe(7);
    expect(now.state.grace).toBe(4);
  });

  it('keeps a snapshot when a character is deleted and can restore it', async () => {
    await freshStore();
    const c = await createCharacter({ name: 'Doomed', notes: 'keep me' });
    await flushSaves();
    await deleteCharacter(c.id);
    expect(getState().characters.find((x) => x.id === c.id)).toBeUndefined();
    const snaps = await listSnapshots(c.id);
    expect(snaps.length).toBeGreaterThan(0);
    await restoreSnapshot(snaps[0]);
    expect(getState().characters.find((x) => x.id === c.id)?.notes).toBe('keep me');
  });

  it('imports as a duplicate or as a replacement and snapshots what it replaces', async () => {
    await freshStore();
    const c = await createCharacter({ name: 'Original', notes: 'v1' });
    await flushSaves();
    const incoming = { ...JSON.parse(JSON.stringify(c)), notes: 'v2', name: 'Original' } as Character;
    const copy = await importCharacter(incoming, 'duplicate');
    expect(copy.id).not.toBe(c.id);
    expect(getState().characters).toHaveLength(2);
    await importCharacter(incoming, 'replace');
    expect(getState().characters.find((x) => x.id === c.id)?.notes).toBe('v2');
    expect((await listSnapshots(c.id)).some((s) => s.reason === 'Before import replace')).toBe(true);
  });

  it('exports what is stored after pending changes are flushed', async () => {
    await freshStore();
    const c = await createCharacter({ name: 'Flush' });
    updateCharacter(c.id, (x) => {
      x.notes = 'unsaved yet';
    });
    await flushSaves();
    const text = serializeEnvelope(getState().characters.find((x) => x.id === c.id)!);
    expect(JSON.parse(text).format).toBe(EXPORT_FORMAT);
    expect(JSON.parse(text).character.notes).toBe('unsaved yet');
  });
});
