import { DRAGON_FORM_BY_ID } from '../data/spiritual';
import type { Character } from './character';
import { cloneCharacter } from './character';
import { derive } from './derive';
import { resolvedHp, resolvedMana } from './recovery';

/**
 * Keep the same share of maximum HP when the maximum changes.
 * Always round down, so a form change can never raise HP past the proportional share.
 * A conscious character keeps at least 1 HP.
 */
export function proportionalHp(current: number, oldMax: number, newMax: number): number {
  if (current <= 0) return 0;
  if (oldMax <= 0) return Math.min(current, newMax);
  const scaled = Math.floor((current * newMax) / oldMax);
  return Math.min(newMax, Math.max(1, scaled));
}

/** Reduce a cost by 1 with a minimum of 1 when the base cost was positive. */
export function reduceCost(base: number, reduction: number): number {
  if (base <= 0) return 0;
  return Math.max(1, base - Math.max(0, reduction));
}

export interface TransformResult {
  ok: boolean;
  character: Character;
  log: string[];
}

function hasProperty(c: Character, id: string): boolean {
  return c.dragon.properties.includes(id);
}

export function activationCost(c: Character, formId: string): number {
  const f = DRAGON_FORM_BY_ID[formId];
  if (!f) return 0;
  return reduceCost(f.activation, hasProperty(c, 'efficient-manifestation') ? 1 : 0);
}

export function upkeepCost(c: Character, formId: string): number {
  const f = DRAGON_FORM_BY_ID[formId];
  if (!f) return 0;
  const sustained = hasProperty(c, 'sustained-manifestation') && c.level >= 12 ? 1 : 0;
  return reduceCost(f.upkeep, sustained);
}

/** Change form. The form changes maximum HP, so current HP keeps its proportion. */
export function transformTo(c: Character, formId: string): TransformResult {
  const log: string[] = [];
  const target = DRAGON_FORM_BY_ID[formId];
  if (c.speciesId !== 'dragonkin') return { ok: false, character: c, log: ['Only Dragonkin can take a form.'] };
  if (!target) return { ok: false, character: c, log: ['Unknown form.'] };
  if (target.id === c.dragon.form) return { ok: false, character: c, log: ['Already in that form.'] };
  const before = derive(c);
  const hp = resolvedHp(c.state, before.hp.value);
  const mana = resolvedMana(c.state, before.mana.value);
  const out = cloneCharacter(c);

  if (target.id === 'normal') {
    const cost = DRAGON_FORM_BY_ID[c.dragon.form]?.revert ?? 0;
    out.dragon.form = 'normal';
    if (cost > mana) {
      out.state.mana = 0;
      out.state.fatigue += 1;
      log.push('Not enough Mana. The form ends free and you gain 1 Fatigue.');
    } else {
      out.state.mana = mana - cost;
      log.push(`Reverted to Normal for ${cost} Mana.`);
    }
  } else {
    if (target.exceptional) return { ok: false, character: c, log: ['The Ancient form is a story event. The Narrator decides.'] };
    if (c.level < target.level) return { ok: false, character: c, log: [`${target.name} opens at level ${target.level}.`] };
    const cost = activationCost(c, target.id);
    if (!before.hasMana) return { ok: false, character: c, log: ['You need Mana access.'] };
    if (cost > mana) return { ok: false, character: c, log: [`${target.name} costs ${cost} Mana. You have ${mana}.`] };
    out.dragon.form = target.id;
    out.state.mana = mana - cost;
    log.push(`Took the ${target.name} form for ${cost} Mana.`);
  }
  const after = derive(out);
  const next = proportionalHp(hp, before.hp.value, after.hp.value);
  out.state.hp = next;
  log.push(`HP kept its share: ${hp} of ${before.hp.value} became ${next} of ${after.hp.value}.`);
  // Conditions, uses and Grace all persist through a change of form. Nothing else is touched.
  return { ok: true, character: out, log };
}

/** Pay upkeep at the start of a Scene. When Mana runs short the form ends free and costs 1 Fatigue. */
export function payUpkeep(c: Character): TransformResult {
  if (c.speciesId !== 'dragonkin' || c.dragon.form === 'normal') return { ok: true, character: c, log: [] };
  const before = derive(c);
  const mana = resolvedMana(c.state, before.mana.value);
  const cost = upkeepCost(c, c.dragon.form);
  if (cost <= mana) {
    const out = cloneCharacter(c);
    out.state.mana = mana - cost;
    return { ok: true, character: out, log: [`Paid ${cost} Mana to keep the form.`] };
  }
  const hp = resolvedHp(c.state, before.hp.value);
  const out = cloneCharacter(c);
  out.dragon.form = 'normal';
  out.state.mana = 0;
  out.state.fatigue += 1;
  const after = derive(out);
  out.state.hp = proportionalHp(hp, before.hp.value, after.hp.value);
  return { ok: true, character: out, log: ['Not enough Mana for upkeep. The form ended and you gained 1 Fatigue.'] };
}
