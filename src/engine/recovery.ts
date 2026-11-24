import type { Recharge, UseDef } from '../data/types';
import { FINAL_BLOW_RESISTANCE } from '../data/progression';
import type { CharacterState } from './character';

export interface RecoveryContext {
  level: number;
  maxHp: number;
  maxMana: number;
  hasMana: boolean;
  /** Rest HP bonuses from Traits, enchantments, species and herbal effects. Applied once for each Rest. */
  restHpBonus: number;
  restManaBonus: number;
  /** Extra HP once for each Sleep, such as Vitality III. */
  sleepHpBonus: number;
  /** Uses the character owns. */
  uses: UseDef[];
}

export interface RecoveryResult {
  state: CharacterState;
  hpGained: number;
  manaGained: number;
  log: string[];
}

/** Rest HP by length: 10 to 59 minutes gives L, then 2L, 3L and 4L at each full hour band. */
export function restBand(minutes: number): number {
  if (minutes < 10) return 0;
  if (minutes < 60) return 1;
  if (minutes < 120) return 2;
  if (minutes < 180) return 3;
  return 4;
}

export function restHpAmount(minutes: number, level: number, bonus: number): number {
  const band = restBand(minutes);
  if (band === 0) return 0;
  return band * level + Math.max(0, bonus);
}

/** Mana from a Rest: floor(max / 2) plus bonuses, up to the Mana that is missing. */
export function restManaAmount(maxMana: number, currentMana: number, bonus: number): number {
  const missing = Math.max(0, maxMana - currentMana);
  return Math.min(missing, Math.floor(maxMana / 2) + Math.max(0, bonus));
}

export function resolvedHp(state: CharacterState, maxHp: number): number {
  return state.hp === null ? maxHp : Math.min(state.hp, maxHp);
}

export function resolvedMana(state: CharacterState, maxMana: number): number {
  return state.mana === null ? maxMana : Math.min(state.mana, maxMana);
}

/** Reset the spent count of every use that recharges on one of the triggers. */
export function recharge(spent: Record<string, number>, uses: UseDef[], triggers: Recharge[]): Record<string, number> {
  const next = { ...spent };
  for (const u of uses) if (triggers.includes(u.per)) delete next[u.id];
  return next;
}

export interface RestOptions {
  /** Pass true when the character did something meaningful since the last Rest. */
  meaningfulActivity?: boolean;
}

/** Two Rests in a row count as one. Meaningful activity allows another. */
export function applyRest(state: CharacterState, ctx: RecoveryContext, minutes: number, opts: RestOptions = {}): RecoveryResult {
  const log: string[] = [];
  const locked = state.restLocked && !opts.meaningfulActivity;
  if (locked) {
    return { state, hpGained: 0, manaGained: 0, log: ['Two Rests in a row count as one. Do something meaningful first.'] };
  }
  const hp = resolvedHp(state, ctx.maxHp);
  const mana = resolvedMana(state, ctx.maxMana);
  const amount = restHpAmount(minutes, ctx.level, ctx.restHpBonus);
  if (amount === 0) {
    return { state, hpGained: 0, manaGained: 0, log: ['A Rest needs at least 10 minutes.'] };
  }
  const hpGain = Math.min(amount, Math.max(0, ctx.maxHp - hp));
  const manaGain = ctx.hasMana ? restManaAmount(ctx.maxMana, mana, ctx.restManaBonus) : 0;
  const next: CharacterState = {
    ...state,
    hp: hp + hpGain,
    mana: ctx.hasMana ? mana + manaGain : state.mana,
    spent: recharge(state.spent, ctx.uses, ['rest']),
    restLocked: true,
  };
  log.push(`Recovered ${hpGain} HP.`);
  if (ctx.hasMana) log.push(`Recovered ${manaGain} Mana.`);
  log.push('Rest uses recharged.');
  return { state: next, hpGained: hpGain, manaGained: manaGain, log };
}

export type SleepResult = 'none' | 'half' | 'full';

export function sleepResult(hours: number): SleepResult {
  if (hours < 4) return 'none';
  if (hours < 6) return 'half';
  return 'full';
}

/**
 * Sleep.
 * Under 4 hours: nothing. 4 to under 6: half of maximum HP and Mana. 6 or more: full recovery.
 * A Fatigued character who sleeps enough removes 1 Fatigue instead of getting the full recovery.
 * A full 8 hours restores 1 Final Blow Resistance. Sleep of 6 hours or more recharges Sleep uses.
 */
export function applySleep(state: CharacterState, ctx: RecoveryContext, hours: number): RecoveryResult {
  const log: string[] = [];
  const kind = sleepResult(hours);
  const hp = resolvedHp(state, ctx.maxHp);
  const mana = resolvedMana(state, ctx.maxMana);
  let next: CharacterState = { ...state, restLocked: false };
  let hpGain = 0;
  let manaGain = 0;
  if (kind === 'none') {
    return { state, hpGained: 0, manaGained: 0, log: ['Under 4 hours of Sleep gives no recovery.'] };
  }
  if (kind === 'half') {
    hpGain = Math.min(Math.floor(ctx.maxHp / 2) + ctx.sleepHpBonus, Math.max(0, ctx.maxHp - hp));
    manaGain = ctx.hasMana ? Math.min(Math.floor(ctx.maxMana / 2), Math.max(0, ctx.maxMana - mana)) : 0;
    log.push(`A short Sleep restores ${hpGain} HP${ctx.hasMana ? ` and ${manaGain} Mana` : ''}.`);
  } else if (state.fatigue > 0) {
    next.fatigue = state.fatigue - 1;
    hpGain = Math.min(ctx.sleepHpBonus, Math.max(0, ctx.maxHp - hp));
    log.push('Enough Sleep removes 1 Fatigue. It replaces the full recovery.');
    if (hpGain > 0) log.push(`The Sleep bonus restores ${hpGain} HP.`);
  } else {
    hpGain = Math.max(0, ctx.maxHp - hp);
    manaGain = ctx.hasMana ? Math.max(0, ctx.maxMana - mana) : 0;
    log.push('Full HP and Mana restored.');
  }
  next.hp = hp + hpGain;
  next.mana = ctx.hasMana ? mana + manaGain : state.mana;
  if (kind === 'full') {
    next.spent = recharge(next.spent, ctx.uses, ['rest', 'sleep', 'encounter', 'scene', 'turn']);
    log.push('Sleep uses recharged.');
    if (hours >= 8) {
      const fb = state.finalBlow === null ? FINAL_BLOW_RESISTANCE : state.finalBlow;
      next.finalBlow = Math.min(FINAL_BLOW_RESISTANCE, fb + 1);
      if (fb < FINAL_BLOW_RESISTANCE) log.push('Final Blow Resistance rose by 1.');
    }
  }
  return { state: next, hpGained: hpGain, manaGained: manaGain, log };
}

/** A new in-game day recharges daily uses. */
export function applyNewDay(state: CharacterState, uses: UseDef[]): CharacterState {
  return { ...state, spent: recharge(state.spent, uses, ['day']) };
}

export function applyEncounterStart(state: CharacterState, uses: UseDef[]): CharacterState {
  return { ...state, spent: recharge(state.spent, uses, ['encounter', 'scene', 'turn']) };
}

export function applySceneStart(state: CharacterState, uses: UseDef[]): CharacterState {
  return { ...state, spent: recharge(state.spent, uses, ['scene', 'turn']) };
}

export function applyTurnStart(state: CharacterState, uses: UseDef[]): CharacterState {
  return { ...state, spent: recharge(state.spent, uses, ['turn']) };
}

/** Spend one use. Returns null when none is left. */
export function spendUse(state: CharacterState, use: UseDef): CharacterState | null {
  const used = state.spent[use.id] ?? 0;
  if (used >= use.count) return null;
  return { ...state, spent: { ...state.spent, [use.id]: used + 1 } };
}

export function usesLeft(state: CharacterState, use: UseDef): number {
  return Math.max(0, use.count - (state.spent[use.id] ?? 0));
}

/** Damage and healing on current HP. HP never goes below 0 or above the maximum. */
export function applyHpChange(state: CharacterState, maxHp: number, delta: number): CharacterState {
  const hp = resolvedHp(state, maxHp);
  return { ...state, hp: Math.max(0, Math.min(maxHp, hp + delta)) };
}

export function spendMana(state: CharacterState, maxMana: number, cost: number): CharacterState | null {
  const mana = resolvedMana(state, maxMana);
  if (cost > mana) return null;
  return { ...state, mana: mana - cost };
}

/** Grace: +1 on a failed meaningful roll, capped. Spend all of it before a roll. */
export function gainGrace(state: CharacterState, cap: number): CharacterState {
  return { ...state, grace: Math.min(cap, state.grace + 1) };
}

export function spendAllGrace(state: CharacterState): { state: CharacterState; bonus: number } {
  return { state: { ...state, grace: 0 }, bonus: state.grace };
}

/** Grace resets at the start and end of combat, then the starting bonus applies. */
export function resetGrace(state: CharacterState, start: number, cap: number): CharacterState {
  return { ...state, grace: Math.min(cap, Math.max(0, start)) };
}

/** A concentration spell replaces the previous one. Concentration may end freely. */
export function setConcentration(state: CharacterState, effect: string | null): CharacterState {
  return { ...state, concentration: effect };
}

/** Stabilization sets a character at 0 HP to 1 HP. */
export function stabilize(state: CharacterState, maxHp: number): CharacterState {
  if (resolvedHp(state, maxHp) > 0) return state;
  return { ...state, hp: 1 };
}

/** A Final Blow always lands. Each one lowers Final Blow Resistance by 1. */
export function finalBlow(state: CharacterState): { state: CharacterState; fallen: boolean } {
  const cur = state.finalBlow === null ? FINAL_BLOW_RESISTANCE : state.finalBlow;
  const next = Math.max(0, cur - 1);
  return { state: { ...state, finalBlow: next }, fallen: next === 0 };
}
