import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Route } from '../router';
import { A, PageHead, StatusBadge, Tabs } from '../components/common';
import { OddsTool } from '../components/OddsTool';
import { ATTR_NAMES } from '../data/types';
import { STATUS_HELP, STATUS_LABEL, Status } from '../data/types';
import { LEDGER } from '../data/ledger';
import { CONDITIONS, DECAY_BASE, poisonDuration } from '../engine/conditions';
import { DefenseKind, RollMode, RollResult, odds, resolveAttack, roll, toPercent } from '../engine/dice';
import { restBand, restHpAmount, restManaAmount, sleepResult } from '../engine/recovery';
import { TIER_LABEL } from '../data/progression';

const SECTIONS = [
  { id: 'check', label: 'Check odds' },
  { id: 'attack', label: 'Attack resolver' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'rest', label: 'Rest and sleep' },
  { id: 'ledger', label: 'Decision ledger' },
];

const MODES: [RollMode, string][] = [['ordinary', 'Ordinary, 2d8'], ['advantage', 'Advantage, 3d8'], ['disadvantage', 'Disadvantage, 1d8']];
const th = 'text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)';

function Num({ label, value, onChange, min = -30, max = 99, width = '8rem' }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; width?: string }): JSX.Element {
  return (
    <label class="field" style={`max-width:${width}`}>
      <span>{label}</span>
      <input class="input" type="number" min={min} max={max} value={value} onInput={(e) => onChange(Math.max(min, Math.min(max, Number((e.target as HTMLInputElement).value) || 0)))} />
    </label>
  );
}

function ModeSelect({ label, value, onChange }: { label: string; value: RollMode; onChange: (m: RollMode) => void }): JSX.Element {
  return (
    <label class="field">
      <span>{label}</span>
      <select class="input" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as RollMode)}>
        {MODES.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AttackResolver(): JSX.Element {
  const [atk, setAtk] = useState(4);
  const [mode, setMode] = useState<RollMode>('ordinary');
  const [armor, setArmor] = useState(10);
  const [dmg, setDmg] = useState(8);
  const [kind, setKind] = useState<DefenseKind | ''>('');
  const [defMod, setDefMod] = useState(3);
  const [defMode, setDefMode] = useState<RollMode>('ordinary');
  const [out, setOut] = useState<{ a: RollResult; d: RollResult | null; lines: string[] } | null>(null);
  const o = odds(mode, atk, armor);

  const go = () => {
    const a = roll(mode, atk);
    const d = kind ? roll(defMode, defMod) : null;
    const res = resolveAttack({ roll: a, armor, dmg, defense: kind && d ? { kind, total: d.total } : null });
    setOut({
      a,
      d,
      lines: [res.hit ? `Hits for ${res.damage} damage.` : 'Misses.', ...res.notes, ...(res.critical ? ['The attack was a critical.'] : []), ...(res.riposte ? ['A Riposte is open to the defender.'] : [])],
    });
  };

  return (
    <div class="stack">
      <p class="muted" style="max-width: 62ch">
        One attack from start to end, in the order the rules give: meet Armor, then an eligible defense, then critical damage. The defender wins ties.
      </p>
      <div class="filters">
        <Num label="Attacker ATK" value={atk} onChange={setAtk} />
        <ModeSelect label="Attack dice" value={mode} onChange={setMode} />
        <Num label="Target Armor" value={armor} onChange={setArmor} min={0} />
        <Num label="DMG" value={dmg} onChange={setDmg} min={0} max={200} />
      </div>
      <div class="filters">
        <label class="field">
          <span>Defense</span>
          <select class="input" value={kind} onChange={(e) => setKind((e.target as HTMLSelectElement).value as DefenseKind | '')}>
            <option value="">None</option>
            <option value="block">Block</option>
            <option value="dodge">Dodge</option>
            <option value="parry">Parry</option>
          </select>
        </label>
        {kind && <Num label="Defense modifier" value={defMod} onChange={setDefMod} />}
        {kind && <ModeSelect label="Defense dice" value={defMode} onChange={setDefMode} />}
        <button type="button" class="btn primary" onClick={go}>
          Resolve one attack
        </button>
      </div>
      <p class="small">
        Chance to meet Armor {armor}: <strong>{toPercent(o.hit)}</strong>. Critical that also hits: {toPercent(o.criticalHit)}. Fumble: {toPercent(o.fumble)}.
      </p>
      {out && (
        <div class="panel" role="status" aria-live="polite">
          <p style="margin: 0">
            Attack <strong class="num">{out.a.total}</strong> <span class="muted small">(dice {out.a.dice.join(' + ')}, modifier {atk >= 0 ? '+' : ''}{atk}){out.a.critical ? ' Critical.' : ''}{out.a.fumble ? ' Fumble.' : ''}</span>
          </p>
          {out.d && (
            <p style="margin: 0.25rem 0 0">
              Defense <strong class="num">{out.d.total}</strong> <span class="muted small">(dice {out.d.dice.join(' + ')})</span>
            </p>
          )}
          <p style="margin: 0.5rem 0 0">{out.lines.join(' ')}</p>
        </div>
      )}
    </div>
  );
}

function ConditionsRef(): JSX.Element {
  const [forAttr, setForAttr] = useState(2);
  const [attr, setAttr] = useState(2);
  const [target, setTarget] = useState(12);
  const [mode, setMode] = useState<RollMode>('ordinary');
  const r = odds(mode, attr, target);
  return (
    <div class="stack">
      <div class="grid-auto">
        <div class="panel">
          <h3 style="margin-top: 0">Poison duration</h3>
          <Num label="Target FOR" value={forAttr} onChange={setForAttr} />
          <p style="margin-bottom: 0">
            Poisoned, Toxic and Rotted last <strong>{poisonDuration(forAttr)}</strong> Turns.
          </p>
        </div>
        <div class="panel">
          <h3 style="margin-top: 0">Resistance odds</h3>
          <div class="filters">
            <Num label="Attribute plus bonus" value={attr} onChange={setAttr} width="9rem" />
            <Num label="Challenge Score" value={target} onChange={setTarget} min={0} width="9rem" />
          </div>
          <ModeSelect label="Dice" value={mode} onChange={setMode} />
          <p style="margin-bottom: 0">
            Success: <strong>{toPercent(r.hit)}</strong>. Fumble: {toPercent(r.fumble)}.
          </p>
        </div>
      </div>
      <p class="muted small">A meter that gains nothing in the affected Turn falls by {DECAY_BASE} plus any decay bonus. Meters and active conditions persist after combat.</p>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Conditions</caption>
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">Kind</th>
              <th scope="col">Resists with</th>
              <th scope="col">Threshold</th>
              <th scope="col">Effect</th>
            </tr>
          </thead>
          <tbody>
            {CONDITIONS.map((c) => (
              <tr key={c.id}>
                <th scope="row" style={th}>
                  {c.name}
                </th>
                <td>{c.kind === 'damage' ? 'Damage over time' : c.kind === 'burst' ? 'Burst' : 'Status'}</td>
                <td>{c.resist ? ATTR_NAMES[c.resist] : 'None'}</td>
                <td>{c.threshold === 'madness' ? 'Madness' : 'Physical'}</td>
                <td class="small">{c.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RestRef(): JSX.Element {
  const [level, setLevel] = useState(5);
  const [bonus, setBonus] = useState(0);
  const [maxMana, setMaxMana] = useState(20);
  const rows = [10, 60, 120, 180];
  return (
    <div class="stack">
      <div class="filters">
        <Num label="Level" value={level} onChange={setLevel} min={1} max={30} />
        <Num label="Rest HP bonus" value={bonus} onChange={setBonus} min={0} />
        <Num label="Maximum Mana" value={maxMana} onChange={setMaxMana} min={0} />
      </div>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Rest recovery by length</caption>
          <thead>
            <tr>
              <th scope="col">Rest length</th>
              <th scope="col">Bands</th>
              <th scope="col">HP</th>
              <th scope="col">Mana from empty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m}>
                <th scope="row" style={th}>
                  {m === 10 ? '10 to 59 minutes' : m === 180 ? '3 hours or more' : `${m / 60} to under ${m / 60 + 1} hours`}
                </th>
                <td class="num">{restBand(m)}</td>
                <td class="num">{restHpAmount(m, level, bonus)}</td>
                <td class="num">{restManaAmount(maxMana, 0, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">Under 10 minutes restores nothing. Two Rests in a row count as one until the character does something meaningful.</p>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Sleep results</caption>
          <thead>
            <tr>
              <th scope="col">Sleep</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {[3, 4, 5, 6, 8].map((h) => (
              <tr key={h}>
                <th scope="row" style={th}>
                  {h} hours
                </th>
                <td>{{ none: 'Nothing.', half: 'Half of maximum Health and Mana.', full: 'Full recovery.' }[sleepResult(h)]}{h === 8 ? ' Also restores 1 Final Blow Resistance.' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">Tier labels used elsewhere: {TIER_LABEL.join(', ')}.</p>
    </div>
  );
}

const ORDER: Status[] = ['owner-review', 'proposal', 'provisional', 'legacy', 'approved'];

export function LedgerView(): JSX.Element {
  const [filter, setFilter] = useState<Status | ''>('');
  const list = LEDGER.filter((e) => !filter || e.status === filter);
  const counts = (s: Status) => LEDGER.filter((e) => e.status === s).length;
  return (
    <div class="stack">
      <p class="muted" style="max-width: 64ch">
        The latest approved specification overrides the legacy site. Anything that fills a gap is marked here. Nothing in this ledger is world canon.
      </p>
      <div class="row" role="group" aria-label="Filter by status">
        <button type="button" class="btn small" aria-pressed={filter === ''} onClick={() => setFilter('')}>
          All ({LEDGER.length})
        </button>
        {ORDER.map((s) => (
          <button key={s} type="button" class="btn small" aria-pressed={filter === s} title={STATUS_HELP[s]} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]} ({counts(s)})
          </button>
        ))}
      </div>
      <p class="count" role="status" aria-live="polite">{list.length} shown</p>
      <ul class="plain ledger-list">
        {list.map((e) => (
          <li key={e.id} id={`ledger-${e.id}`}>
            <div class="row" style="gap: 0.6rem">
              <StatusBadge status={e.status} />
              <span class="small muted">
                {e.area}. Source: {e.source}.
              </span>
            </div>
            <p style="margin: 0.3rem 0 0">{e.decision}</p>
            {e.note && <p class="small muted" style="margin: 0.2rem 0 0">{e.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NarratorPage({ route }: { route?: Route }): JSX.Element {
  const sub = (route as Route)?.path[1] ?? 'check';
  const id = SECTIONS.some((s) => s.id === sub) ? sub : 'check';
  return (
    <>
      <PageHead eyebrow="Tools" title="Narrator Tools" lede="Exact odds, one-attack resolution, condition rules and the decision ledger. Nothing here changes a character." />
      <Tabs label="Narrator tools" current={id} items={SECTIONS.map((s) => ({ id: s.id, label: s.label, to: `/narrator/${s.id}` }))} />
      {id === 'check' && <OddsTool />}
      {id === 'attack' && <AttackResolver />}
      {id === 'conditions' && <ConditionsRef />}
      {id === 'rest' && <RestRef />}
      {id === 'ledger' && <LedgerView />}
      <p class="small muted" style="margin-top: 2rem">
        Building or running a character? Use the <A to="/sheet">Character Sheet</A>.
      </p>
    </>
  );
}
