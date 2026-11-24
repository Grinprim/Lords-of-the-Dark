import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { RollMode, RollResult, odds, roll, toPercent, succeeds } from '../engine/dice';
import { Icon } from './icons';

const MODE_LABEL: Record<RollMode, string> = { ordinary: 'Ordinary (2d8)', advantage: 'Advantage (3d8)', disadvantage: 'Disadvantage (1d8)' };

function Bar({ label, f, note }: { label: string; f: { num: number; den: number }; note?: string }): JSX.Element {
  const pct = (f.num / f.den) * 100;
  return (
    <div class="meter" title={note}>
      <span>{label}</span>
      <span class="bar" aria-hidden="true">
        <i style={`width:${pct}%`} />
      </span>
      <span class="val">{toPercent(f, 1)}</span>
    </div>
  );
}

/** Exact odds for one roll, plus a roller. Everything is computed by counting every outcome. */
export function OddsTool({ initialMod = 3, initialTarget = 12 }: { initialMod?: number; initialTarget?: number }): JSX.Element {
  const [mode, setMode] = useState<RollMode>('ordinary');
  const [mod, setMod] = useState(initialMod);
  const [target, setTarget] = useState(initialTarget);
  const [last, setLast] = useState<RollResult | null>(null);
  const o = odds(mode, mod, target);
  const num = (v: string, set: (n: number) => void) => {
    const n = Number(v);
    if (Number.isFinite(n)) set(Math.max(-50, Math.min(99, Math.trunc(n))));
  };
  return (
    <div class="panel odds-tool">
      <div class="filters" style="margin-bottom: 1rem">
        <label class="field">
          <span>Roll</span>
          <select class="input" value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as RollMode)}>
            {(Object.keys(MODE_LABEL) as RollMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label class="field">
          <span>Modifier</span>
          <input class="input" type="number" inputMode="numeric" value={mod} min={-50} max={99} onInput={(e) => num((e.target as HTMLInputElement).value, setMod)} style="width: 6rem" />
        </label>
        <label class="field">
          <span>Target (Armor or Challenge Score)</span>
          <input class="input" type="number" inputMode="numeric" value={target} min={-50} max={99} onInput={(e) => num((e.target as HTMLInputElement).value, setTarget)} style="width: 8rem" />
        </label>
      </div>
      <div class="stack" role="group" aria-label="Exact odds">
        <Bar label="Success" f={o.hit} note="Meets the target and is not a fumble." />
        <Bar label="Critical success" f={o.criticalHit} note="A critical that also meets the target." />
        <Bar label="Critical miss" f={o.criticalMiss} note="A critical that still misses the target." />
        <Bar label="Fumble" f={o.fumble} note="Every die shows 1. Always fails." />
        <Bar label="Failure" f={o.miss} note="Fails to meet the target, including fumbles." />
      </div>
      <p class="small muted" style="margin-top: 0.75rem">
        Success is {o.hit.num} in {o.hit.den}. A critical needs two or more dice showing 8, and it still has to meet the target. There is no critical on Disadvantage.
      </p>
      <div class="row" style="margin-top: 0.5rem">
        <button type="button" class="btn" onClick={() => setLast(roll(mode, mod))}>
          <Icon name="dice" size={16} /> Roll it
        </button>
        {last && (
          <span role="status" aria-live="polite" class="row">
            {last.dice.map((d, i) => (
              <span key={i} class={`dice-face${d === 8 ? ' hit' : ''}`} aria-label={`die ${d}`}>
                {d}
              </span>
            ))}
            <span class="num">
              {last.natural} {mod >= 0 ? '+' : '-'} {Math.abs(mod)} = <strong>{last.total}</strong>
            </span>
            <strong>
              {last.fumble ? 'Fumble. It fails.' : succeeds(last, target) ? (last.critical ? 'Critical success' : 'Success') : last.critical ? 'Critical, but below the target' : 'Failure'}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
