import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ratio, runChecks } from '../scripts/check-contrast';

describe('contrast', () => {
  it('computes known ratios', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(ratio('#777777', '#ffffff')).toBeGreaterThan(4.4);
    expect(ratio('#777777', '#ffffff')).toBeLessThan(4.6);
  });

  it('meets WCAG AA for every token pair in both themes', () => {
    const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    const results = runChecks(css);
    expect(results.length).toBeGreaterThan(60);
    const fails = results.filter((r) => !r.pass).map((r) => `${r.theme} ${r.fg} on ${r.bg}: ${r.ratio} needs ${r.need}`);
    expect(fails).toEqual([]);
  });
});
