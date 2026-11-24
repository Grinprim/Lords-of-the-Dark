import { Status } from './types';

export const ARTIFACT_CLASSES = [
  { id: 'artifact', name: 'Artifact', text: 'The highest ordinary rarity. It follows the ordinary property budget of 5 points.', status: 'approved' as Status },
  { id: 'maker', name: 'Maker', text: 'Made by the Makers. This names an origin. It is not a rank of power.', status: 'approved' as Status },
  { id: 'divine', name: 'Divine', text: 'Of supernatural origin. This names an origin. It is not a rank of power.', status: 'approved' as Status },
  { id: 'primordial', name: 'Primordial', text: 'Of ancient origin. This names an origin. It is not a rank of power.', status: 'approved' as Status },
];

export const ARTIFACT_RULES = [
  'Maker, Divine and Primordial name where an item comes from. They do not rank its power.',
  'Exceptional ceilings are set item by item.',
  'The Makers are a mysterious underground order. They are not a playable species, class or ordinary Career Rank IV. Their origins belong to the Narrator.',
  'Awakening is optional and narrative: Dormant, Awakened, Ascendant, Transcendent.',
  'Bond capacity is 1 at level 1, 2 at level 8 and 3 at level 16. It applies only to relics that state a bond. Equipment slots are still required.',
  'Physical condition, magical integrity and awakening are tracked separately.',
  'Artifacts arrive through the story. Exceptional effects are never copied to other items.',
];

export const BOND_LEVELS = [
  { level: 1, capacity: 1 },
  { level: 8, capacity: 2 },
  { level: 16, capacity: 3 },
];

export function bondCapacity(level: number): number {
  return BOND_LEVELS.filter((b) => b.level <= level).length;
}

export const AWAKENING = ['Dormant', 'Awakened', 'Ascendant', 'Transcendent'];

export const DESIGN_BUDGETS = [
  { name: 'First band', points: '6 to 8' },
  { name: 'Second band', points: '9 to 12' },
  { name: 'Third band', points: '13 to 16' },
  { name: 'World band', points: 'Individual' },
];

export const ARTIFACT_PROPERTIES = [
  '+20 HP',
  '+15 Mana',
  '+4 Armor',
  '+1 attribute',
  'An extra spiritual use',
  'An additional eligible concentration',
  'An extra Reaction, once per Sleep',
  'Ancestral knowledge',
  'A spatial sanctuary',
  'Divine communion',
  'Remove 1 Fatigue, once per Sleep',
  'Artifact resonance',
];

export const MODIFICATION_STATES = [
  { name: 'Open', text: 'The item accepts ordinary modification.' },
  { name: 'Restricted', text: 'The item accepts only some modifications.' },
  { name: 'Sealed', text: 'The item accepts none.' },
  { name: 'Adaptive', text: 'The item changes with its bearer.' },
];

export interface ArtifactExample {
  id: string;
  name: string;
  kind: string;
  stats: string[];
  text: string;
  bond: number;
  status: Status;
}

export const ARTIFACT_EXAMPLES: ArtifactExample[] = [
  {
    id: 'unbroken-oath',
    name: 'Unbroken Oath',
    kind: 'Greatsword',
    stats: ['ATK 11', 'DMG 18', 'W 4'],
    text: 'Gain +2 on mental resistance. Once per Sleep, reroll a mental resistance check. Oath recognition.',
    bond: 1,
    status: 'provisional',
  },
  {
    id: 'first-guardian',
    name: 'First Guardian',
    kind: 'Armor',
    stats: ['Armor 13', 'W 18'],
    text: 'Gain +20 HP and +4 physical threshold. Inscriptions.',
    bond: 2,
    status: 'provisional',
  },
  {
    id: 'astral-witness',
    name: 'Astral Witness',
    kind: 'Catalyst',
    stats: ['+15 Mana', '+3 concentration'],
    text: 'Grants an extra nonoffensive concentration. Celestial interpretation.',
    bond: 2,
    status: 'provisional',
  },
  {
    id: 'heart-of-everlight',
    name: 'Heart of Everlight',
    kind: 'Accessory',
    stats: ['+5 healing spell HP'],
    text: 'Once per Sleep, remove 1 Fatigue. Symbolic guidance.',
    bond: 1,
    status: 'provisional',
  },
  {
    id: 'compass-of-forgotten-roads',
    name: 'Compass of Forgotten Roads',
    kind: 'Relic',
    stats: ['Advantage on supernatural navigation'],
    text: 'Detects magical passages. Records up to 3 destinations.',
    bond: 1,
    status: 'provisional',
  },
  {
    id: 'ember-of-the-first-dragon',
    name: 'Ember of the First Dragon',
    kind: 'Accessory',
    stats: ['+8 Mana'],
    text: 'Reduces form upkeep by 1, to a minimum of 1, while you are transformed. Draconic communication.',
    bond: 2,
    status: 'provisional',
  },
];

export const ONE_RING = {
  name: 'The One Ring',
  summary: 'A unique artifact. The strongest in the world. Linked to the Abyss.',
  rules: [
    'Its corruption is persistent and separate from Madness.',
    'Stages, in order: Resonance, Influence, Attunement, Corruption, Assimilation. The stages are provisional.',
    'The bearer keeps agency at every stage.',
    'Resistance is 2d8 + floor((INS + ARC) / 2) + bonuses. The Narrator sets the frequency and the Challenge Score.',
    'Creatures that are naturally Abyssal are immune to ordinary corruption. Abyssal practitioners are partly compatible. They are not immune.',
    'No ordinary Rest, Sleep or cleanse cures corruption.',
  ],
  domains: ['Abyssal Authority', 'Arcane Supremacy', 'Abyssal Perception', 'Spiritual Dominion', 'Preservation', 'Ascendance'],
  reserved: 'The exact powers, creator, history and location of the Ring are reserved for the Narrator. Nothing here is canon.',
};

export const RING_STAGES = ['Resonance', 'Influence', 'Attunement', 'Corruption', 'Assimilation'];
