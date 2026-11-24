import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['node_modules', 'dist', '.git', 'assets', 'tests']);
const EXT = new Set(['.ts', '.tsx', '.css', '.html', '.md', '.json', '.js', '.yml', '.svg']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(name)) && name !== 'package-lock.json') out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const read = (f: string) => readFileSync(f, 'utf8');

describe('house style', () => {
  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });
  it('uses no em dashes', () => {
    const hits = files.filter((f) => read(f).includes('—'));
    expect(hits).toEqual([]);
  });
  it('uses no emoji', () => {
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
    const hits = files.filter((f) => re.test(read(f)));
    expect(hits).toEqual([]);
  });
  it('avoids the banned words', () => {
    const re = /\b(unleash|elevate|seamless(ly)?|streamline[sd]?|game-changer|delve)\b/i;
    const hits = files.filter((f) => re.test(read(f)));
    expect(hits).toEqual([]);
  });
  it('avoids banned fonts and card styles', () => {
    const re = /(['"\s])(Inter|Roboto|Space Grotesk|Fraunces)(['",;\s])|rounded-2xl/;
    const hits = files.filter((f) => re.test(read(f)));
    expect(hits).toEqual([]);
  });
});
