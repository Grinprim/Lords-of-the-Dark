import { AttrId, Feature, fx } from './types';

export interface Species {
  id: string;
  name: string;
  family: string;
  mods: Partial<Record<AttrId, number>>;
  /** Human chooses three distinct attributes for +1 each instead of fixed modifiers. */
  chooseThree?: boolean;
  summary: string;
  features: Feature[];
}

// Every species nets +3 across its modifiers.
export const SPECIES: Species[] = [
  {
    id: 'human',
    name: 'Human',
    family: 'Human',
    mods: {},
    chooseThree: true,
    summary: 'Three distinct attributes of your choice gain +1. Pick one species option below.',
    features: [
      {
        id: 'human-adaptability',
        name: 'Adaptability',
        text: 'Gain 1 extra Trait Point.',
        effects: [fx('tp', 1, 'species:human-adaptability')],
        status: 'approved',
      },
      {
        id: 'human-determination',
        name: 'Determination',
        text: 'Your Grace cap is 10.',
        effects: [fx('graceCap', 2, 'species:human-determination')],
        status: 'owner-review',
      },
      {
        id: 'human-quick-learner',
        name: 'Quick Learner',
        text: 'Gain 1 Mastery Point toward your first Path. This applies once.',
        status: 'approved',
      },
    ],
  },
  {
    id: 'elf',
    name: 'Elf',
    family: 'Elf',
    mods: { DEX: 2, ARC: 1, AWA: 1, FOR: -1 },
    summary: 'Quick, perceptive and attuned to magic.',
    features: [
      { id: 'elf-dim-sight', name: 'Dim Sight', text: 'You see in dim light without penalty.', status: 'approved' },
      {
        id: 'elf-mana',
        name: 'Attuned',
        text: 'Gain +3 Mana. This applies only if you have Mana access.',
        effects: [fx('mana', 3, 'species:elf-mana')],
        status: 'approved',
      },
      {
        id: 'elf-mov',
        name: 'Light Step',
        text: 'Gain +1 MOV.',
        effects: [fx('mov', 1, 'species:elf-mov')],
        status: 'approved',
      },
    ],
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    family: 'Dwarf',
    mods: { FOR: 2, STR: 1, VIG: 1, REF: -1 },
    summary: 'Sturdy, patient and at home below ground.',
    features: [
      { id: 'dwarf-craft', name: 'Steady Hands', text: 'Advantage on crafting and repair checks.', status: 'approved' },
      {
        id: 'dwarf-underground',
        name: 'Deep Sight',
        text: 'You see in dim light. Advantage on checks made underground.',
        status: 'approved',
      },
      {
        id: 'dwarf-poison',
        name: 'Hardy Blood',
        text: 'Gain +5 to the Poisoned, Toxic and Rotted thresholds.',
        effects: [fx('thresholdPoison', 5, 'species:dwarf-poison')],
        status: 'approved',
      },
    ],
  },
  {
    id: 'orc',
    name: 'Orc',
    family: 'Orc',
    mods: { STR: 2, VIG: 1, FOR: 1, ARC: -1 },
    summary: 'Strong, stubborn and hard to move.',
    features: [
      { id: 'orc-forced', name: 'Planted', text: 'Advantage on checks against forced movement.', status: 'approved' },
      {
        id: 'orc-stay',
        name: 'Stay Up',
        text: 'Once per Sleep, stay at 1 HP when damage would reduce you to 0.',
        uses: [{ id: 'orc-stay', name: 'Stay Up', count: 1, per: 'sleep' }],
        status: 'owner-review',
      },
      { id: 'orc-intimidate', name: 'Imposing', text: 'Advantage on intimidation checks.', status: 'approved' },
    ],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    family: 'Goblin',
    mods: { DEX: 2, REF: 1, INT: 1, STR: -1 },
    summary: 'Small, clever and quick with tools.',
    features: [
      { id: 'goblin-narrow', name: 'Narrow Access', text: 'You can pass through spaces that are too narrow for larger creatures.', status: 'approved' },
      { id: 'goblin-repair', name: 'Scrapper', text: 'Advantage on repair and salvage checks.', status: 'approved' },
      { id: 'goblin-terrain', name: 'Surefooted', text: 'Ignore the first point of extra terrain cost on each move.', status: 'approved' },
    ],
  },
  {
    id: 'troll',
    name: 'Troll',
    family: 'Troll',
    mods: { VIG: 2, STR: 2, FOR: 1, DEX: -1, REF: -1 },
    summary: 'Huge, tough and slow to wear down.',
    features: [
      {
        id: 'troll-rest',
        name: 'Regeneration',
        text: 'Add your positive VIG to the HP you recover from each Rest.',
        effects: [fx('restHpVig', 1, 'species:troll-rest')],
        status: 'approved',
      },
      {
        id: 'troll-capacity',
        name: 'Heavy Frame',
        text: 'Gain +6 capacity.',
        effects: [fx('capacity', 6, 'species:troll-capacity')],
        status: 'approved',
      },
      {
        id: 'troll-armor',
        name: 'Thick Hide',
        text: 'Gain +1 Armor.',
        effects: [fx('armor', 1, 'species:troll-armor')],
        status: 'approved',
      },
    ],
  },
  {
    id: 'beastkin-wolf',
    name: 'Beastkin: Wolf',
    family: 'Beastkin',
    mods: { AWA: 2, REF: 1, FOR: 1, ARC: -1 },
    summary: 'A keen tracker with a strong sense of smell.',
    features: [{ id: 'wolf-scent', name: 'Scent', text: 'Track and identify by smell. Advantage on checks that rely on scent.', status: 'approved' }],
  },
  {
    id: 'beastkin-fox',
    name: 'Beastkin: Fox',
    family: 'Beastkin',
    mods: { INS: 2, DEX: 1, CHA: 1, FOR: -1 },
    summary: 'Sharp-eared and sharp-witted.',
    features: [{ id: 'fox-hearing', name: 'Hearing', text: 'Advantage on checks that rely on hearing.', status: 'approved' }],
  },
  {
    id: 'beastkin-feline',
    name: 'Beastkin: Feline',
    family: 'Beastkin',
    mods: { REF: 2, DEX: 1, AWA: 1, FOR: -1 },
    summary: 'Agile and balanced on any footing.',
    features: [{ id: 'feline-balance', name: 'Balance', text: 'Advantage on checks to keep your footing on narrow or unstable ground.', status: 'approved' }],
  },
  {
    id: 'beastkin-cervin',
    name: 'Beastkin: Cervin',
    family: 'Beastkin',
    mods: { AWA: 2, REF: 1, INS: 1, STR: -1 },
    summary: 'Alert and quick to notice danger.',
    features: [{ id: 'cervin-detection', name: 'Detection', text: 'Advantage on checks to detect hidden creatures and movement.', status: 'approved' }],
  },
  {
    id: 'beastkin-bear',
    name: 'Beastkin: Bear',
    family: 'Beastkin',
    mods: { STR: 2, VIG: 1, FOR: 1, DEX: -1 },
    summary: 'Broad and strong, built to carry.',
    features: [
      {
        id: 'bear-capacity',
        name: 'Strong Back',
        text: 'Gain +4 capacity.',
        effects: [fx('capacity', 4, 'species:bear-capacity')],
        status: 'approved',
      },
    ],
  },
  {
    id: 'dragonkin',
    name: 'Dragonkin',
    family: 'Dragonkin',
    mods: { ARC: 2, STR: 1, VIG: 1, REF: -1 },
    summary: 'Humanlike, with horns, wings, a tail and scales. Not anthropomorphic. Can take larger forms as they grow.',
    features: [
      {
        id: 'dragonkin-innate',
        name: 'Innate Mana',
        text: 'You have Mana access without a Spellcasting Trait. This gives no ordinary spells.',
        grantsAccess: true,
        status: 'approved',
      },
      { id: 'dragonkin-glide', name: 'Gliding', text: 'You can glide on your wings. Powered flight is exceptional and needs Narrator approval.', status: 'approved' },
      { id: 'dragonkin-tail', name: 'Tail Slot', text: 'You have one extra equipment slot for the tail.', status: 'approved' },
    ],
  },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function speciesNet(s: Species): number {
  return Object.values(s.mods).reduce((a, b) => a + (b ?? 0), 0);
}
