// Checks WCAG 2.2 contrast for the design tokens in both themes.
// Text pairs need 4.5:1. Interface parts such as focus rings and strong borders need 3:1.
// The soft hairline color (--line) is decorative, so it is reported and not enforced.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export interface Result {
  theme: 'light' | 'dark';
  fg: string;
  bg: string;
  ratio: number;
  need: number;
  pass: boolean;
  kind: string;
}

function parseBlock(css: string, selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split(';')) {
    const kv = line.match(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_ON: [string, string][] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'],
  ['ink-2', 'bg'], ['ink-2', 'surface'], ['ink-2', 'surface-2'],
  ['accent', 'bg'], ['accent', 'surface'], ['accent', 'surface-2'],
  ['accent-ink', 'accent'],
  ['brass', 'bg'], ['brass', 'surface'],
  ['st-approved', 'surface'], ['st-provisional', 'surface'], ['st-legacy', 'surface'], ['st-owner-review', 'surface'], ['st-proposal', 'surface'],
  ['st-approved', 'bg'], ['st-provisional', 'bg'], ['st-legacy', 'bg'], ['st-owner-review', 'bg'], ['st-proposal', 'bg'],
  ['ok', 'surface'], ['warn', 'surface'], ['bad', 'surface'],
  ['ok', 'bg'], ['warn', 'bg'], ['bad', 'bg'],
  ['warn', 'surface-2'], ['bad', 'surface-2'],
];

const UI_ON: [string, string][] = [
  ['focus', 'bg'], ['focus', 'surface'], ['focus', 'surface-2'],
  ['line-strong', 'bg'], ['line-strong', 'surface'],
  ['ink', 'bg'],
];

export function runChecks(css: string): Result[] {
  const light = parseBlock(css, /:root\s*\{([^}]*)\}/);
  const dark = { ...light, ...parseBlock(css, /:root\[data-theme='dark'\]\s*\{([^}]*)\}/) };
  const out: Result[] = [];
  for (const [theme, vars] of [['light', light], ['dark', dark]] as const) {
    for (const [fg, bg] of TEXT_ON) out.push(check(theme, vars, fg, bg, 4.5, 'text'));
    for (const [fg, bg] of UI_ON) out.push(check(theme, vars, fg, bg, 3, 'interface'));
  }
  return out;
}

function check(theme: 'light' | 'dark', vars: Record<string, string>, fg: string, bg: string, need: number, kind: string): Result {
  const a = vars[fg];
  const b = vars[bg];
  if (!a || !b) return { theme, fg, bg, ratio: 0, need, pass: false, kind };
  const r = ratio(a, b);
  return { theme, fg, bg, ratio: Math.round(r * 100) / 100, need, pass: r >= need, kind };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  const results = runChecks(css);
  const fails = results.filter((r) => !r.pass);
  for (const r of results) console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.theme.padEnd(5)} ${r.kind.padEnd(9)} ${r.fg} on ${r.bg}: ${r.ratio} (needs ${r.need})`);
  console.log(`\n${results.length - fails.length} of ${results.length} pairs pass.`);
  if (fails.length) process.exit(1);
}
