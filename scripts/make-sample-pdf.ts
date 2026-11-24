// Writes sample character sheets so the layout can be checked by eye. Usage: tsx scripts/make-sample-pdf.ts <outdir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { newCharacter, newId, Item } from '../src/engine/character';
import { SPELLS } from '../src/data/magic';
import { buildCharacterPdf } from '../src/pdf/export';

const out = process.argv[2] ?? 'sample-out';
mkdirSync(out, { recursive: true });
const item = (p: Partial<Item>): Item => ({ uid: newId('i'), kind: 'custom', name: 'Item', ...p });

const sword = item({ kind: 'weapon', baseId: 'longsword', tierId: 'developed', name: 'Longsword' });
const plate = item({ kind: 'armor', baseId: 'reinforced-medium-armor', name: 'Plate of the Marches' });
const charm = item({ kind: 'accessory', accessoryKind: 'health', accessoryRank: 2, name: 'Health charm' });
const warrior = newCharacter({
  name: 'Brann of the Ash Marches', player: 'Melkor', concept: 'A tired knight who keeps a promise.', level: 8, classId: 'warrior',
  attrs: { VIG: 3, FOR: 3, STR: 2, DEX: 1, INT: 0, ARC: 0, CHA: 0, REF: 1, INS: 1, AWA: 1 },
  items: [sword, plate, charm], equipment: { hand1: sword.uid, armor: plate.uid, acc1: charm.uid },
  traits: { health: [1, 2] }, profs: ['prof-armor-medium'], notes: 'Remember the oath.\nThe ring is cursed.',
});
writeFileSync(join(out, 'warrior-a4.pdf'), await buildCharacterPdf(warrior, { paper: 'a4' }));
writeFileSync(join(out, 'warrior-letter.pdf'), await buildCharacterPdf(warrior, { paper: 'letter' }));

const spells = SPELLS.filter((s) => s.schoolId === 'arcane').slice(0, 6).map((s) => s.id);
const mage = newCharacter({
  name: 'Ilse Varn', level: 6, classId: 'scholar', casterSchool: 'arcane', spells,
  attrs: { VIG: 1, FOR: 1, STR: 0, DEX: 1, INT: 3, ARC: 3, CHA: 1, REF: 1, INS: 1, AWA: 1 },
});
writeFileSync(join(out, 'scholar-a4.pdf'), await buildCharacterPdf(mage, { paper: 'a4' }));
console.log('written to', out);
