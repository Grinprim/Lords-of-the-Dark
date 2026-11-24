// Progression tables. Every number here comes from the latest approved rules.

export const MAX_LEVEL = 30;
export const ORDINARY_CAP_LEVEL = 16;

/** AP gained at creation by the player: 4. Species adds net 3 and class adds 2 as fixed modifiers. */
export const CREATION_AP = 4;

/** Level 1 gives 4 AP. Levels 2 to 16 give +1, with +2 at levels 8 and 16. Nothing after 16. */
export function apGainAtLevel(level: number): number {
  if (level === 1) return CREATION_AP;
  if (level < 2 || level > ORDINARY_CAP_LEVEL) return 0;
  return level === 8 || level === 16 ? 2 : 1;
}

export function apTotal(level: number): number {
  let sum = 0;
  for (let l = 1; l <= Math.min(level, MAX_LEVEL); l++) sum += apGainAtLevel(l);
  return sum;
}

/** TP: 4 at levels 1, 4, 8, 12 and 16. 2 at every other level, including levels past 16. */
export const TP_BIG_LEVELS = [1, 4, 8, 12, 16];

export function tpGainAtLevel(level: number): number {
  if (level < 1) return 0;
  return TP_BIG_LEVELS.includes(level) ? 4 : 2;
}

export function tpTotal(level: number): number {
  let sum = 0;
  for (let l = 1; l <= Math.min(level, MAX_LEVEL); l++) sum += tpGainAtLevel(l);
  return sum;
}

/** Independent Paths unlock at levels 4, 8, 12 and 16. */
export const PATH_SLOT_LEVELS = [4, 8, 12, 16];
export function independentPathSlots(level: number): number {
  return PATH_SLOT_LEVELS.filter((l) => l <= level).length;
}

/** Careers are gained at levels 1 and 8. */
export const CAREER_LEVELS = [1, 8];
export function careerSlots(level: number): number {
  return CAREER_LEVELS.filter((l) => l <= level).length;
}

/** Career ranks. Primary: 1, 5, 9. Secondary: 8, 12, 16. */
export const PRIMARY_RANK_LEVELS = [1, 5, 9];
export const SECONDARY_RANK_LEVELS = [8, 12, 16];
export function careerRank(role: 'primary' | 'secondary', level: number): number {
  const table = role === 'primary' ? PRIMARY_RANK_LEVELS : SECONDARY_RANK_LEVELS;
  return table.filter((l) => l <= level).length;
}

/** Class abilities at levels 1, 3, 6, 9, 12 and 16. */
export const CLASS_ABILITY_LEVELS = [1, 3, 6, 9, 12, 16];
export function classAbilityCount(level: number): number {
  return CLASS_ABILITY_LEVELS.filter((l) => l <= level).length;
}

/** Spell tiers: [tier, minimum level, minimum Caster rank]. Tier 0 is the Cantrip. */
export const SPELL_TIER_GATES: { tier: number; level: number; caster: number }[] = [
  { tier: 0, level: 1, caster: 0 },
  { tier: 1, level: 1, caster: 0 },
  { tier: 2, level: 3, caster: 1 },
  { tier: 3, level: 5, caster: 1 },
  { tier: 4, level: 7, caster: 2 },
  { tier: 5, level: 9, caster: 2 },
  { tier: 6, level: 12, caster: 3 },
];

export const TIER_LABEL = ['Cantrip', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/** Damage budget bands by tier. [min, max]. */
export const DAMAGE_BUDGET: [number, number][] = [
  [1, 3],
  [4, 7],
  [7, 10],
  [10, 14],
  [14, 18],
  [18, 24],
  [22, 30],
];

/** Monk and Dragonkin form unlock levels. */
export const MONK_TIER_LEVELS = [1, 4, 8, 12, 16];
export const DRAGON_FORM_LEVELS = [1, 4, 8, 12];

/** Path rank costs in earned Mastery Points: Path I is free, II costs 2, III costs 4 more. */
export const PATH_RANK_MP_COST = [0, 2, 4];
export function pathMpSpent(rank: number): number {
  let s = 0;
  for (let r = 1; r <= rank; r++) s += PATH_RANK_MP_COST[r - 1] ?? 0;
  return s;
}

export const GRACE_CAP = 8;
export const MOV_BASE = 5;
export const FINAL_BLOW_RESISTANCE = 4;

export const FATIGUE_ROLL_PENALTY = 2;

export const ATTR_MIN = -3;
export const ATTR_MAX = 8;
/** Legacy level 1 ceiling from the old site. Kept as a warning, not a block. */
export const LEGACY_LEVEL1_CEILING = 6;
