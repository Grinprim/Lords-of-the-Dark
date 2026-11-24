import { describe, expect, it } from 'vitest';
import { apGainAtLevel, apTotal, tpGainAtLevel, tpTotal, independentPathSlots, pathMpSpent } from '../src/data/progression';
import { enumeration, odds, criticalChance, fumbleChance, resolveMode, resolveAttack, roll, blockDamage, riposteDamage, defenseSucceeds } from '../src/engine/dice';
import { loadBand } from '../src/engine/load';
import { newCharacter, newId, Item } from '../src/engine/character';
import { derive, effectiveTraitRank, tpSpentFor } from '../src/engine/derive';
import { proportionalHp, transformTo } from '../src/engine/transform';
import { applyRest, applySleep, restHpAmount, restManaAmount, sleepResult } from '../src/engine/recovery';
import { addBuildup, CONDITION_BY_ID, endTurnDecay, poisonDuration, healingAfterBleed } from '../src/engine/conditions';
import { damageParts, reduceWeight } from '../src/engine/items';
import { companionCapacity, summonCapacity } from '../src/data/companions';
import { reduceManaCost } from '../src/data/magic';

const frac = (f: { num: number; den: number }) => `${f.num}/${f.den}`;

describe('progression', () => {
  it('gives 4 AP at level 1 and totals 21 AP at level 16', () => {
    expect(apGainAtLevel(1)).toBe(4);
    expect(apTotal(16)).toBe(21);
  });
  it('gives no new AP after level 16', () => {
    expect(apTotal(17)).toBe(21);
    expect(apTotal(30)).toBe(21);
    expect(apGainAtLevel(17)).toBe(0);
  });
  it('gives +2 AP at levels 8 and 16 and +1 at the others from 2 to 16', () => {
    for (let l = 2; l <= 16; l++) expect(apGainAtLevel(l)).toBe(l === 8 || l === 16 ? 2 : 1);
  });
  it('gives TP 4 at 1/4/8/12/16 and 2 elsewhere, 42 at level 16, +2 after', () => {
    for (let l = 1; l <= 30; l++) expect(tpGainAtLevel(l)).toBe([1, 4, 8, 12, 16].includes(l) ? 4 : 2);
    expect(tpTotal(16)).toBe(42);
    expect(tpTotal(17)).toBe(44);
    expect(tpTotal(20)).toBe(50);
  });
  it('opens four independent Paths at 4, 8, 12 and 16', () => {
    expect([1, 3, 4, 7, 8, 12, 15, 16].map(independentPathSlots)).toEqual([0, 0, 1, 1, 2, 3, 3, 4]);
  });
  it('prices Path ranks at 0, 2 and 4 more MP', () => {
    expect([0, 1, 2, 3].map(pathMpSpent)).toEqual([0, 0, 2, 6]);
  });
});

describe('dice', () => {
  it('enumerates exactly', () => {
    expect(enumeration('ordinary').outcomes).toBe(64);
    expect(enumeration('advantage').outcomes).toBe(512);
    expect(enumeration('disadvantage').outcomes).toBe(8);
  });
  it('matches the spec odds', () => {
    expect(frac(criticalChance('ordinary'))).toBe('1/64');
    expect(frac(criticalChance('advantage'))).toBe('11/256');
    expect(enumeration('advantage').critical).toBe(22);
    expect(frac(fumbleChance('ordinary'))).toBe('1/64');
    expect(frac(fumbleChance('advantage'))).toBe('1/512');
    expect(frac(fumbleChance('disadvantage'))).toBe('1/8');
  });
  it('never gives a critical on Disadvantage', () => {
    expect(enumeration('disadvantage').critical).toBe(0);
    expect(roll('disadvantage', 0, () => 0.99).critical).toBe(false);
  });
  it('lets Advantage and Disadvantage cancel and never stack', () => {
    expect(resolveMode(2, 0)).toBe('advantage');
    expect(resolveMode(0, 3)).toBe('disadvantage');
    expect(resolveMode(2, 1)).toBe('ordinary');
  });
  it('lets a critical miss a high Armor', () => {
    const o = odds('ordinary', 0, 30);
    expect(frac(o.hit)).toBe('0/1');
    expect(frac(o.criticalMiss)).toBe('1/64');
    expect(frac(o.criticalHit)).toBe('0/1');
  });
  it('treats a fumble as an automatic failure even against Armor 1', () => {
    const o = odds('ordinary', 10, 1);
    expect(o.hit.num / o.hit.den).toBeCloseTo(63 / 64);
  });
  it('resolves an attack in order', () => {
    const crit = { mode: 'ordinary' as const, dice: [8, 8], natural: 16, modifier: 0, total: 16, critical: true, fumble: false };
    expect(resolveAttack({ roll: crit, armor: 20, dmg: 10 }).hit).toBe(false);
    expect(resolveAttack({ roll: crit, armor: 10, dmg: 10 }).damage).toBe(20);
    expect(resolveAttack({ roll: crit, armor: 10, dmg: 10, defense: { kind: 'dodge', total: 16 } }).damage).toBe(0);
    expect(resolveAttack({ roll: crit, armor: 10, dmg: 10, defense: { kind: 'dodge', total: 15 } }).damage).toBe(20);
  });
  it('gives ties to the defender', () => {
    expect(defenseSucceeds(12, 12)).toBe(true);
    expect(defenseSucceeds(11, 12)).toBe(false);
  });
  it('rounds Block down and Riposte down', () => {
    expect(blockDamage(9)).toBe(4);
    expect(riposteDamage(5)).toBe(7);
  });
});

describe('load', () => {
  it('uses the band edges from the rules', () => {
    expect(loadBand(9, 20).band).toBe('light');
    expect(loadBand(9, 20).movModifier).toBe(1);
    expect(loadBand(10, 20).band).toBe('normal');
    expect(loadBand(15, 20).band).toBe('normal');
    expect(loadBand(16, 20).band).toBe('heavy');
    expect(loadBand(16, 20).movModifier).toBe(-1);
    expect(loadBand(19, 20).band).toBe('heavy');
    const full = loadBand(20, 20);
    expect(full.band).toBe('overloaded');
    expect(full.canMove).toBe(false);
    expect(full.canDodge).toBe(false);
  });
});

const item = (partial: Partial<Item>): Item => ({ uid: newId('i'), kind: 'custom', name: 'Item', ...partial });

describe('derived values', () => {
  it('reproduces the 238 HP formula example', () => {
    const acc = item({ kind: 'accessory', name: 'Health charm', accessoryKind: 'health', accessoryRank: 3 });
    const c = newCharacter({
      level: 16,
      classId: 'warrior',
      attrs: { VIG: 8, FOR: 0, STR: 0, DEX: 0, INT: 0, ARC: 0, CHA: 0, REF: 0, INS: 0, AWA: 0 },
      traits: { health: [1, 2, 3] },
      items: [acc],
      equipment: { acc1: acc.uid },
    });
    const d = derive(c);
    expect(d.attrs.VIG.total).toBe(9);
    expect(d.hp.value).toBe(238);
  });
  it('reproduces the 32 Armor formula example', () => {
    const armor = item({ kind: 'armor', name: 'Plate', baseId: 'reinforced-exceptional-armor' });
    const acc = item({ kind: 'accessory', name: 'Armor charm', accessoryKind: 'armor', accessoryRank: 3 });
    const cloak = item({ kind: 'cloak', name: 'Guardian Cloak', baseId: 'cloak-guardian' });
    const c = newCharacter({
      level: 16,
      classId: 'warrior',
      attrs: { VIG: 0, FOR: 8, STR: 0, DEX: 0, INT: 0, ARC: 0, CHA: 0, REF: 0, INS: 0, AWA: 0 },
      independentPaths: ['armor'],
      pathRanks: { armor: 3 },
      pathMp: { armor: 6 },
      items: [armor, acc, cloak],
      equipment: { armor: armor.uid, acc1: acc.uid, cloak: cloak.uid },
    });
    const d = derive(c);
    expect(d.attrs.FOR.total).toBe(9);
    expect(d.armor.value).toBe(32);
  });
  it('gives no Mana without access', () => {
    const c = newCharacter({ classId: 'warrior', attrs: { VIG: 0, FOR: 0, STR: 0, DEX: 0, INT: 2, ARC: 2, CHA: 0, REF: 0, INS: 0, AWA: 0 } });
    const d = derive(c);
    expect(d.hasMana).toBe(false);
    expect(d.mana.value).toBe(0);
  });
  it('gives Mana to a Scholar and adds the Elf bonus only with access', () => {
    const base = { INT: 1, ARC: 1 };
    const scholar = newCharacter({ classId: 'scholar', speciesId: 'elf', attrs: { VIG: 0, FOR: 0, STR: 0, DEX: 0, INT: base.INT, ARC: base.ARC, CHA: 0, REF: 0, INS: 0, AWA: 0 } });
    const d = derive(scholar);
    expect(d.hasMana).toBe(true);
    // Level 1 + 2 x (INT 2 + ARC 3 incl. elf +1) = 11, plus Elf +3
    expect(d.mana.value).toBe(1 + 2 * (2 + 3) + 3);
    const warrior = derive(newCharacter({ classId: 'warrior', speciesId: 'elf' }));
    expect(warrior.mana.value).toBe(0);
  });
  it('lets a species net +3 and a class add +2', () => {
    const d = derive(newCharacter({ speciesId: 'dwarf', classId: 'warrior' }));
    const sum = Object.values(d.attrs).reduce((a, x) => a + x.total, 0);
    expect(sum).toBe(3 + 2);
  });
  it('lets a Human pick three distinct attributes', () => {
    const d = derive(newCharacter({ speciesId: 'human', humanAttrs: ['DEX', 'INT', 'AWA'], classId: 'marksman' }));
    expect(d.attrs.DEX.species).toBe(1);
    expect(d.attrs.CHA.species).toBe(0);
  });
  it('keeps identical effects to the highest value and stacks distinct ones', () => {
    const a = item({ kind: 'accessory', accessoryKind: 'armor', accessoryRank: 1, name: 'A' });
    const b = item({ kind: 'accessory', accessoryKind: 'armor', accessoryRank: 3, name: 'B' });
    const c = newCharacter({ items: [a, b], equipment: { acc1: a.uid, acc2: b.uid } });
    const d = derive(c);
    // Two Armor accessories are identical effects, so only the Greater +3 applies.
    expect(d.armor.value).toBe(6 + d.attrs.FOR.total + 3);
  });
  it('recomputes totals and ignores a bad override without a reason', () => {
    const c = newCharacter({ overrides: [{ id: 'o1', stat: 'hp', value: 500, reason: '' }] });
    const d = derive(c);
    expect(d.hp.value).not.toBe(500);
    expect(d.warnings.some((w) => w.includes('override'))).toBe(true);
    const ok = derive(newCharacter({ overrides: [{ id: 'o2', stat: 'hp', value: 500, reason: 'Blessing from the Narrator' }] }));
    expect(ok.hp.value).toBe(500);
    expect(ok.overridden[0].reason).toContain('Blessing');
  });
  it('does not reset anything on equip', () => {
    const w = item({ kind: 'weapon', baseId: 'longsword', name: 'Sword' });
    const c = newCharacter({ items: [w], equipment: {}, state: { ...newCharacter().state, hp: 3, grace: 2 } });
    const equipped = { ...c, equipment: { hand1: w.uid } };
    expect(equipped.state.hp).toBe(3);
    expect(derive(equipped).attacks[0].atk).toBe(4);
  });
});

describe('Traits and Paths', () => {
  it('uses the highest of a Path grant and a purchase and never refunds', () => {
    expect(effectiveTraitRank('health', [], 2, 8)).toBe(2);
    expect(effectiveTraitRank('health', [3], 2, 8)).toBe(3);
    expect(effectiveTraitRank('health', [3], 2, 4)).toBe(2);
    expect(effectiveTraitRank('health', [1, 2], 3, 8)).toBe(3);
  });
  it('charges only what was bought', () => {
    const c = newCharacter({ level: 8, independentPaths: [], traits: { health: [1, 2, 3] } });
    expect(tpSpentFor(c, {}, 8)).toBe(6);
  });
  it('gives a duplicate Career Path 2 Mastery Points', () => {
    const c = newCharacter({
      level: 8,
      classId: 'warrior',
      independentPaths: ['melee'],
      careers: [{ careerId: 'fighter', role: 'primary', pathId: 'melee', r1: [], r2: [], r3: [] }],
      pathRanks: { melee: 2 },
    });
    const d = derive(c);
    const melee = d.paths.find((p) => p.pathId === 'melee')!;
    expect(d.paths.filter((p) => p.pathId === 'melee')).toHaveLength(1);
    expect(melee.duplicateMp).toBe(2);
    expect(melee.rank).toBe(2);
  });
  it('lowers a Path rank that the earned Mastery Points cannot pay for', () => {
    const c = newCharacter({ level: 4, independentPaths: ['melee'], pathRanks: { melee: 3 }, pathMp: { melee: 2 } });
    expect(derive(c).paths[0].rank).toBe(2);
  });
  it('lets Quick Learner add 1 MP to the first Path once', () => {
    const c = newCharacter({
      speciesId: 'human',
      humanFeature: 'human-quick-learner',
      classId: 'warrior',
      careers: [{ careerId: 'knight', role: 'primary', pathId: 'armor', r1: [], r2: [], r3: [] }],
    });
    expect(derive(c).paths[0].earnedMp).toBe(1);
  });
});

describe('recovery', () => {
  it('follows the Rest table', () => {
    expect([5, 10, 59, 60, 119, 120, 180, 240].map((m) => restHpAmount(m, 5, 0))).toEqual([0, 5, 5, 10, 10, 15, 20, 20]);
    expect(restHpAmount(60, 5, 3)).toBe(13);
  });
  it('caps Rest Mana at the missing amount', () => {
    expect(restManaAmount(20, 0, 0)).toBe(10);
    expect(restManaAmount(20, 15, 0)).toBe(5);
    expect(restManaAmount(21, 0, 2)).toBe(12);
  });
  it('follows the Sleep table', () => {
    expect([3, 4, 5.9, 6, 8].map(sleepResult)).toEqual(['none', 'half', 'half', 'full', 'full']);
  });
  const ctx = { level: 5, maxHp: 40, maxMana: 10, hasMana: true, restHpBonus: 0, restManaBonus: 0, sleepHpBonus: 8, uses: [{ id: 'u1', name: 'U', count: 1, per: 'sleep' as const }] };
  it('recharges Sleep uses only after 6 hours', () => {
    const base = { ...newCharacter().state, hp: 10, mana: 0, spent: { u1: 1 } };
    expect(applySleep(base, ctx, 5).state.spent.u1).toBe(1);
    expect(applySleep(base, ctx, 6).state.spent.u1).toBeUndefined();
    expect(applySleep(base, ctx, 6).state.hp).toBe(40);
  });
  it('lets a Fatigued character remove 1 Fatigue instead of full recovery', () => {
    const base = { ...newCharacter().state, hp: 10, fatigue: 2 };
    const r = applySleep(base, ctx, 8);
    expect(r.state.fatigue).toBe(1);
    expect(r.state.hp).toBeLessThan(40);
  });
  it('restores Final Blow Resistance after a full 8 hours', () => {
    const base = { ...newCharacter().state, finalBlow: 2 };
    expect(applySleep(base, ctx, 8).state.finalBlow).toBe(3);
    expect(applySleep(base, ctx, 7).state.finalBlow).toBe(2);
  });
  it('counts two Rests in a row as one', () => {
    const s0 = { ...newCharacter().state, hp: 1 };
    const r1 = applyRest(s0, ctx, 60);
    expect(r1.hpGained).toBeGreaterThan(0);
    expect(applyRest(r1.state, ctx, 60).hpGained).toBe(0);
    expect(applyRest(r1.state, ctx, 60, { meaningfulActivity: true }).hpGained).toBeGreaterThan(0);
  });
});

describe('conditions', () => {
  it('activates at the threshold, resets to 0 and discards the excess', () => {
    const r = addBuildup(CONDITION_BY_ID.bleed, undefined, 25, 20);
    expect(r.activated).toBe(true);
    expect(r.state.meter).toBe(0);
    expect(r.damage).toBe(12);
  });
  it('decays by 2 only when nothing new was gained', () => {
    const s = { meter: 9, active: false, timer: null, stacks: 0 };
    expect(endTurnDecay(s, true).meter).toBe(9);
    expect(endTurnDecay(s, false).meter).toBe(7);
    expect(endTurnDecay({ ...s, meter: 1 }, false).meter).toBe(0);
  });
  it('sets poison duration from FOR', () => {
    expect(poisonDuration(0)).toBe(8);
    expect(poisonDuration(4)).toBe(6);
    expect(poisonDuration(20)).toBe(2);
  });
  it('reduces healing by 3 for each Bleed stack', () => {
    expect(healingAfterBleed(10, 2)).toBe(4);
    expect(healingAfterBleed(2, 2)).toBe(0);
  });
  it('caps burst stacks at 8 on reapply', () => {
    let s = addBuildup(CONDITION_BY_ID.frost, undefined, 30, 20).state;
    for (let i = 0; i < 12; i++) s = addBuildup(CONDITION_BY_ID.frost, s, 30, 20).state;
    expect(s.stacks).toBe(8);
  });
});

describe('items and magic helpers', () => {
  it('splits infused damage with the physical half rounded up', () => {
    expect(damageParts(7, 'Slash', 'fire')).toEqual([{ type: 'Slash', amount: 4 }, { type: 'Fire', amount: 3 }]);
    expect(damageParts(7, 'Slash', 'sacred')[1].type).toBe('Holy');
    expect(damageParts(7, 'Slash', 'arcane')).toEqual([{ type: 'Magic', amount: 7 }]);
  });
  it('keeps reduced weight at 1 or more', () => {
    expect(reduceWeight(3, 2)).toBe(1);
    expect(reduceWeight(8, 4)).toBe(4);
    expect(reduceWeight(1, 3)).toBe(1);
  });
  it('never lets a positive Mana cost fall below 1', () => {
    expect(reduceManaCost(2, 5)).toBe(1);
    expect(reduceManaCost(0, 3)).toBe(0);
  });
  it('sets companion and summon capacity', () => {
    expect([0, 1, 2, 3].map(companionCapacity)).toEqual([2, 2, 3, 4]);
    expect([0, 1, 2, 3].map(summonCapacity)).toEqual([2, 3, 4, 5]);
  });
});

describe('Dragonkin', () => {
  it('keeps HP in proportion and rounds down', () => {
    expect(proportionalHp(100, 100, 140)).toBe(140);
    expect(proportionalHp(50, 100, 140)).toBe(70);
    expect(proportionalHp(33, 100, 140)).toBe(46);
    expect(proportionalHp(1, 200, 20)).toBe(1);
    expect(proportionalHp(0, 100, 140)).toBe(0);
  });
  it('transforms, keeps the HP share and reverts', () => {
    const c = newCharacter({ speciesId: 'dragonkin', level: 8, classId: 'warrior', attrs: { VIG: 3, FOR: 0, STR: 0, DEX: 0, INT: 4, ARC: 4, CHA: 0, REF: 0, INS: 0, AWA: 0 } });
    const d0 = derive(c);
    const half = { ...c, state: { ...c.state, hp: Math.floor(d0.hp.value / 2), mana: d0.mana.value } };
    const t = transformTo(half, 'partial');
    expect(t.ok).toBe(true);
    const d1 = derive(t.character);
    expect(d1.hp.value).toBe(d0.hp.value + 15);
    expect(t.character.state.hp).toBe(Math.floor((half.state.hp! * d1.hp.value) / d0.hp.value));
    const back = transformTo(t.character, 'normal');
    expect(back.character.state.hp!).toBeLessThanOrEqual(half.state.hp!);
  });
  it('suspends weapons and armor in a large form', () => {
    const sword = item({ kind: 'weapon', baseId: 'longsword', name: 'Sword' });
    const c = newCharacter({ speciesId: 'dragonkin', level: 8, classId: 'warrior', items: [sword], equipment: { hand1: sword.uid }, dragon: { form: 'vyvren', properties: [], affinity: null, extraAffinities: [] } });
    const d = derive(c);
    expect(d.form.suspendsGear).toBe(true);
    expect(d.weight).toBe(0);
  });
});
