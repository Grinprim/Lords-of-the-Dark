import { Status } from './types';

export type Block =
  | { t: 'h'; id: string; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'formula'; rows: [string, string][] }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { t: 'note'; status: Status; text: string }
  | { t: 'odds' }
  | { t: 'progression' }
  | { t: 'load' };

export interface RuleSection {
  id: string;
  title: string;
  summary: string;
  blocks: Block[];
}

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: 'dice',
    title: 'Dice and checks',
    summary: 'Every roll uses d8s. Ordinary checks use two.',
    blocks: [
      { t: 'p', text: 'An ordinary check rolls 2d8, adds the dice together and then adds modifiers. The total is compared to a Challenge Score, or to the Armor of a target.' },
      {
        t: 'table',
        head: ['Roll', 'Dice', 'Notes'],
        rows: [
          ['Ordinary', '2d8, summed', 'The default.'],
          ['Advantage', '3d8, summed', 'All three dice count.'],
          ['Disadvantage', '1d8', 'A single die.'],
        ],
      },
      { t: 'p', text: 'Advantage and Disadvantage do not stack. A source of each cancels the other. One roll never uses more than one source.' },
      { t: 'h', id: 'critical', text: 'Critical hits and fumbles' },
      {
        t: 'list',
        items: [
          'A critical needs 2 or more natural 8s among the dice you rolled.',
          'A Disadvantage roll cannot be a critical.',
          'A critical attack must still meet the Armor of the target and must survive any defense. Only then does it deal double DMG. A critical is never an automatic hit.',
          'A fumble happens when every die shows 1. A fumble is an automatic failure.',
        ],
      },
      { t: 'odds' },
      { t: 'h', id: 'challenge', text: 'Challenge Scores' },
      { t: 'p', text: 'Resistance checks and many crafting checks use Challenge Scores of 8, 12, 16 and 20 or more. A check can also be opposed by another roll.' },
      { t: 'h', id: 'random', text: 'Random events' },
      { t: 'p', text: 'The Narrator may call a d100 roll for a random event. The Narrator may also call a Gambit, which is a 50/50 roll.' },
      { t: 'h', id: 'grace', text: 'Grace' },
      {
        t: 'list',
        items: [
          'Gain 1 Grace when a meaningful roll fails.',
          'Spend all your Grace before a roll. Each point adds +1 to the roll.',
          'The Grace cap is 8.',
          'Grace resets at the start and end of combat. Then your starting Grace applies.',
        ],
      },
    ],
  },
  {
    id: 'attributes',
    title: 'Attributes and derived values',
    summary: 'Ten attributes feed a small set of formulas.',
    blocks: [
      {
        t: 'table',
        head: ['Short', 'Attribute', 'Used for'],
        rows: [
          ['VIG', 'Vigor', 'Health per level.'],
          ['FOR', 'Fortitude', 'Armor, physical thresholds, Block.'],
          ['STR', 'Strength', 'Carrying capacity.'],
          ['DEX', 'Dexterity', 'Precision and finesse.'],
          ['INT', 'Intelligence', 'Learning, craft and Mana.'],
          ['ARC', 'Arcane', 'Magic, Mana and spell attacks.'],
          ['CHA', 'Charisma', 'Presence and persuasion.'],
          ['REF', 'Reflex', 'Dodge.'],
          ['INS', 'Insight', 'Will and the Madness threshold.'],
          ['AWA', 'Awareness', 'Senses.'],
        ],
      },
      { t: 'p', text: 'Attributes normally run from -3 to 8. A Path may explicitly raise an attribute above 8.' },
      {
        t: 'formula',
        rows: [
          ['HP', 'max(1, 8 + 2 x (Level - 1) + VIG x Level)'],
          ['Armor', 'max(1, 6 + FOR)'],
          ['Mana', 'max(0, Level + 2 x (INT + ARC)). Only with Mana access.'],
          ['MOV', '5'],
          ['Capacity', 'max(1, 20 + 2 x STR)'],
          ['Grace cap', '8'],
          ['Physical threshold', '20 + FOR'],
          ['Madness threshold', '20 + INS'],
          ['Final Blow Resistance', '4'],
        ],
      },
      { t: 'h', id: 'stacking', text: 'How bonuses combine' },
      {
        t: 'list',
        items: [
          'Identical effects use only the highest value.',
          'Distinct effects that are compatible stack.',
          'An upgraded ability replaces the ability it upgrades.',
          'Temporary attribute changes do not recalculate derived values unless the effect says so.',
          'A positive Mana cost never drops below 1 after reductions.',
        ],
      },
      { t: 'h', id: 'load', text: 'Load' },
      { t: 'p', text: 'Add the weight (W) of every equipped item. Compare the total to your capacity. Only active items give benefits. All equipped items count toward weight.' },
      { t: 'load' },
      { t: 'h', id: 'slots', text: 'Equipment slots' },
      {
        t: 'list',
        items: [
          'Two hand slots for weapons, shields or catalysts. A two-handed item fills one slot and uses both hands.',
          'One armor slot and one cloak slot.',
          'Four accessory slots.',
          'Dragonkin have one more slot for the tail.',
          'No equipment needs an attribute to use. Proficiency governs weapons, armor and shields.',
        ],
      },
      { t: 'h', id: 'progression', text: 'Progression' },
      {
        t: 'list',
        items: [
          'AP: 4 at creation. +1 at levels 2 to 16, with +2 at levels 8 and 16. Total 21 AP. Species gives a net +3 and your class gives +2. The attribute sum is 26 before Path bonuses.',
          'TP: 4 at levels 1, 4, 8, 12 and 16. 2 at every other level, including levels past 16. Total 42 at level 16.',
          'Four independent Paths, at levels 4, 8, 12 and 16, plus two Career Paths.',
          'Careers come at levels 1 and 8. Primary ranks come at levels 1, 5 and 9. Secondary ranks come at levels 8, 12 and 16.',
          'Class abilities come at levels 1, 3, 6, 9, 12 and 16.',
          'Path rank I is free. Rank II costs 2 earned Mastery Points (MP) for that Path. Rank III costs 4 more.',
          'A duplicate Career Path gives 2 relevant MP, or an eligible alternative if the Path is full.',
          'After level 16 you gain no new ordinary AP, Paths, Careers or class abilities. TP, HP and Mana keep growing.',
        ],
      },
      { t: 'progression' },
    ],
  },
  {
    id: 'turns',
    title: 'Scenes, Turns and Actions',
    summary: 'Two Actions per Turn. One Reaction per Scene.',
    blocks: [
      {
        t: 'list',
        items: [
          'A Scene is one cycle of all Turns. The Narrator may extend it.',
          'Turn order follows engagement order and Narrator rulings. Nonplayer creatures use a Turn Delay.',
          'An ambush lets an attacker act before the normal order when the target is unaware.',
          'An unconscious creature goes to the bottom of the order.',
          'Leaving the range of an eligible creature allows an opportunity Reaction.',
        ],
      },
      { t: 'h', id: 'action-costs', text: 'Action costs' },
      {
        t: 'table',
        head: ['Cost', 'Examples'],
        rows: [
          ['1 Action', 'Move, Attack, ordinary spell, use a consumable, command a creature, stand up, escape, manifest.'],
          ['2 Actions', 'A complex spell.'],
          ['Free, then 1 Action', 'Switching equipment. The first switch each Turn is free. Later ones cost 1 Action.'],
        ],
      },
      {
        t: 'list',
        items: [
          'You have 2 Actions each Turn and 1 Reaction each Scene.',
          'You may make one Attack Action each Turn unless a rule says otherwise.',
          'Hold one unused Action until your next Turn. A held Action lets you defend.',
          'Dual Wield is one Attack Action with two rolls. Each roll has -1 ATK.',
          'Offensive spells and commanded offensive creatures count toward your one Attack Action.',
        ],
      },
    ],
  },
  {
    id: 'combat',
    title: 'Combat',
    summary: 'Declare, roll, compare, defend, deal damage.',
    blocks: [
      { t: 'h', id: 'sequence', text: 'Attack sequence' },
      {
        t: 'list',
        items: [
          'Declare the attack and pay its costs.',
          'Roll the attack.',
          'Compare the total to the target Armor. A total that meets Armor hits.',
          'The target may use an eligible defense.',
          'Roll DMG. Apply a critical if it applies.',
          'Apply reductions, resistance, vulnerability and immunity.',
          'Apply HP loss, buildup and effects.',
        ],
      },
      {
        t: 'formula',
        rows: [
          ['Weapon attack', '2d8 + ATK + Accuracy + bonuses'],
          ['Spell attack', '2d8 + ARC + spell ATK + bonuses'],
          ['Damage', 'The DMG of the weapon or spell. Attributes never add to DMG on their own.'],
        ],
      },
      { t: 'h', id: 'defense', text: 'Defenses' },
      {
        t: 'table',
        head: ['Defense', 'Roll', 'On success'],
        rows: [
          ['Block', '2d8 + FOR + bonuses', 'Halves the damage of the attack, rounded down.'],
          ['Dodge', '2d8 + REF + bonuses', 'Negates eligible damage. Move 1 tile.'],
          ['Parry', '2d8 + Accuracy with a compatible item', 'Negates the attack. Unlocks a Riposte Reaction at x1.5 damage, rounded down. A failed Parry loses your Reaction for the Scene.'],
        ],
      },
      {
        t: 'list',
        items: [
          'You may use one defense against each incoming Attack.',
          'The defender wins ties.',
          'A defense uses a held Action. The held Action is spent even when the defense fails.',
          'You cannot Dodge when your load is 100 percent or more.',
        ],
      },
      { t: 'h', id: 'damage', text: 'Damage components' },
      {
        t: 'p',
        text: 'Damage types are Standard, Strike, Pierce, Slash, Magic, Fire, Frost, Lightning, Holy and Abyss. Resistance and vulnerability apply as flat amounts to each component on its own. Immunity sets a component to 0. Absorption is exceptional. Condition immunity is separate from damage immunity.',
      },
      { t: 'h', id: 'concentration', text: 'Concentration' },
      {
        t: 'list',
        items: [
          'You can concentrate on one effect at a time. A new effect replaces the old one.',
          'You can end concentration for free.',
          'Concentration ends when you fall unconscious, when it is disrupted, or when the duration ends.',
          'When disruption is explicit, make a check of 2d8 + ARC + bonuses. The Challenge Score is 8, 12 or 16. This happens once per event and costs no Mana.',
        ],
      },
    ],
  },
  {
    id: 'conditions',
    title: 'Conditions',
    summary: 'Buildup meters fill, then a condition activates.',
    blocks: [
      { t: 'h', id: 'buildup', text: 'Buildup' },
      {
        t: 'list',
        items: [
          'Each condition has its own buildup meter.',
          'A meter activates when it reaches its threshold. The meter resets to 0 and any excess is discarded.',
          'At the end of the affected Turn, a meter that gained nothing new falls by 2.',
          'Meters and conditions persist after combat ends.',
          'Physical threshold is 20 + FOR. Madness threshold is 20 + INS.',
          'A resistance check is 2d8 + the attribute + bonuses. The Challenge Score is 8, 12, 16 or 20 and above, or the check is opposed.',
          'An active cleanse does not clear a meter on its own.',
        ],
      },
      {
        t: 'table',
        head: ['Condition', 'Effect'],
        rows: [
          ['Poisoned', '5 HP at each Turn. Lasts max(2, 8 - floor(FOR / 2)) Turns. The same condition refreshes. Different conditions coexist.'],
          ['Toxic', '8 HP at each Turn. Same duration rule.'],
          ['Rotted', '12 HP at each Turn. Same duration rule.'],
          ['Bleed', 'Activation deals 12 HP. Healing is reduced by 3 per stack. The next eligible heal clears it. A full Sleep clears it with no penalty.'],
          ['Frost', 'Activation deals 8 HP. Incoming DMG rises by 2 per stack, once for each resolved damaging ability.'],
          ['Madness', 'Activation deals 10 HP. Casting costs +1 Mana and concentration is -1 per stack. This covers conventional and spiritual casting.'],
        ],
      },
      {
        t: 'note',
        status: 'owner-review',
        text: 'Burst conditions (Bleed, Frost, Madness) have a stack maximum of 5. They activate at the cap. Frost and Madness last 4 Scenes. Reapplying adds 1 stack up to 8. The tracker follows that reading. The source text is compressed, so please confirm it.',
      },
      { t: 'h', id: 'status', text: 'Status conditions' },
      {
        t: 'table',
        head: ['Condition', 'Resists with', 'Effect'],
        rows: [
          ['Stunned', 'FOR', 'You skip your next Turn.'],
          ['Silenced', 'ARC', 'Conventional and verbal casting is blocked.'],
          ['Hesitation', 'INS', 'Ordinary equipment and unarmed attacks are blocked.'],
          ['Dazed', 'REF', 'Activated skills and Traits are blocked.'],
          ['Frightened', 'INS', 'You cannot act, react or move. Direct effects or explicit resistance or buildup apply.'],
          ['Prone', 'FOR', 'MOV 0. Nonranged attacks against you have Advantage. Standing costs 1 Action. You cannot Dash.'],
          ['Restrained', 'STR', 'MOV 0. Attacks against you have Advantage. Ordinary attacks are blocked. Escape takes a check.'],
          ['Slow and Haste', 'FOR', '-1 or +1 MOV for each stack, to a maximum of 3. They cancel each other. They expire at the next Scene unless reapplied.'],
          ['Blinded', 'AWA', 'Your rolls have Disadvantage. Rolls against you have Advantage. Vigil is the inverse.'],
          ['Charmed', 'INS', 'You are influenced in nonharmful ways. Your agency stays. It ends at the end of the Scene unless reapplied.'],
        ],
      },
      { t: 'p', text: 'Action-denying conditions last one Turn and do not stack.' },
    ],
  },
  {
    id: 'recovery',
    title: 'Rest, Sleep and recharge',
    summary: 'Short rests heal. Sleep restores.',
    blocks: [
      { t: 'h', id: 'rest', text: 'Rest' },
      {
        t: 'table',
        head: ['Rest length', 'HP recovered'],
        rows: [
          ['10 to 59 minutes', 'Level'],
          ['1 hour to under 2 hours', '2 x Level'],
          ['2 hours to under 3 hours', '3 x Level'],
          ['3 to 4 hours', '4 x Level'],
        ],
      },
      {
        t: 'list',
        items: [
          'Rest bonuses apply once for each Rest. The sources are Improved Recovery 1, 2 or 3, enchantments of 1, 2 or 3, Vitality of 2, 4 or 6, positive VIG for a Troll, and explicit herbal effects.',
          'A Rest also restores Mana equal to floor(max Mana / 2) plus bonuses, up to your missing Mana.',
          'Two Rests in a row count as one. A meaningful activity allows another.',
        ],
      },
      { t: 'h', id: 'sleep', text: 'Sleep' },
      {
        t: 'table',
        head: ['Sleep length', 'Effect'],
        rows: [
          ['Under 4 hours', 'No recovery.'],
          ['4 to under 6 hours', 'Half of your maximum HP and Mana.'],
          ['6 hours or more', 'Full HP and Mana, if you are eligible.'],
        ],
      },
      {
        t: 'list',
        items: [
          'A Fatigued character who sleeps enough removes 1 Fatigue instead of getting full recovery.',
          'A full 8 hours of Sleep restores 1 Final Blow Resistance.',
          'Vitality III adds 8 HP once for each Sleep.',
        ],
      },
      { t: 'h', id: 'recharge', text: 'Recharge' },
      {
        t: 'p',
        text: 'Limited uses recharge at the trigger they name. The triggers are the start of a Turn, the start of a Scene, the start of a meaningful Encounter, completing a Rest, completing a Sleep of 6 hours or more, an eligible in-game day, or a special event.',
      },
      { t: 'h', id: 'fatigue', text: 'Fatigue' },
      {
        t: 'list',
        items: [
          'Each stack of Fatigue gives -2 to rolls.',
          'Fatigue comes from narrative or explicit effects only. Nothing reduces it passively.',
          'Fatigue checks use FOR. Endurance prevents Fatigue.',
        ],
      },
      { t: 'note', status: 'legacy', text: 'The old site said that six stacks of Fatigue are fatal. The latest rules leave the consequence of six stacks to Narrator judgment.' },
    ],
  },
  {
    id: 'death',
    title: 'Unconsciousness and death',
    summary: 'Told in an abstract, non-graphic way.',
    blocks: [
      {
        t: 'list',
        items: [
          'At 0 HP you are unconscious, or you can be made unconscious by an explicit effect.',
          'Stabilization sets you to 1 HP and ends at the end of the Scene, if you are eligible.',
          'Healing above 0 HP brings you back.',
          'An adjacent creature can spend 1 Action to deliver a Final Blow to an unconscious creature. It always lands.',
          'Final Blow Resistance is 4. Each Final Blow that lands reduces it by 1. The Narrator may adjust it.',
          'The Narrator controls death and the Undead framework.',
        ],
      },
      { t: 'h', id: 'hollowing', text: 'Hollowing' },
      {
        t: 'list',
        items: [
          'Once each in-game day, a Hollowing check is made. It is an unmodified 2d8 against a Challenge Score of 10. The Challenge Score escalates under the Narrator.',
          'Hollowing gives no automatic power.',
          'Narrative restoration is rare.',
        ],
      },
      { t: 'note', status: 'legacy', text: 'The old site described limb loss and grafting. The latest rules do not restate it. Treat it as a Narrator option.' },
      { t: 'note', status: 'approved', text: 'No effect in these rules rewrites reality without limit. Exceptional effects are set by the Narrator.' },
    ],
  },
];

export const RULE_BY_ID: Record<string, RuleSection> = Object.fromEntries(RULE_SECTIONS.map((s) => [s.id, s]));
