import type { AttrId } from '../data/types';
import type { ConditionState } from './character';

// ---- Condition definitions ----

export type ConditionKind = 'damage' | 'burst' | 'status';

export interface ConditionDef {
  id: string;
  name: string;
  kind: ConditionKind;
  /** Attribute for the resistance check. */
  resist: AttrId | null;
  /** Which threshold the meter fills against. */
  threshold: 'physical' | 'madness';
  /** HP lost at each Turn for damage-over-time conditions. */
  perTurn?: number;
  /** HP lost when a burst condition activates. */
  activation?: number;
  /** Stack cap for burst conditions. */
  cap?: number;
  /** Scenes a burst condition lasts, if it has a timer. */
  scenes?: number;
  /** What the timer counts. Action-denying conditions last one Turn. Slow, Haste and Charmed last to the next Scene. */
  unit?: 'turn' | 'scene' | null;
  text: string;
}

export const POISON_FAMILY = ['poisoned', 'toxic', 'rotted'];
export const MAX_STACKS_ON_REAPPLY = 8;
export const BURST_CAP = 5;
export const DECAY_BASE = 2;

export const CONDITIONS: ConditionDef[] = [
  { id: 'poisoned', name: 'Poisoned', kind: 'damage', resist: 'FOR', threshold: 'physical', perTurn: 5, text: 'Lose 5 HP at each Turn.' },
  { id: 'toxic', name: 'Toxic', kind: 'damage', resist: 'FOR', threshold: 'physical', perTurn: 8, text: 'Lose 8 HP at each Turn.' },
  { id: 'rotted', name: 'Rotted', kind: 'damage', resist: 'FOR', threshold: 'physical', perTurn: 12, text: 'Lose 12 HP at each Turn.' },
  { id: 'bleed', name: 'Bleed', kind: 'burst', resist: 'FOR', threshold: 'physical', activation: 12, cap: BURST_CAP, text: 'Activation deals 12 HP. Healing is reduced by 3 for each stack. The next eligible heal clears it.' },
  { id: 'frost', name: 'Frost', kind: 'burst', resist: 'FOR', threshold: 'physical', activation: 8, cap: BURST_CAP, scenes: 4, text: 'Activation deals 8 HP. Incoming DMG rises by 2 for each stack, once for each resolved damaging ability.' },
  { id: 'madness', name: 'Madness', kind: 'burst', resist: 'INS', threshold: 'madness', activation: 10, cap: BURST_CAP, scenes: 4, text: 'Activation deals 10 HP. Casting costs +1 Mana and concentration is -1 for each stack.' },
  { id: 'stunned', name: 'Stunned', kind: 'status', resist: 'FOR', threshold: 'physical', unit: 'turn', text: 'Skip your next Turn.' },
  { id: 'silenced', name: 'Silenced', kind: 'status', resist: 'ARC', threshold: 'madness', unit: 'turn', text: 'Conventional and verbal casting is blocked.' },
  { id: 'hesitation', name: 'Hesitation', kind: 'status', resist: 'INS', threshold: 'madness', unit: 'turn', text: 'Ordinary equipment and unarmed attacks are blocked.' },
  { id: 'dazed', name: 'Dazed', kind: 'status', resist: 'REF', threshold: 'physical', unit: 'turn', text: 'Activated skills and Traits are blocked.' },
  { id: 'frightened', name: 'Frightened', kind: 'status', resist: 'INS', threshold: 'madness', unit: 'turn', text: 'You cannot act, react or move.' },
  { id: 'prone', name: 'Prone', kind: 'status', resist: 'FOR', threshold: 'physical', text: 'MOV 0. Nonranged attacks against you have Advantage. Standing costs 1 Action.' },
  { id: 'restrained', name: 'Restrained', kind: 'status', resist: 'STR', threshold: 'physical', text: 'MOV 0. Attacks against you have Advantage. Escape takes a check.' },
  { id: 'slow', name: 'Slow', kind: 'status', resist: 'FOR', threshold: 'physical', unit: 'scene', text: '-1 MOV for each stack, to a maximum of 3.' },
  { id: 'haste', name: 'Haste', kind: 'status', resist: 'FOR', threshold: 'physical', unit: 'scene', text: '+1 MOV for each stack, to a maximum of 3.' },
  { id: 'blinded', name: 'Blinded', kind: 'status', resist: 'AWA', threshold: 'physical', text: 'Your rolls have Disadvantage. Rolls against you have Advantage.' },
  { id: 'charmed', name: 'Charmed', kind: 'status', resist: 'INS', threshold: 'madness', unit: 'scene', text: 'You are influenced in nonharmful ways. Your agency stays.' },
];

export const CONDITION_BY_ID: Record<string, ConditionDef> = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

export function emptyCondition(): ConditionState {
  return { meter: 0, active: false, timer: null, stacks: 0 };
}

// ---- Thresholds ----

export interface Thresholds {
  physical: number;
  madness: number;
  /** Poisoned, Toxic and Rotted. */
  poison: number;
  dazed: number;
  hesitation: number;
  frightened: number;
}

export function thresholdFor(def: ConditionDef, t: Thresholds): number {
  if (POISON_FAMILY.includes(def.id)) return t.poison;
  if (def.id === 'dazed') return t.dazed;
  if (def.id === 'hesitation') return t.hesitation;
  if (def.id === 'frightened') return t.frightened;
  return def.threshold === 'madness' ? t.madness : t.physical;
}

// ---- Buildup ----

export interface BuildupResult {
  state: ConditionState;
  activated: boolean;
  /** HP lost right away. */
  damage: number;
  notes: string[];
}

/**
 * Add buildup to a meter.
 * When the meter reaches its threshold the condition activates, the meter resets to 0
 * and any excess is discarded.
 */
export function addBuildup(def: ConditionDef, current: ConditionState | undefined, amount: number, threshold: number, poisonDuration = 0): BuildupResult {
  const s: ConditionState = { ...(current ?? emptyCondition()) };
  const notes: string[] = [];
  let damage = 0;
  let activated = false;
  if (amount <= 0) return { state: s, activated, damage, notes };
  s.meter += amount;
  s.meter = Math.max(0, s.meter);
  if (s.meter >= threshold) {
    activated = true;
    s.meter = 0;
    notes.push('The meter reached its threshold. It resets to 0 and the excess is discarded.');
    if (def.kind === 'damage') {
      s.active = true;
      s.timer = poisonDuration;
      s.stacks = 1;
    } else if (def.kind === 'burst') {
      const cap = def.cap ?? BURST_CAP;
      s.stacks = Math.min(MAX_STACKS_ON_REAPPLY, s.active ? s.stacks + 1 : 1);
      s.active = true;
      s.timer = def.scenes ?? null;
      damage = def.activation ?? 0;
      if (s.stacks >= cap) notes.push('The stack cap was reached.');
    } else {
      s.active = true;
      const stacking = def.id === 'slow' || def.id === 'haste';
      s.stacks = stacking ? Math.min(3, (s.stacks || 0) + 1) : 1;
      s.timer = def.unit ? 1 : null;
    }
  }
  return { state: s, activated, damage, notes };
}

/** Poisoned, Toxic and Rotted last max(2, 8 - floor(FOR / 2)) Turns. */
export function poisonDuration(forAttr: number): number {
  return Math.max(2, 8 - Math.floor(forAttr / 2));
}

/**
 * At the end of the affected Turn, a meter that gained nothing falls by 2 (plus any decay bonus).
 * Meters and active conditions persist after combat ends.
 */
export function endTurnDecay(current: ConditionState, gainedThisTurn: boolean, decayBonus = 0): ConditionState {
  const s: ConditionState = { ...current };
  if (!gainedThisTurn && s.meter > 0) s.meter = Math.max(0, s.meter - (DECAY_BASE + Math.max(0, decayBonus)));
  return s;
}

/** Damage over time and timer countdown at the end of a Turn. */
export function endTurnDamage(def: ConditionDef, s: ConditionState): { state: ConditionState; damage: number } {
  if (!s.active) return { state: s, damage: 0 };
  if (def.kind !== 'damage') return { state: s, damage: 0 };
  const state = { ...s, timer: s.timer === null ? null : Math.max(0, s.timer - 1) };
  const damage = def.perTurn ?? 0;
  if (state.timer === 0) {
    state.active = false;
    state.stacks = 0;
  }
  return { state, damage };
}

/** Burst, Slow, Haste and similar timers count down in Scenes. */
export function endSceneTimers(s: ConditionState): ConditionState {
  if (!s.active || s.timer === null) return s;
  const timer = s.timer - 1;
  if (timer <= 0) return { ...s, timer: 0, active: false, stacks: 0 };
  return { ...s, timer };
}

/** Reapplying a burst condition adds 1 stack, up to 8. */
export function reapplyBurst(def: ConditionDef, s: ConditionState): ConditionState {
  if (def.kind !== 'burst') return s;
  return { ...s, active: true, stacks: Math.min(MAX_STACKS_ON_REAPPLY, (s.stacks || 0) + 1), timer: def.scenes ?? s.timer };
}

/** Slow and Haste cancel each other. */
export function cancelSlowHaste(slow: number, haste: number): { slow: number; haste: number } {
  const n = Math.min(slow, haste);
  return { slow: slow - n, haste: haste - n };
}

/** Bleed reduces healing by 3 for each stack. */
export function healingAfterBleed(heal: number, bleedStacks: number): number {
  return Math.max(0, heal - 3 * Math.max(0, bleedStacks));
}

/** Frost raises incoming DMG by 2 for each stack, once for each resolved damaging ability. */
export function frostBonusDamage(stacks: number): number {
  return 2 * Math.max(0, stacks);
}

/** Madness raises casting Mana by 1 and lowers concentration by 1 for each stack. */
export function madnessCasting(stacks: number): { manaExtra: number; concentration: number } {
  return { manaExtra: Math.max(0, stacks), concentration: -Math.max(0, stacks) };
}

/** Slow and Haste change MOV, capped at 3 stacks each. */
export function movFromStatus(slow: number, haste: number): number {
  const { slow: s, haste: h } = cancelSlowHaste(Math.min(3, slow), Math.min(3, haste));
  return h - s;
}

/** The result of a resistance check against a Challenge Score or an opposed roll. */
export function resistanceCheck(natural: number, attr: number, bonus: number, target: number): { total: number; success: boolean } {
  const total = natural + attr + bonus;
  return { total, success: total >= target };
}

/** Fatigue gives -2 to rolls for each stack. */
export function fatiguePenalty(stacks: number): number {
  return -2 * Math.max(0, stacks);
}
