import { Status } from './types';
import { CRAFT_DISCIPLINES } from './traits';

export const CRAFT_CS = [
  { id: 'basic', name: 'Basic', cs: 8 },
  { id: 'advanced', name: 'Advanced', cs: 12 },
  { id: 'superior', name: 'Superior', cs: 16 },
  { id: 'master', name: 'Master', cs: 20 },
  { id: 'artifact', name: 'Artifact', cs: 24 },
];

export type CraftOutcome = 'exceptional' | 'superior' | 'success' | 'partial' | 'failure';

/** Margin is the check total minus the Challenge Score. */
export function craftOutcome(margin: number): CraftOutcome {
  if (margin >= 6) return 'exceptional';
  if (margin >= 3) return 'superior';
  if (margin >= 0) return 'success';
  if (margin >= -3) return 'partial';
  return 'failure';
}

export const CRAFT_OUTCOME_TEXT: Record<CraftOutcome, string> = {
  exceptional: 'Margin 6 or more. An exceptional result.',
  superior: 'Margin 3 to 5. A superior result.',
  success: 'Margin 0 to 2. The work succeeds.',
  partial: 'Margin -1 to -3. A partial result with extra work or a flaw.',
  failure: 'Margin -4 or worse. The work fails. Some material may be recovered.',
};

export const MATERIAL_FAMILIES = ['Metal', 'Mineral', 'Wood', 'Textile', 'Leather', 'Organic', 'Reagent', 'Arcane', 'Exceptional'];
export const MATERIAL_GRADES = [
  { name: 'Poor', value: -1 },
  { name: 'Standard', value: 0 },
  { name: 'Refined', value: 1 },
  { name: 'Superior', value: 2 },
  { name: 'Exceptional', value: 3 },
];

export const MATERIALS = [
  { id: 'iron', name: 'Iron', rarity: 'Common', text: 'The baseline metal.' },
  { id: 'steel', name: 'Steel', rarity: 'Common', text: 'Helps with item condition.' },
  { id: 'silver', name: 'Silver', rarity: 'Uncommon', text: 'Suits supernatural work.' },
  { id: 'mithril', name: 'Mithril', rarity: 'Rare', text: 'Reduces weight by 1 to 2.' },
  { id: 'adamantite', name: 'Adamantite', rarity: 'Epic', text: 'Adds +1 Armor or resilience.' },
  { id: 'starstone', name: 'Starstone', rarity: 'Legendary', text: 'Adds +1 on magic checks or works as a catalyst.' },
  { id: 'spiritwood', name: 'Spiritwood', rarity: 'Rare', text: 'Suits communication and concentration.' },
  { id: 'dragonbone', name: 'Dragonbone', rarity: 'Legendary', text: 'Carries affinity and resistance.' },
  { id: 'abyssal-crystal', name: 'Abyssal Crystal', rarity: 'Exceptional', text: 'Forbidden. It carries a property and consequences. It is a material, not a school.' },
];

export const QUALITY = [
  { name: 'Poor', value: -1 },
  { name: 'Standard', value: 0 },
  { name: 'Fine', value: 1 },
  { name: 'Superior', value: 2 },
  { name: 'Masterwork', value: 3 },
];

export const QUALITY_BUDGET = [
  { text: '-1 W', cost: 1 },
  { text: '+1 maintenance', cost: 1 },
  { text: '+1 appraisal', cost: 1 },
  { text: 'Condition resilience', cost: 1 },
  { text: 'One extra compatible modification opportunity', cost: 2 },
];

export const CONDITION_STATES = [
  { name: 'Pristine', value: '0' },
  { name: 'Sound', value: '0' },
  { name: 'Worn', value: '-1 to the primary value' },
  { name: 'Damaged', value: '-2 to the primary value' },
  { name: 'Broken', value: 'Unavailable' },
];

export const FACILITIES = [
  { name: 'Improvised', allows: 'Basic work.' },
  { name: 'Ordinary', allows: 'Basic and advanced work.' },
  { name: 'Specialized', allows: 'Superior work.' },
  { name: 'Master', allows: 'Master work.' },
  { name: 'Exceptional', allows: 'Artifact work.' },
  { name: 'Maker', allows: 'Story only.' },
];

export const CRAFT_RULES = [
  'Each recipe has a design, requirements, materials, a principal check, craftsmanship and customization.',
  'Make one meaningful check per stage. The check is 2d8 plus the discipline attributes plus bonuses.',
  'Compare the total against the Challenge Score of the recipe.',
  'An item has one material quality and one infusion. Ordinary infusions do not count against an enchantment budget. Exceptional extras and material costs do. Quality is separate.',
  'Quality is not power. It buys small conveniences within the quality budget.',
  'Quality and material give no automatic damage or attribute bonus.',
  'Learn 2 recipes at the start. Learn 1 more at each mastery tier. Gameplay may add more.',
  'Portable kits allow limited repair and never upgrade rarity.',
  'Salvage returns at most what was invested. You may use it to upgrade a recipe or replace an infusion. It must never form a loop.',
  'Recipes use abstract material units. They never include real-world instructions.',
  'No artifact is made automatically. An Artifact needs a Master facility and a Challenge Score of 24.',
];

/** Salvage never returns more than what was invested. Extra salvage comes from class abilities. */
export function salvageUnits(invested: number, extra = 0): number {
  const base = Math.floor(Math.max(0, invested) / 2);
  return Math.min(Math.max(0, invested), base + Math.max(0, extra));
}

/** A recipe cost never drops below 1 unit when it started above 0. */
export function recipeCost(base: number, reduction = 0): number {
  if (base <= 0) return 0;
  return Math.max(1, base - Math.max(0, reduction));
}

export interface Recipe {
  id: string;
  discipline: string;
  index: number;
  name: string;
  tier: string;
  cs: number | null;
  text: string;
  status: Status;
}

const R = (discipline: string, index: number, name: string, tier: string, cs: number | null, text: string): Recipe => ({
  id: `${discipline}-${index + 1}`,
  discipline,
  index,
  name,
  tier,
  cs,
  text,
  status: 'proposal',
});

export const RECIPES: Recipe[] = [
  R('blacksmithing', 0, 'Ordinary Equipment', 'Basic', 8, 'Weapons, armor and shields at Entry tier.'),
  R('blacksmithing', 1, 'Restore Condition', 'Basic', 8, 'Repair worn or damaged metal gear.'),
  R('blacksmithing', 2, 'Developed Equipment', 'Advanced', 12, 'Gear at Developed tier.'),
  R('blacksmithing', 3, 'Rare-Material Advanced Equipment', 'Superior', 16, 'Advanced gear built from rare materials.'),
  R('blacksmithing', 4, 'Endgame Equipment', 'Master', 20, 'Gear at Endgame tier.'),
  R('blacksmithing', 5, 'Artifact Work', 'Artifact', 24, 'Work at Artifact tier. Needs an Exceptional facility.'),
  R('alchemy', 0, 'Restorative Draught', 'Basic', 8, 'Restores 6 HP.'),
  R('alchemy', 1, 'Mana Draught', 'Basic', 8, 'Restores 3 Mana.'),
  R('alchemy', 2, 'Protective Draught', 'Advanced', 12, 'Gain +2 threshold for the Scene.'),
  R('alchemy', 3, 'Greater Restorative', 'Superior', 16, 'Restores 14 HP.'),
  R('alchemy', 4, 'Superior Mana Draught', 'Master', 20, 'Restores 9 Mana.'),
  R('alchemy', 5, 'Transcendent Draught', 'Artifact', 24, 'Effects are set individually.'),
  R('herbalism', 0, 'Restorative Poultice', 'Basic', 8, 'Gain +2 on your next Rest HP recovery.'),
  R('herbalism', 1, 'Preserved Provisions', 'Basic', 8, 'Food that keeps on long journeys.'),
  R('herbalism', 2, 'Environmental Tonic', 'Advanced', 12, 'Gain +2 on environmental checks.'),
  R('herbalism', 3, 'Purifying Remedy', 'Superior', 16, 'Reduce condition buildup.'),
  R('herbalism', 4, 'Magical Cultivation', 'Master', 20, 'Grow plants with magical properties.'),
  R('herbalism', 5, 'Legendary Botanical', 'Artifact', 24, 'A plant with an individual effect.'),
  R('artificing', 0, 'Utility Device', 'Basic', 8, 'A simple working device.'),
  R('artificing', 1, 'Repair Kit', 'Basic', 8, 'A portable kit for limited repair.'),
  R('artificing', 2, 'Minor Construct', 'Advanced', 12, 'A small mechanical helper.'),
  R('artificing', 3, 'Advanced Utility Device', 'Superior', 16, 'A device with several functions.'),
  R('artificing', 4, 'Greater Construct', 'Master', 20, 'A large mechanical creature.'),
  R('artificing', 5, 'Legendary Construct', 'Artifact', 24, 'A construct with an individual design.'),
  R('enchanting', 0, 'Minor Enchantment', 'Basic', 8, 'A Minor enchantment worth 1 point.'),
  R('enchanting', 1, 'Magical Restoration', 'Basic', 8, 'Restore the magical integrity of an item.'),
  R('enchanting', 2, 'Major Enchantment', 'Advanced', 12, 'A Major enchantment worth 2 points.'),
  R('enchanting', 3, 'Greater Enchantment', 'Superior', 16, 'A Greater enchantment worth 3 points.'),
  R('enchanting', 4, 'Master Enchantment', 'Master', 20, 'A Master enchantment worth 4 points.'),
  R('enchanting', 5, 'Legendary Enchantment', 'Artifact', 24, 'A Legendary enchantment worth 5 points.'),
  R('general-craft', 0, 'Travelling Equipment', 'Basic', 8, 'Packs, tents and trail gear.'),
  R('general-craft', 1, 'Artisan Tools', 'Basic', 8, 'Tools for a trade.'),
  R('general-craft', 2, 'Specialized Equipment', 'Advanced', 12, 'Gear for one narrow purpose.'),
  R('general-craft', 3, 'Fine Accessories', 'Superior', 16, 'Accessories with a quality budget.'),
  R('general-craft', 4, 'Masterwork Tools', 'Master', 20, 'Tools of the highest quality.'),
  R('general-craft', 5, 'Legendary Accessory', 'Artifact', 24, 'An accessory with an individual design.'),
];

export const CONSUMABLE_BASE = [
  { tier: 'Basic', hp: 6, mana: 3 },
  { tier: 'Advanced', hp: 10, mana: 4 },
  { tier: 'Superior', hp: 14, mana: 6 },
  { tier: 'Master', hp: 20, mana: 9 },
  { tier: 'Artifact', hp: 28, mana: 12 },
];

export const CONSUMABLE_TEMP = [
  { tier: 'Basic', checks: 1, threshold: 2, resist: 1, armor: 1, mov: 0 },
  { tier: 'Superior', checks: 2, threshold: 4, resist: 2, armor: 2, mov: 1 },
  { tier: 'Master', checks: 3, threshold: 6, resist: 3, armor: 3, mov: 2 },
];

export const CONSUMABLE_RULES = [
  'Using a consumable takes 1 Action.',
  'Identical temporary effects do not stack.',
  'A hybrid consumable splits its HP and Mana values.',
  'Temporary effect durations are provisional.',
];

export const DISCIPLINE_INFO = CRAFT_DISCIPLINES.map((d) => ({ ...d }));

// ---- Enchantments ----

export interface EnchantFamily {
  id: string;
  name: string;
  group: string;
  values?: [number, number, number];
  unit?: string;
  text: string;
}

const E = (group: string, name: string, text: string, values?: [number, number, number], unit?: string): EnchantFamily => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  group,
  text,
  values,
  unit,
});

export const ENCHANT_GROUPS = ['Protection', 'Arcane', 'Knowledge', 'Influence', 'Exploration', 'Craftsmanship', 'Vitality', 'Bonding'];

export const ENCHANT_FAMILIES: EnchantFamily[] = [
  E('Protection', 'Fortification', 'Adds Armor.', [1, 2, 3], 'Armor'),
  E('Protection', 'Elemental Resistance', 'Adds resistance to one element.', [1, 2, 3], 'resistance'),
  E('Protection', 'Resilience', 'Adds threshold.', [2, 4, 6], 'threshold'),
  E('Protection', 'Stability', 'Adds stability.', [1, 2, 3], 'stability'),
  E('Protection', 'Preservation', 'Protects the item from wear.'),
  E('Arcane', 'Mana Reservoir', 'Adds maximum Mana.', [3, 6, 9], 'Mana'),
  E('Arcane', 'Concentration', 'Adds to concentration checks.', [1, 2, 3], 'checks'),
  E('Arcane', 'Arcane Focus', 'Adds to casting.', [1, 2, 3], 'casting'),
  E('Arcane', 'Ritual Focus', 'Adds to ritual checks.', [1, 2, 3], 'checks'),
  E('Arcane', 'Magical Efficiency', 'Once per Sleep, reduce a spell cost by 1, to a minimum of 1.'),
  E('Knowledge', 'Scholar Insight', 'Adds to research checks.', [1, 2, 3], 'checks'),
  E('Knowledge', 'Ancient Understanding', 'Adds to checks about ancient subjects.', [1, 2, 3], 'checks'),
  E('Knowledge', 'Perfect Recall', 'Once per Sleep, recall a detail you have seen.'),
  E('Knowledge', 'Linguistic Rune', 'Lets you read one written language.'),
  E('Knowledge', 'Revelation', 'Once per Sleep, receive a clue.'),
  E('Influence', 'Persuasion', 'Adds to persuasion checks.', [1, 2, 3], 'checks'),
  E('Influence', 'Empathy', 'Adds to empathy checks.', [1, 2, 3], 'checks'),
  E('Influence', 'Diplomacy', 'Adds to diplomacy checks.', [1, 2, 3], 'checks'),
  E('Influence', 'Performance', 'Adds to performance checks.', [1, 2, 3], 'checks'),
  E('Influence', 'Resonant Voice', 'Your voice carries across an area.'),
  E('Exploration', 'Wayfinder', 'Adds to navigation checks.', [1, 2, 3], 'checks'),
  E('Exploration', 'Watchfulness', 'Adds to perception checks.', [1, 2, 3], 'checks'),
  E('Exploration', 'Environmental Ward', 'Adds to checks against harsh environments.', [1, 2, 3], 'checks'),
  E('Exploration', 'Illumination', 'The item sheds light.'),
  E('Exploration', 'Lightness', 'Reduces the weight of the item.', [1, 2, 3], 'W'),
  E('Craftsmanship', 'Artisan Blessing', 'Adds to craft checks.', [1, 2, 3], 'checks'),
  E('Craftsmanship', 'Maintenance', 'Adds to maintenance checks.', [1, 2, 3], 'checks'),
  E('Craftsmanship', 'Appraisal', 'Adds to appraisal checks.', [1, 2, 3], 'checks'),
  E('Craftsmanship', 'Material Insight', 'Tells you the family of a material.'),
  E('Craftsmanship', 'Preserving Rune', 'Keeps goods from spoiling.'),
  E('Vitality', 'Vital Essence', 'Adds maximum HP.', [4, 8, 12], 'HP'),
  E('Vitality', 'Recovery', 'Adds HP recovered on each Rest.', [1, 2, 3], 'Rest HP'),
  E('Vitality', 'Endurance', 'Adds to checks against Fatigue.', [1, 2, 3], 'checks'),
  E('Vitality', 'Mental Harmony', 'Adds mental threshold.', [2, 4, 6], 'threshold'),
  E('Vitality', 'Fortune', 'Raises the Grace cap.', [1, 2, 3], 'Grace cap'),
  E('Bonding', 'Companion Vitality', 'Adds maximum HP to companions.', [3, 6, 9], 'HP'),
  E('Bonding', 'Guidance', 'Adds to checks to guide companions.', [1, 2, 3], 'checks'),
  E('Bonding', 'Summoning Focus', 'Adds to summoning checks.', [1, 2, 3], 'checks'),
  E('Bonding', 'Spiritual Link', 'Links you to a bonded spirit.'),
  E('Bonding', 'Shared Awareness', 'Lets you share senses with a bonded creature.'),
];

export const ENCHANT_RANKS = [
  { name: 'Minor', cost: 1 },
  { name: 'Major', cost: 2 },
  { name: 'Greater', cost: 3 },
  { name: 'Master', cost: 4 },
  { name: 'Legendary', cost: 5 },
];

export const ENCHANT_RULES = [
  'Minor, Major and Greater enchantments cost 1, 2 and 3 points of the item budget.',
  'Master costs 4 and Legendary costs 5. They are exceptional and set individually. They are not a generic +4 or +5 bonus.',
  'The ordinary Artifact budget is 5 points.',
  'Identical effects use the highest value. Distinct effects stack.',
  'Attributes, Actions, concentration and capacity effects are exceptional.',
];

export const ENCHANT_STATUS: Status = 'approved';
