import { describe, expect, it } from 'vitest';
import { SPELLS, SCHOOLS, COMPOSITES } from '../src/data/magic';
import { CAREERS, CAREER_BY_ID } from '../src/data/careers';
import { PATHS, PATH_BY_ID } from '../src/data/paths';
import { PROFICIENCIES, WEAPONS, ARMORS, SHIELDS, CLOAKS, ACCESSORY_KINDS, profIdsByGroup } from '../src/data/equipment';
import { SPECIES, speciesNet } from '../src/data/species';
import { CLASSES } from '../src/data/classes';
import { TRAIT_BY_ID, TRAITS } from '../src/data/traits';
import { DAMAGE_BUDGET } from '../src/data/progression';
import { MONK_TECHNIQUES, SHAMAN_ASPECTS, DRAGON_PROPERTIES, DRAGON_FORMS } from '../src/data/spiritual';
import { RECIPES, ENCHANT_FAMILIES, ENCHANT_GROUPS } from '../src/data/crafting';
import { COMPANION_ABILITIES } from '../src/data/companions';
import { ARTIFACT_EXAMPLES } from '../src/data/artifacts';
import { LEDGER } from '../src/data/ledger';

describe('catalogue counts', () => {
  it('has 248 spell concepts and 496 nominal configurations', () => {
    expect(SPELLS).toHaveLength(248);
    expect(SPELLS.length * 2).toBe(496);
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(248);
  });
  it('splits spells across the seven schools', () => {
    const by: Record<string, number> = {};
    for (const s of SPELLS) by[s.schoolId] = (by[s.schoolId] ?? 0) + 1;
    expect(by).toEqual({ arcane: 31, void: 31, abyssal: 28, elemental: 72, bestial: 28, divine: 30, blood: 28 });
    for (const sc of SCHOOLS) expect(by[sc.id]).toBe(sc.concepts);
  });
  it('has 24 composite spells, four for each of six composites', () => {
    const comp = SPELLS.filter((s) => s.composite);
    expect(comp).toHaveLength(24);
    expect(COMPOSITES).toHaveLength(6);
    for (const c of COMPOSITES) expect(comp.filter((s) => s.composite === c.id)).toHaveLength(4);
    for (const s of comp) expect(s.tier).toBeGreaterThanOrEqual(3);
  });
  it('has 48 primary elemental spells, 12 for each element', () => {
    const prim = SPELLS.filter((s) => s.schoolId === 'elemental' && !s.composite);
    expect(prim).toHaveLength(48);
    for (const e of ['fire', 'water', 'earth', 'wind']) {
      const list = prim.filter((s) => s.element === e);
      expect(list).toHaveLength(12);
      // Cantrip, I, II, III, IV and V hold 3, 3, 2, 2, 1 and 1 concepts.
      const tiers = [0, 1, 2, 3, 4, 5].map((t) => list.filter((s) => s.tier === t).length);
      expect(tiers).toEqual([3, 3, 2, 2, 1, 1]);
    }
  });
  it('has 45 unique Careers with the full ability ladder', () => {
    expect(CAREERS).toHaveLength(45);
    expect(new Set(CAREERS.map((c) => c.id)).size).toBe(45);
    for (const c of CAREERS) {
      expect(c.basics, c.id).toHaveLength(4);
      expect(c.upgrades, c.id).toHaveLength(4);
      expect(c.advanced, c.id).toHaveLength(4);
      expect(c.mastery, c.id).toHaveLength(4);
      expect(c.classes.length, c.id).toBeGreaterThan(0);
      for (const p of c.paths) expect(PATH_BY_ID[p], `${c.id}:${p}`).toBeTruthy();
      const ids = [c.foundation, ...c.basics, ...c.upgrades, ...c.advanced, ...c.mastery].map((f) => f.id);
      expect(new Set(ids).size, c.id).toBe(ids.length);
    }
  });
  it('has 33 Paths with three ranks each', () => {
    expect(PATHS).toHaveLength(33);
    for (const p of PATHS) expect(p.ranks).toHaveLength(3);
    expect(new Set(PATHS.map((p) => p.id)).size).toBe(33);
  });
  it('only grants Traits and proficiencies that exist', () => {
    for (const p of PATHS) {
      for (const r of p.ranks) {
        for (const t of Object.keys(r.grantsTraits ?? {})) expect(TRAIT_BY_ID[t], `${p.id}:${t}`).toBeTruthy();
        for (const tok of r.grantsProf ?? []) {
          if (tok.startsWith('group:')) expect(profIdsByGroup(tok.slice(6) as never).length, tok).toBeGreaterThan(0);
          else expect(PROFICIENCIES.some((x) => x.id === tok), tok).toBe(true);
        }
      }
    }
  });
  it('has 42 proficiencies', () => {
    expect(PROFICIENCIES).toHaveLength(42);
    const g = (x: string) => PROFICIENCIES.filter((p) => p.group === x);
    expect([g('melee').length, g('colossal').length, g('ranged').length, g('armor').length, g('exceptional-armor').length, g('shield').length, g('unarmed').length]).toEqual([19, 5, 10, 3, 1, 3, 1]);
    expect(g('melee').every((p) => p.cost === 1)).toBe(true);
    expect(g('colossal').every((p) => p.cost === 2)).toBe(true);
  });
  it('has 7 classes with 6 abilities and 12 species entries that net +3', () => {
    expect(CLASSES).toHaveLength(7);
    for (const c of CLASSES) expect(c.abilities).toHaveLength(6);
    expect(SPECIES).toHaveLength(12);
    for (const s of SPECIES) if (!s.chooseThree) expect(speciesNet(s), s.id).toBe(3);
  });
  it('has the spiritual, craft and companion lists at spec size', () => {
    expect(MONK_TECHNIQUES).toHaveLength(25);
    expect(SHAMAN_ASPECTS).toHaveLength(6);
    expect(DRAGON_PROPERTIES).toHaveLength(12);
    expect(DRAGON_FORMS).toHaveLength(5);
    expect(RECIPES).toHaveLength(36);
    expect(ENCHANT_FAMILIES).toHaveLength(40);
    expect(ENCHANT_GROUPS).toHaveLength(8);
    for (const g of ENCHANT_GROUPS) expect(ENCHANT_FAMILIES.filter((e) => e.group === g)).toHaveLength(5);
    expect(COMPANION_ABILITIES).toHaveLength(18);
    expect(ARTIFACT_EXAMPLES).toHaveLength(6);
  });
  it('has stable unique ids in every list', () => {
    const lists: [string, { id: string }[]][] = [
      ['traits', TRAITS],
      ['weapons', WEAPONS],
      ['armors', ARMORS],
      ['recipes', RECIPES],
      ['enchant', ENCHANT_FAMILIES],
      ['monk', MONK_TECHNIQUES],
      ['ledger', LEDGER],
    ];
    for (const [name, list] of lists) expect(new Set(list.map((x) => x.id)).size, name).toBe(list.length);
  });
});

describe('equipment tables match the specification', () => {
  const spec = 'dagger 3/2/1,shortsword 4/3/2,longsword 4/5/3,greatsword 4/6/4,curved-sword 5/4/2,katana 5/5/3,thrusting-sword 6/3/2,axe 3/5/3,greataxe 3/7/5,mace 4/4/3,hammer 3/6/3,great-hammer 2/8/6,flail 3/5/3,spear 5/4/3,halberd 4/6/4,scythe 3/6/4,staff 4/3/2,whip 5/2/1,fist 3/2/1,colossal-sword 3/7/8,colossal-axe 2/8/9,colossal-hammer 2/8/10,colossal-polearm 4/6/8,colossal-exotic 3/7/9,shortbow 4/3/2,longbow 4/5/3,greatbow 3/6/5,light-crossbow 4/4/3,heavy-crossbow 3/6/5,hand-crossbow 4/3/2,sling 3/2/1,throwing 4/3/1,pistol 4/4/2,musket 4/6/4';
  it('matches weapon ATK, DMG and W', () => {
    for (const row of spec.split(',')) {
      const [id, nums] = row.split(' ');
      const [atk, dmg, w] = nums.split('/').map(Number);
      const found = WEAPONS.find((x) => x.id === id);
      expect(found, id).toBeTruthy();
      expect([found!.atk, found!.dmg, found!.w], id).toEqual([atk, dmg, w]);
    }
    expect(WEAPONS).toHaveLength(34);
  });
  it('matches armor, shields and cloaks', () => {
    expect(ARMORS.map((a) => `${a.armor}/${a.w}`)).toEqual(['0/0', '1/2', '2/3', '3/6', '4/7', '5/10', '6/11', '8/15', '9/16', '10/20']);
    expect(SHIELDS.map((s) => `${s.w}/${s.block}`)).toEqual(['2/1', '4/2', '7/3']);
    expect(CLOAKS.map((c) => c.w)).toEqual([1, 2, 1, 1, 1, 1, 2, 1]);
    expect(ACCESSORY_KINDS).toHaveLength(9);
  });
});

describe('spell budgets', () => {
  it('keeps damage inside the damage budget of its tier', () => {
    const bad: string[] = [];
    for (const s of SPELLS) {
      for (const cfg of [s.base, s.upcast]) {
        if (cfg.dmg === null || cfg.dmg === undefined) continue;
        const [lo, hi] = DAMAGE_BUDGET[cfg.tier] ?? [0, 99];
        if (cfg.dmg < lo || cfg.dmg > hi) bad.push(`${s.id}@${cfg.tier}:${cfg.dmg}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('gives every Tier I and higher spell a positive Mana cost', () => {
    for (const s of SPELLS) if (s.base.tier >= 1) expect(s.base.mana, s.id).toBeGreaterThanOrEqual(1);
  });
  it('upcasts every spell by exactly one tier', () => {
    for (const s of SPELLS) expect(s.upcast.tier, s.id).toBe(s.base.tier + 1);
  });
});

describe('Career to Path pairs', () => {
  it('lets every Career grant at least one Path and belong to a real class', () => {
    for (const c of CAREERS) {
      expect(c.paths.length, c.id).toBeGreaterThan(0);
      for (const cls of c.classes) expect(CLASSES.some((x) => x.id === cls), `${c.id}:${cls}`).toBe(true);
    }
    expect(CAREER_BY_ID.shaman.status).toBe('approved');
  });
});
