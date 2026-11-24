// Level-up helpers. Pure functions. They report what the approved tables give at each level
// and never invent a rule that the specification does not state.
import {
  CLASS_ABILITY_LEVELS, DRAGON_FORM_LEVELS, MAX_LEVEL, MONK_TIER_LEVELS, ORDINARY_CAP_LEVEL, PATH_SLOT_LEVELS, PRIMARY_RANK_LEVELS, SECONDARY_RANK_LEVELS,
  SPELL_TIER_GATES, TIER_LABEL, apGainAtLevel, tpGainAtLevel,
} from '../data/progression';
import { DRAGON_PROPERTY_LEVELS } from '../data/spiritual';
import type { Character } from './character';
import { derive } from './derive';

export interface LevelGain {
  level: number;
  lines: string[];
}

export interface StatChange {
  stat: string;
  before: number;
  after: number;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** What one level gives, read from the tables. */
export function gainsForLevel(c: Character, level: number, casts: boolean = derive(c).spellcasting): string[] {
  const out: string[] = [];
  const ap = apGainAtLevel(level);
  if (ap > 0) out.push(`${ap} Attribute ${plural(ap, 'Point', 'Points')}.`);
  out.push(`${tpGainAtLevel(level)} Trait Points.`);
  if (CLASS_ABILITY_LEVELS.includes(level)) out.push('A new class ability.');
  if (level === 8) out.push('Your secondary Career opens.');
  PRIMARY_RANK_LEVELS.forEach((l, i) => {
    if (l === level && i > 0) out.push(`Primary Career rank ${['I', 'II', 'III'][i]} opens.`);
  });
  SECONDARY_RANK_LEVELS.forEach((l, i) => {
    if (l === level && i > 0) out.push(`Secondary Career rank ${['I', 'II', 'III'][i]} opens.`);
  });
  if (PATH_SLOT_LEVELS.includes(level)) out.push('One more independent Path slot.');
  if (level > ORDINARY_CAP_LEVEL) out.push('Past level 16 only Trait Points and Narrator rewards come in.');
  if (casts) {
    for (const g of SPELL_TIER_GATES) {
      if (g.level === level && g.tier > 1) out.push(`Spell tier ${TIER_LABEL[g.tier]} can open. It also needs Caster rank ${g.caster}.`);
    }
  }
  if (c.careers.some((k) => k.careerId === 'monk') && MONK_TIER_LEVELS.includes(level) && level > 1) out.push('A new Monk technique tier opens.');
  if (c.speciesId === 'dragonkin') {
    if (DRAGON_FORM_LEVELS.includes(level) && level > 1) out.push('A new Dragonkin form opens. Forms are provisional.');
    if (DRAGON_PROPERTY_LEVELS.includes(level) && level > 1) out.push('One more Dragonkin property.');
  }
  return out;
}

export function gainsBetween(c: Character, from: number, to: number): LevelGain[] {
  const out: LevelGain[] = [];
  const casts = derive(c).spellcasting;
  for (let l = Math.max(1, from + 1); l <= Math.min(to, MAX_LEVEL); l++) out.push({ level: l, lines: gainsForLevel(c, l, casts) });
  return out;
}

/** Derived totals before and after a level change. The character is not touched. */
export function levelDiff(c: Character, to: number): StatChange[] {
  const a = derive(c);
  const b = derive({ ...c, level: to });
  const rows: StatChange[] = [
    { stat: 'Health', before: a.hp.value, after: b.hp.value },
    { stat: 'Armor', before: a.armor.value, after: b.armor.value },
    { stat: 'Mana', before: a.mana.value, after: b.mana.value },
    { stat: 'Movement', before: a.mov.value, after: b.mov.value },
    { stat: 'Attribute Points left', before: a.ap.remaining, after: b.ap.remaining },
    { stat: 'Trait Points left', before: a.tp.remaining, after: b.tp.remaining },
  ];
  return rows;
}

/** Apply a level change. Current Health and Mana are kept as they are. */
export function applyLevel(c: Character, to: number): Character {
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.round(to)));
  return { ...c, level };
}
