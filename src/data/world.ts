import { Status } from './types';

export const NATURES = ['Humanoid', 'Beast', 'Elemental', 'Spirit', 'Undead', 'Draconic', 'Construct', 'Abyssal', 'Celestial', 'Primordial', 'Aberration', 'Divine'];

export const THREAT_LEVELS = ['Lesser', 'Standard', 'Elite', 'Champion', 'Boss', 'Legendary', 'Mythic', 'Transcendent'];

export const LEVEL_BANDS = [
  { band: 'Early', levels: '1 to 4' },
  { band: 'Established', levels: '5 to 8' },
  { band: 'Advanced', levels: '9 to 12' },
  { band: 'Endgame', levels: '13 to 16' },
  { band: 'Superior', levels: '17 to 20' },
  { band: 'Legendary', levels: '21 to 25' },
  { band: 'Mythic', levels: '26 to 30' },
  { band: 'Transcendent', levels: '31 and above, no cap' },
];

export const SPECIALIZATIONS = ['Guardian', 'Colossus', 'Stalker', 'Arcanist', 'Spirit Controller', 'Supporter', 'Adaptive'];

export const REFERENCE_TABLE = [
  { level: 1, hp: 20, armor: 9, atk: 4, dmg: 5 },
  { level: 4, hp: 45, armor: 13, atk: 7, dmg: 9 },
  { level: 8, hp: 100, armor: 19, atk: 11, dmg: 15 },
  { level: 12, hp: 180, armor: 25, atk: 15, dmg: 22 },
  { level: 16, hp: 280, armor: 31, atk: 19, dmg: 30 },
  { level: 20, hp: 420, armor: 37, atk: 23, dmg: 40 },
  { level: 25, hp: 650, armor: 45, atk: 28, dmg: 55 },
  { level: 30, hp: 950, armor: 53, atk: 34, dmg: 75 },
];

export const THREAT_ADJUST = [
  { threat: 'Lesser', hp: '0.5x', armorAtk: -3, dmg: -3, actions: '2', reactions: '0 to 1' },
  { threat: 'Standard', hp: '1x', armorAtk: 0, dmg: 0, actions: '2', reactions: '1' },
  { threat: 'Elite', hp: '1.5x', armorAtk: 2, dmg: 4, actions: '2', reactions: '1' },
  { threat: 'Champion', hp: '2x', armorAtk: 4, dmg: 8, actions: '3', reactions: '1' },
  { threat: 'Boss', hp: '3x', armorAtk: 6, dmg: 12, actions: '3', reactions: '2' },
  { threat: 'Legendary', hp: '5x', armorAtk: 9, dmg: 20, actions: '4', reactions: '2' },
  { threat: 'Mythic', hp: '8x', armorAtk: 12, dmg: 35, actions: '4 to 5', reactions: '2 to 3' },
  { threat: 'Transcendent', hp: 'Individual', armorAtk: 0, dmg: 0, actions: 'Individual', reactions: 'Individual' },
];

export const THRESHOLD_BONUS = [
  { threat: 'Standard', bonus: 0 },
  { threat: 'Elite', bonus: 3 },
  { threat: 'Champion', bonus: 6 },
  { threat: 'Boss', bonus: 10 },
  { threat: 'Legendary', bonus: 15 },
  { threat: 'Mythic', bonus: 20 },
  { threat: 'Transcendent', bonus: 'Individual' },
];

export const DIFFICULTY = ['Favorable', 'Challenging', 'Severe', 'Overwhelming', 'World-defining'];

export const WORLD_RULES = [
  'The world does not scale to player level. A creature of equal level is generally stronger than one player. Bosses may exceed every player limit.',
  'The Narrator decides creature numbers and abilities on the fly. The Bestiary does not need stat blocks.',
  'Natures may combine. A nature gives no automatic benefit.',
  'The reference numbers below are optional guidance. They are flexible and never mandatory.',
  'A creature has 1 Attack limit per Turn unless a rule says otherwise. Mana, innate recharge and hybrid pools are the Narrator choice.',
  'Boss mechanics may include an extra Turn, a legendary Reaction, phases, environment effects, anchors, associated entities, adaptive resistance and awakening.',
  'Continuous, independent and narrative phases never recharge or cleanse automatically.',
  'Optional creature properties: Resistant raises a check, Resilient raises a threshold, Persistent extends a duration, Immune is a named immunity.',
  'Rewards should be meaningful. They should not reward farming.',
];

export interface BestiaryConcept {
  id: string;
  name: string;
  natures: string[];
  status: Status;
}

export const BESTIARY: BestiaryConcept[] = [
  { id: 'hollow-wanderer', name: 'Hollow Wanderer', natures: ['Undead'], status: 'proposal' },
  { id: 'forest-guardian', name: 'Forest Guardian', natures: ['Spirit', 'Beast'], status: 'provisional' },
  { id: 'runic-sentinel', name: 'Runic Sentinel', natures: ['Construct'], status: 'provisional' },
  { id: 'astral-warden', name: 'Astral Warden', natures: ['Celestial'], status: 'proposal' },
  { id: 'abyssal-knight', name: 'Abyssal Knight', natures: ['Abyssal', 'Humanoid'], status: 'proposal' },
  { id: 'ancient-vyvren', name: 'Ancient Vyvren', natures: ['Draconic'], status: 'provisional' },
  { id: 'primordial-dragon', name: 'Primordial Dragon', natures: ['Draconic', 'Primordial'], status: 'proposal' },
  { id: 'forgotten-sovereign', name: 'Forgotten Sovereign', natures: ['Abyssal'], status: 'provisional' },
];

export const BESTIARY_NOTE =
  'These are names only. The Narrator writes the lore and the numbers. The natures shown here are suggestions.';
