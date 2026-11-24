// Safe import. Imported data is untrusted text. Nothing here runs it. Every field is checked and copied.
import { ATTR_IDS, AttrId } from '../data/types';
import { Character, CareerPick, CompanionRec, ConditionState, Item, ItemEffect, ItemKind, Override, SCHEMA_VERSION, RULES_VERSION, newCharacter, zeroAttrs } from '../engine/character';

export const EXPORT_FORMAT = 'lotd-character';
export const ATTACHMENT_NAME = 'character.json';
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_STR = 20000;
const MAX_ARR = 500;
const MAX_KEYS = 500;

export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  rulesVersion: string;
  app: string;
  exportedAt: string;
  character: Character;
}

export type ParseResult = { ok: true; character: Character; warnings: string[]; envelope: { schemaVersion: number; rulesVersion: string; exportedAt: string } } | { ok: false; errors: string[] };

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v);

class Ctx {
  errors: string[] = [];
  warnings: string[] = [];
  err(path: string, msg: string) {
    if (this.errors.length < 30) this.errors.push(`${path}: ${msg}`);
  }
  warn(path: string, msg: string) {
    if (this.warnings.length < 30) this.warnings.push(`${path}: ${msg}`);
  }
}

function str(c: Ctx, path: string, v: Json, def = '', max = MAX_STR): string {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'string') {
    c.err(path, 'expected text');
    return def;
  }
  if (v.length > max) {
    c.err(path, `text is longer than ${max} characters`);
    return def;
  }
  // Remove NUL and other control characters except tab, line feed and carriage return.
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function int(c: Ctx, path: string, v: Json, min: number, max: number, def: number): number {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    c.err(path, 'expected a number');
    return def;
  }
  if (v < min || v > max) {
    c.err(path, `number must be between ${min} and ${max}`);
    return def;
  }
  return Math.trunc(v);
}

function nullableInt(c: Ctx, path: string, v: Json, min: number, max: number): number | null {
  if (v === undefined || v === null) return null;
  return int(c, path, v, min, max, 0);
}

function bool(c: Ctx, path: string, v: Json, def = false): boolean {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'boolean') {
    c.err(path, 'expected true or false');
    return def;
  }
  return v;
}

function strArr(c: Ctx, path: string, v: Json, maxLen = 200): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    c.err(path, 'expected a list');
    return [];
  }
  if (v.length > MAX_ARR) {
    c.err(path, `list is longer than ${MAX_ARR}`);
    return [];
  }
  return v.map((x, i) => str(c, `${path}[${i}]`, x, '', maxLen));
}

function idStr(c: Ctx, path: string, v: Json, def = ''): string {
  const s = str(c, path, v, def, 100);
  if (s && !/^[A-Za-z0-9_.:\-]+$/.test(s)) {
    c.err(path, 'ids may only use letters, digits and . _ : -');
    return def;
  }
  return s;
}

function recOf<T>(c: Ctx, path: string, v: Json, each: (key: string, val: Json) => T): Record<string, T> {
  if (v === undefined || v === null) return {};
  if (!isObj(v)) {
    c.err(path, 'expected an object');
    return {};
  }
  const keys = Object.keys(v);
  if (keys.length > MAX_KEYS) {
    c.err(path, `object has more than ${MAX_KEYS} keys`);
    return {};
  }
  const out: Record<string, T> = Object.create(null);
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      c.err(path, `key ${k} is not allowed`);
      continue;
    }
    if (k.length > 100) {
      c.err(path, 'a key is too long');
      continue;
    }
    out[k] = each(k, v[k]);
  }
  return { ...out };
}

const ITEM_KINDS: ItemKind[] = ['weapon', 'armor', 'shield', 'cloak', 'accessory', 'catalyst', 'custom'];

function parseItem(c: Ctx, path: string, v: Json): Item | null {
  if (!isObj(v)) {
    c.err(path, 'expected an item');
    return null;
  }
  const kind = str(c, `${path}.kind`, v.kind, 'custom', 20) as ItemKind;
  if (!ITEM_KINDS.includes(kind)) {
    c.err(`${path}.kind`, 'unknown item kind');
    return null;
  }
  const out: Item = { uid: idStr(c, `${path}.uid`, v.uid), kind, name: str(c, `${path}.name`, v.name, 'Item', 200) };
  if (!out.uid) {
    c.err(`${path}.uid`, 'an item needs an id');
    return null;
  }
  const opt = (k: keyof Item, val: unknown) => {
    if (val !== undefined) (out as unknown as Record<string, unknown>)[k] = val;
  };
  if (v.baseId !== undefined) opt('baseId', idStr(c, `${path}.baseId`, v.baseId));
  if (v.tierId !== undefined) opt('tierId', idStr(c, `${path}.tierId`, v.tierId));
  if (v.variant !== undefined) opt('variant', idStr(c, `${path}.variant`, v.variant));
  if (v.infusion !== undefined) opt('infusion', idStr(c, `${path}.infusion`, v.infusion));
  if (v.shieldMod !== undefined) opt('shieldMod', idStr(c, `${path}.shieldMod`, v.shieldMod));
  if (v.accessoryKind !== undefined) opt('accessoryKind', idStr(c, `${path}.accessoryKind`, v.accessoryKind));
  if (v.accessoryRank !== undefined) opt('accessoryRank', int(c, `${path}.accessoryRank`, v.accessoryRank, 1, 3, 1));
  if (v.rarity !== undefined) opt('rarity', idStr(c, `${path}.rarity`, v.rarity));
  for (const k of ['atk', 'dmg', 'armor', 'block', 'w'] as const) if (v[k] !== undefined) opt(k, int(c, `${path}.${k}`, v[k], -100, 1000, 0));
  if (v.hands !== undefined) opt('hands', int(c, `${path}.hands`, v.hands, 1, 2, 1) === 2 ? 2 : 1);
  if (v.exceptional !== undefined) opt('exceptional', bool(c, `${path}.exceptional`, v.exceptional));
  if (v.notes !== undefined) opt('notes', str(c, `${path}.notes`, v.notes));
  if (v.property !== undefined && isObj(v.property)) {
    opt('property', { id: idStr(c, `${path}.property.id`, v.property.id), rank: int(c, `${path}.property.rank`, v.property.rank, 1, 3, 1) });
  }
  if (v.effects !== undefined) {
    if (!Array.isArray(v.effects) || v.effects.length > 50) c.err(`${path}.effects`, 'expected a short list');
    else {
      opt(
        'effects',
        v.effects.map((e, i): ItemEffect => {
          const p = `${path}.effects[${i}]`;
          if (!isObj(e)) {
            c.err(p, 'expected an effect');
            return { stat: 'none', v: 0 };
          }
          const eff: ItemEffect = { stat: str(c, `${p}.stat`, e.stat, '', 100), v: int(c, `${p}.v`, e.v, -1000, 1000, 0) };
          if (e.label !== undefined) eff.label = str(c, `${p}.label`, e.label, '', 200);
          return eff;
        }),
      );
    }
  }
  return out;
}

function parseCondition(c: Ctx, path: string, v: Json): ConditionState {
  if (!isObj(v)) {
    c.err(path, 'expected a condition');
    return { meter: 0, active: false, timer: null, stacks: 0 };
  }
  return {
    meter: int(c, `${path}.meter`, v.meter, 0, 1000, 0),
    active: bool(c, `${path}.active`, v.active),
    timer: nullableInt(c, `${path}.timer`, v.timer, 0, 1000),
    stacks: int(c, `${path}.stacks`, v.stacks, 0, 100, 0),
  };
}

function parseCareer(c: Ctx, path: string, v: Json): CareerPick | null {
  if (!isObj(v)) {
    c.err(path, 'expected a Career');
    return null;
  }
  const role = str(c, `${path}.role`, v.role, 'primary', 20);
  if (role !== 'primary' && role !== 'secondary') {
    c.err(`${path}.role`, 'role must be primary or secondary');
    return null;
  }
  const out: CareerPick = {
    careerId: idStr(c, `${path}.careerId`, v.careerId),
    role,
    r1: strArr(c, `${path}.r1`, v.r1, 100),
    r2: strArr(c, `${path}.r2`, v.r2, 100),
    r3: strArr(c, `${path}.r3`, v.r3, 100),
  };
  if (v.pathId !== undefined && v.pathId !== null) out.pathId = idStr(c, `${path}.pathId`, v.pathId);
  if (v.altPathId !== undefined && v.altPathId !== null) out.altPathId = idStr(c, `${path}.altPathId`, v.altPathId);
  return out;
}

function parseCompanion(c: Ctx, path: string, v: Json): CompanionRec | null {
  if (!isObj(v)) {
    c.err(path, 'expected a companion');
    return null;
  }
  const kind = str(c, `${path}.kind`, v.kind, 'companion', 20);
  if (kind !== 'companion' && kind !== 'summon') {
    c.err(`${path}.kind`, 'kind must be companion or summon');
    return null;
  }
  return {
    id: idStr(c, `${path}.id`, v.id),
    name: str(c, `${path}.name`, v.name, '', 200),
    kind,
    size: idStr(c, `${path}.size`, v.size, 'minor'),
    abilities: strArr(c, `${path}.abilities`, v.abilities, 100),
    notes: str(c, `${path}.notes`, v.notes),
  };
}

function parseOverride(c: Ctx, path: string, v: Json): Override | null {
  if (!isObj(v)) {
    c.err(path, 'expected an override');
    return null;
  }
  return {
    id: idStr(c, `${path}.id`, v.id),
    stat: str(c, `${path}.stat`, v.stat, '', 50),
    value: int(c, `${path}.value`, v.value, -100000, 100000, 0),
    reason: str(c, `${path}.reason`, v.reason, '', 2000),
  };
}

/** Rebuild a Character from untrusted data. Unknown fields are dropped. */
export function sanitizeCharacter(raw: Json): { character: Character; errors: string[]; warnings: string[] } {
  const c = new Ctx();
  const base = newCharacter();
  if (!isObj(raw)) {
    c.err('character', 'expected an object');
    return { character: base, errors: c.errors, warnings: c.warnings };
  }
  const level = int(c, 'level', raw.level, 1, 99, 1);
  const attrsRaw = isObj(raw.attrs) ? raw.attrs : {};
  const attrs = zeroAttrs();
  for (const a of ATTR_IDS) attrs[a] = int(c, `attrs.${a}`, attrsRaw[a], 0, 100, 0);
  const state = isObj(raw.state) ? raw.state : {};
  const monk = isObj(raw.monk) ? raw.monk : {};
  const shaman = isObj(raw.shaman) ? raw.shaman : {};
  const dragon = isObj(raw.dragon) ? raw.dragon : {};
  const equipmentRaw = isObj(raw.equipment) ? raw.equipment : {};
  const equipment: Character['equipment'] = {};
  for (const slot of ['hand1', 'hand2', 'armor', 'cloak', 'acc1', 'acc2', 'acc3', 'acc4', 'tail'] as const) {
    if (equipmentRaw[slot] !== undefined && equipmentRaw[slot] !== null) equipment[slot] = idStr(c, `equipment.${slot}`, equipmentRaw[slot]);
  }
  const items: Item[] = [];
  if (raw.items !== undefined) {
    if (!Array.isArray(raw.items) || raw.items.length > MAX_ARR) c.err('items', 'expected a list of at most 500 items');
    else raw.items.forEach((it, i) => {
      const parsed = parseItem(c, `items[${i}]`, it);
      if (parsed) items.push(parsed);
    });
  }
  const careers: CareerPick[] = [];
  if (Array.isArray(raw.careers)) raw.careers.slice(0, 10).forEach((k, i) => {
    const p = parseCareer(c, `careers[${i}]`, k);
    if (p) careers.push(p);
  });
  const companions: CompanionRec[] = [];
  if (Array.isArray(raw.companions)) raw.companions.slice(0, MAX_ARR).forEach((k, i) => {
    const p = parseCompanion(c, `companions[${i}]`, k);
    if (p) companions.push(p);
  });
  const overrides: Override[] = [];
  if (Array.isArray(raw.overrides)) raw.overrides.slice(0, 100).forEach((k, i) => {
    const p = parseOverride(c, `overrides[${i}]`, k);
    if (p) overrides.push(p);
  });
  const humanAttrs = strArr(c, 'humanAttrs', raw.humanAttrs, 10).filter((a): a is AttrId => (ATTR_IDS as string[]).includes(a));

  const character: Character = {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: str(c, 'rulesVersion', raw.rulesVersion, RULES_VERSION, 40),
    id: idStr(c, 'id', raw.id) || base.id,
    createdAt: str(c, 'createdAt', raw.createdAt, base.createdAt, 60),
    updatedAt: str(c, 'updatedAt', raw.updatedAt, base.updatedAt, 60),
    name: str(c, 'name', raw.name, '', 200),
    player: str(c, 'player', raw.player, '', 200),
    concept: str(c, 'concept', raw.concept, '', 2000),
    notes: str(c, 'notes', raw.notes),
    level,
    speciesId: idStr(c, 'speciesId', raw.speciesId, 'human'),
    humanAttrs,
    humanFeature: raw.humanFeature === undefined || raw.humanFeature === null ? null : idStr(c, 'humanFeature', raw.humanFeature),
    classId: idStr(c, 'classId', raw.classId, 'warrior'),
    attrs,
    careers,
    independentPaths: strArr(c, 'independentPaths', raw.independentPaths, 100),
    pathRanks: recOf(c, 'pathRanks', raw.pathRanks, (k, v) => int(c, `pathRanks.${k}`, v, 1, 3, 1)),
    pathMp: recOf(c, 'pathMp', raw.pathMp, (k, v) => int(c, `pathMp.${k}`, v, 0, 1000, 0)),
    traits: recOf(c, 'traits', raw.traits, (k, v) => {
      if (!Array.isArray(v) || v.length > 50) {
        c.err(`traits.${k}`, 'expected a short list of ranks');
        return [];
      }
      return v.map((n, i) => int(c, `traits.${k}[${i}]`, n, 1, 50, 1));
    }),
    traitOptions: recOf(c, 'traitOptions', raw.traitOptions, (k, v) => strArr(c, `traitOptions.${k}`, v, 300)),
    profs: strArr(c, 'profs', raw.profs, 100),
    freeProf: raw.freeProf === undefined || raw.freeProf === null ? null : idStr(c, 'freeProf', raw.freeProf),
    casterSchool: raw.casterSchool === undefined || raw.casterSchool === null ? null : idStr(c, 'casterSchool', raw.casterSchool),
    exceptionalSchools: strArr(c, 'exceptionalSchools', raw.exceptionalSchools, 100),
    spells: strArr(c, 'spells', raw.spells, 100),
    extraSpellSlots: recOf(c, 'extraSpellSlots', raw.extraSpellSlots, (k, v) => int(c, `extraSpellSlots.${k}`, v, 0, 100, 0)),
    monk: { techniques: strArr(c, 'monk.techniques', monk.techniques, 100), manifested: bool(c, 'monk.manifested', monk.manifested), enhanced: strArr(c, 'monk.enhanced', monk.enhanced, 100) },
    shaman: {
      aspects: strArr(c, 'shaman.aspects', shaman.aspects, 100),
      active: shaman.active === undefined || shaman.active === null ? null : idStr(c, 'shaman.active', shaman.active),
      activeRank: int(c, 'shaman.activeRank', shaman.activeRank, 0, 3, 0),
    },
    dragon: {
      form: idStr(c, 'dragon.form', dragon.form, 'normal'),
      properties: strArr(c, 'dragon.properties', dragon.properties, 100),
      affinity: dragon.affinity === undefined || dragon.affinity === null ? null : str(c, 'dragon.affinity', dragon.affinity, '', 50),
      extraAffinities: strArr(c, 'dragon.extraAffinities', dragon.extraAffinities, 50),
    },
    companions,
    items,
    equipment,
    state: {
      hp: nullableInt(c, 'state.hp', state.hp, 0, 1000000),
      mana: nullableInt(c, 'state.mana', state.mana, 0, 1000000),
      grace: int(c, 'state.grace', state.grace, 0, 100, 0),
      fatigue: int(c, 'state.fatigue', state.fatigue, 0, 100, 0),
      finalBlow: nullableInt(c, 'state.finalBlow', state.finalBlow, 0, 100),
      conditions: recOf(c, 'state.conditions', state.conditions, (k, v) => parseCondition(c, `state.conditions.${k}`, v)),
      spent: recOf(c, 'state.spent', state.spent, (k, v) => int(c, `state.spent.${k}`, v, 0, 1000, 0)),
      concentration: state.concentration === undefined || state.concentration === null ? null : str(c, 'state.concentration', state.concentration, '', 300),
      restLocked: bool(c, 'state.restLocked', state.restLocked),
    },
    overrides,
    unlocks: strArr(c, 'unlocks', raw.unlocks, 300),
  };
  return { character, errors: c.errors, warnings: c.warnings };
}

export function makeEnvelope(character: Character): ExportEnvelope {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    app: 'Lords of the Dark',
    exportedAt: new Date().toISOString(),
    character,
  };
}

export function serializeEnvelope(character: Character): string {
  return JSON.stringify(makeEnvelope(character));
}

/** Parse the text of a character.json or .lotd file. */
export function parseImportText(text: string): ParseResult {
  if (typeof text !== 'string') return { ok: false, errors: ['The file is not text.'] };
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: [`The file is larger than ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB. It was not read.`] };
  let raw: Json;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  if (!isObj(raw)) return { ok: false, errors: ['The file does not hold a character.'] };
  if (raw.format !== EXPORT_FORMAT) return { ok: false, errors: [`This is not a Lords of the Dark character file. Its format is ${typeof raw.format === 'string' ? raw.format.slice(0, 40) : 'missing'}.`] };
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : NaN;
  if (!Number.isInteger(version) || version < 1) return { ok: false, errors: ['The file has no valid schema version.'] };
  if (version > SCHEMA_VERSION) return { ok: false, errors: [`This file was made by a newer version of the site (schema ${version}). This copy reads up to schema ${SCHEMA_VERSION}.`] };
  const { character, errors, warnings } = sanitizeCharacter(raw.character);
  if (errors.length) return { ok: false, errors };
  const w = [...warnings];
  if (version < SCHEMA_VERSION) w.push(`Migrated from schema ${version} to ${SCHEMA_VERSION}.`);
  return {
    ok: true,
    character,
    warnings: w,
    envelope: { schemaVersion: version, rulesVersion: str(new Ctx(), 'rulesVersion', raw.rulesVersion, '', 40), exportedAt: str(new Ctx(), 'exportedAt', raw.exportedAt, '', 60) },
  };
}

export const LIBRARY_FORMAT = 'lotd-library';

export function serializeLibrary(characters: Character[]): string {
  return JSON.stringify({
    format: LIBRARY_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    app: 'Lords of the Dark',
    exportedAt: new Date().toISOString(),
    characters,
  });
}

export type LibraryParse = { ok: true; items: { character: Character; warnings: string[] }[]; skipped: string[] } | { ok: false; errors: string[] };

/** Parse a whole-library backup. A character that fails its checks is skipped and named. */
export function parseLibraryText(text: string): LibraryParse {
  if (text.length > MAX_IMPORT_BYTES * 8) return { ok: false, errors: ['The backup is too large. It was not read.'] };
  let raw: Json;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  if (!isObj(raw) || raw.format !== LIBRARY_FORMAT) return { ok: false, errors: ['This is not a Lords of the Dark library backup.'] };
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : NaN;
  if (!Number.isInteger(version) || version < 1) return { ok: false, errors: ['The backup has no valid schema version.'] };
  if (version > SCHEMA_VERSION) return { ok: false, errors: [`This backup was made by a newer version of the site (schema ${version}).`] };
  if (!Array.isArray(raw.characters) || raw.characters.length > 200) return { ok: false, errors: ['The backup does not hold a usable list of characters.'] };
  const items: { character: Character; warnings: string[] }[] = [];
  const skipped: string[] = [];
  raw.characters.forEach((entry, i) => {
    const { character, errors, warnings } = sanitizeCharacter(entry);
    if (errors.length) skipped.push(`Character ${i + 1}: ${errors[0]}`);
    else items.push({ character, warnings });
  });
  if (!items.length) return { ok: false, errors: skipped.length ? skipped : ['The backup holds no characters.'] };
  return { ok: true, items, skipped };
}
