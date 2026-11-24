// Exact dice math. Every roll uses d8s. Odds come from full enumeration, never from a formula guess.

export type RollMode = 'ordinary' | 'advantage' | 'disadvantage';

export const SIDES = 8;

export function diceCount(mode: RollMode): number {
  return mode === 'advantage' ? 3 : mode === 'disadvantage' ? 1 : 2;
}

export interface Fraction {
  num: number;
  den: number;
}

export interface Enumeration {
  mode: RollMode;
  dice: number;
  outcomes: number;
  /** Number of outcomes for each natural sum. */
  bySum: Record<number, number>;
  /** Outcomes with two or more natural 8s. A Disadvantage roll never counts. */
  critical: number;
  /** Outcomes where every die shows 1. */
  fumble: number;
}

export function enumerate(mode: RollMode): Enumeration {
  const n = diceCount(mode);
  const outcomes = SIDES ** n;
  const bySum: Record<number, number> = {};
  let critical = 0;
  let fumble = 0;
  for (let i = 0; i < outcomes; i++) {
    let rest = i;
    let sum = 0;
    let eights = 0;
    let ones = 0;
    for (let d = 0; d < n; d++) {
      const face = (rest % SIDES) + 1;
      rest = Math.floor(rest / SIDES);
      sum += face;
      if (face === SIDES) eights++;
      if (face === 1) ones++;
    }
    bySum[sum] = (bySum[sum] ?? 0) + 1;
    if (mode !== 'disadvantage' && eights >= 2) critical++;
    if (ones === n) fumble++;
  }
  return { mode, dice: n, outcomes, bySum, critical, fumble };
}

const CACHE: Partial<Record<RollMode, Enumeration>> = {};
export function enumeration(mode: RollMode): Enumeration {
  return (CACHE[mode] ??= enumerate(mode));
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export function reduce(f: Fraction): Fraction {
  if (f.num === 0) return { num: 0, den: 1 };
  const g = gcd(f.num, f.den);
  return { num: f.num / g, den: f.den / g };
}

export function toPercent(f: Fraction, digits = 1): string {
  return `${((f.num / f.den) * 100).toFixed(digits)}%`;
}

export interface Odds {
  /** Chance that the roll meets or beats the target and is not a fumble. */
  hit: Fraction;
  /** Chance of a critical that also meets the target. A critical never hits on its own. */
  criticalHit: Fraction;
  /** Chance of a critical that still misses the target. */
  criticalMiss: Fraction;
  fumble: Fraction;
  miss: Fraction;
}

/**
 * Exact odds for one roll.
 * `modifier` is everything added to the natural sum, including Grace spent and Fatigue.
 * A fumble is an automatic failure. A critical must still meet the target.
 */
export function odds(mode: RollMode, modifier: number, target: number): Odds {
  const e = enumeration(mode);
  const n = e.dice;
  let hit = 0;
  let critHit = 0;
  let critMiss = 0;
  for (let i = 0; i < e.outcomes; i++) {
    let rest = i;
    let sum = 0;
    let eights = 0;
    let ones = 0;
    for (let d = 0; d < n; d++) {
      const face = (rest % SIDES) + 1;
      rest = Math.floor(rest / SIDES);
      sum += face;
      if (face === SIDES) eights++;
      if (face === 1) ones++;
    }
    const isFumble = ones === n;
    const isCrit = mode !== 'disadvantage' && eights >= 2;
    const meets = sum + modifier >= target;
    if (isFumble) continue;
    if (meets) {
      hit++;
      if (isCrit) critHit++;
    } else if (isCrit) {
      critMiss++;
    }
  }
  const den = e.outcomes;
  return {
    hit: reduce({ num: hit, den }),
    criticalHit: reduce({ num: critHit, den }),
    criticalMiss: reduce({ num: critMiss, den }),
    fumble: reduce({ num: e.fumble, den }),
    miss: reduce({ num: den - hit, den }),
  };
}

export function criticalChance(mode: RollMode): Fraction {
  const e = enumeration(mode);
  return reduce({ num: e.critical, den: e.outcomes });
}

export function fumbleChance(mode: RollMode): Fraction {
  const e = enumeration(mode);
  return reduce({ num: e.fumble, den: e.outcomes });
}

/** Advantage and Disadvantage cancel and never stack. */
export function resolveMode(advantage: number, disadvantage: number): RollMode {
  if (advantage > 0 && disadvantage > 0) return 'ordinary';
  if (advantage > 0) return 'advantage';
  if (disadvantage > 0) return 'disadvantage';
  return 'ordinary';
}

export type Rng = () => number;

export interface RollResult {
  mode: RollMode;
  dice: number[];
  natural: number;
  modifier: number;
  total: number;
  critical: boolean;
  fumble: boolean;
}

/** A single roll. The random source can be replaced in tests. */
export function roll(mode: RollMode, modifier = 0, rng: Rng = Math.random): RollResult {
  const n = diceCount(mode);
  const dice: number[] = [];
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rng() * SIDES));
  const natural = dice.reduce((a, b) => a + b, 0);
  const eights = dice.filter((d) => d === SIDES).length;
  return {
    mode,
    dice,
    natural,
    modifier,
    total: natural + modifier,
    critical: mode !== 'disadvantage' && eights >= 2,
    fumble: dice.every((d) => d === 1),
  };
}

/** A fumble always fails. Otherwise the total must meet the target. */
export function succeeds(r: RollResult, target: number): boolean {
  return !r.fumble && r.total >= target;
}

// ---- Defenses and damage ----

/** The defender wins ties. */
export function defenseSucceeds(defenseTotal: number, attackTotal: number): boolean {
  return defenseTotal >= attackTotal;
}

/** Block halves damage, rounded down. */
export function blockDamage(dmg: number): number {
  return Math.floor(Math.max(0, dmg) / 2);
}

/** A Riposte deals 1.5 times damage, rounded down. */
export function riposteDamage(dmg: number): number {
  return Math.floor(Math.max(0, dmg) * 1.5);
}

export function criticalDamage(dmg: number): number {
  return Math.max(0, dmg) * 2;
}

export type DefenseKind = 'block' | 'dodge' | 'parry';

export interface AttackInput {
  /** Natural roll data and total. */
  roll: RollResult;
  armor: number;
  dmg: number;
  /** Total of the defense roll, or null for no defense. */
  defense?: { kind: DefenseKind; total: number } | null;
}

export interface AttackOutcome {
  hit: boolean;
  critical: boolean;
  defended: boolean;
  riposte: boolean;
  damage: number;
  notes: string[];
}

/**
 * Resolve one attack in the order the rules give.
 * 1. Meet Armor. A fumble always misses.
 * 2. An eligible defense may answer. The defender wins ties.
 * 3. A critical doubles DMG only after the attack met Armor and survived the defense.
 */
export function resolveAttack(a: AttackInput): AttackOutcome {
  const notes: string[] = [];
  if (a.roll.fumble) return { hit: false, critical: false, defended: false, riposte: false, damage: 0, notes: ['Fumble. The attack fails.'] };
  if (a.roll.total < a.armor) {
    if (a.roll.critical) notes.push('A critical roll still has to meet Armor.');
    return { hit: false, critical: false, defended: false, riposte: false, damage: 0, notes: [...notes, 'The total is below Armor.'] };
  }
  let dmg = a.dmg;
  let defended = false;
  let riposte = false;
  let critical = a.roll.critical;
  if (a.defense) {
    const ok = defenseSucceeds(a.defense.total, a.roll.total);
    if (ok) {
      defended = true;
      if (a.defense.kind === 'block') {
        // A Block halves the damage. The attack still lands, so a critical still applies first.
        dmg = blockDamage(critical ? criticalDamage(dmg) : dmg);
        notes.push('Block halves the damage.');
        return { hit: true, critical, defended, riposte, damage: dmg, notes };
      }
      if (a.defense.kind === 'dodge') {
        notes.push('Dodge negates the damage. Move 1 tile.');
        return { hit: true, critical: false, defended, riposte, damage: 0, notes };
      }
      riposte = true;
      notes.push('Parry negates the attack. A Riposte Reaction is unlocked.');
      return { hit: true, critical: false, defended, riposte, damage: 0, notes };
    }
    if (a.defense.kind === 'parry') notes.push('A failed Parry costs your Reaction for the Scene.');
  }
  if (critical) dmg = criticalDamage(dmg);
  return { hit: true, critical, defended, riposte, damage: dmg, notes };
}
