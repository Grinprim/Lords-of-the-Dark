import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { newCharacter } from '../src/engine/character';
import { derive } from '../src/engine/derive';
import { pendingChoices } from '../src/engine/choices';
import { applyLevel, gainsBetween, gainsForLevel, levelDiff } from '../src/engine/levelup';
import { AREA_STEP, STEPS } from '../src/createSteps';
import { LEDGER } from '../src/data/ledger';
import { MAX_LEVEL } from '../src/data/progression';

describe('level-up helpers', () => {
  it('lists AP and TP for an ordinary level', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    const lines = gainsForLevel(c, 2, false);
    expect(lines).toContain('1 Attribute Point.');
    expect(lines).toContain('2 Trait Points.');
  });

  it('names the secondary Career at level 8 and a Path slot at level 4', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    expect(gainsForLevel(c, 8, false)).toContain('Your secondary Career opens.');
    expect(gainsForLevel(c, 8, false)).toContain('2 Attribute Points.');
    expect(gainsForLevel(c, 4, false)).toContain('One more independent Path slot.');
    expect(gainsForLevel(c, 4, false)).toContain('4 Trait Points.');
  });

  it('gives only Trait Points past level 16', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    const lines = gainsForLevel(c, 20, false);
    expect(lines.some((l) => l.includes('Attribute'))).toBe(false);
    expect(lines).toContain('2 Trait Points.');
  });

  it('walks a range of levels', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior', level: 3 });
    const g = gainsBetween(c, 3, 6);
    expect(g.map((x) => x.level)).toEqual([4, 5, 6]);
  });

  it('shows more AP and TP after a level and does not touch the character', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    const before = JSON.stringify(c);
    const rows = levelDiff(c, 2);
    const ap = rows.find((r) => r.stat === 'Attribute Points left')!;
    const tp = rows.find((r) => r.stat === 'Trait Points left')!;
    expect(ap.after - ap.before).toBe(1);
    expect(tp.after - tp.before).toBe(2);
    expect(JSON.stringify(c)).toBe(before);
  });

  it('keeps current Health when the level changes', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    c.state.hp = 4;
    const next = applyLevel(c, 3);
    expect(next.level).toBe(3);
    expect(next.state.hp).toBe(4);
  });

  it('clamps the level to the allowed range', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    expect(applyLevel(c, 99).level).toBe(MAX_LEVEL);
    expect(applyLevel(c, -4).level).toBe(1);
  });
});

describe('pending choices', () => {
  it('reports every open choice on a blank Human', () => {
    const c = newCharacter({ speciesId: 'human', classId: 'warrior' });
    const ids = pendingChoices(c, derive(c)).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['human-attrs', 'human-feature', 'ap', 'career-primary', 'tp', 'free-prof']));
  });

  it('drops the Human choices once they are made', () => {
    const c = newCharacter({ speciesId: 'human', classId: 'warrior', humanAttrs: ['STR', 'VIG', 'DEX'], humanFeature: 'human-adaptability' });
    const ids = pendingChoices(c, derive(c)).map((p) => p.id);
    expect(ids).not.toContain('human-attrs');
    expect(ids).not.toContain('human-feature');
  });

  it('does not ask a non-Human for Human choices', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior' });
    const ids = pendingChoices(c, derive(c)).map((p) => p.id);
    expect(ids).not.toContain('human-attrs');
  });

  it('settles the free weapon proficiency and Attribute Points', () => {
    const c = newCharacter({ speciesId: 'elf', classId: 'warrior', freeProf: 'longsword' });
    c.attrs.STR = 4;
    const ids = pendingChoices(c, derive(c)).map((p) => p.id);
    expect(ids).not.toContain('free-prof');
    expect(ids).not.toContain('ap');
  });

  it('sends every pending choice to a real step', () => {
    const c = newCharacter({ speciesId: 'human', classId: 'warrior', level: 8 });
    const steps = new Set(STEPS.map((s) => s.id));
    for (const p of pendingChoices(c, derive(c))) expect(steps.has(p.step)).toBe(true);
  });
});

describe('creation steps and ledger', () => {
  it('maps every validation area to a step', () => {
    const src = readFileSync(new URL('../src/engine/validation.ts', import.meta.url), 'utf8');
    const areas = new Set([...src.matchAll(/add\('(?:error|warning|info)', '([^']+)'/g)].map((m) => m[1]));
    expect(areas.size).toBeGreaterThan(8);
    for (const a of areas) expect(AREA_STEP[a], `area ${a}`).toBeTruthy();
    const steps = new Set(STEPS.map((s) => s.id));
    for (const a of Object.values(AREA_STEP)) expect(steps.has(a)).toBe(true);
  });

  it('keeps ledger ids unique and entries complete', () => {
    const ids = LEDGER.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of LEDGER) {
      expect(e.decision.length).toBeGreaterThan(10);
      expect(e.source.length).toBeGreaterThan(0);
    }
  });
});
