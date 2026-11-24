import { AttrId, Effect, Status, UseDef, fx } from './types';
import { CRAFT_DISCIPLINES } from './traits';

export interface PathRank {
  text: string[];
  effects?: Effect[];
  /** Trait id -> rank granted for free. The highest granted or bought rank applies. */
  grantsTraits?: Record<string, number>;
  /** Proficiency ids or group tokens such as group:melee. */
  grantsProf?: string[];
  uses?: UseDef[];
  attr?: Partial<Record<AttrId, number>>;
  /** Spell branch this rank belongs to. */
  caster?: 'sorcery' | 'incantation';
  /** Mark individual rank lines as provisional. */
  provisional?: boolean;
}

export interface PathDef {
  id: string;
  name: string;
  group: 'Physical' | 'Magic' | 'Crafting' | 'Mind and Society' | 'Companion';
  summary: string;
  ranks: [PathRank, PathRank, PathRank];
  status: Status;
  note?: string;
}

const use = (id: string, name: string, count: number, per: UseDef['per']): UseDef => ({ id, name, count, per });
const k = (path: string, what = '') => `path:${path}${what ? ':' + what : ''}`;

function craftPath(d: (typeof CRAFT_DISCIPLINES)[number]): PathDef {
  const id = d.id;
  const attr3: Partial<Record<AttrId, number>> | undefined =
    id === 'alchemy' || id === 'artificing' ? { INT: 1 } : id === 'enchanting' ? { ARC: 1 } : undefined;
  return {
    id,
    name: d.name,
    group: 'Crafting',
    summary: `Craft and maintain work in ${d.name}.`,
    status: 'approved',
    ranks: [
      {
        text: [`${d.name} Access.`, `${d.name} Expertise I.`, `${d.name} Knowledge, which opens the advanced recipes.`],
        grantsTraits: { [`${id}-access`]: 1, [`${id}-expertise`]: 1, [`${id}-knowledge`]: 1 },
      },
      {
        text: [`${d.name} Expertise II.`, 'Superior maintenance and modifications.'],
        grantsTraits: { [`${id}-expertise`]: 2 },
      },
      {
        text: [
          `${d.name} Expertise III.`,
          'Master recipes and artifact-equivalent work at level 16.',
          'Once per Sleep, reroll a failed craft check with Advantage.',
          ...(attr3 ? [`Gain +1 ${Object.keys(attr3)[0]}.`] : []),
        ],
        grantsTraits: { [`${id}-expertise`]: 3 },
        uses: [use(`${id}-reroll`, `${d.name} reroll`, 1, 'sleep')],
        attr: attr3,
      },
    ],
  };
}

export const PATHS: PathDef[] = [
  {
    id: 'melee',
    name: 'Melee',
    group: 'Physical',
    summary: 'Skill with hand weapons.',
    status: 'approved',
    ranks: [
      { text: ['All melee proficiencies.'], grantsProf: ['group:melee'] },
      { text: ['+1 Accuracy with melee attacks.'], effects: [fx('accuracyMelee', 1, k('melee'))] },
      { text: ['+2 Accuracy with melee attacks. Replaces the rank II bonus.'], effects: [fx('accuracyMelee', 2, k('melee'))] },
    ],
  },
  {
    id: 'ranged',
    name: 'Ranged',
    group: 'Physical',
    summary: 'Skill with bows, crossbows and firearms.',
    status: 'approved',
    ranks: [
      { text: ['All ranged proficiencies.'], grantsProf: ['group:ranged'] },
      { text: ['+1 Accuracy with ranged attacks.'], effects: [fx('accuracyRanged', 1, k('ranged'))] },
      { text: ['+2 Accuracy with ranged attacks. Replaces the rank II bonus.'], effects: [fx('accuracyRanged', 2, k('ranged'))] },
    ],
  },
  {
    id: 'heavy',
    name: 'Heavy',
    group: 'Physical',
    summary: 'Colossal weapons and the strength to carry them.',
    status: 'approved',
    ranks: [
      { text: ['All colossal proficiencies.', 'Capacity I.'], grantsProf: ['group:colossal'], grantsTraits: { capacity: 1 } },
      {
        text: ['Capacity II.', 'Reduce the W of colossal weapons by 2, to a minimum of 1.'],
        grantsTraits: { capacity: 2 },
        effects: [fx('colossalWeightReduction', 2, k('heavy'))],
      },
      {
        text: ['Capacity III.', 'Reduce the W of colossal weapons by 4, to a minimum of 1.'],
        grantsTraits: { capacity: 3 },
        effects: [fx('colossalWeightReduction', 4, k('heavy'))],
      },
    ],
  },
  {
    id: 'armor',
    name: 'Armor',
    group: 'Physical',
    summary: 'Wearing armor well.',
    status: 'approved',
    ranks: [
      {
        text: ['Conventional armor proficiencies.', 'Reduce the W of worn armor by 1.'],
        grantsProf: ['group:conventional-armor'],
        effects: [fx('armorWeightReduction', 1, k('armor'))],
      },
      {
        text: ['Reduce the W of worn armor by 2.', 'Capacity I.'],
        effects: [fx('armorWeightReduction', 2, k('armor'))],
        grantsTraits: { capacity: 1 },
      },
      {
        text: ['Reduce the W of worn armor by 3.', 'Capacity II.', '+1 Armor.'],
        effects: [fx('armorWeightReduction', 3, k('armor')), fx('armor', 1, k('armor', 'armor'))],
        grantsTraits: { capacity: 2 },
      },
    ],
  },
  {
    id: 'shield',
    name: 'Shield',
    group: 'Physical',
    summary: 'Blocking and holding ground.',
    status: 'approved',
    ranks: [
      { text: ['All shield proficiencies.', '+1 Block.'], grantsProf: ['group:shield'], effects: [fx('block', 1, k('shield'))] },
      {
        text: ['Stability I.', 'Once per Encounter, reroll a Stability check.'],
        grantsTraits: { stability: 1 },
        uses: [use('shield-reroll', 'Stability reroll', 1, 'encounter')],
      },
      { text: ['Stability II.', '+2 Block. Replaces the rank I bonus.'], grantsTraits: { stability: 2 }, effects: [fx('block', 2, k('shield'))] },
    ],
  },
  {
    id: 'unarmed',
    name: 'Unarmed',
    group: 'Physical',
    summary: 'Fighting with fists and body.',
    status: 'approved',
    ranks: [
      { text: ['Unarmed proficiency.'], grantsProf: ['prof-unarmed'] },
      { text: ['Health I.', '+1 Accuracy with unarmed attacks.'], grantsTraits: { health: 1 }, effects: [fx('accuracyUnarmed', 1, k('unarmed'))] },
      {
        text: ['Health II.', '+2 Accuracy with unarmed attacks. Replaces the rank II bonus.'],
        grantsTraits: { health: 2 },
        effects: [fx('accuracyUnarmed', 2, k('unarmed'))],
      },
    ],
  },
  {
    id: 'sorcery',
    name: 'Sorcery',
    group: 'Magic',
    summary: 'The caster Path for Sorceries: Arcane, Void and Abyssal.',
    status: 'approved',
    note: 'Caster Paths are exclusive for ordinary characters. You pick Sorcery or Incantation.',
    ranks: [
      { text: ['Spellcasting. Caster I.'], grantsTraits: { spellcasting: 1 }, caster: 'sorcery' },
      { text: ['Mana I. Caster II.'], grantsTraits: { mana: 1 }, caster: 'sorcery' },
      { text: ['Mana II. Caster III.'], grantsTraits: { mana: 2 }, caster: 'sorcery' },
    ],
  },
  {
    id: 'incantation',
    name: 'Incantation',
    group: 'Magic',
    summary: 'The caster Path for Incantations: Elemental, Bestial, Divine and Blood.',
    status: 'approved',
    note: 'Caster Paths are exclusive for ordinary characters. You pick Sorcery or Incantation.',
    ranks: [
      { text: ['Spellcasting. Caster I.'], grantsTraits: { spellcasting: 1 }, caster: 'incantation' },
      { text: ['Mana I. Caster II.'], grantsTraits: { mana: 1 }, caster: 'incantation' },
      { text: ['Mana II. Caster III.'], grantsTraits: { mana: 2 }, caster: 'incantation' },
    ],
  },
  {
    id: 'mana-mastery',
    name: 'Mana Mastery',
    group: 'Magic',
    summary: 'A deeper pool and faster recovery.',
    status: 'provisional',
    ranks: [
      { text: ['Mana I.', '+2 Mana recovered on each Rest.'], grantsTraits: { mana: 1 }, effects: [fx('restMana', 2, k('mana-mastery'))] },
      { text: ['Mana II.', '+4 Mana recovered on each Rest.'], grantsTraits: { mana: 2 }, effects: [fx('restMana', 4, k('mana-mastery'))] },
      {
        text: ['Mana III.', '+6 Mana recovered on each Rest.', 'Once per Sleep, recover 5 Mana. Provisional.'],
        grantsTraits: { mana: 3 },
        effects: [fx('restMana', 6, k('mana-mastery'))],
        uses: [use('mana-mastery-recover', 'Recover 5 Mana', 1, 'sleep')],
        provisional: true,
      },
    ],
  },
  {
    id: 'magical-control',
    name: 'Magical Control',
    group: 'Magic',
    summary: 'Holding spells steady.',
    status: 'provisional',
    ranks: [
      { text: ['Concentration I.', '+1 on checks to control unstable magic.'], grantsTraits: { concentration: 1 }, effects: [fx('check:unstable-magic', 1, k('magical-control'))] },
      {
        text: ['Concentration II.', 'Once per Encounter, reroll a concentration check.'],
        grantsTraits: { concentration: 2 },
        uses: [use('magical-control-reroll', 'Concentration reroll', 1, 'encounter')],
      },
      {
        text: ['Concentration III.', '+2 on checks to control unstable magic. Replaces the rank I bonus. Provisional.'],
        grantsTraits: { concentration: 3 },
        effects: [fx('check:unstable-magic', 2, k('magical-control'))],
        provisional: true,
      },
    ],
  },
  {
    id: 'ritual',
    name: 'Ritual',
    group: 'Magic',
    summary: 'Written and practiced ritual magic.',
    status: 'owner-review',
    note: 'The source text names Literacy and Practice I to III together. Literacy and Practice I come at rank I here.',
    ranks: [
      { text: ['Ritual Literacy.', 'Ritual Practice I.'], grantsTraits: { 'ritual-literacy': 1, 'ritual-practice': 1 } },
      { text: ['Ritual Practice II.'], grantsTraits: { 'ritual-practice': 2 } },
      {
        text: ['Ritual Practice III.', 'Once per Sleep, reroll a ritual check with Advantage.'],
        grantsTraits: { 'ritual-practice': 3 },
        uses: [use('ritual-reroll', 'Ritual reroll', 1, 'sleep')],
      },
    ],
  },
  {
    id: 'vitality',
    name: 'Vitality',
    group: 'Physical',
    summary: 'Health and recovery.',
    status: 'approved',
    ranks: [
      { text: ['Health I.', '+2 HP recovered on each Rest.'], grantsTraits: { health: 1 }, effects: [fx('restHp', 2, k('vitality', 'rest'))] },
      { text: ['Health II.', '+4 HP recovered on each Rest.'], grantsTraits: { health: 2 }, effects: [fx('restHp', 4, k('vitality', 'rest'))] },
      {
        text: ['Health III.', '+6 HP recovered on each Rest.', 'Once per Sleep, recover 8 extra HP.', '+1 VIG.'],
        grantsTraits: { health: 3 },
        effects: [fx('restHp', 6, k('vitality', 'rest')), fx('sleepHp', 8, k('vitality', 'sleep'))],
        attr: { VIG: 1 },
      },
    ],
  },
  {
    id: 'fortitude',
    name: 'Fortitude',
    group: 'Physical',
    summary: 'Resisting poison, wounds and strain.',
    status: 'approved',
    ranks: [
      { text: ['Physical Resilience I.', '+1 on resistance checks against physical buildup.'], grantsTraits: { 'physical-threshold': 1 }, effects: [fx('check:physical-resistance', 1, k('fortitude'))] },
      { text: ['Physical Resilience II.', '+1 buildup decay.'], grantsTraits: { 'physical-threshold': 2 }, effects: [fx('decay', 1, k('fortitude', 'decay'))] },
      {
        text: ['Physical Resilience III.', '+2 on resistance checks and +2 buildup decay.', '+1 FOR.'],
        grantsTraits: { 'physical-threshold': 3 },
        effects: [fx('check:physical-resistance', 2, k('fortitude')), fx('decay', 2, k('fortitude', 'decay'))],
        attr: { FOR: 1 },
      },
    ],
  },
  {
    id: 'endurance',
    name: 'Endurance',
    group: 'Physical',
    summary: 'Pushing on without tiring.',
    status: 'approved',
    ranks: [
      { text: ['Fatigue Resistance I.', '+1 on prolonged effort checks.'], grantsTraits: { 'fatigue-resistance': 1 }, effects: [fx('check:prolonged', 1, k('endurance'))] },
      {
        text: ['Fatigue Resistance II.', 'Once per Sleep, prevent 1 Fatigue.'],
        grantsTraits: { 'fatigue-resistance': 2 },
        uses: [use('endurance-prevent', 'Prevent Fatigue', 1, 'sleep')],
      },
      {
        text: ['Fatigue Resistance III.', '+2 on prolonged effort checks.', 'Prevent 2 Fatigue per Sleep instead of 1.'],
        grantsTraits: { 'fatigue-resistance': 3 },
        effects: [fx('check:prolonged', 2, k('endurance'))],
        uses: [use('endurance-prevent', 'Prevent Fatigue', 2, 'sleep')],
      },
    ],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    group: 'Physical',
    summary: 'Moving over rough ground.',
    status: 'owner-review',
    note: 'The source text pairs Movement, Acrobatics and terrain rules loosely. This reading follows the Armor pattern.',
    ranks: [
      { text: ['Movement I.', 'Ignore the first point of extra terrain cost.'], grantsTraits: { movement: 1 } },
      { text: ['Acrobatics I.'], grantsTraits: { acrobatics: 1 } },
      {
        text: ['Movement II.', 'Acrobatics II.', 'Ignore ordinary difficult terrain.', '+2 on traversal checks.', 'Movement II replaces Movement I. It does not add a second MOV bonus.'],
        grantsTraits: { movement: 2, acrobatics: 2 },
        effects: [fx('check:traversal', 2, k('mobility'))],
      },
    ],
  },
  {
    id: 'reflex',
    name: 'Reflex',
    group: 'Physical',
    summary: 'Dodging and recovering from daze.',
    status: 'approved',
    ranks: [
      { text: ['Improved Dodge I.', '+1 to resist Dazed and Hesitation.'], grantsTraits: { 'improved-dodge': 1 }, effects: [fx('resist:dazed', 1, k('reflex'))] },
      {
        text: ['Improved Dodge II.', 'Once per Encounter, reroll a Dodge.'],
        grantsTraits: { 'improved-dodge': 2 },
        uses: [use('reflex-reroll', 'Dodge reroll', 1, 'encounter')],
      },
      {
        text: ['Improved Dodge III.', '+2 to resist Dazed and Hesitation. Replaces the rank I bonus.', 'Reroll a Dodge twice per Encounter.', '+1 REF.'],
        grantsTraits: { 'improved-dodge': 3 },
        effects: [fx('resist:dazed', 2, k('reflex'))],
        uses: [use('reflex-reroll', 'Dodge reroll', 2, 'encounter')],
        attr: { REF: 1 },
      },
    ],
  },
  {
    id: 'physical-power',
    name: 'Physical Power',
    group: 'Physical',
    summary: 'Raw strength, lifting and holding.',
    status: 'approved',
    ranks: [
      { text: ['Capacity I.', 'Physical Aptitude I.', '+1 to resist forced movement.'], grantsTraits: { capacity: 1, 'physical-aptitude': 1 }, effects: [fx('check:forced-move', 1, k('physical-power'))] },
      { text: ['Capacity II.', 'Physical Aptitude II.', 'Advantage on sustained physical effort.'], grantsTraits: { capacity: 2, 'physical-aptitude': 2 } },
      {
        text: ['Capacity III.', 'Physical Aptitude III.', '+2 to resist forced movement. Replaces the rank I bonus.', '+1 STR.'],
        grantsTraits: { capacity: 3, 'physical-aptitude': 3 },
        effects: [fx('check:forced-move', 2, k('physical-power'))],
        attr: { STR: 1 },
      },
    ],
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    group: 'Mind and Society',
    summary: 'Holding the mind steady.',
    status: 'approved',
    ranks: [
      { text: ['Mental Resilience I.', '+1 on mental resistance checks.'], grantsTraits: { 'mental-threshold': 1 }, effects: [fx('check:mental-resistance', 1, k('iron-will'))] },
      { text: ['Mental Resilience II.', '+1 buildup decay.'], grantsTraits: { 'mental-threshold': 2 }, effects: [fx('decay', 1, k('iron-will', 'decay'))] },
      {
        text: ['Mental Resilience III.', '+2 on mental resistance checks and +2 buildup decay.', 'Once per Sleep, reroll a mental resistance check with Advantage.', '+1 INS.'],
        grantsTraits: { 'mental-threshold': 3 },
        effects: [fx('check:mental-resistance', 2, k('iron-will')), fx('decay', 2, k('iron-will', 'decay'))],
        uses: [use('iron-will-reroll', 'Mental reroll', 1, 'sleep')],
        attr: { INS: 1 },
      },
    ],
  },
  {
    id: 'heightened-senses',
    name: 'Heightened Senses',
    group: 'Mind and Society',
    summary: 'Noticing what others miss.',
    status: 'approved',
    ranks: [
      { text: ['Perception I.', 'Advantage on subtle perception checks.'], grantsTraits: { perception: 1 } },
      { text: ['Perception II.', 'Sensory Adaptation.'], grantsTraits: { perception: 2, 'sensory-adaptation': 1 } },
      {
        text: ['Perception III.', '+1 AWA.', 'Once per Scene, reroll a perception check.'],
        grantsTraits: { perception: 3 },
        uses: [use('senses-reroll', 'Perception reroll', 1, 'scene')],
        attr: { AWA: 1 },
      },
    ],
  },
  {
    id: 'arcane-resistance',
    name: 'Arcane Resistance',
    group: 'Magic',
    summary: 'Standing against hostile magic.',
    status: 'provisional',
    note: 'A flat 2 point reduction against magic damage was deferred in the source and is not implemented.',
    ranks: [
      { text: ['Magical Resistance I.', '+2 to the Madness threshold against magical sources.'], grantsTraits: { 'magical-resistance': 1 }, effects: [fx('thresholdMadness', 2, k('arcane-resistance'))] },
      {
        text: ['Magical Resistance II.', 'Once per Encounter, reroll a check against magic.'],
        grantsTraits: { 'magical-resistance': 2 },
        uses: [use('arcane-resistance-reroll', 'Magic resistance reroll', 1, 'encounter')],
      },
      {
        text: ['Magical Resistance III.', '+4 to the Madness threshold against magical sources. Replaces the rank I bonus.', 'A flat reduction of 2 magic damage is deferred.'],
        grantsTraits: { 'magical-resistance': 3 },
        effects: [fx('thresholdMadness', 4, k('arcane-resistance'))],
      },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune',
    group: 'Mind and Society',
    summary: 'Starting each fight with Grace in hand.',
    status: 'approved',
    ranks: [
      { text: ['Grace I.', 'Start combat with 1 Grace.'], grantsTraits: { grace: 1 } },
      { text: ['Grace II.', 'Start combat with 2 Grace.'], grantsTraits: { grace: 2 } },
      {
        text: ['Grace III.', 'Start combat with 3 Grace.', 'Once per Sleep, keep 2 Grace after you spend it.'],
        grantsTraits: { grace: 3 },
        uses: [use('fortune-retain', 'Retain 2 Grace', 1, 'sleep')],
      },
    ],
  },
  ...CRAFT_DISCIPLINES.map(craftPath),
  {
    id: 'companion-bond',
    name: 'Companion Bond',
    group: 'Companion',
    summary: 'A permanent bond with creatures that travel with you.',
    status: 'owner-review',
    note: 'Companion capacity: base 2, rank I 2, rank II 3, rank III 4. Read as totals, not additions.',
    ranks: [
      {
        text: ['Companion Handling I.', 'Companion Vitality I.', '1 shared ability across your companions.', 'Companion capacity 2.'],
        grantsTraits: { 'companion-handling': 1, 'companion-vitality': 1 },
        effects: [fx('companionAbilities', 1, k('companion-bond')), fx('companionCapacity', 2, k('companion-bond'))],
      },
      {
        text: ['Companion Handling II.', 'Companion Vitality II.', 'Companion Recovery.', '2 shared abilities.', 'Companion capacity 3.'],
        grantsTraits: { 'companion-handling': 2, 'companion-vitality': 2, 'companion-recovery': 1 },
        effects: [fx('companionAbilities', 2, k('companion-bond')), fx('companionCapacity', 3, k('companion-bond'))],
      },
      {
        text: ['Companion Handling III.', 'Companion Vitality III.', '3 shared abilities.', 'Companion capacity 4.', 'Once per Sleep, a companion stays at 1 HP when it would drop to 0.'],
        grantsTraits: { 'companion-handling': 3, 'companion-vitality': 3 },
        effects: [fx('companionAbilities', 3, k('companion-bond')), fx('companionCapacity', 4, k('companion-bond'))],
        uses: [use('companion-stay', 'Companion stays at 1 HP', 1, 'sleep')],
      },
    ],
  },
  {
    id: 'summoning-mastery',
    name: 'Summoning Mastery',
    group: 'Companion',
    summary: 'Control and endurance for summoned creatures. This Path gives no casting.',
    status: 'owner-review',
    ranks: [
      {
        text: ['Summoning Control I.', 'Summoned Vitality I.', '+1 Scene of duration.', 'Summon capacity 3.'],
        grantsTraits: { 'summoning-control': 1, 'summoned-vitality': 1 },
        effects: [fx('summonScenes', 1, k('summoning-mastery', 'scenes')), fx('summonCapacity', 3, k('summoning-mastery'))],
      },
      {
        text: ['Summoning Control II.', 'Summoned Vitality II.', 'Once per Encounter, reduce a summon cost by 1, to a minimum of 1.', 'Summon capacity 4.'],
        grantsTraits: { 'summoning-control': 2, 'summoned-vitality': 2 },
        effects: [fx('summonCapacity', 4, k('summoning-mastery'))],
        uses: [use('summon-cost', 'Reduce summon cost', 1, 'encounter')],
      },
      {
        text: ['Summoning Control III.', 'Summoned Vitality III.', '+2 Scenes of duration. Replaces the rank I bonus.', 'Reduce a summon cost by 2. Replaces the rank II reduction.', '+1 ARC.', 'Summon capacity 5.'],
        grantsTraits: { 'summoning-control': 3, 'summoned-vitality': 3 },
        effects: [fx('summonScenes', 2, k('summoning-mastery', 'scenes')), fx('summonCapacity', 5, k('summoning-mastery'))],
        uses: [use('summon-cost', 'Reduce summon cost', 1, 'encounter')],
        attr: { ARC: 1 },
      },
    ],
  },
  {
    id: 'academic',
    name: 'Academic',
    group: 'Mind and Society',
    summary: 'Study, memory and research.',
    status: 'provisional',
    ranks: [
      { text: ['Academic Expertise I.', 'Academic Knowledge I.', 'Advantage on selected research.'], grantsTraits: { 'academic-expertise': 1, 'academic-knowledge': 1 } },
      {
        text: ['Academic Expertise II.', 'Academic Knowledge II.', 'Exceptional Memory.', 'Once per Sleep, reroll an academic check.'],
        grantsTraits: { 'academic-expertise': 2, 'academic-knowledge': 2, 'exceptional-memory': 1 },
        uses: [use('academic-reroll', 'Academic reroll', 1, 'sleep')],
      },
      {
        text: ['Academic Expertise III.', 'Academic Knowledge III.', '+1 INT.', 'Reroll an academic check twice per Sleep.', 'Once per Sleep, ask for a clue.'],
        grantsTraits: { 'academic-expertise': 3, 'academic-knowledge': 3 },
        uses: [use('academic-reroll', 'Academic reroll', 2, 'sleep'), use('academic-clue', 'Ask for a clue', 1, 'sleep')],
        attr: { INT: 1 },
      },
    ],
  },
  {
    id: 'social',
    name: 'Social',
    group: 'Mind and Society',
    summary: 'Reading and moving people.',
    status: 'provisional',
    ranks: [
      { text: ['Social Expertise I.', 'Social Insight I.', 'Advantage on etiquette checks.'], grantsTraits: { 'social-expertise': 1, 'social-insight': 1 } },
      {
        text: ['Social Expertise II.', 'Social Insight II.', 'Once per Scene, reroll a social check.'],
        grantsTraits: { 'social-expertise': 2, 'social-insight': 2 },
        uses: [use('social-reroll', 'Social reroll', 1, 'scene')],
      },
      {
        text: ['Social Expertise III.', 'Social Insight III.', '+1 CHA.', 'Once per Sleep, guide a willing creature so it has Advantage on one check.'],
        grantsTraits: { 'social-expertise': 3, 'social-insight': 3 },
        uses: [use('social-guide', 'Guide a willing creature', 1, 'sleep')],
        attr: { CHA: 1 },
      },
    ],
  },
  {
    id: 'stealth',
    name: 'Stealth',
    group: 'Physical',
    summary: 'Moving unseen.',
    status: 'provisional',
    ranks: [
      { text: ['Stealth Expertise I.', 'Reduce the MOV penalty for sneaking by 1.'], grantsTraits: { 'stealth-expertise': 1 }, effects: [fx('sneakPenaltyReduction', 1, k('stealth'))] },
      {
        text: ['Stealth Expertise II.', 'Concealment.', 'Once per Scene, reroll a stealth check.'],
        grantsTraits: { 'stealth-expertise': 2, concealment: 1 },
        uses: [use('stealth-reroll', 'Stealth reroll', 1, 'scene')],
      },
      {
        text: ['Stealth Expertise III.', '+1 DEX.', 'Remove the ordinary MOV penalty for sneaking.', 'Once per Scene, make a stealth check with Advantage.'],
        grantsTraits: { 'stealth-expertise': 3 },
        effects: [fx('sneakPenaltyReduction', 99, k('stealth'))],
        uses: [use('stealth-advantage', 'Stealth Advantage', 1, 'scene')],
        attr: { DEX: 1 },
      },
    ],
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    group: 'Mind and Society',
    summary: 'Extra Trait Points and temporary Traits.',
    status: 'provisional',
    note: 'Temporary Traits cover mundane proficiency, checks and craft expertise only. They never meet permanent prerequisites or add resources, attributes, casting, languages, TP, MP or exclusive access.',
    ranks: [
      {
        text: ['General Aptitude I.', '+1 TP.', 'After each Sleep, use one eligible rank I Trait temporarily.'],
        grantsTraits: { 'general-aptitude': 1 },
        effects: [fx('tp', 1, k('adaptability'))],
      },
      {
        text: ['General Aptitude II.', '+1 TP. Total 2.', 'After each Sleep, use two eligible rank I Traits temporarily.'],
        grantsTraits: { 'general-aptitude': 2 },
        effects: [fx('tp', 2, k('adaptability'))],
      },
      {
        text: ['General Aptitude III.', '+2 TP. Total 4.', 'After each Sleep, use two eligible rank I Traits or one eligible rank II Trait temporarily.'],
        grantsTraits: { 'general-aptitude': 3 },
        effects: [fx('tp', 4, k('adaptability'))],
      },
    ],
  },
];

export const PATH_BY_ID: Record<string, PathDef> = Object.fromEntries(PATHS.map((p) => [p.id, p]));

export const PATH_GROUPS = ['Physical', 'Magic', 'Crafting', 'Mind and Society', 'Companion'] as const;

export function pathRankFeatures(path: PathDef, rank: number): PathRank[] {
  return path.ranks.slice(0, Math.max(0, Math.min(3, rank)));
}
