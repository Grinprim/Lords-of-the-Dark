// PDF export. The sheet is plain black ink on white paper. The full character travels inside the file as character.json.
import { AFRelationship, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { ATTR_IDS, ATTR_NAMES, StatId } from '../data/types';
import { Character, RULES_VERSION, SCHEMA_VERSION } from '../engine/character';
import { derive, Derived } from '../engine/derive';
import { resolvedHp, resolvedMana, usesLeft } from '../engine/recovery';
import { CONDITION_BY_ID } from '../engine/conditions';
import { ATTACHMENT_NAME, serializeEnvelope } from '../store/schema';
import { IconName, STAT_META } from '../iconNodes';
import { drawIcon } from './icons';
import { PATH_BY_ID } from '../data/paths';
import { TRAIT_BY_ID } from '../data/traits';
import { PROF_BY_ID, SLOT_LABEL, SlotId } from '../data/equipment';
import { SCHOOL_BY_ID, SPELL_BY_ID } from '../data/magic';
import { TIER_LABEL } from '../data/progression';
import { DRAGON_FORM_BY_ID, DRAGON_PROPERTY_BY_ID, MONK_TECHNIQUES, SHAMAN_ASPECTS } from '../data/spiritual';
import { COMPANION_SIZE_BY_ID } from '../data/companions';

export type Paper = 'a4' | 'letter';
export const PAPER_SIZES: Record<Paper, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
export { ATTACHMENT_NAME };

const INK = rgb(0.05, 0.05, 0.05);
const GREY = rgb(0.38, 0.38, 0.38);
const RULE = rgb(0.6, 0.6, 0.6);
const MARGIN = 40;

const SUBS: [RegExp, string][] = [
  [/[\u2018\u2019\u201b]/g, "'"],
  [/[\u201c\u201d\u201f]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/\u2026/g, '...'],
  [/[\u00a0\u2007\u202f]/g, ' '],
  [/\t/g, '    '],
  [/\r\n?/g, '\n'],
];

/** The built-in PDF fonts only draw Latin-1 text. Anything else becomes a question mark. */
export function pdfSafe(text: string): string {
  let t = text;
  for (const [re, to] of SUBS) t = t.replace(re, to);
  let out = '';
  for (const ch of t) {
    const c = ch.codePointAt(0) ?? 63;
    out += ch === '\n' || (c >= 32 && c <= 126) || (c >= 161 && c <= 255 && c !== 173) ? ch : c === 160 ? ' ' : '?';
  }
  return out;
}

interface Fonts {
  serif: PDFFont;
  serifBold: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
}

const roman = (n: number) => ['', 'I', 'II', 'III'][n] ?? String(n);
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

class Sheet {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  readonly w: number;
  readonly h: number;
  readonly cw: number;
  constructor(readonly doc: PDFDocument, readonly size: [number, number], readonly f: Fonts) {
    [this.w, this.h] = size;
    this.cw = this.w - MARGIN * 2;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage(this.size);
    this.pages.push(this.page);
    this.y = this.h - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN + 24) this.newPage();
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const para of pdfSafe(text).split('\n')) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) <= width) {
          line = test;
          continue;
        }
        if (line) lines.push(line);
        // A single very long word is cut so it never leaves the page.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
          let n = rest.length - 1;
          while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > width) n--;
          lines.push(rest.slice(0, n));
          rest = rest.slice(n);
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines;
  }

  /** Draw wrapped text and move down. */
  para(text: string, opts: { font?: PDFFont; size?: number; x?: number; width?: number; gap?: number; color?: ReturnType<typeof rgb> } = {}) {
    const font = opts.font ?? this.f.sans;
    const size = opts.size ?? 9;
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? this.cw - (x - MARGIN);
    const lead = size * 1.32;
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(lead);
      this.y -= lead;
      if (line) this.page.drawText(line, { x, y: this.y, size, font, color: opts.color ?? INK });
    }
    this.y -= opts.gap ?? 2;
  }

  heading(text: string) {
    this.ensure(30);
    this.y -= 14;
    this.page.drawText(pdfSafe(text.toUpperCase()), { x: MARGIN, y: this.y, size: 9, font: this.f.sansBold, color: INK });
    this.y -= 4;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + this.cw, y: this.y }, thickness: 0.75, color: INK });
    this.y -= 2;
  }

  /** A line of bold label and plain text, wrapped under the label. */
  item(label: string, text: string) {
    const lead = 9 * 1.32;
    const labelText = pdfSafe(label) + (label ? ' ' : '');
    const lw = this.f.sansBold.widthOfTextAtSize(labelText, 9);
    const lines = this.wrap(text, this.f.sans, 9, this.cw - lw);
    if (!lines.length) lines.push('');
    this.ensure(lead);
    this.y -= lead;
    this.page.drawText(labelText, { x: MARGIN, y: this.y, size: 9, font: this.f.sansBold, color: INK });
    this.page.drawText(lines[0], { x: MARGIN + lw, y: this.y, size: 9, font: this.f.sans, color: INK });
    for (const line of lines.slice(1)) {
      this.ensure(lead);
      this.y -= lead;
      this.page.drawText(line, { x: MARGIN + lw, y: this.y, size: 9, font: this.f.sans, color: INK });
    }
    this.y -= 2;
  }

  icon(name: IconName, x: number, yTop: number, size: number) {
    drawIcon(this.page, name, x, yTop, size, INK);
  }

  box(x: number, yTop: number, w: number, h: number) {
    this.page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderWidth: 0.75, borderColor: INK });
  }

  /** One stat in a bordered cell: icon, short label, large number and an optional small line. */
  statCell(x: number, yTop: number, w: number, h: number, stat: StatId, value: string, sub?: string) {
    const m = STAT_META[stat];
    this.box(x, yTop, w, h);
    this.icon(m.icon, x + 6, yTop - 6, 14);
    this.page.drawText(pdfSafe(m.label), { x: x + 24, y: yTop - 16, size: 7.5, font: this.f.sansBold, color: INK });
    this.page.drawText(pdfSafe(value), { x: x + 8, y: yTop - 38, size: 17, font: this.f.serifBold, color: INK });
    if (sub) this.page.drawText(pdfSafe(sub), { x: x + 8, y: yTop - h + 7, size: 7, font: this.f.sans, color: GREY });
  }

  rule() {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + this.cw, y: this.y }, thickness: 0.4, color: RULE });
  }
}

function nameList(ids: string[], lookup: (id: string) => string | undefined): string {
  return ids.map((id) => lookup(id) ?? id).join(', ');
}

function drawSheet(s: Sheet, c: Character, d: Derived) {
  const f = s.f;
  // Header
  s.page.drawText('LORDS OF THE DARK', { x: MARGIN, y: s.y - 8, size: 8, font: f.sansBold, color: GREY });
  const stamp = pdfSafe(`Character sheet. Rules ${RULES_VERSION}. Schema ${SCHEMA_VERSION}.`);
  s.page.drawText(stamp, { x: s.w - MARGIN - f.sans.widthOfTextAtSize(stamp, 8), y: s.y - 8, size: 8, font: f.sans, color: GREY });
  s.y -= 34;
  const title = pdfSafe(c.name.trim() || 'Unnamed character');
  let titleSize = 24;
  while (titleSize > 12 && f.serifBold.widthOfTextAtSize(title, titleSize) > s.cw) titleSize -= 1;
  s.page.drawText(title, { x: MARGIN, y: s.y, size: titleSize, font: f.serifBold, color: INK });
  s.y -= 6;
  const sub = [`${d.speciesName} ${d.className}`, `Level ${c.level}`, c.player.trim() ? `Player ${c.player.trim()}` : ''].filter(Boolean).join('. ');
  s.para(sub, { size: 10.5, font: f.serif, gap: 4 });
  if (c.concept.trim()) s.para(c.concept.trim(), { size: 9, color: GREY, gap: 4 });

  // Attributes: two rows of five.
  s.heading('Attributes');
  s.y -= 4;
  const gap = 6;
  const cellW = (s.cw - gap * 4) / 5;
  const cellH = 44;
  ATTR_IDS.forEach((a, i) => {
    const x = MARGIN + (i % 5) * (cellW + gap);
    const yTop = s.y - Math.floor(i / 5) * (cellH + gap);
    s.box(x, yTop, cellW, cellH);
    s.page.drawText(a, { x: x + 6, y: yTop - 13, size: 8.5, font: f.sansBold, color: INK });
    s.page.drawText(pdfSafe(ATTR_NAMES[a]), { x: x + 6, y: yTop - cellH + 6, size: 7, font: f.sans, color: GREY });
    const v = String(d.attrs[a].total);
    s.page.drawText(v, { x: x + cellW - 8 - f.serifBold.widthOfTextAtSize(v, 20), y: yTop - 32, size: 20, font: f.serifBold, color: INK });
  });
  s.y -= cellH * 2 + gap + 4;
  s.para(`AP spent ${d.ap.spent} of ${d.ap.total}. TP spent ${d.tp.spent} of ${d.tp.total}.`, { size: 8, color: GREY });

  // Vitals
  s.heading('Vitals');
  s.y -= 4;
  const vcw = (s.cw - gap * 3) / 4;
  const vch = 58;
  const hpNow = c.state.hp === null ? null : resolvedHp(c.state, d.hp.value);
  const manaNow = c.state.mana === null ? null : resolvedMana(c.state, d.mana.value);
  const moveText = d.load.canMove ? String(Math.max(0, d.mov.value + d.load.movModifier)) : '0';
  const cells: [StatId, string, string][] = [
    ['hp', String(d.hp.value), hpNow === null ? 'Now ______' : `Now ${hpNow}`],
    ['mana', d.hasMana ? String(d.mana.value) : 'None', d.hasMana ? (manaNow === null ? 'Now ______' : `Now ${manaNow}`) : 'No Mana access'],
    ['armor', String(d.armor.value), `Block ${sign(d.defense.block)}`],
    ['mov', moveText, d.load.movModifier ? `Load ${sign(d.load.movModifier)}` : 'No load penalty'],
    ['weight', `${d.weight} / ${d.capacity.value}`, `${Math.round(d.load.percent)}% of capacity`],
    ['grace', `${c.state.grace} / ${d.graceCap}`, `Starts at ${d.graceStart}`],
    ['actions', String(d.actions), 'each Turn'],
    ['reactions', String(d.reactions), 'each Scene'],
  ];
  cells.forEach(([stat, value, subText], i) => {
    const x = MARGIN + (i % 4) * (vcw + gap);
    const yTop = s.y - Math.floor(i / 4) * (vch + gap);
    s.statCell(x, yTop, vcw, vch, stat, value, subText);
  });
  s.y -= vch * 2 + gap + 2;
  s.item('Defense.', `Block ${sign(d.defense.block)}, Dodge ${sign(d.defense.dodge)}${d.load.canDodge ? '' : ' (not allowed while overloaded)'}, Parry ${sign(d.defense.parry)}.`);
  s.item('Accuracy.', `Melee ${sign(d.accuracy.melee)}, ranged ${sign(d.accuracy.ranged)}, unarmed ${sign(d.accuracy.unarmed)}${d.hasMana ? `, spell ${sign(d.accuracy.spell)}` : ''}.`);
  s.item('Thresholds.', `Physical ${d.thresholds.physical}, madness ${d.thresholds.madness}, poison ${d.thresholds.poison}, dazed ${d.thresholds.dazed}, hesitation ${d.thresholds.hesitation}, frightened ${d.thresholds.frightened}.`);
  s.item('Final Blow Resistance.', `${c.state.finalBlow ?? d.finalBlowMax} of ${d.finalBlowMax}.${c.state.concentration ? ` Concentrating on ${c.state.concentration}.` : ''}`);
  if (d.form.id !== 'normal') s.item('Form.', d.form.name + (d.form.suspendsGear ? '. Weapons, armor, shields and catalysts are suspended.' : '.'));

  // Attacks
  s.heading('Attacks');
  if (d.attacks.length === 0) s.para('No attacks listed.', { color: GREY });
  for (const a of d.attacks) s.item(`${a.name}.`, `ATK ${sign(a.atk)}, DMG ${a.dmg}.${a.note ? ' ' + a.note : ''}`);

  // Gear
  s.heading('Gear');
  const slotOrder: SlotId[] = ['hand1', 'hand2', 'armor', 'cloak', 'acc1', 'acc2', 'acc3', 'acc4', 'tail'];
  for (const slot of slotOrder) {
    const eq = d.equipped.find((e) => e.slot === slot);
    if (!eq) continue;
    const v = eq.view;
    const bits: string[] = [];
    if (v.atk !== undefined) bits.push(`ATK ${sign(v.atk)}`);
    if (v.dmg !== undefined) bits.push(`DMG ${v.dmg}`);
    if (v.armor !== undefined) bits.push(`Armor ${v.armor}`);
    if (v.block !== undefined) bits.push(`Block ${sign(v.block)}`);
    bits.push(`W ${v.w}`);
    if (v.suspended) bits.push('suspended');
    if (!v.proficient) bits.push('not proficient');
    s.item(`${SLOT_LABEL[slot]}.`, `${v.name}. ${bits.join(', ')}.`);
  }
  const carried = c.items.filter((it) => !Object.values(c.equipment).includes(it.uid));
  if (carried.length) s.item('Carried.', carried.map((it) => it.name).join(', ') + '.');
  if (!d.equipped.length && !carried.length) s.para('No gear.', { color: GREY });
  for (const ig of d.ignoredItems) s.para(`Ignored: ${ig.reason}`, { size: 8, color: GREY });

  // Features
  s.heading('Features');
  if (d.features.length === 0) s.para('No features yet.', { color: GREY });
  for (const ft of d.features) s.item(`${ft.name}.`, `${ft.text} (${ft.source})`);

  // Paths, traits, proficiencies
  if (d.paths.length) {
    s.heading('Paths');
    for (const p of d.paths) s.item(`${PATH_BY_ID[p.pathId]?.name ?? p.pathId}.`, `Rank ${roman(p.rank)}${p.chosenRank !== p.rank ? ` (chosen ${roman(p.chosenRank)})` : ''}. Earned MP ${p.earnedMp}, spent ${p.spentMp}.`);
  }
  const traitLines = Object.entries(d.traitRanks).filter(([, r]) => r > 0);
  if (traitLines.length) {
    s.heading('Traits');
    s.para(traitLines.map(([id, r]) => `${TRAIT_BY_ID[id]?.name ?? id} ${TRAIT_BY_ID[id] && TRAIT_BY_ID[id].ranks > 1 ? roman(r) : ''}`.trim()).join(', ') + '.');
  }
  if (d.profs.size) {
    s.heading('Proficiencies');
    s.para(nameList([...d.profs], (id) => PROF_BY_ID[id]?.name) + '.');
  }

  // Magic
  if (c.spells.length || c.casterSchool) {
    s.heading('Magic');
    if (c.casterSchool) s.item('School.', (SCHOOL_BY_ID[c.casterSchool]?.name ?? c.casterSchool) + (d.casterBranch ? `. Branch ${d.casterBranch}.` : '.'));
    const byTier = new Map<number, string[]>();
    for (const id of c.spells) {
      const sp = SPELL_BY_ID[id];
      if (!sp) continue;
      byTier.set(sp.tier, [...(byTier.get(sp.tier) ?? []), sp.name]);
    }
    for (const [tier, names] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) s.item(tier === 0 ? 'Cantrips.' : `Tier ${TIER_LABEL[tier]}.`, names.join(', ') + '.');
  }
  if (c.monk.techniques.length) s.item('Monk techniques.', nameList(c.monk.techniques, (id) => MONK_TECHNIQUES.find((t) => t.id === id)?.name) + '.');
  if (c.shaman.aspects.length) s.item('Shaman aspects.', nameList(c.shaman.aspects, (id) => SHAMAN_ASPECTS.find((t) => t.id === id)?.name) + '.');
  if (c.speciesId === 'dragonkin') {
    s.item('Dragon form.', `${DRAGON_FORM_BY_ID[c.dragon.form]?.name ?? c.dragon.form}${c.dragon.affinity ? `. Affinity ${c.dragon.affinity}` : ''}.`);
    if (c.dragon.properties.length) s.item('Dragon properties.', nameList(c.dragon.properties, (id) => DRAGON_PROPERTY_BY_ID[id]?.name) + '.');
  }

  // Companions
  if (c.companions.length) {
    s.heading('Companions and summons');
    for (const k of c.companions) s.item(`${k.name || 'Unnamed'}.`, `${k.kind}, ${COMPANION_SIZE_BY_ID[k.size]?.name ?? k.size}.${k.notes ? ' ' + k.notes : ''}`);
  }

  // Play state
  const active = Object.entries(c.state.conditions).filter(([, st]) => st.active || st.meter > 0);
  if (active.length || c.state.fatigue > 0) {
    s.heading('Conditions');
    if (c.state.fatigue > 0) s.item('Fatigue.', String(c.state.fatigue));
    for (const [id, st] of active) s.item(`${CONDITION_BY_ID[id]?.name ?? id}.`, `${st.active ? 'Active' : 'Building'}. Meter ${st.meter}.${st.timer !== null ? ` Timer ${st.timer}.` : ''}`);
  }
  if (d.uses.length) {
    s.heading('Limited uses');
    s.para(d.uses.map((u) => `${u.name} ${usesLeft(c.state, u)}/${u.count}`).join(', ') + '.');
  }
  if (c.overrides.length) {
    s.heading('Narrator overrides');
    for (const o of c.overrides) s.item(`${o.stat} ${sign(o.value)}.`, o.reason || 'No reason given.');
  }
  if (d.warnings.length) {
    s.heading('Rule warnings');
    for (const w of d.warnings) s.para(w, { size: 8.5 });
  }

  // Notes and writing space
  s.heading('Notes');
  if (c.notes.trim()) s.para(c.notes.trim());
  const lead = 18;
  // Always leave room to write by hand. If the sheet is nearly full, the lines start on a new page.
  if (s.y - lead * 5 < MARGIN + 30) {
    s.newPage();
    s.heading('Notes, continued');
  }
  while (s.y - lead > MARGIN + 30) {
    s.y -= lead;
    s.rule();
  }
}

function drawFooters(s: Sheet, c: Character) {
  const total = s.pages.length;
  s.pages.forEach((p, i) => {
    const left = pdfSafe(`${c.name.trim() || 'Unnamed character'}. Page ${i + 1} of ${total}.`);
    p.drawText(left, { x: MARGIN, y: MARGIN - 4, size: 7.5, font: s.f.sans, color: GREY });
    const note = 'Holds a copy of this character for import. Printing, scanning or rewriting this PDF can remove it.';
    p.drawText(note, { x: s.w - MARGIN - s.f.sans.widthOfTextAtSize(note, 7), y: MARGIN - 4, size: 7, font: s.f.sans, color: GREY });
  });
}

/** Build the PDF. The returned bytes hold the readable sheet and the embedded character.json. */
export async function buildCharacterPdf(c: Character, opts: { paper?: Paper; now?: Date } = {}): Promise<Uint8Array> {
  const now = opts.now ?? new Date();
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const d = derive(c);
  const sheet = new Sheet(doc, PAPER_SIZES[opts.paper ?? 'a4'], fonts);
  drawSheet(sheet, c, d);
  drawFooters(sheet, c);

  doc.setTitle(pdfSafe(`${c.name.trim() || 'Unnamed character'}, Lords of the Dark`));
  doc.setAuthor(pdfSafe(c.player.trim() || 'Lords of the Dark'));
  doc.setSubject('Lords of the Dark character sheet');
  doc.setKeywords(['lotd-character', `schema=${SCHEMA_VERSION}`, `rules=${RULES_VERSION}`]);
  doc.setCreator('Lords of the Dark');
  doc.setProducer('Lords of the Dark');
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const json = new TextEncoder().encode(serializeEnvelope(c));
  await doc.attach(json, ATTACHMENT_NAME, {
    mimeType: 'application/json',
    description: `Lords of the Dark character data, schema ${SCHEMA_VERSION}, rules ${RULES_VERSION}`,
    creationDate: now,
    modificationDate: now,
    afRelationship: AFRelationship.Data,
  });
  return doc.save({ useObjectStreams: false });
}

export function pdfFileName(c: Character): string {
  const base = (c.name.trim() || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'character';
  return `${base}.pdf`;
}
