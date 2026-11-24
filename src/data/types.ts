// Shared types for rules data. Rules data is read-only. User state lives in src/engine/character.ts.

export type Status = 'approved' | 'provisional' | 'legacy' | 'owner-review' | 'proposal';

export const STATUS_LABEL: Record<Status, string> = {
  approved: 'Approved',
  provisional: 'Provisional',
  legacy: 'Legacy',
  'owner-review': 'Owner review',
  proposal: 'Proposal',
};

export const STATUS_HELP: Record<Status, string> = {
  approved: 'Latest approved rule from the owner specification.',
  provisional: 'Approved for play but marked provisional in the specification.',
  legacy: 'Carried over from the old site. Not restated in the latest rules.',
  'owner-review': 'The specification is ambiguous. The reading used here needs a decision.',
  proposal: 'Written to fill a gap. Not canon until the owner approves it.',
};

export type AttrId = 'VIG' | 'FOR' | 'STR' | 'DEX' | 'INT' | 'ARC' | 'CHA' | 'REF' | 'INS' | 'AWA';

export const ATTR_IDS: AttrId[] = ['VIG', 'FOR', 'STR', 'DEX', 'INT', 'ARC', 'CHA', 'REF', 'INS', 'AWA'];

export const ATTR_NAMES: Record<AttrId, string> = {
  VIG: 'Vigor',
  FOR: 'Fortitude',
  STR: 'Strength',
  DEX: 'Dexterity',
  INT: 'Intelligence',
  ARC: 'Arcane',
  CHA: 'Charisma',
  REF: 'Reflex',
  INS: 'Insight',
  AWA: 'Awareness',
};

export const ATTR_ROLE: Record<AttrId, string> = {
  VIG: 'Health per level and endurance of body.',
  FOR: 'Armor, physical thresholds, Block and decay of conditions.',
  STR: 'Carrying capacity and raw physical force.',
  DEX: 'Precision, finesse and ranged control.',
  INT: 'Learning, craft and Mana.',
  ARC: 'Magical power, Mana and spell attacks.',
  CHA: 'Presence and persuasion.',
  REF: 'Speed of response and Dodge.',
  INS: 'Judgment, will and the Madness threshold.',
  AWA: 'Senses and attention.',
};

export type Recharge = 'turn' | 'scene' | 'encounter' | 'rest' | 'sleep' | 'day';

export const RECHARGE_LABEL: Record<Recharge, string> = {
  turn: 'each Turn',
  scene: 'each Scene',
  encounter: 'each Encounter',
  rest: 'each Rest',
  sleep: 'each Sleep',
  day: 'each in-game day',
};

/**
 * A numeric effect on a derived value.
 * Effects that share the same stat and key are identical effects: only the highest applies.
 * Effects with different keys are distinct and stack.
 * An effect with `when` is conditional. It is listed on the sheet but never added to base totals.
 */
export interface Effect {
  stat: string;
  v: number;
  key: string;
  label?: string;
  when?: string;
}

export interface UseDef {
  id: string;
  name: string;
  count: number;
  per: Recharge;
}

export interface Feature {
  id: string;
  name: string;
  text: string;
  effects?: Effect[];
  uses?: UseDef[];
  replaces?: string[];
  status: Status;
  grantsAccess?: boolean;
}

/** One entry in a browsable catalogue. */
export type CatalogId =
  | 'species'
  | 'classes'
  | 'careers'
  | 'paths'
  | 'traits'
  | 'proficiencies'
  | 'equipment'
  | 'magic'
  | 'spiritual'
  | 'companions'
  | 'crafting'
  | 'artifacts'
  | 'world';

export type StatId =
  | 'hp'
  | 'mana'
  | 'armor'
  | 'atk'
  | 'dmg'
  | 'mov'
  | 'weight'
  | 'grace'
  | 'actions'
  | 'reactions'
  | 'concentration'
  | 'mp';

export interface StatChip {
  stat: StatId;
  value: string | number;
}

export interface Entry {
  id: string;
  catalog: CatalogId;
  /** Sub catalogue used for tabs on pages that hold several tables. */
  section: string;
  name: string;
  summary: string;
  facets: Record<string, string>;
  stats?: StatChip[];
  fields?: [string, string][];
  body?: string[];
  bullets?: string[];
  related?: { catalog: CatalogId; id: string; label?: string }[];
  status: Status;
  note?: string;
  searchText?: string;
}

export function entryKey(e: { catalog: CatalogId; id: string }): string {
  return `${e.catalog}:${e.id}`;
}

export const fx = (stat: string, v: number, key: string, label?: string, when?: string): Effect => ({
  stat,
  v,
  key,
  label,
  when,
});
