import { Effect, Status, fx } from './types';

export interface CompanionSize {
  id: string;
  name: string;
  capacity: number;
  minLevel: number;
  hp: [number, number] | null;
  armor: [number, number] | null;
  atk: [number, number] | null;
  dmg: [number, number] | null;
  status: Status;
}

export const COMPANION_SIZES: CompanionSize[] = [
  { id: 'minor', name: 'Minor', capacity: 1, minLevel: 1, hp: [8, 20], armor: [6, 9], atk: [1, 3], dmg: [1, 3], status: 'approved' },
  { id: 'standard', name: 'Standard', capacity: 2, minLevel: 1, hp: [20, 45], armor: [8, 12], atk: [3, 5], dmg: [3, 6], status: 'approved' },
  { id: 'greater', name: 'Greater', capacity: 3, minLevel: 8, hp: [45, 80], armor: [10, 15], atk: [4, 7], dmg: [5, 9], status: 'approved' },
  { id: 'legendary', name: 'Legendary', capacity: 4, minLevel: 16, hp: [80, 130], armor: [13, 19], atk: [6, 9], dmg: [8, 13], status: 'approved' },
  { id: 'exceptional', name: 'Exceptional', capacity: 5, minLevel: 99, hp: null, armor: null, atk: null, dmg: null, status: 'approved' },
];

export const COMPANION_SIZE_BY_ID: Record<string, CompanionSize> = Object.fromEntries(COMPANION_SIZES.map((s) => [s.id, s]));

/** Meaningful stages. A companion starts with 2 abilities and gains 1 at each later stage, for 6 in all. */
export const COMPANION_STAGE_LEVELS = [1, 4, 8, 12, 16];
export const COMPANION_BASE_CAPACITY = 2;
export const SUMMON_BASE_CAPACITY = 2;

export function companionAbilitySlots(level: number): number {
  return 1 + COMPANION_STAGE_LEVELS.filter((l) => l <= level).length;
}

export interface CompanionAbility {
  id: string;
  name: string;
  text: string;
  effects?: Effect[];
}

const ca = (name: string, text: string, effects?: Effect[]): CompanionAbility => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  text,
  effects,
});

export const COMPANION_ABILITIES: CompanionAbility[] = [
  ca('Vitality', 'The companion gains +6 HP.', [fx('hp', 6, 'comp:vitality')]),
  ca('Protection', 'The companion gains +1 Armor.', [fx('armor', 1, 'comp:protection')]),
  ca('Mobility', 'The companion gains +1 MOV.', [fx('mov', 1, 'comp:mobility')]),
  ca('Resilient', 'The companion gains +2 to its thresholds.', [fx('threshold', 2, 'comp:resilient')]),
  ca('Protective Presence', 'You gain +1 on defense while the companion is adjacent.'),
  ca('Keen Senses', 'The companion gains +2 on perception checks.'),
  ca('Spiritual Awareness', 'The companion senses spiritual presences.'),
  ca('Material Recognition', 'The companion recognizes common materials.'),
  ca('Wilderness Guide', 'Gain +2 on navigation checks while the companion leads.'),
  ca('Messenger', 'The companion can carry short messages between places you name.'),
  ca('Burden Bearer', 'The companion carries +4 W.', [fx('capacity', 4, 'comp:burden')]),
  ca('Aquatic Adaptation', 'The companion moves and breathes in water.'),
  ca('Illumination', 'The companion sheds light.'),
  ca('Emotional Bond', 'You sense the companion mood across a distance.'),
  ca('Arcane Resonance', 'Gain +2 on checks to identify magic while the companion is near.'),
  ca('Artisan Assistant', 'Gain +1 on craft checks while the companion helps.'),
  ca('Linguistic Familiarity', 'The companion understands one language you know.'),
  ca('Restorative Nature', 'The companion recovers +3 HP from each Rest.'),
];

export const SUMMON_TIERS = [
  { tier: 'Cantrip (0)', size: 'Noncombat helper', note: 'Lasts 1 Scene.' },
  { tier: 'I and II', size: 'Minor', note: 'Lasts 3 Scenes in combat.' },
  { tier: 'III', size: 'Standard', note: 'Lasts 3 Scenes in combat.' },
  { tier: 'IV', size: 'Greater', note: 'Lasts 3 Scenes in combat.' },
  { tier: 'V', size: 'Legendary', note: 'Lasts 3 Scenes in combat.' },
  { tier: 'VI', size: 'Enhanced Legendary', note: 'Upcast only. Individual extensions are set by the Narrator.' },
];

export const COMPANION_RULES = [
  'Permanent companions and temporary summons use separate capacity.',
  'Ordinary pets, followers and mounts do not use capacity unless they have mechanical abilities.',
  'A Minor companion uses 1 capacity. Standard uses 2. Greater uses 3. Legendary uses 4. Exceptional uses 5 or more.',
  'Companion capacity is 2 without a Path. Companion Bond rank I gives 2, rank II gives 3, rank III gives 4.',
  'Summon capacity is 2 without a Path. Summoning Mastery rank I gives 3, rank II gives 4, rank III gives 5.',
  'Minor and Standard companions are open at level 1. Greater opens at level 8. Legendary opens at level 16. Exceptional companions are a story event.',
  'A companion has meaningful stages at levels 1, 4, 8, 12 and 16. It starts with 2 abilities and gains 1 at each later stage, for a total of 6.',
  'Companion Bond gives 1, 2 or 3 shared abilities at ranks I, II and III. You distribute them among your companions.',
  'A companion acts through your commands. A summon takes an independent nonoffensive Action. Directed mechanical or offensive actions use your own Action count.',
  'Offensive spells and commanded offensive creatures count toward your own limit of one Attack Action per Turn.',
  'Living creatures recover through Rest, Sleep and healing. Spirits recover through spiritual restoration. Mechanical creatures need repair. Magical creatures need magical restoration or repair.',
  'A temporary creature must be recast. A permanent companion is not respawned automatically.',
];

export function companionCapacity(bondRank: number): number {
  return bondRank <= 0 ? COMPANION_BASE_CAPACITY : [2, 3, 4][Math.min(3, bondRank) - 1];
}

export function summonCapacity(masteryRank: number): number {
  return masteryRank <= 0 ? SUMMON_BASE_CAPACITY : [3, 4, 5][Math.min(3, masteryRank) - 1];
}
