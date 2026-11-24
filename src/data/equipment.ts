import { Status } from './types';
import type { ProficiencyDef } from './traits';

// ---- Weapons ----

export type WeaponGroup = 'melee' | 'colossal' | 'ranged';
export type WeightClass = 'light' | 'balanced' | 'heavy' | 'colossal' | 'standard';
export type DamageType =
  | 'Standard'
  | 'Strike'
  | 'Pierce'
  | 'Slash'
  | 'Magic'
  | 'Fire'
  | 'Frost'
  | 'Lightning'
  | 'Holy'
  | 'Abyss';

export const DAMAGE_TYPES: DamageType[] = ['Standard', 'Strike', 'Pierce', 'Slash', 'Magic', 'Fire', 'Frost', 'Lightning', 'Holy', 'Abyss'];

export interface WeaponBase {
  id: string;
  name: string;
  group: WeaponGroup;
  cls: WeightClass;
  atk: number;
  dmg: number;
  w: number;
  hands: 1 | 2;
  dmgType: DamageType;
  profId: string;
}

const wb = (
  id: string,
  name: string,
  group: WeaponGroup,
  cls: WeightClass,
  atk: number,
  dmg: number,
  w: number,
  hands: 1 | 2,
  dmgType: DamageType,
): WeaponBase => ({ id, name, group, cls, atk, dmg, w, hands, dmgType, profId: `prof-${id}` });

export const WEAPONS: WeaponBase[] = [
  wb('dagger', 'Dagger', 'melee', 'light', 3, 2, 1, 1, 'Pierce'),
  wb('shortsword', 'Shortsword', 'melee', 'light', 4, 3, 2, 1, 'Slash'),
  wb('longsword', 'Longsword', 'melee', 'balanced', 4, 5, 3, 1, 'Slash'),
  wb('greatsword', 'Greatsword', 'melee', 'heavy', 4, 6, 4, 2, 'Slash'),
  wb('curved-sword', 'Curved Sword', 'melee', 'light', 5, 4, 2, 1, 'Slash'),
  wb('katana', 'Katana', 'melee', 'balanced', 5, 5, 3, 1, 'Slash'),
  wb('thrusting-sword', 'Thrusting Sword', 'melee', 'light', 6, 3, 2, 1, 'Pierce'),
  wb('axe', 'Axe', 'melee', 'balanced', 3, 5, 3, 1, 'Slash'),
  wb('greataxe', 'Greataxe', 'melee', 'heavy', 3, 7, 5, 2, 'Slash'),
  wb('mace', 'Mace', 'melee', 'balanced', 4, 4, 3, 1, 'Strike'),
  wb('hammer', 'Hammer', 'melee', 'balanced', 3, 6, 3, 1, 'Strike'),
  wb('great-hammer', 'Great Hammer', 'melee', 'heavy', 2, 8, 6, 2, 'Strike'),
  wb('flail', 'Flail', 'melee', 'balanced', 3, 5, 3, 1, 'Strike'),
  wb('spear', 'Spear', 'melee', 'balanced', 5, 4, 3, 1, 'Pierce'),
  wb('halberd', 'Halberd', 'melee', 'heavy', 4, 6, 4, 2, 'Slash'),
  wb('scythe', 'Scythe', 'melee', 'heavy', 3, 6, 4, 2, 'Slash'),
  wb('staff', 'Staff', 'melee', 'light', 4, 3, 2, 2, 'Strike'),
  wb('whip', 'Whip', 'melee', 'light', 5, 2, 1, 1, 'Slash'),
  wb('fist', 'Fist Weapon', 'melee', 'light', 3, 2, 1, 1, 'Strike'),
  wb('colossal-sword', 'Colossal Sword', 'colossal', 'colossal', 3, 7, 8, 2, 'Slash'),
  wb('colossal-axe', 'Colossal Axe', 'colossal', 'colossal', 2, 8, 9, 2, 'Slash'),
  wb('colossal-hammer', 'Colossal Hammer', 'colossal', 'colossal', 2, 8, 10, 2, 'Strike'),
  wb('colossal-polearm', 'Colossal Polearm', 'colossal', 'colossal', 4, 6, 8, 2, 'Pierce'),
  wb('colossal-exotic', 'Colossal Exotic', 'colossal', 'colossal', 3, 7, 9, 2, 'Standard'),
  wb('shortbow', 'Shortbow', 'ranged', 'light', 4, 3, 2, 2, 'Pierce'),
  wb('longbow', 'Longbow', 'ranged', 'standard', 4, 5, 3, 2, 'Pierce'),
  wb('greatbow', 'Greatbow', 'ranged', 'heavy', 3, 6, 5, 2, 'Pierce'),
  wb('light-crossbow', 'Light Crossbow', 'ranged', 'standard', 4, 4, 3, 2, 'Pierce'),
  wb('heavy-crossbow', 'Heavy Crossbow', 'ranged', 'heavy', 3, 6, 5, 2, 'Pierce'),
  wb('hand-crossbow', 'Hand Crossbow', 'ranged', 'light', 4, 3, 2, 1, 'Pierce'),
  wb('sling', 'Sling', 'ranged', 'light', 3, 2, 1, 1, 'Strike'),
  wb('throwing', 'Throwing Weapon', 'ranged', 'light', 4, 3, 1, 1, 'Pierce'),
  wb('pistol', 'Pistol', 'ranged', 'light', 4, 4, 2, 1, 'Pierce'),
  wb('musket', 'Musket', 'ranged', 'heavy', 4, 6, 4, 2, 'Pierce'),
];

export const UNARMED = { atk: 0, dmg: 1, w: 0 };

export const WEAPON_BY_ID: Record<string, WeaponBase> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export interface TierDef {
  id: string;
  name: string;
  atk: number;
  dmg: number;
}

export const WEAPON_TIERS: TierDef[] = [
  { id: 'entry', name: 'Entry', atk: 0, dmg: 0 },
  { id: 'developed', name: 'Developed', atk: 1, dmg: 1 },
  { id: 'advanced', name: 'Advanced', atk: 2, dmg: 2 },
  { id: 'endgame', name: 'Endgame', atk: 3, dmg: 3 },
  { id: 'artifact', name: 'Artifact', atk: 4, dmg: 5 },
];

export const CEILINGS = { atk: 10, dmg: 16, armor: 10, scaling: 8 };

/** Weapon variants. Values depend on the weight class of the weapon. */
export type VariantId = 'none' | 'heavy' | 'keen' | 'quality';
export const VARIANTS: { id: VariantId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'heavy', name: 'Heavy' },
  { id: 'keen', name: 'Keen' },
  { id: 'quality', name: 'Quality' },
];

export const VARIANT_TABLE: Record<WeightClass, Record<Exclude<VariantId, 'none'>, { atk: number; dmg: number }>> = {
  light: { heavy: { atk: 0, dmg: 1 }, keen: { atk: 2, dmg: 0 }, quality: { atk: 1, dmg: 0 } },
  balanced: { heavy: { atk: 0, dmg: 2 }, keen: { atk: 2, dmg: 0 }, quality: { atk: 1, dmg: 1 } },
  heavy: { heavy: { atk: 0, dmg: 2 }, keen: { atk: 1, dmg: 0 }, quality: { atk: 1, dmg: 1 } },
  colossal: { heavy: { atk: 0, dmg: 3 }, keen: { atk: 1, dmg: 0 }, quality: { atk: 1, dmg: 2 } },
  // Ranged: Light, Standard and Heavy. Heavy +1/+2/+2 DMG. Keen +2/+1/+1 ATK. Quality +1 ATK, plus +1 DMG on Standard and Heavy.
  standard: { heavy: { atk: 0, dmg: 2 }, keen: { atk: 1, dmg: 0 }, quality: { atk: 1, dmg: 1 } },
};

export type InfusionId = 'none' | 'arcane' | 'fire' | 'frost' | 'lightning' | 'sacred' | 'abyssal';
export const INFUSIONS: { id: InfusionId; name: string; text: string }[] = [
  { id: 'none', name: 'None', text: 'No infusion.' },
  { id: 'arcane', name: 'Arcane', text: 'All damage becomes Magic.' },
  { id: 'fire', name: 'Fire', text: 'Half the physical damage, rounded up, stays physical. The rest becomes Fire.' },
  { id: 'frost', name: 'Frost', text: 'Half the physical damage, rounded up, stays physical. The rest becomes Frost.' },
  { id: 'lightning', name: 'Lightning', text: 'Half the physical damage, rounded up, stays physical. The rest becomes Lightning.' },
  { id: 'sacred', name: 'Sacred', text: 'Half the physical damage, rounded up, stays physical. The rest becomes Holy.' },
  { id: 'abyssal', name: 'Abyssal', text: 'Defined item by item. Exceptional.' },
];

export const SCALING_MODES = [
  { id: 'none', name: 'None', text: 'No scaling.' },
  { id: 'moderate', name: 'Moderate', text: 'Add half the attribute, rounded down.' },
  { id: 'strong', name: 'Strong', text: 'Add the full attribute.' },
  { id: 'dual', name: 'Dual', text: 'Add the average of two attributes, rounded down. Must be stated on the item.' },
];

// ---- Armor ----

export interface ArmorBase {
  id: string;
  name: string;
  armor: number;
  w: number;
  profId: string | null;
}

const ab = (id: string, name: string, armor: number, w: number, profId: string | null): ArmorBase => ({ id, name, armor, w, profId });

export const ARMORS: ArmorBase[] = [
  ab('clothing', 'Clothing', 0, 0, null),
  ab('reinforced-clothing', 'Reinforced Clothing', 1, 2, null),
  ab('light-armor', 'Light Armor', 2, 3, 'prof-armor-light'),
  ab('reinforced-light-armor', 'Reinforced Light Armor', 3, 6, 'prof-armor-light'),
  ab('medium-armor', 'Medium Armor', 4, 7, 'prof-armor-medium'),
  ab('reinforced-medium-armor', 'Reinforced Medium Armor', 5, 10, 'prof-armor-medium'),
  ab('heavy-armor', 'Heavy Armor', 6, 11, 'prof-armor-heavy'),
  ab('reinforced-heavy-armor', 'Reinforced Heavy Armor', 8, 15, 'prof-armor-heavy'),
  ab('exceptional-armor', 'Exceptional Armor', 9, 16, 'prof-armor-exceptional'),
  ab('reinforced-exceptional-armor', 'Reinforced Exceptional Armor', 10, 20, 'prof-armor-exceptional'),
];

export const ARMOR_BY_ID: Record<string, ArmorBase> = Object.fromEntries(ARMORS.map((a) => [a.id, a]));

export const ARMOR_INFUSIONS = [
  { id: 'none', name: 'None', armor: 0, w: 0, threshold: 0, resist: 0, text: 'No infusion.' },
  { id: 'reinforced', name: 'Reinforced', armor: 1, w: 2, threshold: 0, resist: 0, text: '+1 Armor and +2 W.' },
  { id: 'lightweight', name: 'Lightweight', armor: 0, w: -2, threshold: 0, resist: 0, text: '-2 W, to a minimum of 1.' },
  { id: 'resilient', name: 'Resilient', armor: 0, w: 0, threshold: 2, resist: 0, text: '+2 threshold.' },
  { id: 'warded', name: 'Warded', armor: 0, w: 0, threshold: 0, resist: 1, text: '+1 resistance.' },
];

// ---- Shields ----

export interface ShieldBase {
  id: string;
  name: string;
  w: number;
  block: number;
  profId: string;
}

export const SHIELDS: ShieldBase[] = [
  { id: 'small-shield', name: 'Small Shield', w: 2, block: 1, profId: 'prof-shield-small' },
  { id: 'medium-shield', name: 'Medium Shield', w: 4, block: 2, profId: 'prof-shield-medium' },
  { id: 'great-shield', name: 'Great Shield', w: 7, block: 3, profId: 'prof-shield-great' },
];

export const SHIELD_BY_ID: Record<string, ShieldBase> = Object.fromEntries(SHIELDS.map((s) => [s.id, s]));

export const SHIELD_MODS = [
  { id: 'none', name: 'None', block: 0, w: 0, stability: 0, resist: 0, text: 'No modification.' },
  { id: 'reinforced', name: 'Reinforced', block: 1, w: 1, stability: 0, resist: 0, text: '+1 Block and +1 W.' },
  { id: 'lightweight', name: 'Lightweight', block: 0, w: -1, stability: 0, resist: 0, text: '-1 W, to a minimum of 1.' },
  { id: 'stable', name: 'Stable', block: 0, w: 0, stability: 1, resist: 0, text: '+1 Stability.' },
  { id: 'warded', name: 'Warded', block: 0, w: 0, stability: 0, resist: 1, text: '+1 resistance while the shield is active.' },
];

// ---- Cloaks ----

export interface CloakDef {
  id: string;
  name: string;
  w: number;
  text: string;
  effects: { stat: string; v: number; label: string }[];
}

export const CLOAKS: CloakDef[] = [
  { id: 'cloak-traveler', name: 'Traveler Cloak', w: 1, text: 'Helps against ordinary weather and terrain.', effects: [{ stat: 'check:environment', v: 1, label: 'environment checks' }] },
  { id: 'cloak-winter', name: 'Winter Cloak', w: 2, text: 'Gain +2 against cold.', effects: [{ stat: 'resist:cold', v: 2, label: 'cold resistance' }] },
  { id: 'cloak-scholar', name: 'Scholar Cloak', w: 1, text: 'Gain +1 on research checks.', effects: [{ stat: 'check:research', v: 1, label: 'research checks' }] },
  { id: 'cloak-pilgrim', name: 'Pilgrim Cloak', w: 1, text: 'Gain +1 on religious checks.', effects: [{ stat: 'check:religious', v: 1, label: 'religious checks' }] },
  { id: 'cloak-wanderer', name: 'Wanderer Cloak', w: 1, text: 'Gain +1 on navigation checks.', effects: [{ stat: 'check:navigation', v: 1, label: 'navigation checks' }] },
  { id: 'cloak-spiritwoven', name: 'Spiritwoven Cloak', w: 1, text: 'Gain +2 to the Madness threshold.', effects: [{ stat: 'thresholdMadness', v: 2, label: 'Madness threshold' }] },
  { id: 'cloak-guardian', name: 'Guardian Cloak', w: 2, text: 'Gain +1 Armor.', effects: [{ stat: 'armor', v: 1, label: 'Armor' }] },
  { id: 'cloak-enchanted', name: 'Enchanted Cloak', w: 1, text: 'Properties are set item by item within the property budget.', effects: [] },
];

export const CLOAK_BY_ID: Record<string, CloakDef> = Object.fromEntries(CLOAKS.map((c) => [c.id, c]));

// ---- Accessories ----

export interface AccessoryKind {
  id: string;
  name: string;
  stat: string;
  values: [number, number, number];
  unit: string;
}

export const ACCESSORY_KINDS: AccessoryKind[] = [
  { id: 'health', name: 'Health', stat: 'hp', values: [4, 8, 12], unit: 'HP' },
  { id: 'mana', name: 'Mana', stat: 'mana', values: [3, 6, 9], unit: 'Mana' },
  { id: 'armor', name: 'Armor', stat: 'armor', values: [1, 2, 3], unit: 'Armor' },
  { id: 'capacity', name: 'Capacity', stat: 'capacity', values: [2, 4, 6], unit: 'W capacity' },
  { id: 'resistance', name: 'Resistance', stat: 'resist', values: [1, 2, 3], unit: 'resistance' },
  { id: 'threshold', name: 'Threshold', stat: 'thresholdAll', values: [2, 4, 6], unit: 'threshold' },
  { id: 'check', name: 'Check', stat: 'check:chosen', values: [1, 2, 3], unit: 'on one named check' },
  { id: 'grace', name: 'Grace', stat: 'graceStart', values: [1, 2, 3], unit: 'Grace' },
  { id: 'rest-hp', name: 'Rest HP', stat: 'restHp', values: [1, 2, 3], unit: 'Rest HP' },
];

export const ACCESSORY_RANK_NAMES = ['Minor', 'Major', 'Greater'];
export const ACCESSORY_WEIGHT = 1;

export const NARRATIVE_PROPERTIES = [
  { id: 'illumination', name: 'Illumination', cost: '1', text: 'Sheds light.' },
  { id: 'preservation', name: 'Document preservation', cost: '1', text: 'Keeps documents safe from damage.' },
  { id: 'recall', name: 'Recall', cost: '1', text: 'Once per Sleep, recall a detail you have seen.' },
  { id: 'written-language', name: 'Written language', cost: '2', text: 'Read one written language.' },
  { id: 'bonded-communication', name: 'Bonded communication', cost: '2', text: 'Speak with a bonded partner at a distance.' },
  { id: 'storage', name: 'Storage', cost: '3', text: 'Holds a small amount of gear outside normal weight.' },
  { id: 'symbolic-clue', name: 'Symbolic clue', cost: '3', text: 'Offers a symbolic clue when the Narrator allows.' },
  { id: 'travel', name: 'Travel', cost: 'Individual', text: 'Travel effects are set item by item.' },
];

// ---- Catalysts ----

export const CATALYSTS = [
  { id: 'wand', name: 'Wand', w: 1, focus: 'casting', text: 'A casting focus.' },
  { id: 'staff-catalyst', name: 'Staff Catalyst', w: 2, focus: 'concentration', text: 'A concentration focus.' },
  { id: 'orb', name: 'Orb', w: 1, focus: 'Mana', text: 'A Mana focus.' },
  { id: 'grimoire', name: 'Grimoire', w: 2, focus: 'knowledge', text: 'A knowledge focus.' },
  { id: 'seal', name: 'Seal', w: 0, focus: 'incantation', text: 'An incantation focus.' },
  { id: 'relic', name: 'Relic', w: 1, focus: 'spirit', text: 'A spirit focus.' },
  { id: 'prayer-book', name: 'Prayer Book', w: 1, focus: 'ritual knowledge', text: 'A ritual knowledge focus.' },
  { id: 'ritual-focus', name: 'Ritual Focus', w: 2, focus: 'ritual checks', text: 'A ritual check focus.' },
];

export const CATALYST_BY_ID: Record<string, (typeof CATALYSTS)[number]> = Object.fromEntries(CATALYSTS.map((c) => [c.id, c]));

export const CATALYST_PROPERTIES = [
  { id: 'casting', name: 'Casting', values: [1, 2, 3] },
  { id: 'concentration', name: 'Concentration', values: [1, 2, 3] },
  { id: 'knowledge', name: 'Knowledge', values: [1, 2, 3] },
  { id: 'ritual', name: 'Ritual', values: [1, 2, 3] },
  { id: 'damage', name: 'Spell damage', values: [1, 2, 3] },
  { id: 'heal', name: 'Healing', values: [1, 2, 3] },
  { id: 'mana', name: 'Mana', values: [3, 6, 9] },
];

export const RARITIES = [
  { id: 'common', name: 'Common', points: 0 },
  { id: 'uncommon', name: 'Uncommon', points: 1 },
  { id: 'rare', name: 'Rare', points: 2 },
  { id: 'epic', name: 'Epic', points: 3 },
  { id: 'legendary', name: 'Legendary', points: 4 },
  { id: 'artifact', name: 'Artifact', points: 5 },
];

// ---- Slots ----

export type SlotId = 'hand1' | 'hand2' | 'armor' | 'cloak' | 'acc1' | 'acc2' | 'acc3' | 'acc4' | 'tail';

export const SLOT_LABEL: Record<SlotId, string> = {
  hand1: 'Hand slot 1',
  hand2: 'Hand slot 2',
  armor: 'Armor',
  cloak: 'Cloak',
  acc1: 'Accessory 1',
  acc2: 'Accessory 2',
  acc3: 'Accessory 3',
  acc4: 'Accessory 4',
  tail: 'Tail (Dragonkin)',
};

export const BASE_SLOTS: SlotId[] = ['hand1', 'hand2', 'armor', 'cloak', 'acc1', 'acc2', 'acc3', 'acc4'];

// ---- Proficiencies (42) ----

export const PROFICIENCIES: ProficiencyDef[] = [
  ...WEAPONS.filter((w) => w.group === 'melee').map((w): ProficiencyDef => ({ id: w.profId, name: w.name, group: 'melee', cost: 1 })),
  ...WEAPONS.filter((w) => w.group === 'colossal').map((w): ProficiencyDef => ({ id: w.profId, name: w.name, group: 'colossal', cost: 2 })),
  ...WEAPONS.filter((w) => w.group === 'ranged').map((w): ProficiencyDef => ({ id: w.profId, name: w.name, group: 'ranged', cost: 1 })),
  { id: 'prof-armor-light', name: 'Light Armor', group: 'armor', cost: 1 },
  { id: 'prof-armor-medium', name: 'Medium Armor', group: 'armor', cost: 1 },
  { id: 'prof-armor-heavy', name: 'Heavy Armor', group: 'armor', cost: 1 },
  { id: 'prof-armor-exceptional', name: 'Exceptional Armor', group: 'exceptional-armor', cost: 2 },
  { id: 'prof-shield-small', name: 'Small Shield', group: 'shield', cost: 1 },
  { id: 'prof-shield-medium', name: 'Medium Shield', group: 'shield', cost: 1 },
  { id: 'prof-shield-great', name: 'Great Shield', group: 'shield', cost: 1 },
  { id: 'prof-unarmed', name: 'Unarmed', group: 'unarmed', cost: 1 },
];

export const PROF_BY_ID: Record<string, ProficiencyDef> = Object.fromEntries(PROFICIENCIES.map((p) => [p.id, p]));

export function profIdsByGroup(group: ProficiencyDef['group'] | 'conventional-armor' | 'all-armor'): string[] {
  if (group === 'conventional-armor') return PROFICIENCIES.filter((p) => p.group === 'armor').map((p) => p.id);
  if (group === 'all-armor') return PROFICIENCIES.filter((p) => p.group === 'armor' || p.group === 'exceptional-armor').map((p) => p.id);
  return PROFICIENCIES.filter((p) => p.group === group).map((p) => p.id);
}

export const EQUIPMENT_STATUS: Record<string, Status> = {
  hands: 'proposal',
  damageType: 'proposal',
  rangedClass: 'proposal',
  accessoryWeight: 'owner-review',
};
