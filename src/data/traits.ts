import { Effect, Status, fx } from './types';

export type TraitKind = 'ranked' | 'single' | 'advanced' | 'exceptional';

export interface TraitDef {
  id: string;
  name: string;
  group: string;
  kind: TraitKind;
  /** Number of ranks. 1 for single, advanced and exceptional Traits. */
  ranks: number;
  /** TP price of each rank. Rank prices are paid one rank at a time. */
  cost: number[];
  /** Minimum character level for each rank. */
  levelReq: number[];
  text: string;
  /** Numeric effect: stat and value per rank. */
  eff?: { stat: string; values: number[] }[];
  unit?: string;
  repeatable?: boolean;
  /** The player names a choice, such as a language or a specific field. */
  optionLabel?: string;
  /** Rank r allows r picks from these fields. */
  fieldOptions?: string[];
  grantsAccess?: boolean;
  needsAccess?: boolean;
  status: Status;
  note?: string;
}

const RANK_COST = [1, 2, 3];
const RANK_LEVEL = [1, 4, 8];

function ranked(
  id: string,
  name: string,
  group: string,
  stat: string,
  values: number[],
  text: string,
  extra: Partial<TraitDef> = {},
): TraitDef {
  return {
    id,
    name,
    group,
    kind: 'ranked',
    ranks: values.length,
    cost: RANK_COST.slice(0, values.length),
    levelReq: RANK_LEVEL.slice(0, values.length),
    text,
    eff: [{ stat, values }],
    status: 'approved',
    ...extra,
  };
}

function single(id: string, name: string, group: string, cost: number, text: string, extra: Partial<TraitDef> = {}): TraitDef {
  return {
    id,
    name,
    group,
    kind: cost >= 2 ? 'advanced' : 'single',
    ranks: 1,
    cost: [cost],
    levelReq: [1],
    text,
    status: 'approved',
    ...extra,
  };
}

function exceptional(id: string, name: string, text: string): TraitDef {
  return {
    id,
    name,
    group: 'Exceptional',
    kind: 'exceptional',
    ranks: 1,
    cost: [0],
    levelReq: [1],
    text: `${text} Needs a Narrator grant. It is never bought with TP.`,
    status: 'approved',
  };
}

export const ACADEMIC_FIELDS = [
  'History',
  'Theology',
  'Geography',
  'Politics',
  'Magical Theory',
  'Medicine',
  'Natural Philosophy',
  'Linguistics',
  'Ancient Civilizations',
  'Supernatural Creatures',
];

export const CRAFT_DISCIPLINES = [
  { id: 'blacksmithing', name: 'Blacksmithing', attrs: ['STR', 'INT'] },
  { id: 'alchemy', name: 'Alchemy', attrs: ['INT', 'ARC'] },
  { id: 'herbalism', name: 'Herbalism', attrs: ['INT', 'AWA'] },
  { id: 'artificing', name: 'Artificing', attrs: ['INT', 'DEX'] },
  { id: 'enchanting', name: 'Enchanting', attrs: ['ARC', 'INT'] },
  { id: 'general-craft', name: 'General Craft', attrs: ['DEX', 'INT'] },
] as const;

const checkTraits: [string, string, string, string][] = [
  ['stability', 'Stability', 'check:stability', 'checks to stay on your feet and resist being moved'],
  ['fatigue-resistance', 'Fatigue Resistance', 'check:fatigue', 'checks against Fatigue'],
  ['physical-aptitude', 'Physical Aptitude', 'check:physical', 'physical checks'],
  ['perception', 'Perception', 'check:perception', 'perception checks'],
  ['magical-resistance', 'Magical Resistance', 'check:magical-resistance', 'checks to resist magical effects'],
  ['concentration', 'Concentration', 'check:concentration', 'concentration checks'],
  ['ritual-practice', 'Ritual Practice', 'check:ritual', 'ritual checks'],
  ['companion-handling', 'Companion Handling', 'check:companion', 'checks to handle companions'],
  ['summoning-control', 'Summoning Control', 'check:summoning', 'checks to control summoned creatures'],
  ['academic-expertise', 'Academic Expertise', 'check:academic', 'academic checks'],
  ['social-expertise', 'Social Expertise', 'check:social', 'social checks'],
  ['social-insight', 'Social Insight', 'check:insight', 'checks to read people'],
  ['stealth-expertise', 'Stealth Expertise', 'check:stealth', 'stealth checks'],
  ['general-aptitude', 'General Aptitude', 'check:general', 'ordinary mundane checks'],
];

export const TRAITS: TraitDef[] = [
  // Core resources
  ranked('health', 'Health', 'Resources', 'hp', [4, 8, 12], 'Increase your maximum HP.', { unit: 'HP' }),
  ranked('mana', 'Mana', 'Resources', 'mana', [3, 6, 9], 'Increase your maximum Mana. You need Mana access.', { unit: 'Mana', needsAccess: true }),
  ranked('capacity', 'Capacity', 'Resources', 'capacity', [2, 4, 6], 'Increase your carrying capacity.', { unit: 'W' }),
  ranked('movement', 'Movement', 'Resources', 'mov', [1, 2], 'Increase your MOV.', { unit: 'MOV' }),
  ranked('grace', 'Grace', 'Resources', 'graceStart', [1, 2, 3], 'Start each combat with more Grace.', { unit: 'Grace' }),
  ranked('physical-threshold', 'Physical Resilience', 'Resources', 'thresholdPhysical', [2, 4, 6], 'Raise your physical buildup thresholds.', { unit: 'threshold' }),
  ranked('mental-threshold', 'Mental Resilience', 'Resources', 'thresholdMental', [2, 4, 6], 'Raise your mental buildup thresholds.', { unit: 'threshold' }),
  ranked('improved-recovery', 'Improved Recovery', 'Resources', 'restHp', [1, 2, 3], 'Recover extra HP once for each Rest.', { unit: 'Rest HP' }),

  // Combat and checks
  ranked('improved-dodge', 'Improved Dodge', 'Combat', 'dodge', [1, 2, 3], 'Add to your Dodge rolls.', { unit: 'Dodge' }),
  single('dual-wield', 'Dual Wield', 'Combat', 2, 'Attack with two weapons as one Attack Action. Make two rolls at -1 ATK each.'),
  ...checkTraits
    .filter(([id]) => id !== 'improved-dodge')
    .map(([id, name, stat, applies]) =>
      ranked(id, name, 'Checks', stat, [1, 2, 3], `Gain a bonus on ${applies}.`, { unit: 'checks' }),
    ),
  ranked('acrobatics', 'Acrobatics', 'Checks', 'check:acrobatics', [1, 2], 'Gain a bonus on acrobatics checks. This Trait has two ranks.', { unit: 'checks' }),

  // Companions and summons
  ranked('companion-vitality', 'Companion Vitality', 'Companions', 'companionHp', [3, 6, 9], 'Your companions gain maximum HP.', { unit: 'HP' }),
  ranked('summoned-vitality', 'Summoned Vitality', 'Companions', 'summonHp', [2, 4, 6], 'Your summoned creatures gain maximum HP.', { unit: 'HP' }),
  single('companion-recovery', 'Companion Recovery', 'Companions', 1, 'Your companions recover +3 HP from each Rest.'),

  // Knowledge
  {
    id: 'academic-knowledge',
    name: 'Academic Knowledge',
    group: 'Knowledge',
    kind: 'ranked',
    ranks: 3,
    cost: RANK_COST,
    levelReq: RANK_LEVEL,
    text: 'Gain +2 on checks in chosen fields. Rank I picks 1 field, rank II picks 2, rank III picks 3.',
    fieldOptions: ACADEMIC_FIELDS,
    status: 'approved',
  },
  single('exceptional-memory', 'Exceptional Memory', 'Knowledge', 2, 'Advantage on checks to recall information.'),
  single('sensory-adaptation', 'Sensory Adaptation', 'Knowledge', 2, 'You see in dim light without penalty.'),
  single('appraisal', 'Appraisal', 'Knowledge', 1, 'Gain +2 on appraisal checks.', { eff: [{ stat: 'check:appraisal', values: [2] }] }),
  single('maintenance', 'Maintenance', 'Knowledge', 1, 'Gain +2 on maintenance checks.', { eff: [{ stat: 'check:maintenance', values: [2] }] }),
  single('concealment', 'Concealment', 'Knowledge', 1, 'Gain +2 on concealment checks.', { eff: [{ stat: 'check:concealment', values: [2] }] }),
  single('additional-language', 'Additional Language', 'Knowledge', 1, 'Learn one more language. You can take this Trait again for each new language.', {
    repeatable: true,
    optionLabel: 'Language',
  }),
  ...(
    [
      ['cultural-knowledge', 'Cultural Knowledge'],
      ['regional-knowledge', 'Regional Knowledge'],
      ['navigation-knowledge', 'Navigation Knowledge'],
      ['animal-affinity', 'Animal Affinity'],
      ['performance-knowledge', 'Performance Knowledge'],
      ['medical-knowledge', 'Medical Knowledge'],
      ['professional-knowledge', 'Professional Knowledge'],
      ['environmental-adaptation', 'Environmental Adaptation'],
    ] as const
  ).map(([id, name]) =>
    single(id, name, 'Knowledge', 1, 'Gain +2 on checks about one specific subject you name.', {
      optionLabel: 'Subject',
      repeatable: true,
    }),
  ),
  single('natural-preservation', 'Natural Preservation', 'Knowledge', 1, 'Gain +2 on checks to preserve natural materials.'),
  single('technical-maintenance', 'Technical Maintenance', 'Knowledge', 1, 'Gain +2 on checks to maintain devices.'),
  single('enchantment-maintenance', 'Enchantment Maintenance', 'Knowledge', 1, 'Gain +2 on checks to maintain enchantments.'),

  // Craft
  ...CRAFT_DISCIPLINES.flatMap((d) => [
    single(`${d.id}-access`, `${d.name} Access`, 'Craft', 1, `Craft with the ${d.name} discipline. Basic recipes are open to you.`),
    ranked(`${d.id}-expertise`, `${d.name} Expertise`, 'Craft', `check:craft-${d.id}`, [1, 2, 3], `Gain a bonus on ${d.name} checks.`, { unit: 'checks' }),
    single(`${d.id}-knowledge`, `${d.name} Knowledge`, 'Craft', 2, `Open the advanced recipes of ${d.name}.`),
  ]),

  // Magic
  single('spellcasting', 'Spellcasting', 'Magic', 2, 'Gain Mana access and learn spells from your school.', { grantsAccess: true }),
  single('ritual-literacy', 'Ritual Literacy', 'Magic', 1, 'Read and perform written rituals.'),
  ...(
    [
      ['fire', 'Fire'],
      ['water', 'Water'],
      ['earth', 'Earth'],
      ['wind', 'Wind'],
    ] as const
  ).map(([id, name]) =>
    ranked(`affinity-${id}`, `${name} Affinity`, 'Magic', `check:affinity-${id}`, [1, 2, 3], `Gain a bonus on noncombat manipulation of ${name.toLowerCase()}.`, { unit: 'checks' }),
  ),

  // Exceptional
  exceptional('additional-school', 'Additional School', 'Learn spells from one extra school.'),
  exceptional('abyssal-affinity', 'Abyssal Affinity', 'Gain access to Abyssal Sorcery.'),
  exceptional('blood-affinity', 'Blood Affinity', 'Gain access to Blood Incantations.'),
  exceptional('draconic-affinity', 'Draconic Affinity', 'Gain a draconic affinity.'),
  exceptional('flight', 'Flight', 'Gain powered flight.'),
];

export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export function traitEffects(def: TraitDef, rank: number): Effect[] {
  if (rank <= 0) return [];
  const out: Effect[] = [];
  for (const e of def.eff ?? []) {
    const v = e.values[Math.min(rank, e.values.length) - 1];
    if (v) out.push(fx(e.stat, v, `trait:${def.id}`, def.name));
  }
  if (def.id === 'academic-knowledge') return out;
  return out;
}

export function traitRankLabel(def: TraitDef, rank: number): string {
  if (def.id === 'academic-knowledge') return `${rank} field${rank > 1 ? 's' : ''}, +2`;
  const e = def.eff?.[0];
  if (!e) return def.ranks > 1 ? `Rank ${'I'.repeat(rank)}` : '';
  const v = e.values[Math.min(rank, e.values.length) - 1];
  return `+${v}${def.unit ? ' ' + def.unit : ''}`;
}

export function traitTotalCost(def: TraitDef): number {
  return def.cost.reduce((a, b) => a + b, 0);
}

// ---- Proficiencies (data only, equipment items link to these ids) ----

export interface ProficiencyDef {
  id: string;
  name: string;
  group: 'melee' | 'colossal' | 'ranged' | 'armor' | 'exceptional-armor' | 'shield' | 'unarmed';
  cost: number;
}
