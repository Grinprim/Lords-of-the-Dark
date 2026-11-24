import type { Effect } from '../data/types';

/** An effect plus the name of whatever grants it. */
export interface SourcedEffect extends Effect {
  source: string;
}

export interface Line {
  label: string;
  v: number;
  source: string;
}

export interface Breakdown {
  value: number;
  lines: Line[];
}

export interface Resolved {
  total: number;
  lines: Line[];
  /** Conditional effects. They are listed on the sheet and never added to base totals. */
  conditional: SourcedEffect[];
}

/**
 * Combine effects for one stat.
 * Identical effects (same stat and same key) use only the highest value.
 * Distinct keys stack. Penalties and bonuses are resolved separately.
 */
export function resolveStat(effects: SourcedEffect[], stat: string): Resolved {
  const live = effects.filter((e) => e.stat === stat && !e.when);
  const conditional = effects.filter((e) => e.stat === stat && !!e.when);
  const best = new Map<string, SourcedEffect>();
  for (const e of live) {
    const slot = `${e.key}|${e.v < 0 ? 'neg' : 'pos'}`;
    const cur = best.get(slot);
    if (!cur || Math.abs(e.v) > Math.abs(cur.v)) best.set(slot, e);
  }
  const lines: Line[] = [];
  let total = 0;
  for (const e of best.values()) {
    total += e.v;
    lines.push({ label: e.label ?? e.key, v: e.v, source: e.source });
  }
  return { total, lines, conditional };
}

export function sumStat(effects: SourcedEffect[], stat: string): number {
  return resolveStat(effects, stat).total;
}

/** Build a breakdown from a base line and resolved effect lines. */
export function breakdown(base: Line[], extra: Resolved | null, floor?: number): Breakdown {
  const lines = [...base, ...(extra?.lines ?? [])];
  let value = lines.reduce((a, l) => a + l.v, 0);
  if (floor !== undefined) value = Math.max(floor, value);
  return { value, lines };
}

/** Every stat name that begins with a prefix, such as `check:`. */
export function statsWithPrefix(effects: SourcedEffect[], prefix: string): string[] {
  return [...new Set(effects.filter((e) => e.stat.startsWith(prefix)).map((e) => e.stat))].sort();
}

/**
 * Remove any feature that another owned feature replaces.
 * `replaces` lists the ids of the abilities that an upgrade improves.
 */
export function dropReplaced<T extends { id: string; replaces?: string[] }>(features: T[]): T[] {
  const replaced = new Set(features.flatMap((f) => f.replaces ?? []));
  return features.filter((f) => !replaced.has(f.id));
}
