import { Status } from './types';
import { DAMAGE_BUDGET } from './progression';

export type Branch = 'sorcery' | 'incantation';

export interface School {
  id: string;
  name: string;
  branch: Branch;
  concepts: number;
  /** Forbidden schools need explicit Narrator access. */
  restricted: boolean;
  summary: string;
  status: Status;
}

export const SCHOOLS: School[] = [
  { id: 'arcane', name: 'Arcane', branch: 'sorcery', concepts: 31, restricted: false, summary: 'Raw force, wards and the study of magic itself.', status: 'approved' },
  { id: 'void', name: 'Void (Gravity)', branch: 'sorcery', concepts: 31, restricted: false, summary: 'Weight, pull and the control of gravity.', status: 'approved' },
  { id: 'abyssal', name: 'Abyssal', branch: 'sorcery', concepts: 28, restricted: true, summary: 'Forbidden. Spells state their own Madness effects. Access is exceptional.', status: 'approved' },
  { id: 'elemental', name: 'Elemental', branch: 'incantation', concepts: 72, restricted: false, summary: 'Fire, Water, Earth and Wind, plus six composite elements.', status: 'approved' },
  { id: 'bestial', name: 'Bestial', branch: 'incantation', concepts: 28, restricted: false, summary: 'Living healing and animal traits. A spell never changes your species.', status: 'approved' },
  { id: 'divine', name: 'Divine', branch: 'incantation', concepts: 30, restricted: false, summary: 'Spiritual will with limited information. Not always good. Resurrection is exceptional.', status: 'approved' },
  { id: 'blood', name: 'Blood', branch: 'incantation', concepts: 28, restricted: true, summary: 'Forbidden. Supernatural essence paid in Mana, not a physical resource. Primarily Magic damage.', status: 'approved' },
];

export const SCHOOL_BY_ID: Record<string, School> = Object.fromEntries(SCHOOLS.map((s) => [s.id, s]));

export const ELEMENTS = [
  { id: 'fire', name: 'Fire', parts: ['Flame', 'Lightning', 'Heat'] },
  { id: 'water', name: 'Water', parts: ['Water', 'Ice', 'Mist'] },
  { id: 'earth', name: 'Earth', parts: ['Stone', 'Lava', 'Crystal', 'Sand'] },
  { id: 'wind', name: 'Wind', parts: ['Air', 'Sound', 'Pressure'] },
];

export interface SpellConfig {
  tier: number;
  mana: number;
  actions: 1 | 2;
  range: string;
  target: string;
  area: string;
  duration: string;
  atk: number | null;
  dmg: number | null;
  dmgType: string | null;
  concentration: boolean;
  effect: string;
}

export interface SpellConcept {
  id: string;
  name: string;
  schoolId: string;
  /** Element id for primary elemental spells. */
  element?: string;
  /** Composite id for composite elemental spells. */
  composite?: string;
  tier: number;
  base: SpellConfig;
  upcast: SpellConfig;
  status: Status;
  note?: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Arch = 'B' | 'A' | 'W' | 'H' | 'M' | 'D' | 'U' | 'C' | 'S';
type Seed = [name: string, arch: Arch, extra?: string];

const BUILDUP = ['Poisoned', 'Toxic', 'Rotted', 'Bleed', 'Frost', 'Madness'];
const ACTION_COND: Record<string, string> = {
  Stunned: 'FOR',
  Silenced: 'ARC',
  Hesitation: 'INS',
  Dazed: 'REF',
  Frightened: 'INS',
  Slow: 'FOR',
  Prone: 'FOR',
  Restrained: 'STR',
  Blinded: 'AWA',
};

const DMG = [3, 6, 9, 13, 17, 22];
const BUILD = [4, 6, 8, 10, 12, 14];
const AREA_NAMES = ['Minor', 'Standard', 'Greater'];
const csFor = (t: number) => (t <= 2 ? 8 : t <= 4 ? 12 : 16);

function emptyCfg(tier: number): SpellConfig {
  return {
    tier,
    mana: tier,
    actions: 1,
    range: 'Self',
    target: 'Self',
    area: 'None',
    duration: 'Instant',
    atk: null,
    dmg: null,
    dmgType: null,
    concentration: false,
    effect: '',
  };
}

/** Builds one configuration. t is the base tier. up is true for the upcast configuration at tier t+1. */
function config(arch: Arch, t: number, up: boolean, extra?: string): SpellConfig {
  const tt = up ? t + 1 : t;
  const c = emptyCfg(tt);
  const atk = Math.floor(tt / 2);
  const sizeIndex = Math.min(2, (t <= 2 ? 0 : t <= 4 ? 1 : 2) + (up ? 1 : 0));
  c.actions = (arch === 'A' || arch === 'S') && t >= 3 ? 2 : t >= 5 ? 2 : 1;
  switch (arch) {
    case 'B': {
      const dmg = DMG[t] + (up ? 4 : 0);
      Object.assign(c, { range: `${6 + (up ? 2 : 0)} tiles`, target: 'One creature', atk, dmg, dmgType: extra ?? 'Magic' });
      c.effect = `Spell attack against Armor. Deals ${dmg} ${extra ?? 'Magic'} damage on a hit.`;
      break;
    }
    case 'A': {
      const dmg = Math.max(1, DMG[t] - 2) + (up ? 4 : 0);
      Object.assign(c, { range: `${6 + (up ? 2 : 0)} tiles`, target: 'Each creature in the area', area: AREA_NAMES[sizeIndex], atk, dmg, dmgType: extra ?? 'Magic' });
      c.effect = `Spell attack against each creature in the area. Deals ${dmg} ${extra ?? 'Magic'} damage on a hit.`;
      break;
    }
    case 'W': {
      const v = t + 1 + (up ? 1 : 0);
      Object.assign(c, { range: 'Touch', target: 'Self or one willing creature', duration: 'While concentrating', concentration: true });
      c.effect = `The target gains +${v} Armor while you concentrate.`;
      break;
    }
    case 'H': {
      const v = DMG[t] + (up ? 5 : 0);
      Object.assign(c, { range: 'Touch', target: 'One creature' });
      c.effect = `Restore ${v} HP. Healing spells have no attack roll.`;
      break;
    }
    case 'M': {
      const v = Math.max(1, Math.ceil(tt / 2));
      Object.assign(c, { range: 'Touch', target: 'Self or one willing creature', duration: 'While concentrating', concentration: true });
      c.effect = `The target gains +${v} MOV while you concentrate.`;
      break;
    }
    case 'D': {
      Object.assign(c, { range: `${6 + (up ? 2 : 0)} tiles`, target: 'One creature', atk });
      if (extra && BUILDUP.includes(extra)) {
        const n = BUILD[t] + (up ? 2 : 0);
        c.effect = `Spell attack against Armor. On a hit, adds ${n} ${extra} buildup.`;
      } else {
        const attr = ACTION_COND[extra ?? 'Dazed'] ?? 'FOR';
        c.effect = `Spell attack against Armor. On a hit, the target makes a ${attr} resistance check against CS ${csFor(tt)}. On a failure it is ${extra ?? 'Dazed'}.`;
      }
      break;
    }
    case 'C': {
      const n = 1 + Math.floor(tt / 2);
      Object.assign(c, { range: `${6 + (up ? 2 : 0)} tiles`, target: 'One creature', atk });
      c.effect = `Spell attack against Armor. On a hit, the target makes a FOR resistance check against CS ${csFor(tt)}. On a failure you move it up to ${n} tiles.`;
      break;
    }
    case 'S': {
      const sizes = ['a noncombat helper', 'a Minor creature', 'a Minor creature', 'a Standard creature', 'a Greater creature', 'a Legendary creature'];
      Object.assign(c, { range: '4 tiles', target: 'An empty tile', duration: t === 0 ? '1 Scene' : '3 Scenes' });
      c.effect = `Summon ${sizes[Math.min(5, tt)]}.`;
      break;
    }
    case 'U':
    default: {
      Object.assign(c, { range: 'Self or touch', target: 'Self or one object', duration: `${1 + (up ? 1 : 0)} Scene${up ? 's' : ''}` });
      c.effect = `${extra ?? 'A utility effect.'}${up ? ' The upcast improves range, duration or detail.' : ''} Utility effects work automatically or against a check of CS ${csFor(tt)}.`;
      break;
    }
  }
  return c;
}

function make(schoolId: string, seed: Seed, tier: number, extras: Partial<SpellConcept> = {}): SpellConcept {
  const [name, arch, extra] = seed;
  return {
    id: `${schoolId}-${slug(name)}`,
    name,
    schoolId,
    tier,
    base: config(arch, tier, false, extra),
    upcast: config(arch, tier, true, extra),
    status: 'proposal',
    ...extras,
  };
}

/** Lists are written in tier order. counts says how many concepts sit in each tier 0 to 5. */
function build(schoolId: string, counts: number[], list: Seed[], extras: Partial<SpellConcept> = {}): SpellConcept[] {
  const out: SpellConcept[] = [];
  let i = 0;
  counts.forEach((n, tier) => {
    for (let j = 0; j < n; j++) out.push(make(schoolId, list[i++], tier, extras));
  });
  if (i !== list.length) throw new Error(`Spell list for ${schoolId} has ${list.length} seeds but counts use ${i}`);
  return out;
}

const ARCANE: Seed[] = [
  ['Arcane Spark', 'B', 'Magic'], ['Glimmer', 'U', 'Create a small, steady light.'], ['Thin Ward', 'W'], ['Mend Object', 'U', 'Repair a small break in an ordinary object.'], ['Distant Whisper', 'U', 'Send a short message to a creature you can see.'],
  ['Force Dart', 'B', 'Magic'], ['Shimmering Shield', 'W'], ['Detect Magic', 'U', 'Sense magic nearby and learn its school.'], ['Arcane Mark', 'U', 'Leave a lasting mark only you can see.'], ['Light Step', 'M'], ['Disrupting Pulse', 'D', 'Dazed'],
  ['Force Lance', 'B', 'Magic'], ['Ward of Force', 'W'], ['Arcane Burst', 'A', 'Magic'], ['Dispelling Touch', 'U', 'Attempt to end one magical effect you touch.'], ['Sensor Eye', 'U', 'Create an unseen eye that you can see through.'], ['Hold Position', 'C'],
  ['Arcane Barrage', 'B', 'Magic'], ['Warding Circle', 'W'], ['Mana Shackle', 'D', 'Silenced'], ['Arcane Nova', 'A', 'Magic'], ['Telekinetic Grasp', 'C'], ['Reveal Hidden', 'U', 'Reveal hidden creatures and objects nearby.'],
  ['Piercing Ray', 'B', 'Magic'], ['Aegis of Force', 'W'], ['Spell Break', 'D', 'Silenced'], ['Arcane Storm', 'A', 'Magic'], ['Greater Sensor', 'U', 'Create a sensor with a wider reach and clearer detail.'],
  ['Arcane Annihilation', 'B', 'Magic'], ['Bastion of Force', 'W'], ['Unraveling', 'A', 'Magic'],
];
const VOID: Seed[] = [
  ['Gravity Pulse', 'B', 'Magic'], ['Light Burden', 'U', 'Make a small object lighter or heavier.'], ['Feather Fall', 'M'], ['Pull Small Object', 'U', 'Pull a small object to your hand.'], ['Lean Shift', 'C'],
  ['Crushing Weight', 'B', 'Magic'], ['Heavy Step', 'D', 'Slow'], ['Gravity Anchor', 'W'], ['Float', 'M'], ['Pull', 'C'], ['Weigh Object', 'U', 'Learn the weight and balance of an object.'],
  ['Gravity Lance', 'B', 'Magic'], ['Pressure Field', 'W'], ['Collapse', 'A', 'Magic'], ['Hold Down', 'D', 'Prone'], ['Lift', 'M'], ['Slip Gravity', 'U', 'Reverse the pull on one object or creature for a moment.'],
  ['Crushing Field', 'A', 'Magic'], ['Heavy Ground', 'D', 'Slow'], ['Singularity Seed', 'B', 'Magic'], ['Anchor Ward', 'W'], ['Weightless Zone', 'M'], ['Hurl', 'C'],
  ['Gravity Well', 'A', 'Magic'], ['Pinning Weight', 'D', 'Restrained'], ['Gravity Spear', 'B', 'Magic'], ['Warp Ward', 'W'], ['Flight of Mass', 'M'],
  ['Collapse Star', 'A', 'Magic'], ['Event Horizon', 'W'], ['Crushing Sphere', 'B', 'Magic'],
];
const ABYSSAL: Seed[] = [
  ['Abyssal Whisper', 'D', 'Madness'], ['Shade Touch', 'B', 'Abyss'], ['Dark Sight', 'U', 'See in darkness for a short time.'], ['Black Candle', 'U', 'Light a flame that gives no warmth and casts deep shadow.'],
  ['Abyss Bolt', 'B', 'Abyss'], ['Dread Whisper', 'D', 'Madness'], ['Shadow Veil', 'W'], ['Hollow Step', 'M'], ['Void Taste', 'D', 'Frightened'],
  ['Abyssal Lance', 'B', 'Abyss'], ['Creeping Dark', 'A', 'Abyss'], ['Mind Rot', 'D', 'Madness'], ['Umbral Ward', 'W'], ['Dark Pull', 'C'], ['Hollow Gaze', 'D', 'Frightened'],
  ['Abyssal Torrent', 'B', 'Abyss'], ['Darkness Burst', 'A', 'Abyss'], ['Shadow Chains', 'D', 'Restrained'], ['Black Ward', 'W'], ['Madness Spiral', 'D', 'Madness'],
  ['Abyssal Rend', 'B', 'Abyss'], ['Consuming Dark', 'A', 'Abyss'], ['Deep Terror', 'D', 'Frightened'], ['Abyssal Armor', 'W'], ['Void Mantle', 'M'],
  ['Abyssal Collapse', 'A', 'Abyss'], ['Maw of the Deep', 'B', 'Abyss'], ['Absolute Dark', 'W'],
];
const BESTIAL: Seed[] = [
  ['Soothing Touch', 'H'], ['Animal Whisper', 'U', 'Speak simple ideas with an animal.'], ['Keen Scent', 'U', 'Gain a hound-like sense of smell.'], ['Thorn Lash', 'B', 'Pierce'], ['Calming Aura', 'U', 'Calm a frightened animal.'],
  ['Wild Mend', 'H'], ['Claw Strike', 'B', 'Slash'], ['Beast Speed', 'M'], ['Hide Armor', 'W'], ['Animal Eyes', 'U', 'See through the eyes of a nearby animal.'], ['Venom Spit', 'D', 'Poisoned'],
  ['Rending Claws', 'B', 'Slash'], ['Pounce', 'M'], ['Barkskin', 'W'], ['Healing Surge', 'H'], ['Stampede', 'A', 'Strike'],
  ['Feral Mend', 'H'], ['Venom Fang', 'D', 'Toxic'], ['Swarm', 'A', 'Pierce'], ['Predator Sense', 'U', 'Sense living creatures nearby.'], ['Thick Hide', 'W'],
  ['Savage Maul', 'B', 'Slash'], ['Greater Mend', 'H'], ['Wild Pack', 'A', 'Slash'], ['Primal Speed', 'M'],
  ['Apex Rend', 'B', 'Slash'], ['Vital Surge', 'H'], ['Primal Aegis', 'W'],
];
const DIVINE: Seed[] = [
  ['Holy Spark', 'B', 'Holy'], ['Blessing Word', 'U', 'Speak a short blessing that steadies a willing creature.'], ['Lamp of Faith', 'U', 'Create a soft, steady light.'], ['Minor Mending', 'H'], ['Calm Spirit', 'U', 'Calm a distressed creature.'],
  ['Smite', 'B', 'Holy'], ['Healing Prayer', 'H'], ['Shield of Faith', 'W'], ['Sense Presence', 'U', 'Sense spiritual presences nearby.'], ['Sacred Haste', 'M'], ['Rebuke', 'D', 'Hesitation'],
  ['Radiant Lance', 'B', 'Holy'], ['Greater Prayer', 'H'], ['Ward of Light', 'W'], ['Sanctify Ground', 'U', 'Mark a small area as sacred ground.'], ['Holy Burst', 'A', 'Holy'], ['Hold in Awe', 'D', 'Frightened'],
  ['Judgment', 'B', 'Holy'], ['Mass Prayer', 'H'], ['Aegis of Faith', 'W'], ['Guiding Light', 'U', 'A light leads you toward a place you name.'], ['Radiant Wave', 'A', 'Holy'],
  ['Sunlance', 'B', 'Holy'], ['Restoring Light', 'H'], ['Sanctuary', 'W'], ['Dispel Corruption', 'U', 'Attempt to end one curse or corruption you touch.'], ['Divine Storm', 'A', 'Holy'],
  ['Wrath of Heaven', 'A', 'Holy'], ['Great Restoration', 'H'], ['Hallowed Aegis', 'W'],
];
const BLOOD: Seed[] = [
  ['Crimson Spark', 'B', 'Magic'], ['Taste Essence', 'U', 'Learn what kind of living essence is in a sample.'], ['Lifeline', 'U', 'Sense the vitality of one creature you touch.'], ['Bind Wound', 'H'],
  ['Essence Bolt', 'B', 'Magic'], ['Vital Drain', 'B', 'Magic'], ['Crimson Ward', 'W'], ['Sanguine Haste', 'M'], ['Thirst', 'D', 'Bleed'],
  ['Essence Lance', 'B', 'Magic'], ['Hemorrhage', 'D', 'Bleed'], ['Blood Mend', 'H'], ['Crimson Burst', 'A', 'Magic'], ['Mark of Blood', 'U', 'Mark a creature so you can track it.'], ['Binding Vein', 'C'],
  ['Essence Torrent', 'B', 'Magic'], ['Crimson Tide', 'A', 'Magic'], ['Vital Ward', 'W'], ['Siphon', 'H'], ['Weakening Bleed', 'D', 'Bleed'],
  ['Blood Rend', 'B', 'Magic'], ['Sanguine Storm', 'A', 'Magic'], ['Mantle of Blood', 'W'], ['Fevered Speed', 'M'], ['Greater Siphon', 'H'],
  ['Crimson Cataclysm', 'A', 'Magic'], ['Essence Annihilation', 'B', 'Magic'], ['Heart of Blood', 'W'],
];

const ELEMENT_SEEDS: Record<string, Seed[]> = {
  fire: [
    ['Ember Spark', 'B', 'Fire'], ['Warm Hands', 'U', 'Warm your hands and dry cloth you hold.'], ['Static Spark', 'B', 'Lightning'],
    ['Fire Bolt', 'B', 'Fire'], ['Shock', 'B', 'Lightning'], ['Heat Ward', 'W'],
    ['Flame Burst', 'A', 'Fire'], ['Thermal Cloak', 'W'],
    ['Lightning Lance', 'B', 'Lightning'], ['Scorching Wave', 'A', 'Fire'],
    ['Chain Lightning', 'A', 'Lightning'],
    ['Firestorm', 'A', 'Fire'],
  ],
  water: [
    ['Water Jet', 'B', 'Strike'], ['Clean Water', 'U', 'Purify a small amount of water.'], ['Frost Touch', 'B', 'Frost'],
    ['Ice Shard', 'B', 'Frost'], ['Mist Veil', 'W'], ['Chill', 'D', 'Frost'],
    ['Frost Lance', 'B', 'Frost'], ['Tidal Splash', 'A', 'Strike'],
    ['Blizzard Burst', 'A', 'Frost'], ['Fog Bank', 'W'],
    ['Glacial Spear', 'B', 'Frost'],
    ['Tidal Surge', 'A', 'Strike'],
  ],
  earth: [
    ['Stone Fist', 'B', 'Strike'], ['Shape Earth', 'U', 'Shape a small amount of loose earth or stone.'], ['Sand Spray', 'D', 'Blinded'],
    ['Rock Throw', 'B', 'Strike'], ['Stone Skin', 'W'], ['Crystal Shard', 'B', 'Pierce'],
    ['Lava Spit', 'B', 'Fire'], ['Earthen Tremor', 'A', 'Strike'],
    ['Crystal Barrage', 'A', 'Pierce'], ['Sand Storm', 'A', 'Slash'],
    ['Magma Lance', 'B', 'Fire'],
    ['Earthquake', 'A', 'Strike'],
  ],
  wind: [
    ['Gust', 'B', 'Slash'], ['Calling Breeze', 'U', 'Stir a steady breeze in one direction.'], ['Thunder Clap', 'B', 'Magic'],
    ['Air Blade', 'B', 'Slash'], ['Wind Wall', 'W'], ['Pressure Push', 'C'],
    ['Sound Lance', 'B', 'Magic'], ['Cyclone Burst', 'A', 'Slash'],
    ['Pressure Crush', 'B', 'Strike'], ['Resonant Wave', 'A', 'Magic'],
    ['Tornado', 'A', 'Slash'],
    ['Hurricane', 'A', 'Slash'],
  ],
};

interface CompositeSeed {
  name: string;
  tier: 3 | 4 | 5;
  dmg?: [number, number];
  dmgType?: string;
  conc?: boolean;
  armor?: [number, number];
  base: string;
  up: string;
}

export interface CompositeDef {
  id: string;
  name: string;
  parts: [string, string];
  note?: string;
  spells: CompositeSeed[];
}

export const COMPOSITES: CompositeDef[] = [
  {
    id: 'volcanic',
    name: 'Volcanic',
    parts: ['Fire', 'Earth'],
    spells: [
      { name: 'Obsidian Manifestation', tier: 3, base: 'Create a temporary structure of obsidian.', up: 'The structure is larger.' },
      { name: 'Volcanic Surge', tier: 3, dmg: [14, 18], dmgType: 'Fire / Strike', base: 'A surge of molten rock strikes one creature.', up: 'The surge hits harder.' },
      { name: 'Obsidian Sanctuary', tier: 4, armor: [5, 6], conc: true, base: 'A shell of obsidian grants +5 Armor while you concentrate.', up: 'The shell grants +6 Armor.' },
      { name: 'Primordial Volcano', tier: 5, dmg: [24, 30], dmgType: 'Fire / Strike', base: 'A volcano erupts over the target area.', up: 'The eruption hits harder.' },
    ],
  },
  {
    id: 'steam',
    name: 'Steam',
    parts: ['Fire', 'Water'],
    spells: [
      { name: 'Vapor Veil', tier: 3, base: 'Create an obscuring mist.', up: 'The mist is larger.' },
      { name: 'Thermal Harmony', tier: 3, armor: undefined, base: 'Gain +3 on environmental checks.', up: 'Gain +4 on environmental checks.' },
      { name: 'Vapor Manifestation', tier: 4, dmg: [17, 22], dmgType: 'Magic', base: 'A vapor form strikes one creature.', up: 'The form hits harder.' },
      { name: 'Sanctuary of Mist', tier: 5, conc: true, base: 'An area of mist protects and conceals those inside while you concentrate.', up: 'The area is expanded.' },
    ],
  },
  {
    id: 'solar-wind',
    name: 'Solar Wind',
    parts: ['Fire', 'Wind'],
    note: 'Solar Wind is not Holy. Its damage is Fire and Magic.',
    spells: [
      { name: 'Solar Current', tier: 3, dmg: [13, 17], dmgType: 'Fire', base: 'A current of heat strikes one creature.', up: 'The current hits harder.' },
      { name: 'Radiant Passage', tier: 3, conc: true, base: 'Gain +2 MOV while you concentrate.', up: 'Gain +3 MOV while you concentrate.' },
      { name: 'Celestial Mantle', tier: 4, base: 'Gain 4 resistance to Fire and shed light.', up: 'Gain 5 resistance to Fire and shed light.' },
      { name: 'Solar Tempest', tier: 5, dmg: [23, 29], dmgType: 'Fire / Magic', base: 'A tempest of heat and wind covers the target area.', up: 'The tempest hits harder.' },
    ],
  },
  {
    id: 'clay',
    name: 'Clay',
    parts: ['Water', 'Earth'],
    spells: [
      { name: 'Earthen Sculpting', tier: 3, base: 'Shape clay and earth into a temporary form.', up: 'The shape can be more complex.' },
      { name: 'Clay Servant', tier: 3, base: 'Summon a Standard clay creature.', up: 'The servant is improved.' },
      { name: 'Living Foundation', tier: 4, base: 'Gain +4 stability.', up: 'Gain +5 stability.' },
      { name: 'Grand Earthen Artisan', tier: 5, base: 'Raise a temporary construction.', up: 'The construction is expanded.' },
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    parts: ['Water', 'Wind'],
    spells: [
      { name: 'Cloudstep', tier: 3, conc: true, base: 'Glide on a cloud while you concentrate.', up: 'The glide lasts longer.' },
      { name: 'Whispering Clouds', tier: 3, base: 'Send a message on the clouds.', up: 'The message travels farther.' },
      { name: 'Cloud Sanctuary', tier: 4, conc: true, base: 'Gain +3 Dodge while you concentrate.', up: 'Gain +4 Dodge while you concentrate.' },
      { name: 'Celestial Cloud', tier: 5, base: 'Raise a floating platform of cloud.', up: 'The platform holds more.' },
    ],
  },
  {
    id: 'dust',
    name: 'Dust',
    parts: ['Earth', 'Wind'],
    spells: [
      { name: 'Dust Memory', tier: 3, base: 'Read impressions left in dust.', up: 'The impressions have more detail.' },
      { name: 'Wandering Dust', tier: 3, base: 'Dust conceals a creature or area.', up: 'The effect lasts longer.' },
      { name: 'Dust Manifestation', tier: 4, dmg: [16, 21], dmgType: 'Magic', base: 'A form of dust strikes one creature.', up: 'The form hits harder.' },
      { name: 'Dominion of Sands', tier: 5, conc: true, base: 'Shape the environment of sand and dust while you concentrate.', up: 'The area is larger.' },
    ],
  },
];

function compositeSpells(): SpellConcept[] {
  const out: SpellConcept[] = [];
  for (const comp of COMPOSITES) {
    for (const s of comp.spells) {
      const mk = (up: boolean): SpellConfig => {
        const tier = up ? s.tier + 1 : s.tier;
        const c = emptyCfg(tier);
        const dmg = s.dmg ? s.dmg[up ? 1 : 0] : null;
        Object.assign(c, {
          actions: s.tier >= 5 || dmg ? (s.tier >= 5 ? 2 : 1) : 1,
          range: '6 tiles',
          target: dmg ? 'One creature or an area' : 'Self or an area',
          area: 'To be defined',
          duration: s.conc ? 'While concentrating' : 'Instant',
          atk: dmg ? Math.floor(tier / 2) : null,
          dmg,
          dmgType: s.dmgType ?? null,
          concentration: !!s.conc,
          effect: up ? s.up : s.base,
        });
        return c;
      };
      out.push({
        id: `elemental-${slug(s.name)}`,
        name: s.name,
        schoolId: 'elemental',
        composite: comp.id,
        tier: s.tier,
        base: mk(false),
        upcast: mk(true),
        status: 'provisional',
        note: 'Damage and Armor values come from the specification. Range, area and action count are proposals and must be completed and validated before release.',
      });
    }
  }
  return out;
}

export const SPELLS: SpellConcept[] = [
  ...build('arcane', [5, 6, 6, 6, 5, 3], ARCANE),
  ...build('void', [5, 6, 6, 6, 5, 3], VOID),
  ...build('abyssal', [4, 5, 6, 5, 5, 3], ABYSSAL),
  ...Object.entries(ELEMENT_SEEDS).flatMap(([el, list]) => build('elemental', [3, 3, 2, 2, 1, 1], list, { element: el })),
  ...compositeSpells(),
  ...build('bestial', [5, 6, 5, 5, 4, 3], BESTIAL),
  ...build('divine', [5, 6, 6, 5, 5, 3], DIVINE),
  ...build('blood', [4, 5, 6, 5, 5, 3], BLOOD),
];

export const SPELL_BY_ID: Record<string, SpellConcept> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

export function spellsInSchool(schoolId: string): SpellConcept[] {
  return SPELLS.filter((s) => s.schoolId === schoolId);
}

export const UPCAST_RULES = [
  'A known spell can be upcast one tier, to the tier right above it.',
  'Tier VI spells exist only as upcasts of Tier V spells.',
  'The upcast costs the Mana of the new tier.',
  'Typical upcast changes: +4 DMG, +1 ATK for every 2 tiers, +5 HP of healing, +1 Armor, resistance or MOV, +2 buildup or range, +1 duration, target or area.',
];

export function damageBudgetLabel(tier: number): string {
  const [a, b] = DAMAGE_BUDGET[tier] ?? [0, 0];
  return `${a} to ${b}`;
}

export function reduceManaCost(base: number, reductions: number): number {
  if (base <= 0) return 0;
  return Math.max(1, base - Math.max(0, reductions));
}
