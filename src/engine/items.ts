import {
  ARMOR_BY_ID,
  ARMOR_INFUSIONS,
  ACCESSORY_KINDS,
  ACCESSORY_WEIGHT,
  CATALYST_BY_ID,
  CATALYST_PROPERTIES,
  CEILINGS,
  CLOAK_BY_ID,
  DamageType,
  SHIELD_BY_ID,
  SHIELD_MODS,
  VARIANT_TABLE,
  WEAPON_BY_ID,
  WEAPON_TIERS,
  WeaponGroup,
  UNARMED,
} from '../data/equipment';
import type { Item, ItemKind } from './character';

export interface DamagePart {
  type: DamageType | string;
  amount: number;
}

export interface ItemEffectOut {
  stat: string;
  v: number;
  label: string;
  /** Identical-effect key. Items of the same kind share a key, so only the highest applies. */
  key: string;
}

export interface ItemView {
  item: Item;
  kind: ItemKind;
  name: string;
  /** Weight after reductions. */
  w: number;
  baseW: number;
  atk?: number;
  dmg?: number;
  hands?: 1 | 2;
  group?: WeaponGroup | 'unarmed';
  parts?: DamagePart[];
  armor?: number;
  block?: number;
  profId: string | null;
  proficient: boolean;
  suspended: boolean;
  effects: ItemEffectOut[];
  warnings: string[];
}

export interface ItemContext {
  /** Proficiency ids the character owns, including Path grants. */
  profs: Set<string>;
  armorWeightReduction: number;
  colossalWeightReduction: number;
  /** Item kinds that are suspended, such as weapons while in a large Dragonkin form. */
  suspended: Set<ItemKind>;
}

export const defaultItemContext: ItemContext = {
  profs: new Set(),
  armorWeightReduction: 0,
  colossalWeightReduction: 0,
  suspended: new Set(),
};

/**
 * Split damage across types for an infusion.
 * Arcane makes everything Magic. Fire, Frost, Lightning and Sacred keep half (rounded up) as the
 * physical type and put the rest into the element. Abyssal is set item by item.
 */
export function damageParts(dmg: number, base: DamageType | string, infusion: string | undefined): DamagePart[] {
  const total = Math.max(0, dmg);
  switch (infusion) {
    case 'arcane':
      return [{ type: 'Magic', amount: total }];
    case 'fire':
    case 'frost':
    case 'lightning':
    case 'sacred': {
      const element = infusion === 'sacred' ? 'Holy' : infusion[0].toUpperCase() + infusion.slice(1);
      const physical = Math.ceil(total / 2);
      return [
        { type: base, amount: physical },
        { type: element, amount: total - physical },
      ];
    }
    default:
      return [{ type: base, amount: total }];
  }
}

/** Reduce a weight, never below the minimum when the base weight was above it. */
export function reduceWeight(w: number, reduction: number, min = 1): number {
  if (reduction <= 0 || w <= 0) return w;
  return Math.max(Math.min(w, min), w - reduction);
}

function weaponView(item: Item, ctx: ItemContext): ItemView {
  const warnings: string[] = [];
  const base = item.baseId ? WEAPON_BY_ID[item.baseId] : undefined;
  let atk = base ? base.atk : item.atk ?? 0;
  let dmg = base ? base.dmg : item.dmg ?? 0;
  let w = base ? base.w : item.w ?? 0;
  const hands = base ? base.hands : item.hands ?? 1;
  const group = base?.group;
  if (base) {
    const tier = WEAPON_TIERS.find((t) => t.id === item.tierId) ?? WEAPON_TIERS[0];
    atk += tier.atk;
    dmg += tier.dmg;
    if (item.variant && item.variant !== 'none') {
      const row = VARIANT_TABLE[base.cls]?.[item.variant as 'heavy' | 'keen' | 'quality'];
      if (row) {
        atk += row.atk;
        dmg += row.dmg;
      }
    }
  }
  const baseW = w;
  if (group === 'colossal') w = reduceWeight(w, ctx.colossalWeightReduction);
  if (!item.exceptional && (atk > CEILINGS.atk || dmg > CEILINGS.dmg)) {
    warnings.push(`Over the intrinsic ceiling of ${CEILINGS.atk} ATK and ${CEILINGS.dmg} DMG. Mark it exceptional if the Narrator allows it.`);
  }
  const profId = base?.profId ?? null;
  const proficient = !profId || ctx.profs.has(profId);
  if (!proficient) warnings.push('You are not proficient with this weapon.');
  return {
    item,
    kind: 'weapon',
    name: item.name,
    w,
    baseW,
    atk,
    dmg,
    hands,
    group,
    parts: damageParts(dmg, base?.dmgType ?? 'Standard', item.infusion),
    profId,
    proficient,
    suspended: ctx.suspended.has('weapon'),
    effects: customEffects(item),
    warnings,
  };
}

function armorView(item: Item, ctx: ItemContext): ItemView {
  const warnings: string[] = [];
  const base = item.baseId ? ARMOR_BY_ID[item.baseId] : undefined;
  const inf = ARMOR_INFUSIONS.find((i) => i.id === item.infusion) ?? ARMOR_INFUSIONS[0];
  const armor = (base ? base.armor : item.armor ?? 0) + inf.armor;
  let w = (base ? base.w : item.w ?? 0) + (inf.w > 0 ? inf.w : 0);
  const baseW = w;
  if (inf.w < 0) w = reduceWeight(w, -inf.w);
  w = reduceWeight(w, ctx.armorWeightReduction);
  if (!item.exceptional && armor > CEILINGS.armor) {
    warnings.push(`Over the intrinsic Armor ceiling of ${CEILINGS.armor}.`);
  }
  const profId = base?.profId ?? null;
  const proficient = !profId || ctx.profs.has(profId);
  if (!proficient) warnings.push('You are not proficient with this armor.');
  const effects: ItemEffectOut[] = [...customEffects(item)];
  if (inf.threshold) effects.push({ stat: 'thresholdAll', v: inf.threshold, label: 'Resilient armor', key: `item:${item.uid}:threshold` });
  if (inf.resist) effects.push({ stat: 'resist', v: inf.resist, label: 'Warded armor', key: `item:${item.uid}:resist` });
  return { item, kind: 'armor', name: item.name, w, baseW, armor, profId, proficient, suspended: ctx.suspended.has('armor'), effects, warnings };
}

function shieldView(item: Item, ctx: ItemContext): ItemView {
  const warnings: string[] = [];
  const base = item.baseId ? SHIELD_BY_ID[item.baseId] : undefined;
  const mod = SHIELD_MODS.find((m) => m.id === item.shieldMod) ?? SHIELD_MODS[0];
  const block = (base ? base.block : item.block ?? 0) + mod.block;
  let w = (base ? base.w : item.w ?? 0) + (mod.w > 0 ? mod.w : 0);
  const baseW = w;
  if (mod.w < 0) w = reduceWeight(w, -mod.w);
  const profId = base?.profId ?? null;
  const proficient = !profId || ctx.profs.has(profId);
  if (!proficient) warnings.push('You are not proficient with this shield.');
  const effects: ItemEffectOut[] = [...customEffects(item)];
  if (mod.stability) effects.push({ stat: 'stability', v: mod.stability, label: 'Stable shield', key: `item:${item.uid}:stability` });
  if (mod.resist) effects.push({ stat: 'resist', v: mod.resist, label: 'Warded shield', key: `item:${item.uid}:resist` });
  return { item, kind: 'shield', name: item.name, w, baseW, block, hands: 1, profId, proficient, suspended: ctx.suspended.has('shield'), effects, warnings };
}

function cloakView(item: Item, ctx: ItemContext): ItemView {
  const base = item.baseId ? CLOAK_BY_ID[item.baseId] : undefined;
  const effects: ItemEffectOut[] = [...customEffects(item)];
  if (base) for (const e of base.effects) effects.push({ stat: e.stat, v: e.v, label: e.label, key: `cloak:${base.id}:${e.stat}` });
  const w = base ? base.w : item.w ?? 0;
  return { item, kind: 'cloak', name: item.name, w, baseW: w, profId: null, proficient: true, suspended: ctx.suspended.has('cloak'), effects, warnings: [] };
}

function accessoryView(item: Item, ctx: ItemContext): ItemView {
  const kind = ACCESSORY_KINDS.find((k) => k.id === item.accessoryKind);
  const rank = Math.min(3, Math.max(1, item.accessoryRank ?? 1));
  const effects: ItemEffectOut[] = [...customEffects(item)];
  if (kind) {
    // Accessories of the same kind are identical effects, so only the highest applies.
    effects.push({ stat: kind.stat, v: kind.values[rank - 1], label: `${kind.name} accessory`, key: `accessory:${kind.id}` });
  }
  const w = item.w ?? ACCESSORY_WEIGHT;
  return { item, kind: 'accessory', name: item.name, w, baseW: w, profId: null, proficient: true, suspended: ctx.suspended.has('accessory'), effects, warnings: [] };
}

const PROPERTY_STAT: Record<string, string> = {
  casting: 'spellAccuracy',
  concentration: 'check:concentration',
  knowledge: 'check:knowledge',
  ritual: 'check:ritual',
  damage: 'spellDmg',
  heal: 'healSpell',
  mana: 'mana',
};

function catalystView(item: Item, ctx: ItemContext): ItemView {
  const base = item.baseId ? CATALYST_BY_ID[item.baseId] : undefined;
  const effects: ItemEffectOut[] = [...customEffects(item)];
  const prop = item.property ? CATALYST_PROPERTIES.find((p) => p.id === item.property!.id) : undefined;
  if (prop) {
    const rank = Math.min(3, Math.max(1, item.property!.rank));
    effects.push({ stat: PROPERTY_STAT[prop.id], v: prop.values[rank - 1], label: `${prop.name} catalyst`, key: `catalyst:${prop.id}` });
  }
  const w = base ? base.w : item.w ?? 0;
  return { item, kind: 'catalyst', name: item.name, w, baseW: w, profId: null, proficient: true, suspended: ctx.suspended.has('catalyst'), effects, warnings: [] };
}

function customView(item: Item, ctx: ItemContext): ItemView {
  const w = item.w ?? 0;
  return { item, kind: 'custom', name: item.name, w, baseW: w, atk: item.atk, dmg: item.dmg, armor: item.armor, block: item.block, profId: null, proficient: true, suspended: false, effects: customEffects(item), warnings: [] };
}

function customEffects(item: Item): ItemEffectOut[] {
  return (item.effects ?? []).map((e, i) => ({ stat: e.stat, v: e.v, label: e.label ?? item.name, key: `item:${item.uid}:${i}` }));
}

export function viewItem(item: Item, ctx: ItemContext = defaultItemContext): ItemView {
  switch (item.kind) {
    case 'weapon':
      return weaponView(item, ctx);
    case 'armor':
      return armorView(item, ctx);
    case 'shield':
      return shieldView(item, ctx);
    case 'cloak':
      return cloakView(item, ctx);
    case 'accessory':
      return accessoryView(item, ctx);
    case 'catalyst':
      return catalystView(item, ctx);
    default:
      return customView(item, ctx);
  }
}

/** Unarmed numbers when no weapon is equipped. */
export function unarmedStats(): { atk: number; dmg: number; w: number } {
  return { ...UNARMED };
}

export function itemKindFits(kind: ItemKind, slot: string): boolean {
  if (slot === 'hand1' || slot === 'hand2') return kind === 'weapon' || kind === 'shield' || kind === 'catalyst' || kind === 'custom';
  if (slot === 'armor') return kind === 'armor';
  if (slot === 'cloak') return kind === 'cloak';
  if (slot.startsWith('acc') || slot === 'tail') return kind === 'accessory' || kind === 'custom';
  return false;
}
