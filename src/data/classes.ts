import { AttrId, Feature, fx } from './types';

export interface ClassDef {
  id: string;
  name: string;
  attrs: [AttrId, AttrId];
  summary: string;
  /** Six abilities at levels 1, 3, 6, 9, 12 and 16. */
  abilities: Feature[];
  grantsSpellcasting?: boolean;
}

const A = (id: string, name: string, text: string, rest: Partial<Feature> = {}): Feature => ({
  id,
  name,
  text,
  status: 'approved',
  ...rest,
});

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    attrs: ['VIG', 'FOR'],
    summary: 'Front line fighter built to take hits.',
    abilities: [
      A('warrior-1', 'Tough Frame', 'Gain +1 HP per level.', { effects: [fx('hpPerLevel', 1, 'class:hp')] }),
      A('warrior-2', 'Unmoved', 'Gain +2 on checks against forced movement and Prone.', {
        effects: [fx('check:forced-move', 2, 'class:unmoved')],
      }),
      A('warrior-3', 'Hardened', 'Gain +3 to all thresholds.', { effects: [fx('thresholdAll', 3, 'class:thresholds')] }),
      A('warrior-4', 'Iron Frame', 'Gain +2 HP per level. Replaces Tough Frame.', {
        effects: [fx('hpPerLevel', 2, 'class:hp')],
        replaces: ['warrior-1'],
      }),
      A('warrior-5', 'Guard Training', 'Gain +1 Block and +1 Parry.', {
        effects: [fx('block', 1, 'class:block'), fx('parry', 1, 'class:parry')],
      }),
      A('warrior-6', 'Living Fortress', 'Gain +2 natural Armor and +5 to all thresholds. Replaces Hardened.', {
        effects: [fx('armor', 2, 'class:natural-armor'), fx('thresholdAll', 5, 'class:thresholds')],
        replaces: ['warrior-3'],
      }),
    ],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    attrs: ['DEX', 'REF'],
    summary: 'Fast, quiet and precise.',
    abilities: [
      A('assassin-1', 'Quiet Step', 'Gain +2 on stealth checks.', { effects: [fx('check:stealth', 2, 'class:stealth')] }),
      A('assassin-2', 'Slip Away', 'Gain +1 Dodge.', { effects: [fx('dodge', 1, 'class:dodge')] }),
      A('assassin-3', 'Fleet', 'Gain +1 MOV.', { effects: [fx('mov', 1, 'class:mov')] }),
      A('assassin-4', 'Exploit Opening', 'Gain +2 Accuracy against targets that are unaware of you.', {
        effects: [fx('accuracy', 2, 'class:unaware', undefined, 'target is unaware')],
      }),
      A('assassin-5', 'Clean Escape', 'Advantage on checks to escape.'),
      A('assassin-6', 'Ghost', 'Gain +2 Dodge and +2 MOV. Replaces Slip Away and Fleet.', {
        effects: [fx('dodge', 2, 'class:dodge'), fx('mov', 2, 'class:mov')],
        replaces: ['assassin-2', 'assassin-3'],
      }),
    ],
  },
  {
    id: 'scholar',
    name: 'Scholar',
    attrs: ['INT', 'ARC'],
    summary: 'Learned caster who studies how magic works.',
    grantsSpellcasting: true,
    abilities: [
      A('scholar-1', 'Spellcasting', 'You gain the Spellcasting Trait and +2 on research checks.', {
        grantsAccess: true,
        effects: [fx('check:research', 2, 'class:research')],
      }),
      A('scholar-2', 'Magic Eye', 'Advantage on checks to identify magic.'),
      A('scholar-3', 'Deep Reserve', 'Gain +4 Mana.', { effects: [fx('mana', 4, 'class:mana')] }),
      A('scholar-4', 'Practiced Casting', 'Gain +1 on casting.', { effects: [fx('spellAccuracy', 1, 'class:casting')] }),
      A('scholar-5', 'Efficient Casting', 'Once per Sleep, reduce a spell cost by 2, to a minimum of 1.', {
        uses: [{ id: 'scholar-efficiency', name: 'Efficient Casting', count: 1, per: 'sleep' }],
      }),
      A('scholar-6', 'Master Scholar', 'Gain +8 Mana and use efficiency 3 times per Sleep. Replaces Deep Reserve and Efficient Casting.', {
        effects: [fx('mana', 8, 'class:mana')],
        uses: [{ id: 'scholar-efficiency', name: 'Efficient Casting', count: 3, per: 'sleep' }],
        replaces: ['scholar-3', 'scholar-5'],
      }),
    ],
  },
  {
    id: 'marksman',
    name: 'Marksman',
    attrs: ['DEX', 'AWA'],
    summary: 'Patient shooter who watches from a distance.',
    abilities: [
      A('marksman-1', 'Long Watch', 'Gain +2 on distant observation checks.', { effects: [fx('check:distant-observation', 2, 'class:observe')] }),
      A('marksman-2', 'Steady Aim', 'Gain +1 Accuracy with ranged attacks while stationary.', {
        effects: [fx('accuracyRanged', 1, 'class:ranged', undefined, 'you did not move this Turn')],
      }),
      A('marksman-3', 'Eye for Detail', 'Advantage on detail checks.'),
      A('marksman-4', 'Always Steady', 'Remove the stationary requirement from Steady Aim.', {
        effects: [fx('accuracyRanged', 1, 'class:ranged')],
        replaces: ['marksman-2'],
      }),
      A('marksman-5', 'Focus', 'Gain +3 to the Dazed and Hesitation thresholds.', {
        effects: [fx('thresholdDazed', 3, 'class:dazed')],
      }),
      A('marksman-6', 'Dead Eye', 'Gain +2 Accuracy with ranged attacks. Replaces Always Steady.', {
        effects: [fx('accuracyRanged', 2, 'class:ranged')],
        replaces: ['marksman-4'],
      }),
    ],
  },
  {
    id: 'wanderer',
    name: 'Wanderer',
    attrs: ['AWA', 'FOR'],
    summary: 'Traveler who reads land and weather.',
    abilities: [
      A('wanderer-1', 'Pathfinder', 'Gain +2 on navigation and survival checks.', {
        effects: [fx('check:navigation', 2, 'class:nav'), fx('check:survival', 2, 'class:survival')],
      }),
      A('wanderer-2', 'Weathered', 'Advantage on checks against harsh environments.'),
      A('wanderer-3', 'Long Stride', 'Gain +1 MOV.', { effects: [fx('mov', 1, 'class:mov')] }),
      A('wanderer-4', 'Tracker', 'Advantage on tracking checks.'),
      A('wanderer-5', 'Enduring', 'Advantage on checks against Fatigue.'),
      A('wanderer-6', 'Trailblazer', 'Ignore ordinary difficult terrain.'),
    ],
  },
  {
    id: 'tinkerer',
    name: 'Tinkerer',
    attrs: ['INT', 'ARC'],
    summary: 'Maker who builds, repairs and reclaims.',
    abilities: [
      A('tinkerer-1', 'Workshop Sense', 'Gain +2 on crafting and repair checks.', {
        effects: [fx('check:craft', 2, 'class:craft'), fx('check:repair', 2, 'class:repair')],
      }),
      A('tinkerer-2', 'Material Eye', 'Advantage on checks about materials.'),
      A('tinkerer-3', 'Reclaimer', 'Salvage returns 1 extra unit.'),
      A('tinkerer-4', 'Pack Rig', 'Gain +4 capacity.', { effects: [fx('capacity', 4, 'class:capacity')] }),
      A('tinkerer-5', 'Lean Recipes', 'Recipes cost 2 fewer units.'),
      A('tinkerer-6', 'Master Reclaimer', 'Salvage returns 2 extra units and recipes cost 4 fewer units. Replaces Reclaimer and Lean Recipes.', {
        replaces: ['tinkerer-3', 'tinkerer-5'],
      }),
    ],
  },
  {
    id: 'acolyte',
    name: 'Acolyte',
    attrs: ['ARC', 'VIG'],
    summary: 'Devout caster who heals and wards.',
    grantsSpellcasting: true,
    abilities: [
      A('acolyte-1', 'Spellcasting', 'You gain the Spellcasting Trait and +2 on religious checks.', {
        grantsAccess: true,
        effects: [fx('check:religious', 2, 'class:religious')],
      }),
      A('acolyte-2', 'Steadfast Faith', 'Gain +5 to the Madness and Frightened thresholds.', {
        effects: [fx('thresholdMadness', 5, 'class:madness'), fx('thresholdFrightened', 5, 'class:frightened')],
      }),
      A('acolyte-3', 'Deep Reserve', 'Gain +4 Mana.', { effects: [fx('mana', 4, 'class:mana')] }),
      A('acolyte-4', 'Mending Words', 'Healing spells restore +2 HP per creature.', { effects: [fx('healSpell', 2, 'class:heal')] }),
      A('acolyte-5', 'Warded Mind', 'Advantage on checks against curses and possession.'),
      A('acolyte-6', 'Master Acolyte', 'Gain +8 Mana and healing spells restore +4 HP per creature. Replaces Deep Reserve and Mending Words.', {
        effects: [fx('mana', 8, 'class:mana'), fx('healSpell', 4, 'class:heal')],
        replaces: ['acolyte-3', 'acolyte-4'],
      }),
    ],
  },
];

export const CLASS_BY_ID: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
