// Open choices for a character. The builder, the level-up flow and the sheet all read this list.
import { careerRank, independentPathSlots } from '../data/progression';
import { CAREER_BY_ID } from '../data/careers';
import { SPELL_BY_ID } from '../data/magic';
import { TIER_LABEL } from '../data/progression';
import type { Character } from './character';
import type { Derived } from './derive';

export interface PendingChoice {
  id: string;
  text: string;
  /** Builder step that settles it. */
  step: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function pendingChoices(c: Character, d: Derived): PendingChoice[] {
  const out: PendingChoice[] = [];
  const add = (id: string, text: string, step: string) => out.push({ id, text, step });

  if (c.speciesId === 'human') {
    if (c.humanAttrs.length !== 3) add('human-attrs', 'Pick three attributes for the Human +1.', 'species');
    if (!c.humanFeature) add('human-feature', 'Pick one Human option.', 'species');
  }
  if (d.ap.remaining > 0) add('ap', `${d.ap.remaining} Attribute ${plural(d.ap.remaining, 'Point', 'Points')} to spend.`, 'attributes');

  if (!c.careers.some((k) => k.role === 'primary')) add('career-primary', 'Choose your primary Career.', 'careers');
  if (d.level >= 8 && !c.careers.some((k) => k.role === 'secondary')) add('career-secondary', 'Your secondary Career is open.', 'careers');
  for (const pick of c.careers) {
    const def = CAREER_BY_ID[pick.careerId];
    if (!def) continue;
    if (pick.role === 'secondary' && d.level < 8) continue;
    if (!pick.pathId) add(`path-${pick.careerId}`, `${def.name}: pick the Path it grants.`, 'careers');
    const rank = careerRank(pick.role, d.level);
    const need: [string, number, number][] = [
      ['I', rank >= 1 ? 2 : 0, pick.r1.length],
      ['II', rank >= 2 ? 2 : 0, pick.r2.length],
      ['III', rank >= 3 ? 1 : 0, pick.r3.length],
    ];
    for (const [label, want, have] of need) {
      if (have < want) add(`rank-${pick.careerId}-${label}`, `${def.name}: pick ${want - have} more rank ${label} ${plural(want - have, 'ability', 'abilities')}.`, 'careers');
    }
  }
  const openSlots = independentPathSlots(d.level) - c.independentPaths.length;
  if (openSlots > 0) add('independent-path', `${openSlots} independent Path ${plural(openSlots, 'slot is', 'slots are')} open.`, 'careers');

  if (d.tp.remaining > 0) add('tp', `${d.tp.remaining} Trait ${plural(d.tp.remaining, 'Point', 'Points')} to spend.`, 'traits');
  if (!c.freeProf) add('free-prof', 'Pick your free weapon proficiency.', 'traits');

  if (d.spellcasting) {
    if (!c.casterSchool) add('school', 'Choose your school of magic.', 'magic');
    else {
      for (const t of d.spellTiers) {
        if (!t.available || t.tier >= 6) continue;
        const known = c.spells.filter((id) => SPELL_BY_ID[id]?.tier === t.tier).length;
        const allowed = t.allowed + (c.extraSpellSlots[String(t.tier)] ?? 0);
        if (known < allowed) add(`spells-${t.tier}`, `${TIER_LABEL[t.tier]}: learn ${allowed - known} more ${plural(allowed - known, 'spell', 'spells')}.`, 'magic');
      }
    }
  }
  return out;
}
