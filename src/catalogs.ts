// Turns the typed rules data into browsable catalogue entries. Search, filters, detail pages and links all read from here.
import { ATTR_NAMES, CatalogId, Entry, Status, StatChip } from './data/types';
import { SPECIES } from './data/species';
import { CLASSES } from './data/classes';
import { CAREERS } from './data/careers';
import { PATHS, PATH_BY_ID } from './data/paths';
import { TRAITS, TRAIT_BY_ID, traitRankLabel } from './data/traits';
import {
  ACCESSORY_KINDS, ACCESSORY_RANK_NAMES, ARMORS, CATALYSTS, CATALYST_PROPERTIES, CLOAKS, INFUSIONS, NARRATIVE_PROPERTIES, PROFICIENCIES,
  RARITIES, SHIELDS, WEAPONS, WEAPON_TIERS, ARMOR_INFUSIONS, SHIELD_MODS, EQUIPMENT_STATUS,
} from './data/equipment';
import { COMPOSITES, SCHOOLS, SCHOOL_BY_ID, SPELLS, UPCAST_RULES } from './data/magic';
import { TIER_LABEL } from './data/progression';
import {
  DRAGON_AFFINITIES, DRAGON_FORMS, DRAGON_PROPERTIES, MONK_TECHNIQUES, MONK_TIERS, SHAMAN_ABILITIES, SHAMAN_ASPECTS, SHAMAN_ASPECT_COST,
} from './data/spiritual';
import { COMPANION_ABILITIES, COMPANION_SIZES, SUMMON_TIERS } from './data/companions';
import {
  CONSUMABLE_BASE, ENCHANT_FAMILIES, ENCHANT_RANKS, MATERIALS, QUALITY, RECIPES, CRAFT_CS,
} from './data/crafting';
import { ARTIFACT_CLASSES, ARTIFACT_EXAMPLES, ONE_RING } from './data/artifacts';
import { BESTIARY, NATURES, THREAT_LEVELS } from './data/world';
import { CRAFT_DISCIPLINES } from './data/traits';

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const roman = (n: number) => ['', 'I', 'II', 'III'][n] ?? String(n);

function E(e: Omit<Entry, 'searchText'> & { searchText?: string }): Entry {
  const text = [e.name, e.summary, ...Object.values(e.facets), ...(e.bullets ?? []), ...(e.body ?? []), ...(e.fields ?? []).flat()].join(' ').toLowerCase();
  return { ...e, searchText: e.searchText ?? text };
}

// ---- Species and classes ----

function speciesEntries(): Entry[] {
  return SPECIES.map((s) => {
    const mods = Object.entries(s.mods).map(([a, v]) => `${sign(v as number)} ${a}`);
    const worst = s.features.some((f) => f.status === 'owner-review') ? 'owner-review' : 'approved';
    return E({
      id: s.id,
      catalog: 'species',
      section: 'species',
      name: s.name,
      summary: s.summary,
      facets: { Family: s.family, Net: s.chooseThree ? '+3 (your pick)' : '+3' },
      fields: [
        ['Attribute modifiers', s.chooseThree ? '+1 to three different attributes of your choice' : mods.join(', ')],
        ['Family', s.family],
      ],
      bullets: s.features.map((f) => `${f.name}. ${f.text}`),
      related: [{ catalog: 'classes', id: 'warrior', label: 'Choose a class' }],
      status: worst as Status,
      note: s.chooseThree ? 'A Human picks one of Adaptability, Determination or Quick Learner. The Determination reading needs owner confirmation.' : undefined,
    });
  });
}

function classEntries(): Entry[] {
  return CLASSES.map((c) => {
    const levels = [1, 3, 6, 9, 12, 16];
    return E({
      id: c.id,
      catalog: 'classes',
      section: 'classes',
      name: c.name,
      summary: c.summary,
      facets: { 'Attribute pair': c.attrs.join(' and '), Casting: c.grantsSpellcasting ? 'Spellcasting' : 'No spellcasting' },
      fields: [['Attribute pair', `${c.attrs.map((a) => `${a} (${ATTR_NAMES[a]})`).join(' and ')}. Each gets +1.`]],
      bullets: c.abilities.map((a, i) => `Level ${levels[i]}. ${a.name}. ${a.text}`),
      related: CAREERS.filter((k) => k.classes.includes(c.id)).slice(0, 12).map((k) => ({ catalog: 'careers' as CatalogId, id: k.id, label: k.name })),
      status: 'approved',
    });
  });
}

// ---- Careers and Paths ----

function careerEntries(): Entry[] {
  return CAREERS.map((c) => {
    const f = (x: { name: string; text: string; status: Status }) => `${x.name}${x.status === 'proposal' ? ' (proposal)' : ''}. ${x.text}`;
    return E({
      id: c.id,
      catalog: 'careers',
      section: 'careers',
      name: c.name,
      summary: c.summary,
      facets: { Class: c.classes.map((k) => CLASSES.find((x) => x.id === k)?.name ?? k).join(', '), Path: c.paths.map((p) => PATH_BY_ID[p]?.name).join(', '), Spiritual: c.spiritual ? (c.spiritual === 'monk' ? 'Monk' : 'Shaman') : 'None' },
      fields: [
        ['Classes', c.classes.map((k) => CLASSES.find((x) => x.id === k)?.name ?? k).join(', ')],
        ['Grants one Path', c.paths.map((p) => PATH_BY_ID[p]?.name).join(' or ')],
        ['Domains', c.domains.join(' and ')],
        ['Cost', 'No TP and no MP. Careers are free choices.'],
      ],
      bullets: [
        `Foundation (automatic). ${f(c.foundation)}`,
        ...c.basics.map((x, i) => `Basic ${i + 1} (rank I, pick two). ${f(x)}`),
        ...c.upgrades.map((x, i) => `Upgrade ${i + 1} (rank II or III, replaces Basic ${i + 1}). ${f(x)}`),
        ...c.advanced.map((x, i) => `Advanced ${i + 1} (rank II). ${f(x)}`),
        ...c.mastery.map((x, i) => `Mastery ${i + 1} (rank III). ${f(x)}`),
      ],
      related: [
        ...c.classes.map((k) => ({ catalog: 'classes' as CatalogId, id: k, label: CLASSES.find((x) => x.id === k)?.name })),
        ...c.paths.map((p) => ({ catalog: 'paths' as CatalogId, id: p, label: PATH_BY_ID[p]?.name })),
      ],
      status: c.status,
      note: c.status === 'proposal' ? 'The foundation and the pairing come from the specification where it names them. Other abilities are written to fill gaps and are labeled proposals.' : undefined,
    });
  });
}

function pathEntries(): Entry[] {
  return PATHS.map((p) =>
    E({
      id: p.id,
      catalog: 'paths',
      section: 'paths',
      name: p.name,
      summary: p.summary,
      facets: { Group: p.group },
      fields: [
        ['Cost', 'Rank I is free. Rank II costs 2 earned Mastery Points for this Path. Rank III costs 4 more.'],
        ['Taken from', 'Four independent slots (levels 4, 8, 12, 16) or a Career.'],
      ],
      bullets: p.ranks.map((r, i) => `Rank ${roman(i + 1)}. ${r.text.join(' ')}${r.provisional ? ' (provisional)' : ''}`),
      related: [
        ...CAREERS.filter((c) => c.paths.includes(p.id)).slice(0, 10).map((c) => ({ catalog: 'careers' as CatalogId, id: c.id, label: c.name })),
        ...p.ranks.flatMap((r) => Object.keys(r.grantsTraits ?? {})).filter((v, i, a) => a.indexOf(v) === i).map((t) => ({ catalog: 'traits' as CatalogId, id: t, label: TRAIT_BY_ID[t]?.name })),
      ],
      status: p.status,
      note: p.note,
    }),
  );
}

// ---- Traits and proficiencies ----

function traitEntries(): Entry[] {
  const traits = TRAITS.map((t) => {
    const ladder = t.ranks > 1 ? Array.from({ length: t.ranks }, (_, i) => `Rank ${roman(i + 1)}: ${traitRankLabel(t, i + 1)}. Costs ${t.cost[i]} TP. Level ${t.levelReq[i]}.`) : [];
    return E({
      id: t.id,
      catalog: 'traits',
      section: 'traits',
      name: t.name,
      summary: t.text,
      facets: { Group: t.group, Kind: t.kind === 'ranked' ? 'Ranked' : t.kind === 'single' ? 'Single' : t.kind === 'advanced' ? 'Advanced' : 'Exceptional' },
      fields: [
        ['Cost', t.kind === 'exceptional' ? 'Story only' : `${t.cost.reduce((a, b) => a + b, 0)} TP in all${t.ranks > 1 ? ` (${t.cost.join(' + ')})` : ''}`],
        ['Ranks', String(t.ranks)],
        ...(t.needsAccess ? ([['Needs', 'Mana access']] as [string, string][]) : []),
      ],
      bullets: ladder,
      related: PATHS.filter((p) => p.ranks.some((r) => r.grantsTraits && t.id in r.grantsTraits)).map((p) => ({ catalog: 'paths' as CatalogId, id: p.id, label: p.name })),
      status: t.status,
      note: t.note,
    });
  });
  const profs = PROFICIENCIES.map((p) =>
    E({
      id: p.id,
      catalog: 'traits',
      section: 'proficiencies',
      name: p.name,
      summary: `${p.group === 'exceptional-armor' ? 'Exceptional armor' : p.group[0].toUpperCase() + p.group.slice(1)} proficiency. Costs ${p.cost} TP.`,
      facets: { Group: p.group === 'exceptional-armor' ? 'Exceptional armor' : p.group[0].toUpperCase() + p.group.slice(1), Cost: `${p.cost} TP` },
      fields: [['Cost', `${p.cost} TP`], ['Free pick', 'You also get one eligible weapon proficiency free at the start.']],
      status: 'approved',
    }),
  );
  return [...traits, ...profs];
}

// ---- Equipment ----

const eqStatus = (k: string): Status => EQUIPMENT_STATUS[k] ?? 'approved';

function equipmentEntries(): Entry[] {
  const out: Entry[] = [];
  for (const w of WEAPONS) {
    out.push(
      E({
        id: w.id, catalog: 'equipment', section: 'weapons', name: w.name,
        summary: `${w.group[0].toUpperCase() + w.group.slice(1)} weapon, ${w.cls} class. ${w.hands === 2 ? 'Two-handed' : 'One-handed'}.`,
        facets: { Group: w.group[0].toUpperCase() + w.group.slice(1), Class: w.cls[0].toUpperCase() + w.cls.slice(1), Hands: String(w.hands), 'Damage type': w.dmgType },
        stats: [{ stat: 'atk', value: w.atk }, { stat: 'dmg', value: w.dmg }, { stat: 'weight', value: w.w }],
        fields: [['Damage type', `${w.dmgType} (proposal)`], ['Proficiency', `${w.name} proficiency`], ['Hands', `${w.hands} (proposal)`]],
        bullets: WEAPON_TIERS.map((t) => `${t.name} tier. ATK ${w.atk + t.atk}, DMG ${w.dmg + t.dmg}.`),
        related: [{ catalog: 'traits', id: w.profId, label: `${w.name} proficiency` }],
        status: 'approved',
        note: 'Hands and damage type are proposals. ATK, DMG and W come from the specification.',
      }),
    );
  }
  for (const a of ARMORS) {
    out.push(E({
      id: a.id, catalog: 'equipment', section: 'armor', name: a.name,
      summary: a.profId ? `Needs the ${a.profId.replace('prof-armor-', '')} armor proficiency.` : 'No proficiency needed.',
      facets: { Weight: a.w <= 3 ? 'Light' : a.w <= 10 ? 'Medium' : 'Heavy' },
      stats: [{ stat: 'armor', value: a.armor }, { stat: 'weight', value: a.w }],
      fields: [['Armor', String(a.armor)], ['Weight', String(a.w)]],
      bullets: ARMOR_INFUSIONS.filter((i) => i.id !== 'none').map((i) => `${i.name}. ${i.text}`),
      status: 'approved',
    }));
  }
  for (const s of SHIELDS) {
    out.push(E({
      id: s.id, catalog: 'equipment', section: 'shields', name: s.name,
      summary: 'A shield adds to Block checks. It gives no passive Armor.',
      facets: { Size: s.name.split(' ')[0] },
      stats: [{ stat: 'weight', value: s.w }],
      fields: [['Block bonus', `+${s.block}`], ['Weight', String(s.w)]],
      bullets: SHIELD_MODS.filter((m) => m.id !== 'none').map((m) => `${m.name}. ${m.text}`),
      status: 'approved',
    }));
  }
  for (const c of CLOAKS) {
    out.push(E({
      id: c.id, catalog: 'equipment', section: 'cloaks', name: c.name, summary: c.text,
      facets: { Weight: `${c.w} W` }, stats: [{ stat: 'weight', value: c.w }], status: 'approved',
    }));
  }
  for (const k of ACCESSORY_KINDS) {
    out.push(E({
      id: k.id, catalog: 'equipment', section: 'accessories', name: `${k.name} accessory`,
      summary: `Three ranks give ${k.values.join(', ')} ${k.unit}. Accessories of the same kind do not stack.`,
      facets: { Kind: k.name },
      fields: ACCESSORY_RANK_NAMES.map((n, i) => [n, `${k.values[i]} ${k.unit}`] as [string, string]),
      status: eqStatus('accessoryWeight') === 'owner-review' ? 'owner-review' : 'approved',
      note: 'Accessory weight is 1 W in this build. The specification does not state it. Please confirm.',
    }));
  }
  for (const p of NARRATIVE_PROPERTIES) {
    out.push(E({
      id: p.id, catalog: 'equipment', section: 'properties', name: p.name, summary: p.text,
      facets: { Cost: p.cost === 'Individual' ? 'Individual' : `${p.cost} point${p.cost === '1' ? '' : 's'}` },
      fields: [['Property budget cost', p.cost]], status: 'approved',
    }));
  }
  for (const c of CATALYSTS) {
    out.push(E({
      id: c.id, catalog: 'equipment', section: 'catalysts', name: c.name, summary: `${c.text} Only one catalyst is active for each spell.`,
      facets: { Focus: c.focus }, stats: [{ stat: 'weight', value: c.w }],
      bullets: CATALYST_PROPERTIES.map((p) => `${p.name}: ${p.values.map((v) => `+${v}`).join(', ')}`), status: 'approved',
    }));
  }
  for (const i of INFUSIONS.filter((x) => x.id !== 'none')) {
    out.push(E({ id: i.id, catalog: 'equipment', section: 'rarity', name: `${i.name} infusion`, summary: i.text, facets: { Kind: 'Infusion' }, status: 'approved' }));
  }
  for (const r of RARITIES) {
    out.push(E({ id: `rarity-${r.id}`, catalog: 'equipment', section: 'rarity', name: `${r.name} rarity`, summary: `${r.points} property point${r.points === 1 ? '' : 's'}.`, facets: { Kind: 'Rarity' }, status: 'approved' }));
  }
  return out;
}

// ---- Magic ----

function cfgLine(c: { mana: number; actions: number; range: string; target: string; area: string; duration: string; atk: number | null; dmg: number | null; dmgType: string | null; concentration: boolean; effect: string; tier: number }): string {
  const bits = [`Tier ${TIER_LABEL[c.tier]}`, `${c.mana} Mana`, `${c.actions} Action${c.actions === 1 ? '' : 's'}`];
  if (c.atk !== null) bits.push(`ATK ${c.atk}`);
  if (c.dmg !== null) bits.push(`DMG ${c.dmg}${c.dmgType ? ' ' + c.dmgType : ''}`);
  if (c.concentration) bits.push('Concentration');
  return `${bits.join(', ')}. ${c.effect}`;
}

function magicEntries(): Entry[] {
  const out: Entry[] = SCHOOLS.map((s) =>
    E({
      id: s.id, catalog: 'magic', section: 'schools', name: s.name, summary: s.summary,
      facets: { Branch: s.branch === 'sorcery' ? 'Sorcery' : 'Incantation', Access: s.restricted ? 'Forbidden' : 'Ordinary' },
      fields: [['Branch', s.branch === 'sorcery' ? 'Sorcery' : 'Incantation'], ['Concepts', String(s.concepts)], ['Access', s.restricted ? 'Exceptional. Needs Narrator access.' : 'Ordinary. One school for each caster.']],
      related: SPELLS.filter((x) => x.schoolId === s.id).slice(0, 8).map((x) => ({ catalog: 'magic' as CatalogId, id: x.id, label: x.name })),
      status: s.status,
    }),
  );
  for (const c of COMPOSITES) {
    out.push(E({
      id: `composite-${c.id}`, catalog: 'magic', section: 'schools', name: `${c.name} composite`,
      summary: `${c.parts.join(' and ')} together. Four spells, learned separately from tier III. Only your highest affinity counts.`,
      facets: { Branch: 'Incantation', Access: 'Ordinary' },
      related: SPELLS.filter((s) => s.composite === c.id).map((s) => ({ catalog: 'magic' as CatalogId, id: s.id, label: s.name })),
      status: 'approved',
    }));
  }
  for (const s of SPELLS) {
    const school = SCHOOL_BY_ID[s.schoolId];
    const stats: StatChip[] = [];
    if (s.base.mana > 0) stats.push({ stat: 'mana', value: s.base.mana });
    if (s.base.atk !== null) stats.push({ stat: 'atk', value: s.base.atk });
    if (s.base.dmg !== null) stats.push({ stat: 'dmg', value: s.base.dmg });
    if (s.base.concentration) stats.push({ stat: 'concentration', value: 'Yes' });
    const comp = s.composite ? COMPOSITES.find((c) => c.id === s.composite) : undefined;
    out.push(E({
      id: s.id, catalog: 'magic', section: 'spells', name: s.name, summary: s.base.effect,
      facets: {
        School: school.name,
        Tier: TIER_LABEL[s.tier],
        Branch: school.branch === 'sorcery' ? 'Sorcery' : 'Incantation',
        ...(s.element ? { Element: s.element[0].toUpperCase() + s.element.slice(1) } : {}),
        ...(comp ? { Element: `${comp.name} (composite)` } : {}),
        Damage: s.base.dmgType ?? 'None',
        Concentration: s.base.concentration ? 'Yes' : 'No',
      },
      stats,
      fields: [
        ['School', school.name],
        ['Tier', TIER_LABEL[s.tier]],
        ['Actions', String(s.base.actions)],
        ['Range', s.base.range],
        ['Target', s.base.target],
        ['Area', s.base.area],
        ['Duration', s.base.duration],
      ],
      bullets: [`Base. ${cfgLine(s.base)}`, `Upcast. ${cfgLine(s.upcast)}`],
      related: [{ catalog: 'magic', id: s.schoolId, label: school.name }],
      status: s.status,
      note: s.note,
    }));
  }
  return out;
}

// ---- Spiritual arts and forms ----

function spiritualEntries(): Entry[] {
  const out: Entry[] = [];
  for (const t of MONK_TIERS) {
    out.push(E({
      id: `monk-tier-${t.id}`, catalog: 'spiritual', section: 'monk', name: `${t.name} tier`,
      summary: `Opens at level ${t.level}. Manifestation unarmed ATK ${t.atk}, DMG ${t.dmg}.`,
      facets: { Kind: 'Tier' }, stats: [{ stat: 'atk', value: t.atk }, { stat: 'dmg', value: t.dmg }],
      fields: [['Level', String(t.level)], ['Unarmed Path rank', t.unarmedRank === 0 ? 'Monk Foundation' : roman(t.unarmedRank)]], status: 'approved',
    }));
  }
  for (const t of MONK_TECHNIQUES) {
    const stats: StatChip[] = [];
    if (t.mana > 0) stats.push({ stat: 'mana', value: t.mana });
    if (t.concentration) stats.push({ stat: 'concentration', value: 'Yes' });
    out.push(E({
      id: t.id, catalog: 'spiritual', section: 'monk', name: t.name, summary: t.text,
      facets: { Kind: 'Technique', Tier: t.tier[0].toUpperCase() + t.tier.slice(1) },
      stats, fields: [['Cost', t.mana === 0 ? 'Free' : `${t.mana} Mana`]], status: 'approved',
    }));
  }
  for (const a of SHAMAN_ASPECTS) {
    out.push(E({
      id: a.id, catalog: 'spiritual', section: 'shaman', name: `${a.name} Aspect`, summary: `${a.text} Narrative use: ${a.narrative}`,
      facets: { Kind: 'Aspect' },
      fields: [['Basic', `${a.stat} ${a.values[0]}. Costs ${SHAMAN_ASPECT_COST[0]} Mana.`], ['Advanced', `${a.stat} ${a.values[1]}. Costs ${SHAMAN_ASPECT_COST[1]} Mana.`], ['Master', `${a.stat} ${a.values[2]}. Costs ${SHAMAN_ASPECT_COST[2]} Mana.`]],
      status: 'approved',
    }));
  }
  const sh = [...SHAMAN_ABILITIES.basics, ...SHAMAN_ABILITIES.advanced, ...SHAMAN_ABILITIES.mastery];
  for (const f of sh) {
    out.push(E({ id: f.id, catalog: 'spiritual', section: 'shaman', name: f.name, summary: f.text, facets: { Kind: 'Ability' }, status: f.status }));
  }
  for (const f of DRAGON_FORMS) {
    out.push(E({
      id: `form-${f.id}`, catalog: 'spiritual', section: 'dragonkin', name: `${f.name} form`,
      summary: `Size ${f.size}. Relative power about ${f.power}. ${f.exceptional ? 'A story event.' : `Opens at level ${f.level}.`}`,
      facets: { Kind: 'Form' },
      stats: [{ stat: 'hp', value: `+${f.hp}` }, { stat: 'armor', value: `+${f.armor}` }, { stat: 'mov', value: `+${f.mov}` }],
      fields: [
        ['Natural attack', `ATK ${f.atk}, DMG ${f.dmg}`], ['Attributes (temporary)', `+${f.attrs} STR, FOR and ARC`],
        ['Thresholds', `Physical +${f.physical}, mental +${f.mental}`], ['Activation, upkeep, revert', `${f.activation}, ${f.upkeep}, ${f.revert} Mana`],
        ['Breath', `${f.breathMana} Mana, ATK ${f.breathAtk}, DMG ${f.breathDmg}, ${f.breathArea} area`],
      ],
      status: 'provisional', note: 'Form numbers are provisional in the specification.',
    }));
  }
  for (const p of DRAGON_PROPERTIES) {
    out.push(E({ id: p.id, catalog: 'spiritual', section: 'dragonkin', name: p.name, summary: p.text, facets: { Kind: 'Property' }, fields: [['Opens at level', String(p.minLevel)]], status: 'approved' }));
  }
  out.push(E({ id: 'affinities', catalog: 'spiritual', section: 'dragonkin', name: 'Affinities', summary: `Choose one: ${DRAGON_AFFINITIES.join(', ')}. Abyss is exceptional and Holy is not available. An extra affinity is a story event.`, facets: { Kind: 'Affinity' }, status: 'approved' }));
  return out;
}

// ---- Companions ----

function companionEntries(): Entry[] {
  const out: Entry[] = [];
  for (const s of COMPANION_SIZES) {
    const stats: StatChip[] = [];
    if (s.hp) stats.push({ stat: 'hp', value: `${s.hp[0]} to ${s.hp[1]}` });
    if (s.armor) stats.push({ stat: 'armor', value: `${s.armor[0]} to ${s.armor[1]}` });
    if (s.atk) stats.push({ stat: 'atk', value: `${s.atk[0]} to ${s.atk[1]}` });
    if (s.dmg) stats.push({ stat: 'dmg', value: `${s.dmg[0]} to ${s.dmg[1]}` });
    out.push(E({
      id: s.id, catalog: 'companions', section: 'sizes', name: `${s.name} creature`,
      summary: `Uses ${s.capacity} capacity.${s.minLevel === 99 ? ' A story event.' : ` Opens at level ${s.minLevel}.`}`,
      facets: { Capacity: String(s.capacity) }, stats,
      fields: s.hp ? [['Reference numbers', 'These ranges guide the Narrator. They are not mandatory.']] : [['Reference numbers', 'Individual.']], status: 'approved',
    }));
  }
  for (const a of COMPANION_ABILITIES) {
    out.push(E({ id: a.id, catalog: 'companions', section: 'abilities', name: a.name, summary: a.text, facets: { Kind: 'Ability' }, status: 'approved' }));
  }
  for (const t of SUMMON_TIERS) {
    out.push(E({ id: `summon-${t.tier.replace(/\W+/g, '-').toLowerCase()}`, catalog: 'companions', section: 'summons', name: `Tier ${t.tier}`, summary: `${t.size}. ${t.note}`, facets: { Size: t.size }, status: 'approved' }));
  }
  return out;
}

// ---- Crafting ----

function craftingEntries(): Entry[] {
  const out: Entry[] = [];
  for (const d of CRAFT_DISCIPLINES) {
    out.push(E({ id: d.id, catalog: 'crafting', section: 'disciplines', name: d.name, summary: `${d.name} work. The check uses ${d.attrs.join(' and ')}.`, facets: { Attributes: d.attrs.join(' and ') }, fields: [['Check', `2d8 + ${d.attrs.join(' + ')} + bonuses`]], related: RECIPES.filter((r) => r.discipline === d.id).map((r) => ({ catalog: 'crafting' as CatalogId, id: r.id, label: r.name })), status: 'approved' }));
  }
  for (const r of RECIPES) {
    const d = CRAFT_DISCIPLINES.find((x) => x.id === r.discipline);
    out.push(E({
      id: r.id, catalog: 'crafting', section: 'recipes', name: r.name, summary: r.text,
      facets: { Discipline: d?.name ?? r.discipline, Tier: r.tier },
      fields: [['Challenge Score', r.cs === null ? 'Individual' : String(r.cs)], ['Discipline', d?.name ?? r.discipline], ['Tier', r.tier]],
      related: [{ catalog: 'crafting', id: r.discipline, label: d?.name }], status: r.status,
      note: 'The recipe concepts come from the specification. The exact wording is a proposal.',
    }));
  }
  for (const m of MATERIALS) {
    out.push(E({ id: m.id, catalog: 'crafting', section: 'materials', name: m.name, summary: m.text, facets: { Rarity: m.rarity }, status: 'approved' }));
  }
  for (const e of ENCHANT_FAMILIES) {
    out.push(E({
      id: e.id, catalog: 'crafting', section: 'enchantments', name: e.name, summary: e.text, facets: { Group: e.group },
      fields: e.values ? ENCHANT_RANKS.slice(0, 3).map((r, i) => [`${r.name} (${r.cost} point${r.cost === 1 ? '' : 's'})`, `${e.values![i]} ${e.unit ?? ''}`.trim()] as [string, string]) : [['Ranks', 'Set item by item.']],
      status: 'approved',
    }));
  }
  for (const q of QUALITY) {
    out.push(E({ id: `quality-${q.name.toLowerCase()}`, catalog: 'crafting', section: 'materials', name: `${q.name} quality`, summary: `Quality value ${sign(q.value)}. Quality buys small conveniences. It is not power.`, facets: { Rarity: 'Quality' }, status: 'approved' }));
  }
  out.push(E({ id: 'consumables', catalog: 'crafting', section: 'recipes', name: 'Consumable values', summary: CONSUMABLE_BASE.map((c) => `${c.tier}: ${c.hp} HP or ${c.mana} Mana`).join('. ') + '.', facets: { Discipline: 'Alchemy', Tier: 'All' }, status: 'provisional', note: 'Temporary effect durations are provisional.' }));
  void CRAFT_CS;
  return out;
}

// ---- Artifacts and world ----

function artifactEntries(): Entry[] {
  const out: Entry[] = ARTIFACT_CLASSES.map((c) => E({ id: c.id, catalog: 'artifacts', section: 'classes', name: c.name, summary: c.text, facets: { Kind: 'Class' }, status: c.status }));
  for (const a of ARTIFACT_EXAMPLES) {
    out.push(E({ id: a.id, catalog: 'artifacts', section: 'examples', name: a.name, summary: `${a.kind}. ${a.text}`, facets: { Kind: a.kind, Bond: String(a.bond) }, fields: [['Statistics', a.stats.join(', ')], ['Bond capacity used', String(a.bond)]], status: a.status, note: 'A provisional example from the specification.' }));
  }
  out.push(E({ id: 'one-ring', catalog: 'artifacts', section: 'ring', name: ONE_RING.name, summary: ONE_RING.summary, facets: { Kind: 'Unique' }, bullets: [...ONE_RING.rules, `Domains: ${ONE_RING.domains.join(', ')}.`], status: 'provisional', note: ONE_RING.reserved }));
  return out;
}

function worldEntries(): Entry[] {
  const out: Entry[] = BESTIARY.map((b) => E({ id: b.id, catalog: 'world', section: 'bestiary', name: b.name, summary: `Suggested natures: ${b.natures.join(', ')}. The Narrator writes the lore and the numbers.`, facets: { Nature: b.natures.join(', ') }, status: b.status }));
  for (const n of NATURES) out.push(E({ id: `nature-${n.toLowerCase()}`, catalog: 'world', section: 'natures', name: n, summary: 'A nature gives no automatic benefit. A creature may have several.', facets: { Kind: 'Nature' }, status: 'approved' }));
  for (const t of THREAT_LEVELS) out.push(E({ id: `threat-${t.toLowerCase()}`, catalog: 'world', section: 'threat', name: t, summary: 'A threat level. Use it as a rough guide.', facets: { Kind: 'Threat' }, status: 'approved' }));
  void UPCAST_RULES;
  return out;
}

let cache: Entry[] | null = null;

export function allEntries(): Entry[] {
  if (cache) return cache;
  cache = [
    ...speciesEntries(), ...classEntries(), ...careerEntries(), ...pathEntries(), ...traitEntries(), ...equipmentEntries(),
    ...magicEntries(), ...spiritualEntries(), ...companionEntries(), ...craftingEntries(), ...artifactEntries(), ...worldEntries(),
  ];
  return cache;
}

export function entriesFor(catalog: CatalogId, section?: string): Entry[] {
  return allEntries().filter((e) => e.catalog === catalog && (!section || e.section === section));
}

export function findEntry(catalog: CatalogId, id: string): Entry | undefined {
  return allEntries().find((e) => e.catalog === catalog && e.id === id);
}

export const CATALOG_PATH: Record<CatalogId, string> = {
  species: 'species', classes: 'classes', careers: 'careers', paths: 'paths', traits: 'traits', proficiencies: 'traits', equipment: 'equipment',
  magic: 'magic', spiritual: 'spiritual', companions: 'companions', crafting: 'crafting', artifacts: 'artifacts', world: 'world',
};

export function entryHref(e: { catalog: CatalogId; id: string; section?: string }): string {
  const entry = e.section ? e : findEntry(e.catalog, e.id);
  const section = entry && 'section' in entry ? entry.section : undefined;
  const base = CATALOG_PATH[e.catalog];
  return section && SECTIONED.has(e.catalog) ? `/${base}/${section}/${encodeURIComponent(e.id)}` : `/${base}/${encodeURIComponent(e.id)}`;
}

/** Catalogues whose pages use tabs. Their detail routes include the tab. */
export const SECTIONED = new Set<CatalogId>(['traits', 'equipment', 'magic', 'spiritual', 'companions', 'crafting', 'artifacts', 'world']);

void ATTR_NAMES;
void PATH_BY_ID;
