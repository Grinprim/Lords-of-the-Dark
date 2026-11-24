import { Feature, Status, UseDef, fx } from './types';

// ---- Monk ----

export interface MonkTier {
  id: string;
  name: string;
  level: number;
  /** Unarmed Path rank needed. 0 means the Monk Foundation. */
  unarmedRank: number;
  atk: number;
  dmg: number;
}

export const MONK_TIERS: MonkTier[] = [
  { id: 'basic', name: 'Basic', level: 1, unarmedRank: 0, atk: 4, dmg: 4 },
  { id: 'developed', name: 'Developed', level: 4, unarmedRank: 1, atk: 5, dmg: 5 },
  { id: 'advanced', name: 'Advanced', level: 8, unarmedRank: 2, atk: 6, dmg: 6 },
  { id: 'master', name: 'Master', level: 12, unarmedRank: 3, atk: 7, dmg: 7 },
  { id: 'transcendent', name: 'Transcendent', level: 16, unarmedRank: 3, atk: 8, dmg: 9 },
];

export interface MonkTechnique {
  id: string;
  name: string;
  tier: string;
  mana: number;
  concentration: boolean;
  text: string;
  /** Numeric values the sheet can show. */
  heal?: number;
  dmg?: number;
}

const mt = (tier: string, mana: number, name: string, text: string, extra: Partial<MonkTechnique> = {}): MonkTechnique => ({
  id: `monk-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  tier,
  mana,
  concentration: false,
  text,
  ...extra,
});

export const MONK_TECHNIQUES: MonkTechnique[] = [
  mt('basic', 0, 'Spiritual Awareness', 'Gain Advantage on one spiritual check.'),
  mt('basic', 1, 'Inner Harmony', 'Gain +2 on mental thresholds for the Scene.'),
  mt('basic', 1, 'Spirit Pulse', 'Deal 5 Magic damage on a successful Attack.', { dmg: 5 }),
  mt('basic', 0, 'Meditative Focus', 'Gain +1 on knowledge checks.'),
  mt('basic', 1, 'Gentle Presence', 'A willing creature gains +2 on composure.'),
  mt('developed', 2, 'Weightless Spirit', 'Glide for the Scene.'),
  mt('developed', 2, 'Spiritual Ward', 'Gain +3 Armor until your next Turn.'),
  mt('developed', 2, 'Inner Restoration', 'Restore 9 HP to yourself.', { heal: 9 }),
  mt('developed', 1, 'Spirit Resonance', 'Identify a spiritual link.'),
  mt('developed', 2, 'Harmonious Communion', 'Communicate with a willing spirit or creature.'),
  mt('advanced', 3, 'Astral Perception', 'Gain heightened perception.'),
  mt('advanced', 3, 'Guardian Spirit', 'Gain +4 Armor while you concentrate.', { concentration: true }),
  mt('advanced', 3, 'Spiritual Renewal', 'Restore 13 HP and reduce buildup.', { heal: 13 }),
  mt('advanced', 2, 'Tranquil Mind', 'Gain +3 on mental resistance for the Scene while you concentrate.', { concentration: true }),
  mt('advanced', 3, 'Astral Manifestation', 'Deal 12 Magic or Holy damage.', { dmg: 12 }),
  mt('master', 4, 'Spiritwalk', 'Project your spirit while you concentrate.', { concentration: true }),
  mt('master', 4, 'Perfect Harmony', 'Gain +2 on noncombat checks while you concentrate.', { concentration: true }),
  mt('master', 4, 'Spiritual Sanctuary', 'An area grants +3 mental resistance.'),
  mt('master', 4, 'Greater Renewal', 'Restore 18 HP to yourself.', { heal: 18 }),
  mt('master', 4, 'Enlightened Perception', 'Perceive a clue.'),
  mt('transcendent', 5, 'Avatar Spirit', 'Enhance your Manifestation while you concentrate.', { concentration: true }),
  mt('transcendent', 5, 'Transcendent Harmony', 'Gain +5 threshold and +3 resistance while you concentrate.', { concentration: true }),
  mt('transcendent', 5, 'Astral Communion', 'Communicate across a great distance.'),
  mt('transcendent', 5, 'Spiritual Ascendance', 'Deal 22 Magic or Holy damage.', { dmg: 22 }),
  mt('transcendent', 5, 'Perfect Renewal', 'Restore 25 HP and remove one ordinary condition.', { heal: 25 }),
];

export const MONK_RULES = [
  'Monk power is Mana, not Ki. A Monk has no automatic conventional casting.',
  'Manifestation replaces your unarmed ATK and DMG. It uses a weapon slot and has no weight.',
  'Activate Manifestation with 1 Action and 1 Mana. It lasts until Sleep or until you dismiss it.',
  'Learn 2 Basic techniques at the start. Learn 1 more each time a new tier opens.',
  'Enhance a technique once to use the next tier effect at +1 Mana. No catalyst is needed.',
  'Techniques share one concentration. You may wear proficient armor.',
];

// ---- Shaman ----

export interface ShamanAspect {
  id: string;
  name: string;
  stat: string;
  values: [number, number, number];
  text: string;
  narrative: string;
  once?: boolean;
}

export const SHAMAN_ASPECTS: ShamanAspect[] = [
  { id: 'bear', name: 'Bear', stat: 'Armor', values: [2, 3, 4], text: 'Gain Armor.', narrative: 'Endurance.' },
  { id: 'wolf', name: 'Wolf', stat: 'MOV', values: [1, 2, 3], text: 'Gain MOV.', narrative: 'Tracking.' },
  { id: 'phoenix', name: 'Phoenix', stat: 'HP restored', values: [6, 10, 15], text: 'Restore HP once, when you activate the Aspect.', narrative: 'Elemental sensing.', once: true },
  { id: 'turtle', name: 'Turtle', stat: 'Block', values: [1, 2, 3], text: 'Gain Block.', narrative: 'Barriers.' },
  { id: 'stag', name: 'Stag', stat: 'Mental threshold', values: [2, 4, 6], text: 'Gain mental threshold.', narrative: 'Natural spirits.' },
  { id: 'raven', name: 'Raven', stat: 'Supernatural perception', values: [1, 2, 3], text: 'Gain supernatural perception.', narrative: 'Symbols.' },
];

export const SHAMAN_ASPECT_COST = [2, 3, 4];
export const SHAMAN_TIER_NAMES = ['Basic', 'Advanced', 'Master'];

export const SHAMAN_RULES = [
  'Shamans use external spirits. This is not the personal power of a Monk.',
  'Shamans have innate Mana but no conventional casting.',
  'Embodying an Aspect takes 1 Action and 2, 3 or 4 Mana for Basic, Advanced or Master.',
  'An Aspect lasts 3 Scenes and needs concentration. Only one Aspect is active. A new one replaces it. You can dismiss it for free.',
  'Rest or Sleep ends an Aspect.',
  'The Shaman Foundation gives two Basic Aspects. Careers do not add TP, MP or companion capacity.',
];

const sh = (id: string, name: string, text: string, rest: Partial<Feature> = {}): Feature => ({
  id: `shaman:${id}`,
  name,
  text,
  status: 'approved',
  ...rest,
});
const su = (id: string, name: string, count: number, per: UseDef['per']): UseDef => ({ id: `shaman:${id}`, name, count, per });

/** Shaman Career abilities from the specification. They replace the generated proposals for this Career. */
export const SHAMAN_ABILITIES: { basics: Feature[]; upgrades: Feature[]; advanced: Feature[]; mastery: Feature[] } = {
  basics: [
    sh('affinity', 'Spiritual Affinity', 'Gain +1 on spirit checks.', { effects: [fx('check:spirit', 1, 'shaman:affinity')] }),
    sh('reservoir', 'Spirit Reservoir', 'Gain +3 Mana.', { effects: [fx('mana', 3, 'shaman:reservoir')] }),
    sh('control', 'Manifestation Control', 'Gain +1 on concentration checks.', { effects: [fx('check:concentration', 1, 'shaman:control')] }),
    sh('guidance', 'Ancestral Guidance', 'Gain +1 on knowledge checks.', { effects: [fx('check:knowledge', 1, 'shaman:guidance')] }),
  ],
  upgrades: [
    sh('affinity-2', 'Spiritual Affinity II', 'Gain +2 on spirit checks. Replaces Spiritual Affinity.', { effects: [fx('check:spirit', 2, 'shaman:affinity')], replaces: ['shaman:affinity'], status: 'proposal' }),
    sh('reservoir-2', 'Spirit Reservoir II', 'Gain +6 Mana. Replaces Spirit Reservoir.', { effects: [fx('mana', 6, 'shaman:reservoir')], replaces: ['shaman:reservoir'], status: 'proposal' }),
    sh('control-2', 'Manifestation Control II', 'Gain +2 on concentration checks. Replaces Manifestation Control.', { effects: [fx('check:concentration', 2, 'shaman:control')], replaces: ['shaman:control'], status: 'proposal' }),
    sh('guidance-2', 'Ancestral Guidance II', 'Gain +2 on knowledge checks. Replaces Ancestral Guidance.', { effects: [fx('check:knowledge', 2, 'shaman:guidance')], replaces: ['shaman:guidance'], status: 'proposal' }),
  ],
  advanced: [
    sh('greater', 'Greater Manifestation', 'Unlock Advanced Aspects.'),
    sh('expanded', 'Expanded Communion', 'Learn 2 more Aspects.'),
    sh('sustained', 'Sustained Aspect', 'Your Aspect lasts 2 more Scenes.'),
    sh('fluid', 'Fluid Manifestation', 'Once per Encounter, switch Aspects as a free Action. You still pay the Mana.', { uses: [su('fluid', 'Switch Aspect', 1, 'encounter')] }),
  ],
  mastery: [
    sh('ascendant', 'Ascendant Manifestation', 'Unlock Master Aspects. Needs Greater Manifestation.'),
    sh('dual', 'Dual Resonance', 'Hold one Basic Aspect and one different Aspect together. They share concentration.'),
    sh('communion', 'Perfect Communion', 'Advantage on spirit checks.'),
    sh('awakening', 'Spiritual Awakening', 'Once per Sleep, for one Scene, gain +2 on your primary Aspect value or heal 5.', { uses: [su('awakening', 'Spiritual Awakening', 1, 'sleep')] }),
  ],
};

// ---- Dragonkin ----

export interface DragonForm {
  id: string;
  name: string;
  level: number;
  size: string;
  power: string;
  hp: number;
  armor: number;
  attrs: number;
  mov: number;
  physical: number;
  mental: number;
  atk: string;
  dmg: string;
  activation: number;
  upkeep: number;
  revert: number;
  breathMana: string;
  breathAtk: string;
  breathDmg: string;
  breathArea: string;
  resist: string;
  exceptional?: boolean;
}

export const DRAGON_FORMS: DragonForm[] = [
  { id: 'normal', name: 'Normal', level: 1, size: '1x1', power: '1', hp: 0, armor: 0, attrs: 0, mov: 0, physical: 0, mental: 0, atk: 'Gear', dmg: 'Gear', activation: 0, upkeep: 0, revert: 0, breathMana: '2', breathAtk: '3', breathDmg: '5', breathArea: 'Minor', resist: '1' },
  { id: 'partial', name: 'Partial', level: 4, size: '1x1', power: '1.5', hp: 15, armor: 2, attrs: 1, mov: 1, physical: 3, mental: 2, atk: '5', dmg: '7', activation: 5, upkeep: 2, revert: 2, breathMana: '3', breathAtk: '4', breathDmg: '9', breathArea: 'Minor', resist: '2' },
  { id: 'vyvren', name: 'Vyvren', level: 8, size: '2x2', power: '2', hp: 40, armor: 5, attrs: 2, mov: 2, physical: 6, mental: 4, atk: '7', dmg: '12', activation: 10, upkeep: 3, revert: 4, breathMana: '4', breathAtk: '5', breathDmg: '14', breathArea: 'Standard', resist: '3' },
  { id: 'dragon', name: 'Dragon', level: 12, size: '3x3', power: '3', hp: 80, armor: 9, attrs: 3, mov: 3, physical: 10, mental: 6, atk: '10', dmg: '18', activation: 15, upkeep: 5, revert: 6, breathMana: '5', breathAtk: '7', breathDmg: '22', breathArea: 'Greater', resist: '5' },
  { id: 'ancient', name: 'Ancient', level: 99, size: '5x5 or larger', power: '5', hp: 160, armor: 15, attrs: 5, mov: 4, physical: 15, mental: 10, atk: '14+', dmg: '30+', activation: 25, upkeep: 8, revert: 10, breathMana: '8', breathAtk: '10+', breathDmg: '35+', breathArea: 'Exceptional', resist: 'Individual', exceptional: true },
];

export const DRAGON_FORM_BY_ID: Record<string, DragonForm> = Object.fromEntries(DRAGON_FORMS.map((f) => [f.id, f]));

export const DRAGON_FORM_RULES = [
  'Changing form takes 1 Action. Reverting takes 1 Action.',
  'Pay the upkeep at the start of the following Scene. If you cannot pay, you revert for free and gain 1 Fatigue.',
  'Forms do not need concentration. Rest or Sleep returns you to Normal.',
  'HP keeps the same proportion across the change. Round down. Never round up.',
  'Conditions and spent uses carry over.',
  'Normal and Partial forms keep gear and casting if you learned it.',
  'Vyvren and larger forms merge or suspend gear. Only compatible passive properties keep working. You cannot cast ordinary spells.',
  'The tail slot gives no ATK, Accuracy or Block bonus. It keeps its DMG. You are Prone if you already have a tail item equipped. Equipping an empty tail slot takes 2 Actions.',
  'Temporary attribute gains from a form can exceed the cap. They do not change derived stats except where the table says so.',
  'The Ancient form is an exceptional Narrator unlock. Flight is exceptional for Normal and Partial. Larger forms are set individually.',
  'Power targets of 1, 1.5, 2, 3 and 5 are relative guides. They are not literal multipliers.',
];

export const DRAGON_AFFINITIES = ['Fire', 'Frost', 'Lightning', 'Magic'];

export interface DragonProperty {
  id: string;
  name: string;
  text: string;
  minLevel: number;
  effects?: { stat: string; v: number }[];
}

export const DRAGON_PROPERTIES: DragonProperty[] = [
  { id: 'perception', name: 'Perception', text: 'Gain +2 on supernatural perception.', minLevel: 1 },
  { id: 'ancestral-memory', name: 'Ancestral Memory', text: 'Advantage on history checks.', minLevel: 1 },
  { id: 'vitality', name: 'Vitality', text: 'Gain +6 HP.', minLevel: 1, effects: [{ stat: 'hp', v: 6 }] },
  { id: 'arcane-bloodline', name: 'Arcane Bloodline', text: 'Gain +4 Mana.', minLevel: 1, effects: [{ stat: 'mana', v: 4 }] },
  { id: 'scales', name: 'Scales', text: 'Gain +1 Armor.', minLevel: 1, effects: [{ stat: 'armor', v: 1 }] },
  { id: 'elemental-resilience', name: 'Elemental Resilience', text: 'Gain +1 resistance to your affinity.', minLevel: 1 },
  { id: 'spiritual-presence', name: 'Spiritual Presence', text: 'Gain +2 on social checks.', minLevel: 1 },
  { id: 'wing-mastery', name: 'Wing Mastery', text: 'You glide with more control.', minLevel: 1 },
  { id: 'communion', name: 'Communion', text: 'You can communicate with draconic entities.', minLevel: 1 },
  { id: 'efficient-manifestation', name: 'Efficient Manifestation', text: 'Reduce form activation cost by 1, to a minimum of 1.', minLevel: 1 },
  { id: 'sustained-manifestation', name: 'Sustained Manifestation', text: 'Reduce form upkeep by 1, to a minimum of 1.', minLevel: 12 },
  { id: 'greater-affinity', name: 'Greater Affinity', text: 'Gain +3 on breath DMG.', minLevel: 12 },
];

export const DRAGON_PROPERTY_LEVELS = [1, 4, 8, 12, 16];
export const DRAGON_PROPERTY_BY_ID: Record<string, DragonProperty> = Object.fromEntries(DRAGON_PROPERTIES.map((p) => [p.id, p]));

export const SPIRITUAL_STATUS: Record<string, Status> = {
  monk: 'approved',
  shaman: 'approved',
  dragon: 'provisional',
};
