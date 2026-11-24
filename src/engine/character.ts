import { ATTR_IDS, AttrId } from '../data/types';
import type { SlotId } from '../data/equipment';
import { FINAL_BLOW_RESISTANCE } from '../data/progression';

export const SCHEMA_VERSION = 1;
export const RULES_VERSION = '2026.1';

export type ItemKind = 'weapon' | 'armor' | 'shield' | 'cloak' | 'accessory' | 'catalyst' | 'custom';

export interface ItemEffect {
  stat: string;
  v: number;
  label?: string;
}

/** One item the character owns. Derived numbers are never stored here. */
export interface Item {
  uid: string;
  kind: ItemKind;
  name: string;
  /** Catalogue id of the weapon, armor, shield, cloak or catalyst base. */
  baseId?: string;
  tierId?: string;
  variant?: string;
  infusion?: string;
  shieldMod?: string;
  accessoryKind?: string;
  accessoryRank?: number;
  rarity?: string;
  /** Absolute values, used only when there is no baseId (custom gear). */
  atk?: number;
  dmg?: number;
  armor?: number;
  block?: number;
  w?: number;
  hands?: 1 | 2;
  /** Catalyst property and its rank, 1 to 3. */
  property?: { id: string; rank: number };
  /** Extra effects the owner wrote for custom or artifact gear. */
  effects?: ItemEffect[];
  /** Artifact class gear may pass the intrinsic ceilings. */
  exceptional?: boolean;
  notes?: string;
}

export interface CareerPick {
  careerId: string;
  role: 'primary' | 'secondary';
  /** The Path this Career grants. */
  pathId?: string;
  /** Used when the granted Path is a duplicate and already full. */
  altPathId?: string;
  /** Rank I: two of the four basics. */
  r1: string[];
  /** Rank II: two upgrades or advanced abilities. */
  r2: string[];
  /** Rank III: one upgrade or one mastery ability. */
  r3: string[];
}

export interface ConditionState {
  meter: number;
  active: boolean;
  /** Remaining Turns or Scenes. Null means no timer. */
  timer: number | null;
  stacks: number;
}

export interface CompanionRec {
  id: string;
  name: string;
  kind: 'companion' | 'summon';
  size: string;
  abilities: string[];
  notes: string;
}

export interface Override {
  id: string;
  stat: string;
  value: number;
  reason: string;
}

export interface CharacterState {
  hp: number | null;
  mana: number | null;
  grace: number;
  fatigue: number;
  finalBlow: number | null;
  conditions: Record<string, ConditionState>;
  /** Uses spent, keyed by use id. */
  spent: Record<string, number>;
  concentration: string | null;
  /** True after a Rest, until a meaningful activity allows another. */
  restLocked: boolean;
}

export interface Character {
  schemaVersion: number;
  rulesVersion: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  player: string;
  concept: string;
  notes: string;
  level: number;
  speciesId: string;
  humanAttrs: AttrId[];
  humanFeature: string | null;
  classId: string;
  /** AP spent on each attribute. */
  attrs: Record<AttrId, number>;
  careers: CareerPick[];
  independentPaths: string[];
  pathRanks: Record<string, number>;
  /** Earned Mastery Points for each Path. */
  pathMp: Record<string, number>;
  /** Purchased Trait ranks, such as [1, 2]. */
  traits: Record<string, number[]>;
  traitOptions: Record<string, string[]>;
  /** Proficiencies bought with TP. */
  profs: string[];
  freeProf: string | null;
  casterSchool: string | null;
  exceptionalSchools: string[];
  spells: string[];
  extraSpellSlots: Record<string, number>;
  monk: { techniques: string[]; manifested: boolean; enhanced: string[] };
  shaman: { aspects: string[]; active: string | null; activeRank: number };
  dragon: { form: string; properties: string[]; affinity: string | null; extraAffinities: string[] };
  companions: CompanionRec[];
  items: Item[];
  equipment: Partial<Record<SlotId, string>>;
  state: CharacterState;
  overrides: Override[];
  unlocks: string[];
}

export function newId(prefix = 'c'): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

export function zeroAttrs(): Record<AttrId, number> {
  return Object.fromEntries(ATTR_IDS.map((a) => [a, 0])) as Record<AttrId, number>;
}

export function emptyState(): CharacterState {
  return {
    hp: null,
    mana: null,
    grace: 0,
    fatigue: 0,
    finalBlow: null,
    conditions: {},
    spent: {},
    concentration: null,
    restLocked: false,
  };
}

export function newCharacter(partial: Partial<Character> = {}): Character {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: '',
    player: '',
    concept: '',
    notes: '',
    level: 1,
    speciesId: 'human',
    humanAttrs: [],
    humanFeature: null,
    classId: 'warrior',
    attrs: zeroAttrs(),
    careers: [],
    independentPaths: [],
    pathRanks: {},
    pathMp: {},
    traits: {},
    traitOptions: {},
    profs: [],
    freeProf: null,
    casterSchool: null,
    exceptionalSchools: [],
    spells: [],
    extraSpellSlots: {},
    monk: { techniques: [], manifested: false, enhanced: [] },
    shaman: { aspects: [], active: null, activeRank: 0 },
    dragon: { form: 'normal', properties: [], affinity: null, extraAffinities: [] },
    companions: [],
    items: [],
    equipment: {},
    state: emptyState(),
    overrides: [],
    unlocks: [],
    ...partial,
  };
}

export function finalBlowMax(): number {
  return FINAL_BLOW_RESISTANCE;
}

/** Deep copy that keeps the shape of a character. */
export function cloneCharacter(c: Character): Character {
  return JSON.parse(JSON.stringify(c)) as Character;
}

export function touch(c: Character): Character {
  return { ...c, updatedAt: new Date().toISOString() };
}
