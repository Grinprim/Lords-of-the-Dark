import { ATTR_IDS, AttrId, Status, UseDef } from '../data/types';
import {
  ATTR_MAX,
  ATTR_MIN,
  GRACE_CAP,
  LEGACY_LEVEL1_CEILING,
  MAX_LEVEL,
  MOV_BASE,
  FINAL_BLOW_RESISTANCE,
  PATH_SLOT_LEVELS,
  SPELL_TIER_GATES,
  apTotal,
  careerRank,
  careerSlots,
  classAbilityCount,
  independentPathSlots,
  pathMpSpent,
  tpTotal,
} from '../data/progression';
import { SPECIES_BY_ID } from '../data/species';
import { CLASS_BY_ID } from '../data/classes';
import { CAREER_BY_ID, upgradeBase } from '../data/careers';
import { PATH_BY_ID } from '../data/paths';
import { TRAIT_BY_ID, traitEffects } from '../data/traits';
import { BASE_SLOTS, PROF_BY_ID, SlotId, profIdsByGroup } from '../data/equipment';
import { DRAGON_FORM_BY_ID, DRAGON_PROPERTY_BY_ID, MONK_TIERS, SHAMAN_ASPECTS } from '../data/spiritual';
import { COMPANION_BASE_CAPACITY, SUMMON_BASE_CAPACITY, COMPANION_SIZE_BY_ID } from '../data/companions';
import type { Character, ItemKind } from './character';
import { Breakdown, SourcedEffect, breakdown, dropReplaced, resolveStat, statsWithPrefix } from './effects';
import { ItemContext, ItemView, itemKindFits, viewItem } from './items';
import { LoadResult, loadBand } from './load';
import type { Thresholds } from './conditions';

// ---- Output types ----

export interface FeatureRef {
  id: string;
  name: string;
  text: string;
  origin: 'species' | 'class' | 'career' | 'path' | 'trait' | 'spiritual' | 'form';
  source: string;
  status: Status;
}

export interface DerivedAttr {
  id: AttrId;
  bought: number;
  species: number;
  klass: number;
  path: number;
  total: number;
  /** Total without Path bonuses. Path bonuses may pass the ordinary ceiling. */
  ordinary: number;
}

export interface OwnedPath {
  pathId: string;
  source: 'independent' | 'primary-career' | 'secondary-career';
  chosenRank: number;
  rank: number;
  earnedMp: number;
  spentMp: number;
  /** Mastery Points from a duplicate Career Path. */
  duplicateMp: number;
  caster?: 'sorcery' | 'incantation';
}

export interface EquippedItem {
  slot: SlotId;
  view: ItemView;
}

export interface CheckLine {
  stat: string;
  total: number;
  lines: { label: string; v: number; source: string }[];
  conditional: SourcedEffect[];
}

export interface SpellTierState {
  tier: number;
  available: boolean;
  reason: string;
  /** Spells the character may know at this tier without a Narrator grant. */
  allowed: number;
}

export interface Derived {
  level: number;
  ap: { total: number; spent: number; remaining: number };
  tp: { total: number; spent: number; remaining: number; bonus: number };
  attrs: Record<AttrId, DerivedAttr>;
  speciesName: string;
  className: string;
  hasMana: boolean;
  spellcasting: boolean;
  casterRank: number;
  casterBranch: 'sorcery' | 'incantation' | null;
  spellTiers: SpellTierState[];
  hp: Breakdown;
  armor: Breakdown;
  mana: Breakdown;
  mov: Breakdown;
  capacity: Breakdown;
  weight: number;
  load: LoadResult;
  graceCap: number;
  graceStart: number;
  actions: number;
  reactions: number;
  finalBlowMax: number;
  thresholds: Thresholds;
  decayBonus: number;
  accuracy: { melee: number; ranged: number; unarmed: number; spell: number };
  defense: { block: number; dodge: number; parry: number };
  attack: { spell: number };
  /** Weapons and unarmed attacks the character can make now. */
  attacks: { name: string; atk: number; dmg: number; note: string }[];
  dualWield: boolean;
  rest: { hpBonus: number; manaBonus: number; sleepHpBonus: number };
  healSpellBonus: number;
  checks: Record<string, CheckLine>;
  features: FeatureRef[];
  uses: UseDef[];
  conditional: SourcedEffect[];
  paths: OwnedPath[];
  traitRanks: Record<string, number>;
  traitGranted: Record<string, number>;
  profs: Set<string>;
  equipped: EquippedItem[];
  ignoredItems: { uid: string; reason: string }[];
  companionCapacity: number;
  summonCapacity: number;
  companionAbilityPool: number;
  companionUsed: number;
  summonUsed: number;
  companionHpBonus: number;
  summonHpBonus: number;
  form: { id: string; name: string; suspendsGear: boolean };
  overridden: { stat: string; from: number; to: number; reason: string }[];
  warnings: string[];
  effects: SourcedEffect[];
}

// ---- Helpers ----

export function slotsFor(c: Character): SlotId[] {
  return c.speciesId === 'dragonkin' ? [...BASE_SLOTS, 'tail'] : [...BASE_SLOTS];
}

function expandProfToken(token: string): string[] {
  if (!token.startsWith('group:')) return [token];
  const g = token.slice(6) as Parameters<typeof profIdsByGroup>[0];
  return profIdsByGroup(g);
}

function tag(list: SourcedEffect[], effects: { stat: string; v: number; key: string; label?: string; when?: string }[] | undefined, source: string) {
  for (const e of effects ?? []) list.push({ ...e, source });
}

// ---- Owned Paths ----

export function ownedPaths(c: Character): OwnedPath[] {
  const level = clampLevel(c.level);
  const out: OwnedPath[] = [];
  const seen = new Set<string>();
  const slots = independentPathSlots(level);
  for (const id of c.independentPaths.slice(0, slots)) {
    if (!PATH_BY_ID[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(makePath(id, 'independent', c));
  }
  const careers = [...c.careers].sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1)).slice(0, careerSlots(level));
  for (const pick of careers) {
    if (pick.role === 'secondary' && level < 8) continue;
    const source = pick.role === 'primary' ? 'primary-career' : 'secondary-career';
    let id = pick.pathId;
    if (!id || !PATH_BY_ID[id]) continue;
    if (seen.has(id)) {
      const existing = out.find((p) => p.pathId === id);
      const full = (c.pathRanks[id] ?? 1) >= 3 || (existing?.rank ?? 0) >= 3;
      if (full && pick.altPathId && PATH_BY_ID[pick.altPathId] && !seen.has(pick.altPathId)) {
        id = pick.altPathId;
      } else if (existing) {
        // A duplicate Career Path gives 2 Mastery Points to that Path.
        existing.duplicateMp += 2;
        continue;
      }
    }
    seen.add(id);
    out.push(makePath(id, source, c));
  }
  // Mastery Points and effective ranks.
  const first = out[0]?.pathId;
  for (const p of out) {
    let earned = (c.pathMp[p.pathId] ?? 0) + p.duplicateMp;
    if (c.speciesId === 'human' && c.humanFeature === 'human-quick-learner' && p.pathId === first) earned += 1;
    p.earnedMp = earned;
    let rank = Math.max(1, Math.min(3, p.chosenRank));
    while (rank > 1 && pathMpSpent(rank) > earned) rank--;
    p.rank = rank;
    p.spentMp = pathMpSpent(rank);
    const def = PATH_BY_ID[p.pathId];
    p.caster = def.ranks[0].caster;
  }
  return out;
}

function makePath(pathId: string, source: OwnedPath['source'], c: Character): OwnedPath {
  return { pathId, source, chosenRank: c.pathRanks[pathId] ?? 1, rank: 1, earnedMp: 0, spentMp: 0, duplicateMp: 0 };
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(level || 1)));
}

/** Effective rank of one Trait. A Path grant covers its ranks for free. Higher ranks cost TP. */
export function effectiveTraitRank(traitId: string, purchased: number[], granted: number, level: number): number {
  const def = TRAIT_BY_ID[traitId];
  if (!def) return 0;
  if (def.repeatable) return purchased.length + (granted > 0 ? 1 : 0) > 0 ? Math.max(purchased.length, granted > 0 ? 1 : 0) : 0;
  let rank = 0;
  for (let r = 1; r <= def.ranks; r++) {
    const bought = purchased.includes(r) && level >= (def.levelReq[r - 1] ?? 1);
    if (bought || r <= granted) rank = r;
    else break;
  }
  return rank;
}

// ---- Main ----

export function derive(c: Character): Derived {
  const level = clampLevel(c.level);
  const species = SPECIES_BY_ID[c.speciesId];
  const klass = CLASS_BY_ID[c.classId];
  const warnings: string[] = [];
  const effects: SourcedEffect[] = [];
  const features: FeatureRef[] = [];
  const uses: UseDef[] = [];
  let grantsAccess = false;
  const addFeature = (f: { id: string; name: string; text: string; status: Status; effects?: SourcedEffect[] | any[]; uses?: UseDef[]; grantsAccess?: boolean }, origin: FeatureRef['origin'], source: string) => {
    features.push({ id: f.id, name: f.name, text: f.text, origin, source, status: f.status });
    tag(effects, f.effects, f.name);
    for (const u of f.uses ?? []) {
      const i = uses.findIndex((x) => x.id === u.id);
      if (i >= 0) uses[i] = u;
      else uses.push(u);
    }
    if (f.grantsAccess) grantsAccess = true;
  };

  // Species
  if (!species) warnings.push('Unknown species.');
  const speciesFeatures = species ? (species.chooseThree ? species.features.filter((f) => f.id === c.humanFeature) : species.features) : [];
  for (const f of speciesFeatures) addFeature(f, 'species', species!.name);

  // Class abilities. An upgrade replaces the ability it improves.
  const classAbilities = klass ? dropReplaced(klass.abilities.slice(0, classAbilityCount(level))) : [];
  for (const f of classAbilities) addFeature(f, 'class', klass!.name);

  // Paths
  const paths = ownedPaths(c);
  const traitGranted: Record<string, number> = {};
  const grantedProfs = new Set<string>();
  const pathAttr: Partial<Record<AttrId, number>> = {};
  let casterRank = 0;
  let casterBranch: 'sorcery' | 'incantation' | null = null;
  for (const p of paths) {
    const def = PATH_BY_ID[p.pathId];
    for (let r = 0; r < p.rank; r++) {
      const rk = def.ranks[r];
      tag(effects, rk.effects, `${def.name} ${'I'.repeat(r + 1)}`);
      for (const [tid, tr] of Object.entries(rk.grantsTraits ?? {})) traitGranted[tid] = Math.max(traitGranted[tid] ?? 0, tr);
      for (const tok of rk.grantsProf ?? []) for (const id of expandProfToken(tok)) grantedProfs.add(id);
      for (const u of rk.uses ?? []) {
        const i = uses.findIndex((x) => x.id === u.id);
        if (i >= 0) uses[i] = u;
        else uses.push(u);
      }
      for (const [a, v] of Object.entries(rk.attr ?? {})) pathAttr[a as AttrId] = (pathAttr[a as AttrId] ?? 0) + (v ?? 0);
      if (rk.caster) {
        casterBranch = rk.caster;
        casterRank = Math.max(casterRank, r + 1);
      }
    }
    features.push({ id: `path-${p.pathId}`, name: `${def.name} ${'I'.repeat(p.rank)}`, text: def.ranks.slice(0, p.rank).flatMap((r) => r.text).join(' '), origin: 'path', source: def.name, status: def.status });
  }
  if (klass?.grantsSpellcasting) traitGranted.spellcasting = Math.max(traitGranted.spellcasting ?? 0, 1);

  // Careers
  const careers = [...c.careers].sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1)).slice(0, careerSlots(level));
  for (const pick of careers) {
    const career = CAREER_BY_ID[pick.careerId];
    if (!career) continue;
    if (klass && !career.classes.includes(klass.id)) warnings.push(`${career.name} is not open to the ${klass.name} class.`);
    const rank = careerRank(pick.role, level);
    if (rank === 0 && pick.role === 'secondary') continue;
    const chosen: typeof career.basics = [];
    const all = [career.foundation, ...career.basics, ...career.upgrades, ...career.advanced, ...career.mastery];
    const pickIds = [...(rank >= 1 ? pick.r1.slice(0, 2) : []), ...(rank >= 2 ? pick.r2.slice(0, 2) : []), ...(rank >= 3 ? pick.r3.slice(0, 1) : [])];
    const replacedIds = new Set<string>();
    for (const id of pickIds) {
      const base = upgradeBase(career, id);
      if (base) replacedIds.add(base);
    }
    addFeature(career.foundation, 'career', career.name);
    for (const id of pickIds) {
      const f = all.find((x) => x.id === id);
      if (!f || replacedIds.has(f.id)) continue;
      chosen.push(f);
      addFeature(f, 'career', career.name);
    }
  }

  // Traits
  const traitRanks: Record<string, number> = {};
  const traitIds = new Set([...Object.keys(c.traits), ...Object.keys(traitGranted)]);
  for (const id of traitIds) {
    const def = TRAIT_BY_ID[id];
    if (!def) continue;
    const rank = effectiveTraitRank(id, c.traits[id] ?? [], traitGranted[id] ?? 0, level);
    if (rank <= 0) continue;
    traitRanks[id] = rank;
    tag(effects, traitEffects(def, rank), def.name);
    if (def.grantsAccess) grantsAccess = true;
  }
  const spellcasting = (traitRanks.spellcasting ?? 0) >= 1;

  // Spiritual arts and Dragonkin forms
  const form = DRAGON_FORM_BY_ID[c.dragon.form] ?? DRAGON_FORM_BY_ID.normal;
  const isDragonkin = c.speciesId === 'dragonkin';
  const activeForm = isDragonkin ? form : DRAGON_FORM_BY_ID.normal;
  const formApplies = isDragonkin && activeForm.id !== 'normal' && level >= Math.min(activeForm.level, 99);
  const largeForm = formApplies && ['vyvren', 'dragon', 'ancient'].includes(activeForm.id);
  if (isDragonkin) {
    for (const pid of c.dragon.properties) {
      const prop = DRAGON_PROPERTY_BY_ID[pid];
      if (!prop || level < prop.minLevel) continue;
      tag(effects, prop.effects?.map((e) => ({ ...e, key: `dragon:${prop.id}` })), prop.name);
    }
  }
  if (formApplies) {
    tag(
      effects,
      [
        { stat: 'hp', v: activeForm.hp, key: 'form:hp', label: `${activeForm.name} form` },
        { stat: 'armor', v: activeForm.armor, key: 'form:armor', label: `${activeForm.name} form` },
        { stat: 'mov', v: activeForm.mov, key: 'form:mov', label: `${activeForm.name} form` },
        { stat: 'thresholdPhysical', v: activeForm.physical, key: 'form:physical', label: `${activeForm.name} form` },
        { stat: 'thresholdMental', v: activeForm.mental, key: 'form:mental', label: `${activeForm.name} form` },
      ],
      `${activeForm.name} form`,
    );
    features.push({ id: `form-${activeForm.id}`, name: `${activeForm.name} form`, text: `Natural ATK ${activeForm.atk}, DMG ${activeForm.dmg}.`, origin: 'form', source: 'Dragonkin', status: 'provisional' });
  }
  // The temporary form attributes are shown on the sheet. They never recalculate derived values.
  if (c.shaman.active) {
    const aspect = SHAMAN_ASPECTS.find((a) => a.id === c.shaman.active);
    if (aspect && c.shaman.aspects.includes(aspect.id)) {
      const v = aspect.values[Math.min(2, Math.max(0, (c.shaman.activeRank || 1) - 1))];
      const stat: Record<string, string> = { bear: 'armor', wolf: 'mov', turtle: 'block', stag: 'thresholdMental', raven: 'check:supernatural-perception' };
      if (stat[aspect.id]) effects.push({ stat: stat[aspect.id], v, key: `aspect:${aspect.id}`, label: `${aspect.name} Aspect`, source: `${aspect.name} Aspect` });
    }
  }

  // Attributes
  const attrs = {} as Record<AttrId, DerivedAttr>;
  for (const a of ATTR_IDS) {
    const sp = species ? (species.mods[a] ?? 0) + (species.chooseThree && c.humanAttrs.includes(a) ? 1 : 0) : 0;
    const cl = klass?.attrs.includes(a) ? 1 : 0;
    const bought = Math.max(0, Math.floor(c.attrs[a] ?? 0));
    const path = pathAttr[a] ?? 0;
    const ordinary = bought + sp + cl;
    attrs[a] = { id: a, bought, species: sp, klass: cl, path, total: ordinary + path, ordinary };
  }
  const A = (id: AttrId) => attrs[id].total;

  // Proficiencies
  const profs = new Set<string>();
  for (const id of c.profs) if (PROF_BY_ID[id]) profs.add(id);
  if (c.freeProf && PROF_BY_ID[c.freeProf]) profs.add(c.freeProf);
  for (const id of grantedProfs) profs.add(id);
  if (c.monk.manifested || traitRanks.unarmed) profs.add('prof-unarmed');

  // Equipment
  const suspended = new Set<ItemKind>();
  if (largeForm) for (const k of ['weapon', 'armor', 'shield', 'catalyst'] as ItemKind[]) suspended.add(k);
  const pre = (stat: string) => resolveStat(effects, stat).total;
  const ctx: ItemContext = {
    profs,
    armorWeightReduction: pre('armorWeightReduction'),
    colossalWeightReduction: pre('colossalWeightReduction'),
    suspended,
  };
  const equipped: EquippedItem[] = [];
  const ignoredItems: { uid: string; reason: string }[] = [];
  const slots = slotsFor(c);
  for (const slot of slots) {
    const uid = c.equipment[slot];
    if (!uid) continue;
    const item = c.items.find((i) => i.uid === uid);
    if (!item) {
      ignoredItems.push({ uid, reason: 'The item is missing from the inventory.' });
      continue;
    }
    if (!itemKindFits(item.kind, slot)) {
      ignoredItems.push({ uid, reason: `${item.name} does not fit the ${slot} slot.` });
      continue;
    }
    const view = viewItem(item, ctx);
    equipped.push({ slot, view });
  }
  // A two-handed item uses one slot and both hands, so the other hand slot must stay empty.
  for (const e of [...equipped]) {
    if ((e.slot === 'hand1' || e.slot === 'hand2') && e.view.hands === 2) {
      const other = e.slot === 'hand1' ? 'hand2' : 'hand1';
      const clash = equipped.find((x) => x.slot === other);
      if (clash) {
        ignoredItems.push({ uid: clash.view.item.uid, reason: `${e.view.name} uses both hands, so ${clash.view.name} is not active.` });
        equipped.splice(equipped.indexOf(clash), 1);
      }
    }
  }
  const active = equipped.filter((e) => !e.view.suspended);
  for (const e of active) {
    for (const fx of e.view.effects) effects.push({ stat: fx.stat, v: fx.v, key: fx.key, label: fx.label, source: e.view.name });
    for (const w of e.view.warnings) warnings.push(`${e.view.name}: ${w}`);
  }
  const weight = active.reduce((a, e) => a + e.view.w, 0);

  // Core values
  const R = (stat: string) => resolveStat(effects, stat);
  const hpBase = Math.max(1, 8 + 2 * (level - 1) + A('VIG') * level);
  const hpPerLevel = R('hpPerLevel');
  const hp = breakdown(
    [
      { label: 'Base 8 + 2 per level after the first + VIG x Level', v: hpBase, source: 'Core' },
      ...(hpPerLevel.total ? [{ label: `Per level x ${level}`, v: hpPerLevel.total * level, source: 'Class' }] : []),
    ],
    R('hp'),
    1,
  );

  const armorItem = active.find((e) => e.view.kind === 'armor');
  const armor = breakdown(
    [
      { label: '6 + FOR', v: Math.max(1, 6 + A('FOR')), source: 'Core' },
      ...(armorItem ? [{ label: armorItem.view.name, v: armorItem.view.armor ?? 0, source: 'Armor' }] : []),
    ],
    R('armor'),
    1,
  );

  const mana: Breakdown = grantsAccess
    ? breakdown([{ label: 'Level + 2 x (INT + ARC)', v: Math.max(0, level + 2 * (A('INT') + A('ARC'))), source: 'Core' }], R('mana'), 0)
    : { value: 0, lines: [] };

  const capacity = breakdown([{ label: '20 + 2 x STR', v: Math.max(1, 20 + 2 * A('STR')), source: 'Core' }], R('capacity'), 1);
  const load = loadBand(weight, capacity.value);
  const mov = breakdown(
    [
      { label: 'Base', v: MOV_BASE, source: 'Core' },
      ...(load.movModifier ? [{ label: 'Load', v: load.movModifier, source: 'Load' }] : []),
    ],
    R('mov'),
    0,
  );
  if (!load.canMove) mov.value = 0;

  const graceCap = GRACE_CAP + R('graceCap').total;
  const graceStart = Math.max(0, R('graceStart').total);

  const physical = 20 + A('FOR') + R('thresholdAll').total + R('thresholdPhysical').total;
  const madness = 20 + A('INS') + R('thresholdAll').total + R('thresholdMental').total + R('thresholdMadness').total;
  const thresholds: Thresholds = {
    physical,
    madness,
    poison: physical + R('thresholdPoison').total,
    dazed: physical + R('thresholdDazed').total,
    hesitation: madness + R('thresholdDazed').total,
    frightened: madness + R('thresholdFrightened').total,
  };

  // Accuracy and defenses
  const acc = R('accuracy').total;
  const accuracy = {
    melee: acc + R('accuracyMelee').total,
    ranged: acc + R('accuracyRanged').total,
    unarmed: acc + R('accuracyUnarmed').total,
    spell: R('spellAccuracy').total,
  };
  const shield = active.find((e) => e.view.kind === 'shield');
  const weapons = active.filter((e) => e.view.kind === 'weapon');
  const dualWield = (traitRanks['dual-wield'] ?? 0) >= 1 && weapons.length >= 2 && weapons.every((w) => w.view.hands === 1);
  const attacks: Derived['attacks'] = [];
  for (const e of weapons) {
    const g = e.view.group;
    const bonus = g === 'ranged' ? accuracy.ranged : accuracy.melee;
    const tail = e.slot === 'tail';
    const atk = tail ? 0 : (e.view.atk ?? 0) + bonus + (dualWield ? -1 : 0);
    attacks.push({
      name: e.view.name,
      atk,
      dmg: e.view.dmg ?? 0,
      note: tail ? 'Tail weapon. ATK and Accuracy bonuses do not apply.' : dualWield ? 'Dual Wield. Two rolls, one Attack Action.' : '',
    });
  }
  if (c.monk.manifested && !largeForm) {
    const tier = [...MONK_TIERS].reverse().find((t) => t.level <= level) ?? MONK_TIERS[0];
    attacks.push({ name: 'Manifestation', atk: tier.atk + accuracy.unarmed, dmg: tier.dmg, note: 'Replaces unarmed ATK and DMG. Uses a weapon slot.' });
  } else if (weapons.length === 0 && !largeForm) {
    attacks.push({ name: 'Unarmed', atk: accuracy.unarmed, dmg: 1, note: '' });
  }
  if (formApplies) {
    const atk = Number(String(activeForm.atk).replace('+', ''));
    const dmg = Number(String(activeForm.dmg).replace('+', ''));
    if (Number.isFinite(atk)) attacks.push({ name: `${activeForm.name} natural attack`, atk, dmg, note: 'No ordinary gear or proficiency bonus.' });
  }
  const bestWeaponAtk = attacks.length ? Math.max(...attacks.map((a) => a.atk)) : accuracy.unarmed;
  const defense = {
    block: A('FOR') + R('block').total + (shield?.view.block ?? 0),
    dodge: A('REF') + R('dodge').total,
    parry: bestWeaponAtk + R('parry').total,
  };

  // Spell tiers
  const spellTiers: SpellTierState[] = SPELL_TIER_GATES.map((g) => {
    let available = spellcasting && level >= g.level && casterRank >= g.caster;
    let reason = '';
    if (!spellcasting) reason = 'Needs the Spellcasting Trait.';
    else if (level < g.level) reason = `Needs level ${g.level}.`;
    else if (casterRank < g.caster) reason = `Needs Caster rank ${g.caster}. Take the Sorcery or Incantation Path.`;
    if (g.tier === 6) reason = reason || 'Tier VI is upcast only.';
    const allowed = g.tier === 0 || g.tier === 1 ? 2 : g.tier <= 5 ? 1 : 0;
    return { tier: g.tier, available, reason, allowed };
  });

  // Checks
  const checks: Record<string, CheckLine> = {};
  for (const stat of statsWithPrefix(effects, 'check:')) {
    const r = R(stat);
    checks[stat.slice(6)] = { stat, total: r.total, lines: r.lines, conditional: r.conditional };
  }

  // Companions and summons
  const companionCap = Math.max(COMPANION_BASE_CAPACITY, R('companionCapacity').total);
  const summonCap = Math.max(SUMMON_BASE_CAPACITY, R('summonCapacity').total);
  const companionUsed = c.companions.filter((x) => x.kind === 'companion').reduce((a, x) => a + (COMPANION_SIZE_BY_ID[x.size]?.capacity ?? 0), 0);
  const summonUsed = c.companions.filter((x) => x.kind === 'summon').reduce((a, x) => a + (COMPANION_SIZE_BY_ID[x.size]?.capacity ?? 0), 0);

  // AP and TP
  const apSpent = ATTR_IDS.reduce((a, id) => a + attrs[id].bought, 0);
  const tpBonus = R('tp').total;
  const tpSpent = tpSpentFor(c, traitGranted, level);
  const result: Derived = {
    level,
    ap: { total: apTotal(level), spent: apSpent, remaining: apTotal(level) - apSpent },
    tp: { total: tpTotal(level) + tpBonus, spent: tpSpent, remaining: tpTotal(level) + tpBonus - tpSpent, bonus: tpBonus },
    attrs,
    speciesName: species?.name ?? 'Unknown',
    className: klass?.name ?? 'Unknown',
    hasMana: grantsAccess,
    spellcasting,
    casterRank,
    casterBranch,
    spellTiers,
    hp,
    armor,
    mana,
    mov,
    capacity,
    weight,
    load,
    graceCap,
    graceStart,
    actions: 2 + R('actions').total,
    reactions: 1 + R('reactions').total,
    finalBlowMax: FINAL_BLOW_RESISTANCE,
    thresholds,
    decayBonus: R('decay').total,
    accuracy,
    defense,
    attack: { spell: A('ARC') + accuracy.spell },
    attacks,
    dualWield,
    rest: {
      hpBonus: R('restHp').total + (R('restHpVig').total > 0 ? Math.max(0, A('VIG')) : 0),
      manaBonus: R('restMana').total,
      sleepHpBonus: R('sleepHp').total,
    },
    healSpellBonus: R('healSpell').total,
    checks,
    features,
    uses,
    conditional: effects.filter((e) => !!e.when),
    paths,
    traitRanks,
    traitGranted,
    profs,
    equipped,
    ignoredItems,
    companionCapacity: companionCap,
    summonCapacity: summonCap,
    companionAbilityPool: R('companionAbilities').total,
    companionUsed,
    summonUsed,
    companionHpBonus: R('companionHp').total,
    summonHpBonus: R('summonHp').total,
    form: { id: activeForm.id, name: activeForm.name, suspendsGear: largeForm },
    overridden: [],
    warnings,
    effects,
  };

  // Narrator overrides need a written reason. An override without one is ignored.
  for (const o of c.overrides) {
    if (!o.reason || !o.reason.trim()) {
      warnings.push(`An override on ${o.stat} was ignored because it has no reason.`);
      continue;
    }
    const target = (result as unknown as Record<string, unknown>)[o.stat] as Breakdown | undefined;
    if (target && typeof target === 'object' && 'value' in target) {
      result.overridden.push({ stat: o.stat, from: target.value, to: o.value, reason: o.reason });
      target.value = o.value;
    }
  }
  return result;
}

/** TP spent: every purchased Trait rank, plus purchased proficiencies. Path grants are free and never refunded. */
export function tpSpentFor(c: Character, granted: Record<string, number>, level: number): number {
  let sum = 0;
  for (const [id, ranks] of Object.entries(c.traits)) {
    const def = TRAIT_BY_ID[id];
    if (!def) continue;
    if (def.repeatable) {
      sum += (def.cost[0] ?? 0) * ranks.length;
      continue;
    }
    for (const r of new Set(ranks)) {
      if (r >= 1 && r <= def.ranks && level >= (def.levelReq[r - 1] ?? 1)) sum += def.cost[r - 1] ?? 0;
    }
  }
  for (const id of c.profs) {
    if (id === c.freeProf) continue;
    sum += PROF_BY_ID[id]?.cost ?? 0;
  }
  void granted;
  return sum;
}

export function attrWithinRange(a: DerivedAttr): boolean {
  return a.ordinary >= ATTR_MIN && a.ordinary <= ATTR_MAX;
}

export function level1Ceiling(): number {
  return LEGACY_LEVEL1_CEILING;
}

export function pathSlotLevels(): number[] {
  return PATH_SLOT_LEVELS;
}
