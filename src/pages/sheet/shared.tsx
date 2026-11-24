import type { JSX } from 'preact';
import type { Character, CharacterState } from '../../engine/character';
import type { Derived } from '../../engine/derive';
import type { RollMode, RollResult } from '../../engine/dice';

export interface RollEntry {
  id: number;
  label: string;
  r: RollResult;
  /** Lines that explain the modifier. */
  notes: string[];
  target: number | null;
}

export interface SheetProps {
  c: Character;
  d: Derived;
  /** Change the play state. Return null to refuse. Returns true when it applied. */
  play: (fn: (s: CharacterState) => CharacterState | null) => boolean;
  /** Change the character itself. */
  edit: (fn: (c: Character) => void) => void;
  /** Roll 2d8 (or 3d8, 1d8) plus a modifier and add the result to the log. */
  rollWith: (label: string, modifier: number, opts?: { mode?: RollMode; target?: number | null; notes?: string[]; after?: (r: RollResult) => string[] }) => RollEntry;
  say: (message: string) => void;
}

export const MODE_LABEL: Record<RollMode, string> = { ordinary: 'Ordinary, 2d8', advantage: 'Advantage, 3d8', disadvantage: 'Disadvantage, 1d8' };

export function Meter({ value, max, label, tone }: { value: number; max: number; label: string; tone?: 'bad' }): JSX.Element {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div class="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value} of ${max}`} data-tone={tone}>
      <span style={`width:${pct}%`} />
    </div>
  );
}

export const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

export function RollLine({ e }: { e: RollEntry }): JSX.Element {
  const { r } = e;
  const verdict = r.fumble ? 'Fumble. This is an automatic failure.' : r.critical ? 'Critical.' : '';
  const against = e.target === null ? '' : r.fumble || r.total < e.target ? ` Misses ${e.target}.` : ` Meets ${e.target}.`;
  return (
    <div class="roll-line" data-crit={r.critical} data-fumble={r.fumble}>
      <strong class="serif">{e.label}</strong>
      <span class="num roll-total">{r.total}</span>
      <span class="small muted">
        dice {r.dice.join(' + ')} = {r.natural}
        {r.modifier !== 0 ? `, modifier ${signed(r.modifier)}` : ''}.
        {verdict ? ` ${verdict}` : ''}
        {against}
      </span>
      {e.notes.length > 0 && <span class="small muted roll-notes">{e.notes.join(' ')}</span>}
    </div>
  );
}
