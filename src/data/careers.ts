import { Feature, Status, UseDef, fx } from './types';
import { SHAMAN_ABILITIES } from './spiritual';

export interface CareerDef {
  id: string;
  name: string;
  /** Classes whose characters may take this Career. */
  classes: string[];
  /** Paths this Career may grant. The player picks one. */
  paths: string[];
  domains: [string, string];
  summary: string;
  foundation: Feature;
  basics: Feature[];
  upgrades: Feature[];
  advanced: Feature[];
  mastery: Feature[];
  /** Spiritual arts the Career opens. */
  spiritual?: 'monk' | 'shaman';
  status: Status;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const per = (id: string, name: string, count: number, p: UseDef['per']): UseDef => ({ id, name, count, per: p });

interface Seed {
  id: string;
  name: string;
  classes: string[];
  paths: string[];
  domains: [string, string];
  foundation?: { name: string; text: string; status: Status; effects?: Feature['effects']; grantsAccess?: boolean };
  spiritual?: 'monk' | 'shaman';
}

const seeds: Seed[] = [
  // Warrior
  { id: 'knight', name: 'Knight', classes: ['warrior'], paths: ['armor', 'shield'], domains: ['armor handling', 'shield work'] },
  { id: 'fighter', name: 'Fighter', classes: ['warrior'], paths: ['melee', 'physical-power'], domains: ['weapon drill', 'conditioning'] },
  { id: 'barbarian', name: 'Barbarian', classes: ['warrior'], paths: ['physical-power', 'vitality'], domains: ['raw strength', 'rough living'] },
  {
    id: 'paladin',
    name: 'Paladin',
    classes: ['warrior', 'acolyte'],
    paths: ['incantation'],
    domains: ['holy rites', 'protection'],
    foundation: {
      name: 'Divine',
      text: 'Your faith opens the Divine school of Incantations to you. Owner review: the exact access and tier limits are not defined.',
      status: 'owner-review',
    },
  },
  {
    id: 'berserker',
    name: 'Berserker',
    classes: ['warrior'],
    paths: ['physical-power', 'endurance'],
    domains: ['fury control', 'pain tolerance'],
    foundation: {
      name: 'Rage',
      text: 'Rage has a maximum of 5. At the end of each of your Turns in which you received damage, gain 1 Rage. Rage resets at the end of the Encounter. What Rage does at each level is not defined.',
      status: 'owner-review',
    },
  },
  { id: 'guardian', name: 'Guardian', classes: ['warrior'], paths: ['shield', 'fortitude'], domains: ['bodyguard work', 'bracing'] },
  { id: 'samurai', name: 'Samurai', classes: ['warrior'], paths: ['melee', 'iron-will'], domains: ['blade discipline', 'composure'] },
  { id: 'weaponmaster', name: 'Weaponmaster', classes: ['warrior'], paths: ['melee', 'heavy'], domains: ['weapon lore', 'heavy weapon handling'] },
  { id: 'pit-fighter', name: 'Pit Fighter', classes: ['warrior'], paths: ['unarmed', 'vitality'], domains: ['brawling', 'taking hits'] },
  {
    id: 'spellblade',
    name: 'Spellblade',
    classes: ['warrior', 'scholar'],
    paths: ['sorcery', 'incantation'],
    domains: ['blade and spell', 'battle focus'],
    foundation: {
      name: 'Existing Caster',
      text: 'If you already have Mana access, gain +3 Mana.',
      status: 'approved',
      effects: [fx('mana', 3, 'career:spellblade')],
    },
  },
  { id: 'vanguard', name: 'Vanguard', classes: ['warrior'], paths: ['armor', 'fortitude'], domains: ['formation', 'line holding'] },
  // Assassin
  { id: 'rogue', name: 'Rogue', classes: ['assassin'], paths: ['stealth', 'adaptability'], domains: ['lockwork', 'improvisation'] },
  { id: 'thief', name: 'Thief', classes: ['assassin'], paths: ['stealth', 'mobility'], domains: ['pilfering', 'climbing'] },
  { id: 'assassin', name: 'Assassin', classes: ['assassin'], paths: ['stealth', 'reflex'], domains: ['ambush', 'quick strikes'] },
  { id: 'infiltrator', name: 'Infiltrator', classes: ['assassin'], paths: ['stealth', 'social'], domains: ['disguise', 'deception'] },
  { id: 'duelist', name: 'Duelist', classes: ['assassin'], paths: ['melee', 'reflex'], domains: ['single combat', 'footwork'] },
  { id: 'scout', name: 'Scout', classes: ['assassin', 'marksman', 'wanderer'], paths: ['heightened-senses', 'mobility', 'stealth'], domains: ['reconnaissance', 'trailcraft'] },
  // Scholar
  { id: 'wizard', name: 'Wizard', classes: ['scholar'], paths: ['sorcery', 'incantation'], domains: ['spell theory', 'arcane study'] },
  { id: 'sorcerer', name: 'Sorcerer', classes: ['scholar'], paths: ['sorcery', 'incantation'], domains: ['innate power', 'raw casting'] },
  {
    id: 'mage',
    name: 'Mage',
    classes: ['scholar'],
    paths: ['sorcery', 'incantation'],
    domains: ['school study', 'casting discipline'],
    foundation: {
      name: 'Second School',
      text: 'You may learn spells from one additional ordinary school. Owner review: the number of extra schools and any tier limit are not defined.',
      status: 'owner-review',
    },
  },
  {
    id: 'witch',
    name: 'Witch',
    classes: ['scholar'],
    paths: ['sorcery', 'incantation'],
    domains: ['hexes', 'ritual craft'],
    foundation: {
      name: 'Familiar, Hex and Ritual',
      text: 'You gain a familiar, a hex and a ritual practice. Owner review: the exact rules for each are not defined.',
      status: 'owner-review',
    },
  },
  { id: 'battlemage', name: 'Battlemage', classes: ['scholar'], paths: ['sorcery', 'incantation'], domains: ['battle casting', 'war tactics'] },
  {
    id: 'enchanter',
    name: 'Enchanter',
    classes: ['scholar', 'tinkerer'],
    paths: ['enchanting'],
    domains: ['rune work', 'item bonding'],
    foundation: {
      name: 'Rune Literacy',
      text: 'You can read and write the runes used in enchanting. Gain +2 on checks to read runes.',
      status: 'provisional',
      effects: [fx('check:runes', 2, 'career:enchanter')],
    },
  },
  { id: 'cleric', name: 'Cleric', classes: ['scholar', 'acolyte'], paths: ['incantation'], domains: ['liturgy', 'mending'] },
  { id: 'priest', name: 'Priest', classes: ['scholar', 'acolyte'], paths: ['incantation'], domains: ['sermon', 'blessing'] },
  { id: 'sage', name: 'Sage', classes: ['scholar'], paths: ['academic', 'ritual'], domains: ['research', 'lore keeping'] },
  // Marksman
  { id: 'ranger', name: 'Ranger', classes: ['marksman', 'wanderer'], paths: ['ranged', 'heightened-senses'], domains: ['woodcraft', 'tracking'] },
  { id: 'hunter', name: 'Hunter', classes: ['marksman'], paths: ['ranged', 'companion-bond'], domains: ['hunting', 'animal handling'] },
  { id: 'sharpshooter', name: 'Sharpshooter', classes: ['marksman'], paths: ['ranged', 'heightened-senses'], domains: ['long shots', 'steady aim'] },
  { id: 'gunslinger', name: 'Gunslinger', classes: ['marksman'], paths: ['ranged', 'fortune'], domains: ['quick draw', 'nerve'] },
  { id: 'musketeer', name: 'Musketeer', classes: ['marksman'], paths: ['ranged', 'reflex'], domains: ['volley fire', 'cover work'] },
  { id: 'artillerist', name: 'Artillerist', classes: ['marksman'], paths: ['artificing', 'heavy'], domains: ['siege devices', 'heavy ordnance'] },
  { id: 'trapper', name: 'Trapper', classes: ['marksman'], paths: ['artificing', 'stealth'], domains: ['trap work', 'concealment'] },
  // Tinkerer
  { id: 'artificer', name: 'Artificer', classes: ['tinkerer'], paths: ['artificing'], domains: ['devices', 'repair'] },
  { id: 'blacksmith', name: 'Blacksmith', classes: ['tinkerer'], paths: ['blacksmithing'], domains: ['forging', 'metalwork'] },
  { id: 'alchemist', name: 'Alchemist', classes: ['tinkerer'], paths: ['alchemy'], domains: ['mixing', 'reagents'] },
  // Wanderer
  { id: 'survivalist', name: 'Survivalist', classes: ['wanderer'], paths: ['endurance', 'fortitude'], domains: ['survival', 'foraging'] },
  {
    id: 'beastmaster',
    name: 'Beastmaster',
    classes: ['wanderer'],
    paths: ['companion-bond'],
    domains: ['animal bonds', 'training'],
    foundation: {
      name: 'Powerful Companion',
      text: 'You bond with a powerful companion. Owner review: the size and level at which it arrives are not defined.',
      status: 'owner-review',
    },
  },
  { id: 'herbalist', name: 'Herbalist', classes: ['wanderer'], paths: ['herbalism'], domains: ['gathering', 'remedies'] },
  { id: 'cartographer', name: 'Cartographer', classes: ['wanderer'], paths: ['academic', 'heightened-senses'], domains: ['mapping', 'surveying'] },
  {
    id: 'shaman',
    name: 'Shaman',
    classes: ['wanderer', 'acolyte'],
    paths: ['companion-bond', 'iron-will'],
    domains: ['spirit lore', 'aspect bonds'],
    spiritual: 'shaman',
    foundation: {
      name: 'Spirit Communion',
      text: 'You gain innate Mana and two Basic Aspects. You talk with spirits. You do not gain conventional casting.',
      status: 'approved',
      grantsAccess: true,
    },
  },
  // Acolyte
  {
    id: 'prophet',
    name: 'Prophet',
    classes: ['acolyte'],
    paths: ['incantation'],
    domains: ['visions', 'omens'],
    foundation: {
      name: 'Symbolic Futures',
      text: 'The Narrator may offer you symbolic hints of possible futures. They are never exact and never certain.',
      status: 'provisional',
    },
  },
  {
    id: 'monk',
    name: 'Monk',
    classes: ['acolyte'],
    paths: ['unarmed', 'iron-will'],
    domains: ['inner discipline', 'spiritual practice'],
    spiritual: 'monk',
    foundation: {
      name: 'Spiritual Foundation',
      text: 'You gain Unarmed proficiency and Mana access. Your Mana is not Ki. You gain no conventional casting. You learn 2 Basic techniques.',
      status: 'approved',
      grantsAccess: true,
    },
  },
  {
    id: 'spiritcaller',
    name: 'Spiritcaller',
    classes: ['acolyte'],
    paths: ['incantation'],
    domains: ['spirit calling', 'rites'],
    foundation: {
      name: 'Powerful Companion',
      text: 'You bond with a powerful spirit companion. Owner review: the size and level at which it arrives are not defined.',
      status: 'owner-review',
    },
  },
  { id: 'templar', name: 'Templar', classes: ['acolyte'], paths: ['armor', 'arcane-resistance'], domains: ['guarding the faithful', 'warding'] },
];

function buildCareer(s: Seed): CareerDef {
  const [a, b] = s.domains;
  const A = a.charAt(0).toUpperCase() + a.slice(1);
  const B = b.charAt(0).toUpperCase() + b.slice(1);
  const p = (suffix: string) => `${s.id}:${suffix}`;
  const ck = (d: string) => `check:${slug(d)}`;
  const prop = (id: string, name: string, text: string, extra: Partial<Feature> = {}): Feature => ({
    id: p(id),
    name,
    text,
    status: 'proposal',
    ...extra,
  });
  const foundation: Feature = s.foundation
    ? { id: p('foundation'), name: s.foundation.name, text: s.foundation.text, status: s.foundation.status, effects: s.foundation.effects, grantsAccess: s.foundation.grantsAccess }
    : prop('foundation', `${s.name} Foundation`, `Gain +1 on ${a} checks.`, { effects: [fx(ck(a), 1, p('foundation'))] });
  return {
    id: s.id,
    name: s.name,
    classes: s.classes,
    paths: s.paths,
    domains: s.domains,
    spiritual: s.spiritual,
    summary: `Work centered on ${a} and ${b}.`,
    status: 'proposal',
    foundation,
    basics: [
      prop('b1', `${A} Training`, `Gain +1 on ${a} checks.`, { effects: [fx(ck(a), 1, p('train-a'))] }),
      prop('b2', `${B} Training`, `Gain +1 on ${b} checks.`, { effects: [fx(ck(b), 1, p('train-b'))] }),
      prop('b3', 'Practiced Hand', `Once per Scene, reroll one failed ${a} or ${b} check.`, { uses: [per(p('b3'), 'Practiced Hand', 1, 'scene')] }),
      prop('b4', 'Steady Nerve', `Once per Encounter, gain +1 on a ${a} or ${b} check.`, { uses: [per(p('b4'), 'Steady Nerve', 1, 'encounter')] }),
    ],
    upgrades: [
      prop('u1', `${A} Expertise`, `Gain +2 on ${a} checks. Replaces ${A} Training.`, { effects: [fx(ck(a), 2, p('train-a'))], replaces: [p('b1')] }),
      prop('u2', `${B} Expertise`, `Gain +2 on ${b} checks. Replaces ${B} Training.`, { effects: [fx(ck(b), 2, p('train-b'))], replaces: [p('b2')] }),
      prop('u3', 'Practiced Hand II', `Twice per Scene, reroll one failed ${a} or ${b} check. Replaces Practiced Hand.`, {
        uses: [per(p('b3'), 'Practiced Hand', 2, 'scene')],
        replaces: [p('b3')],
      }),
      prop('u4', 'Steady Nerve II', `Twice per Encounter, gain +2 on a ${a} or ${b} check. Replaces Steady Nerve.`, {
        uses: [per(p('b4'), 'Steady Nerve', 2, 'encounter')],
        replaces: [p('b4')],
      }),
    ],
    advanced: [
      prop('a1', `Advanced ${A}`, `Once per Scene, make a ${a} check with Advantage.`, { uses: [per(p('a1'), `Advanced ${A}`, 1, 'scene')] }),
      prop('a2', `Advanced ${B}`, `Once per Scene, make a ${b} check with Advantage.`, { uses: [per(p('a2'), `Advanced ${B}`, 1, 'scene')] }),
      prop('a3', 'Trained Eye', `Once per Sleep, judge a ${a} or ${b} task with Advantage on the check.`, { uses: [per(p('a3'), 'Trained Eye', 1, 'sleep')] }),
      prop('a4', 'Teach the Craft', `Once per Sleep, give an ally +2 on one ${a} check.`, { uses: [per(p('a4'), 'Teach the Craft', 1, 'sleep')] }),
    ],
    mastery: [
      prop('m1', `Master of ${A}`, `Gain +1 on ${a} checks. Once per Encounter, make one with Advantage.`, {
        effects: [fx(ck(a), 1, p('master-a'))],
        uses: [per(p('m1'), `Master of ${A}`, 1, 'encounter')],
      }),
      prop('m2', `Master of ${B}`, `Gain +1 on ${b} checks. Once per Encounter, make one with Advantage.`, {
        effects: [fx(ck(b), 1, p('master-b'))],
        uses: [per(p('m2'), `Master of ${B}`, 1, 'encounter')],
      }),
      prop('m3', 'Career Insight', 'Once per Sleep, ask the Narrator one question related to your Career.', { uses: [per(p('m3'), 'Career Insight', 1, 'sleep')] }),
      prop('m4', 'Standing Reputation', 'Gain +2 on social checks with people who know your Career.', { effects: [fx('check:social', 2, p('reputation'), undefined, 'the other party knows your Career')] }),
    ],
  };
}

export const CAREERS: CareerDef[] = seeds.map((s) => {
  const c = buildCareer(s);
  if (s.id === 'shaman') {
    // The specification defines Shaman abilities. They replace the generated proposals.
    Object.assign(c, { ...SHAMAN_ABILITIES, status: 'approved' as Status });
  }
  return c;
});
export const CAREER_BY_ID: Record<string, CareerDef> = Object.fromEntries(CAREERS.map((c) => [c.id, c]));

export function careersForClass(classId: string): CareerDef[] {
  return CAREERS.filter((c) => c.classes.includes(classId));
}

export function careerAbility(career: CareerDef, abilityId: string): Feature | undefined {
  return [career.foundation, ...career.basics, ...career.upgrades, ...career.advanced, ...career.mastery].find((f) => f.id === abilityId);
}

/** The basic ability that an upgrade improves, by position. */
export function upgradeBase(career: CareerDef, upgradeId: string): string | undefined {
  const i = career.upgrades.findIndex((u) => u.id === upgradeId);
  return i >= 0 ? career.basics[i]?.id : undefined;
}
