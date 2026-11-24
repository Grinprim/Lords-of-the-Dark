import { ATTR_IDS, AttrId } from '../data/types';
import { ATTR_MAX, ATTR_MIN, CAREER_LEVELS, DRAGON_FORM_LEVELS, LEGACY_LEVEL1_CEILING, MONK_TIER_LEVELS, careerSlots, independentPathSlots, pathMpSpent } from '../data/progression';
import { SPECIES_BY_ID } from '../data/species';
import { CLASS_BY_ID } from '../data/classes';
import { CAREER_BY_ID, careersForClass } from '../data/careers';
import { PATH_BY_ID } from '../data/paths';
import { TRAIT_BY_ID } from '../data/traits';
import { PROF_BY_ID } from '../data/equipment';
import { SCHOOL_BY_ID, SPELL_BY_ID } from '../data/magic';
import { MONK_TECHNIQUES, MONK_TIERS, SHAMAN_ASPECTS, DRAGON_PROPERTY_BY_ID, DRAGON_PROPERTY_LEVELS } from '../data/spiritual';
import { COMPANION_SIZE_BY_ID } from '../data/companions';
import type { Character } from './character';
import { Derived, effectiveTraitRank } from './derive';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  id: string;
  severity: Severity;
  area: string;
  message: string;
}

export interface Eligibility {
  ok: boolean;
  reason?: string;
}

const ok = (): Eligibility => ({ ok: true });
const no = (reason: string): Eligibility => ({ ok: false, reason });

// ---- Eligibility, with a reason for every disabled choice ----

export function canTakeIndependentPath(c: Character, d: Derived, pathId: string): Eligibility {
  const def = PATH_BY_ID[pathId];
  if (!def) return no('Unknown Path.');
  if (c.independentPaths.includes(pathId)) return no('You already have this Path.');
  const slots = independentPathSlots(d.level);
  if (slots === 0) return no('Independent Paths open at level 4.');
  if (c.independentPaths.length >= slots) return no(`All ${slots} independent Path slots are used. The next opens at level ${[4, 8, 12, 16].find((l) => l > d.level) ?? 'never'}.`);
  const caster = def.ranks[0].caster;
  if (caster && d.paths.some((p) => p.caster && p.caster !== caster)) return no('Sorcery and Incantation are exclusive for ordinary characters.');
  if (d.paths.some((p) => p.pathId === pathId)) return no('A Career already gives you this Path. A duplicate gives you 2 Mastery Points instead.');
  return ok();
}

export function canRaisePathRank(c: Character, d: Derived, pathId: string): Eligibility {
  const p = d.paths.find((x) => x.pathId === pathId);
  if (!p) return no('You do not have this Path.');
  if (p.rank >= 3) return no('This Path is at rank III.');
  const next = p.rank + 1;
  const need = pathMpSpent(next);
  if (p.earnedMp < need) return no(`Rank ${'I'.repeat(next)} needs ${need} earned Mastery Points for this Path. You have ${p.earnedMp}.`);
  return ok();
}

export function canTakeCareer(c: Character, d: Derived, careerId: string, role: 'primary' | 'secondary'): Eligibility {
  const def = CAREER_BY_ID[careerId];
  if (!def) return no('Unknown Career.');
  if (!def.classes.includes(c.classId)) return no(`${def.name} is closed to the ${CLASS_BY_ID[c.classId]?.name ?? 'chosen'} class.`);
  if (c.careers.some((k) => k.careerId === careerId)) return no('You already have this Career.');
  const need = role === 'primary' ? CAREER_LEVELS[0] : CAREER_LEVELS[1];
  if (d.level < need) return no(`Your ${role} Career opens at level ${need}.`);
  if (c.careers.some((k) => k.role === role)) return no(`You already have a ${role} Career.`);
  return ok();
}

export function canBuyTraitRank(c: Character, d: Derived, traitId: string, rank: number): Eligibility {
  const def = TRAIT_BY_ID[traitId];
  if (!def) return no('Unknown Trait.');
  if (rank < 1 || rank > def.ranks) return no('That rank does not exist.');
  const purchased = c.traits[traitId] ?? [];
  const granted = d.traitGranted[traitId] ?? 0;
  if (def.repeatable) {
    if (d.tp.remaining < (def.cost[0] ?? 0)) return no(`Costs ${def.cost[0]} TP. You have ${d.tp.remaining}.`);
    return ok();
  }
  if (purchased.includes(rank)) return no('You already bought this rank.');
  if (rank <= granted) return no('A Path already gives you this rank for free.');
  const have = effectiveTraitRank(traitId, purchased, granted, d.level);
  if (have < rank - 1) return no(`Buy rank ${rank - 1} first.`);
  const gate = def.levelReq[rank - 1] ?? 1;
  if (d.level < gate) return no(`Rank ${rank} needs level ${gate}.`);
  if (def.needsAccess && !d.hasMana) return no('You need Mana access.');
  if (def.kind === 'exceptional') return no('This Trait is exceptional. The Narrator grants it through the story.');
  const price = def.cost[rank - 1] ?? 0;
  if (d.tp.remaining < price) return no(`Costs ${price} TP. You have ${d.tp.remaining}.`);
  return ok();
}

export function canBuyProficiency(c: Character, d: Derived, profId: string): Eligibility {
  const def = PROF_BY_ID[profId];
  if (!def) return no('Unknown proficiency.');
  if (d.profs.has(profId)) return no('You already have this proficiency.');
  if (d.tp.remaining < def.cost) return no(`Costs ${def.cost} TP. You have ${d.tp.remaining}.`);
  return ok();
}

export function canLearnSpell(c: Character, d: Derived, spellId: string): Eligibility {
  const s = SPELL_BY_ID[spellId];
  if (!s) return no('Unknown spell.');
  if (c.spells.includes(spellId)) return no('You already know this spell.');
  if (!d.spellcasting) return no('You need the Spellcasting Trait.');
  const school = SCHOOL_BY_ID[s.schoolId];
  const exceptional = c.exceptionalSchools.includes(s.schoolId);
  if (c.casterSchool !== s.schoolId && !exceptional) {
    return no(c.casterSchool ? `Your ordinary school is ${SCHOOL_BY_ID[c.casterSchool]?.name}. Other schools need Narrator access.` : 'Choose your school first.');
  }
  if (school.restricted && !exceptional) return no(`${school.name} is forbidden. It needs explicit Narrator access.`);
  if (school.branch !== (d.casterBranch ?? school.branch) && !exceptional) return no(`Your caster Path is ${d.casterBranch}. ${school.name} belongs to ${school.branch}.`);
  if (s.tier >= 6) return no('Tier VI is upcast only.');
  const gate = d.spellTiers.find((t) => t.tier === s.tier);
  if (!gate?.available) return no(gate?.reason || 'This tier is not open yet.');
  if (s.composite && s.tier < 3) return no('Composite spells start at tier III.');
  const known = c.spells.filter((id) => SPELL_BY_ID[id]?.tier === s.tier).length;
  const allowed = (gate?.allowed ?? 0) + (c.extraSpellSlots[String(s.tier)] ?? 0);
  if (known >= allowed) return no(`You may know ${allowed} spell${allowed === 1 ? '' : 's'} of this tier. The Narrator can grant more.`);
  return ok();
}

export function canEquip(c: Character, d: Derived, uid: string, slot: string): Eligibility {
  const item = c.items.find((i) => i.uid === uid);
  if (!item) return no('Item not found.');
  if (slot === 'tail' && c.speciesId !== 'dragonkin') return no('Only Dragonkin have a tail slot.');
  return ok();
}

// ---- Full validation ----

export function validateCharacter(c: Character, d: Derived): Issue[] {
  const out: Issue[] = [];
  const add = (severity: Severity, area: string, message: string) => out.push({ id: `${area}-${out.length}`, severity, area, message });

  const species = SPECIES_BY_ID[c.speciesId];
  const klass = CLASS_BY_ID[c.classId];
  if (!species) add('error', 'Species', 'Choose a species.');
  if (!klass) add('error', 'Class', 'Choose a class.');
  if (!c.name.trim()) add('warning', 'Identity', 'Give the character a name.');

  if (species?.chooseThree) {
    const picks = new Set(c.humanAttrs);
    if (picks.size !== 3 || c.humanAttrs.length !== 3) add('error', 'Species', 'A Human picks three distinct attributes for +1 each.');
    if (!c.humanFeature) add('error', 'Species', 'A Human picks one of Adaptability, Determination or Quick Learner.');
  }

  // Attributes
  if (d.ap.remaining < 0) add('error', 'Attributes', `You spent ${-d.ap.remaining} more AP than you have.`);
  else if (d.ap.remaining > 0) add('info', 'Attributes', `${d.ap.remaining} AP left to spend.`);
  for (const id of ATTR_IDS) {
    const a = d.attrs[id];
    if (c.attrs[id] < 0) add('error', 'Attributes', `${id} has negative AP spent.`);
    if (a.ordinary > ATTR_MAX) add('error', 'Attributes', `${id} is ${a.ordinary}. Ordinary attributes stop at ${ATTR_MAX}. Only a Path may push past it.`);
    if (a.ordinary < ATTR_MIN) add('error', 'Attributes', `${id} is ${a.ordinary}. The floor is ${ATTR_MIN}.`);
    if (d.level === 1 && a.ordinary > LEGACY_LEVEL1_CEILING) add('warning', 'Attributes', `${id} is ${a.ordinary} at level 1. The old site capped new characters at ${LEGACY_LEVEL1_CEILING}.`);
  }

  // Traits
  if (d.tp.remaining < 0) add('error', 'Traits', `You spent ${-d.tp.remaining} more TP than you have.`);
  else if (d.tp.remaining > 0 && d.level === 1) add('info', 'Traits', `${d.tp.remaining} TP left to spend.`);
  for (const [id, ranks] of Object.entries(c.traits)) {
    const def = TRAIT_BY_ID[id];
    if (!def) {
      add('error', 'Traits', `Unknown Trait ${id}.`);
      continue;
    }
    const granted = d.traitGranted[id] ?? 0;
    for (const r of ranks) {
      if (!def.repeatable && (r < 1 || r > def.ranks)) add('error', 'Traits', `${def.name} has no rank ${r}.`);
      else if (!def.repeatable && d.level < (def.levelReq[r - 1] ?? 1)) add('error', 'Traits', `${def.name} rank ${r} needs level ${def.levelReq[r - 1]}.`);
      else if (!def.repeatable && r > 1 && !ranks.includes(r - 1) && r - 1 > granted) add('error', 'Traits', `${def.name} rank ${r} needs the rank before it.`);
    }
    if (def.needsAccess && !d.hasMana) add('error', 'Traits', `${def.name} needs Mana access.`);
    const eff = d.traitRanks[id] ?? 0;
    if (def.optionLabel && eff > 0) {
      const have = (c.traitOptions[id] ?? []).filter((x) => x.trim()).length;
      const need = def.fieldOptions ? eff : def.repeatable ? ranks.length : 1;
      if (have < need) add('warning', 'Traits', `${def.name}: name ${need === 1 ? 'the' : 'all'} ${def.optionLabel.toLowerCase()}${need === 1 ? '' : 's'} (${have} of ${need}).`);
    }
  }
  for (const id of c.profs) {
    if (!PROF_BY_ID[id]) add('error', 'Proficiencies', `Unknown proficiency ${id}.`);
    else if (d.traitGranted && [...d.profs].includes(id) && c.freeProf === id) add('info', 'Proficiencies', `${PROF_BY_ID[id].name} is also your free proficiency.`);
  }
  if (c.freeProf) {
    const p = PROF_BY_ID[c.freeProf];
    if (!p || !['melee', 'colossal', 'ranged'].includes(p.group)) add('error', 'Proficiencies', 'Your free starting proficiency must be a weapon.');
    else if (c.profs.includes(c.freeProf)) add('warning', 'Proficiencies', 'You bought the proficiency you also took for free. Pick another free weapon.');
  } else if (d.level >= 1) {
    add('info', 'Proficiencies', 'Pick your free starting weapon proficiency.');
  }

  // Careers
  const slots = careerSlots(d.level);
  if (c.careers.length > slots) add('error', 'Careers', `Only ${slots} Career${slots === 1 ? '' : 's'} open at level ${d.level}.`);
  for (const pick of c.careers) {
    const def = CAREER_BY_ID[pick.careerId];
    if (!def) {
      add('error', 'Careers', `Unknown Career ${pick.careerId}.`);
      continue;
    }
    if (!def.classes.includes(c.classId)) add('error', 'Careers', `${def.name} is closed to your class.`);
    if (!pick.pathId) add('warning', 'Careers', `${def.name}: pick the Path this Career grants.`);
    else if (!def.paths.includes(pick.pathId)) add('error', 'Careers', `${def.name} cannot grant ${PATH_BY_ID[pick.pathId]?.name ?? pick.pathId}.`);
    const basics = new Set(def.basics.map((b) => b.id));
    const second = new Set([...def.upgrades, ...def.advanced].map((b) => b.id));
    const third = new Set([...def.upgrades, ...def.mastery].map((b) => b.id));
    if (pick.r1.length > 2 || pick.r1.some((id) => !basics.has(id))) add('error', 'Careers', `${def.name} rank I: choose two of the four basic abilities.`);
    if (pick.r2.length > 2 || pick.r2.some((id) => !second.has(id))) add('error', 'Careers', `${def.name} rank II: choose two upgrades or advanced abilities.`);
    if (pick.r3.length > 1 || pick.r3.some((id) => !third.has(id))) add('error', 'Careers', `${def.name} rank III: choose one upgrade or one mastery ability.`);
    for (const id of [...pick.r2, ...pick.r3]) {
      const idx = def.upgrades.findIndex((u) => u.id === id);
      if (idx >= 0 && !pick.r1.includes(def.basics[idx]?.id)) add('warning', 'Careers', `${def.upgrades[idx].name} improves ${def.basics[idx]?.name}. Take that basic ability first.`);
    }
  }
  if (new Set(c.careers.map((k) => k.role)).size !== c.careers.length) add('error', 'Careers', 'You have two Careers in the same role.');

  // Paths
  const slotsPaths = independentPathSlots(d.level);
  if (c.independentPaths.length > slotsPaths) add('error', 'Paths', `Only ${slotsPaths} independent Path slot${slotsPaths === 1 ? '' : 's'} open at level ${d.level}.`);
  for (const p of d.paths) {
    const chosen = Math.max(1, Math.min(3, p.chosenRank));
    if (chosen > p.rank) add('error', 'Paths', `${PATH_BY_ID[p.pathId].name} is set to rank ${chosen}, but ${p.earnedMp} earned Mastery Points only pay for rank ${p.rank}.`);
  }
  const casterBranches = new Set(d.paths.map((p) => p.caster).filter(Boolean));
  if (casterBranches.size > 1) add('error', 'Paths', 'Sorcery and Incantation are exclusive for ordinary characters.');
  for (const id of c.independentPaths) if (!PATH_BY_ID[id]) add('error', 'Paths', `Unknown Path ${id}.`);
  if (new Set(c.independentPaths).size !== c.independentPaths.length) add('error', 'Paths', 'A Path appears twice in your independent Paths.');

  // Magic
  if (c.spells.length && !d.spellcasting) add('error', 'Magic', 'You know spells but have no Spellcasting Trait.');
  const perTier: Record<number, number> = {};
  for (const id of c.spells) {
    const s = SPELL_BY_ID[id];
    if (!s) {
      add('error', 'Magic', `Unknown spell ${id}.`);
      continue;
    }
    perTier[s.tier] = (perTier[s.tier] ?? 0) + 1;
    const exceptional = c.exceptionalSchools.includes(s.schoolId);
    if (c.casterSchool !== s.schoolId && !exceptional) add('error', 'Magic', `${s.name} is outside your ordinary school.`);
    const gate = d.spellTiers.find((t) => t.tier === s.tier);
    if (!gate?.available) add('error', 'Magic', `${s.name} (tier ${s.tier}) is not open to you yet.`);
    if (s.tier >= 6) add('error', 'Magic', `${s.name} is tier VI. It is upcast only and cannot be learned.`);
  }
  for (const [tier, n] of Object.entries(perTier)) {
    const gate = d.spellTiers.find((t) => t.tier === Number(tier));
    const allowed = (gate?.allowed ?? 0) + (c.extraSpellSlots[tier] ?? 0);
    if (n > allowed) add('warning', 'Magic', `Tier ${tier}: you know ${n} spells. The standard limit is ${allowed}. A Narrator grant raises it.`);
  }
  for (const id of c.exceptionalSchools) if (!SCHOOL_BY_ID[id]) add('error', 'Magic', `Unknown school ${id}.`);

  // Spiritual arts
  const hasCareer = (id: string) => c.careers.some((k) => k.careerId === id) && careerSlots(d.level) > 0;
  if (c.monk.techniques.length) {
    if (!hasCareer('monk')) add('error', 'Spiritual Arts', 'Monk techniques need the Monk Career.');
    const tierLevel = (t: string) => MONK_TIERS.find((x) => x.id === t)?.level ?? 99;
    for (const id of c.monk.techniques) {
      const t = MONK_TECHNIQUES.find((x) => x.id === id);
      if (!t) add('error', 'Spiritual Arts', `Unknown Monk technique ${id}.`);
      else if (d.level < tierLevel(t.tier)) add('error', 'Spiritual Arts', `${t.name} opens at level ${tierLevel(t.tier)}.`);
    }
    const basics = c.monk.techniques.filter((id) => MONK_TECHNIQUES.find((x) => x.id === id)?.tier === 'basic').length;
    const reached = MONK_TIER_LEVELS.filter((l) => l <= d.level).length;
    const allowed = 2 + (reached - 1) * 1;
    if (basics > 2) add('warning', 'Spiritual Arts', 'A Monk learns 2 Basic techniques to start.');
    if (c.monk.techniques.length > allowed + 4) add('warning', 'Spiritual Arts', 'You know more techniques than the standard limit. A Narrator grant allows it.');
  }
  if (c.shaman.aspects.length) {
    if (!hasCareer('shaman')) add('error', 'Spiritual Arts', 'Shaman Aspects need the Shaman Career.');
    for (const id of c.shaman.aspects) if (!SHAMAN_ASPECTS.find((a) => a.id === id)) add('error', 'Spiritual Arts', `Unknown Aspect ${id}.`);
  }

  // Dragonkin
  if (c.speciesId !== 'dragonkin' && (c.dragon.form !== 'normal' || c.dragon.properties.length)) add('error', 'Dragonkin', 'Forms and Dragonkin properties need the Dragonkin species.');
  if (c.speciesId === 'dragonkin') {
    const allowed = DRAGON_PROPERTY_LEVELS.filter((l) => l <= d.level).length;
    if (c.dragon.properties.length > allowed) add('error', 'Dragonkin', `You may choose ${allowed} propert${allowed === 1 ? 'y' : 'ies'} at level ${d.level}.`);
    for (const id of c.dragon.properties) {
      const p = DRAGON_PROPERTY_BY_ID[id];
      if (!p) add('error', 'Dragonkin', `Unknown property ${id}.`);
      else if (d.level < p.minLevel) add('error', 'Dragonkin', `${p.name} needs level ${p.minLevel}.`);
    }
    const formLevel = DRAGON_FORM_LEVELS[['normal', 'partial', 'vyvren', 'dragon'].indexOf(c.dragon.form)];
    if (formLevel !== undefined && d.level < formLevel) add('error', 'Dragonkin', `The ${c.dragon.form} form opens at level ${formLevel}.`);
  }

  // Equipment
  for (const ig of d.ignoredItems) add('warning', 'Equipment', ig.reason);
  if (d.load.band === 'overloaded') add('warning', 'Equipment', 'You are overloaded. No movement and no Dodge.');
  for (const [slot, uid] of Object.entries(c.equipment)) {
    if (slot === 'tail' && c.speciesId !== 'dragonkin') add('error', 'Equipment', 'Only Dragonkin have a tail slot.');
    if (uid && !c.items.some((i) => i.uid === uid)) add('error', 'Equipment', `Slot ${slot} points to an item that does not exist.`);
  }
  const uids = c.equipment ? Object.values(c.equipment).filter(Boolean) : [];
  if (new Set(uids).size !== uids.length) add('error', 'Equipment', 'One item sits in two slots.');
  for (const w of d.warnings) add('warning', 'Notes', w);

  // Companions
  if (d.companionUsed > d.companionCapacity) add('warning', 'Companions', `Companions use ${d.companionUsed} of ${d.companionCapacity} capacity.`);
  if (d.summonUsed > d.summonCapacity) add('warning', 'Companions', `Summons use ${d.summonUsed} of ${d.summonCapacity} capacity.`);
  for (const k of c.companions) {
    const size = COMPANION_SIZE_BY_ID[k.size];
    if (!size) add('error', 'Companions', `${k.name || 'A companion'} has an unknown size.`);
    else if (k.kind === 'companion' && d.level < size.minLevel) add('warning', 'Companions', `${k.name || 'A companion'}: ${size.name} companions open at level ${size.minLevel}.`);
  }

  // Overrides and state
  for (const o of c.overrides) if (!o.reason.trim()) add('error', 'Overrides', `The override on ${o.stat} needs a reason.`);
  if (c.state.fatigue < 0) add('error', 'State', 'Fatigue cannot be negative.');
  if (c.level < 1 || c.level > 99) add('error', 'Level', 'Level is out of range.');
  void careersForClass;
  return out;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

/** Short step checks for the wizard. */
export function stepIssues(issues: Issue[], areas: string[]): Issue[] {
  return issues.filter((i) => areas.includes(i.area));
}

export function attrList(): AttrId[] {
  return ATTR_IDS;
}
