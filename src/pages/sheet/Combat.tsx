import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import {
  CONDITIONS, ConditionDef, emptyCondition, endSceneTimers, endTurnDamage, endTurnDecay, addBuildup, poisonDuration, thresholdFor, fatiguePenalty,
} from '../../engine/conditions';
import { DefenseKind, RollMode, RollResult, resolveAttack } from '../../engine/dice';
import { applyHpChange } from '../../engine/recovery';
import { StatChip } from '../../components/icons';
import { MODE_LABEL, SheetProps, signed } from './shared';

const KINDS: DefenseKind[] = ['block', 'dodge', 'parry'];

function pseudoRoll(total: number, critical: boolean): RollResult {
  return { mode: 'ordinary', dice: [], natural: total, modifier: 0, total, critical, fumble: false };
}

function Attacks({ c, d, rollWith }: SheetProps): JSX.Element {
  const [mode, setMode] = useState<RollMode>('ordinary');
  const [armor, setArmor] = useState(10);
  const [defKind, setDefKind] = useState<DefenseKind | ''>('');
  const [defTotal, setDefTotal] = useState(0);
  const fat = fatiguePenalty(c.state.fatigue);

  const attack = (name: string, atk: number, dmg: number | null) => {
    rollWith(`${name} attack`, atk + fat, {
      mode,
      target: armor,
      notes: fat !== 0 ? [`Fatigue ${fat}.`] : [],
      after: (r) => {
        if (dmg === null) return [];
        const out = resolveAttack({ roll: r, armor, dmg, defense: defKind ? { kind: defKind, total: defTotal } : null });
        return [out.hit ? `Hit for ${out.damage} damage.` : 'Miss.', ...out.notes, ...(out.riposte ? ['A Riposte is open to the defender.'] : [])];
      },
    });
  };

  return (
    <section class="panel sheet-section" aria-labelledby="atk-h">
      <h2 id="atk-h" style="margin-top: 0">
        Attacks
      </h2>
      <div class="filters no-print">
        <label class="field">
          <span>Dice</span>
          <select class="input" value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as RollMode)}>
            {(Object.keys(MODE_LABEL) as RollMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label class="field" style="max-width: 8rem">
          <span>Target Armor</span>
          <input class="input" type="number" min={0} max={60} value={armor} onInput={(e) => setArmor(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
        </label>
        <label class="field">
          <span>Their defense</span>
          <select class="input" value={defKind} onChange={(e) => setDefKind((e.target as HTMLSelectElement).value as DefenseKind | '')}>
            <option value="">None</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k[0].toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {defKind && (
          <label class="field" style="max-width: 8rem">
            <span>Defense total</span>
            <input class="input" type="number" min={0} max={80} value={defTotal} onInput={(e) => setDefTotal(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
          </label>
        )}
      </div>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Attacks you can make</caption>
          <thead>
            <tr>
              <th scope="col">Attack</th>
              <th scope="col">ATK</th>
              <th scope="col">DMG</th>
              <th scope="col" class="hide-small">Note</th>
              <th scope="col" class="no-print">
                <span class="visually-hidden">Roll</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {d.attacks.map((a, i) => (
              <tr key={`${a.name}-${i}`}>
                <th scope="row" style="text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)">
                  {a.name}
                </th>
                <td class="num">{signed(a.atk)}</td>
                <td class="num">{a.dmg}</td>
                <td class="hide-small small muted">{a.note}</td>
                <td class="no-print">
                  <button type="button" class="btn small primary" onClick={() => attack(a.name, a.atk, a.dmg)}>
                    Roll
                  </button>
                </td>
              </tr>
            ))}
            {d.spellcasting && (
              <tr>
                <th scope="row" style="text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)">
                  Spell attack
                </th>
                <td class="num">{signed(d.attack.spell)}</td>
                <td class="num">by spell</td>
                <td class="hide-small small muted">DMG comes from the spell.</td>
                <td class="no-print">
                  <button type="button" class="btn small primary" onClick={() => attack('Spell', d.attack.spell, null)}>
                    Roll
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {d.dualWield && <p class="small muted">You wield two weapons. The sheet lists each one.</p>}
    </section>
  );
}

function Defense({ c, d, rollWith }: SheetProps): JSX.Element {
  const [attackTotal, setAttackTotal] = useState(12);
  const [dmg, setDmg] = useState(8);
  const [crit, setCrit] = useState(false);
  const fat = fatiguePenalty(c.state.fatigue);
  const defend = (kind: DefenseKind) => {
    rollWith(`${kind[0].toUpperCase() + kind.slice(1)}`, d.defense[kind] + fat, {
      target: attackTotal,
      notes: [`Against attack total ${attackTotal}. The defender wins ties.`],
      after: (r) => {
        const out = resolveAttack({ roll: pseudoRoll(attackTotal, crit), armor: 0, dmg, defense: { kind, total: r.total } });
        return [out.defended ? 'The defense holds.' : 'The defense fails.', `You take ${out.damage} damage.`, ...out.notes];
      },
    });
  };
  return (
    <section class="panel sheet-section no-print" aria-labelledby="def-h">
      <h2 id="def-h" style="margin-top: 0">
        Defend
      </h2>
      <div class="filters">
        <label class="field" style="max-width: 9rem">
          <span>Their attack total</span>
          <input class="input" type="number" min={0} max={80} value={attackTotal} onInput={(e) => setAttackTotal(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
        </label>
        <label class="field" style="max-width: 8rem">
          <span>Their DMG</span>
          <input class="input" type="number" min={0} max={200} value={dmg} onInput={(e) => setDmg(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
        </label>
        <label class="check">
          <input type="checkbox" checked={crit} onChange={() => setCrit(!crit)} />
          Their roll was a critical
        </label>
      </div>
      <div class="row">
        {KINDS.map((k) => (
          <button key={k} type="button" class="btn" onClick={() => defend(k)}>
            Roll {k[0].toUpperCase() + k.slice(1)} ({signed(d.defense[k])})
          </button>
        ))}
      </div>
      <p class="small muted" style="margin-bottom: 0">
        The attack must already have met your Armor of {d.armor.value}. This tool answers what the defense does after that.
      </p>
    </section>
  );
}

function Conditions({ c, d, play, rollWith, say }: SheetProps): JSX.Element {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [gained, setGained] = useState<Set<string>>(new Set());
  const thr = d.thresholds;
  const forDur = poisonDuration(d.attrs.FOR.total);

  const add = (def: ConditionDef) => {
    const amount = amounts[def.id] ?? 1;
    play((s) => {
      const res = addBuildup(def, s.conditions[def.id], amount, thresholdFor(def, thr), forDur);
      const next = { ...s, conditions: { ...s.conditions, [def.id]: res.state } };
      say(`${def.name}: ${res.activated ? 'activated. ' : `meter ${res.state.meter} of ${thresholdFor(def, thr)}. `}${res.damage ? `Lose ${res.damage} HP. ` : ''}${res.notes.join(' ')}`.trim());
      return res.damage > 0 ? applyHpChange(next, d.hp.value, -res.damage) : next;
    });
    setGained(new Set([...gained, def.id]));
  };

  const endTurn = () => {
    let lost = 0;
    play((s) => {
      const conditions = { ...s.conditions };
      for (const def of CONDITIONS) {
        const cur = conditions[def.id];
        if (!cur) continue;
        let st = endTurnDecay(cur, gained.has(def.id), d.decayBonus);
        const r = endTurnDamage(def, st);
        st = r.state;
        lost += r.damage;
        conditions[def.id] = st;
      }
      const next = { ...s, conditions };
      return lost > 0 ? applyHpChange(next, d.hp.value, -lost) : next;
    });
    setGained(new Set());
    say(lost > 0 ? `End of your Turn. You lose ${lost} HP to ongoing damage.` : 'End of your Turn. Meters that gained nothing fell.');
  };

  const endScene = () =>
    play((s) => {
      const conditions = { ...s.conditions };
      for (const id of Object.keys(conditions)) conditions[id] = endSceneTimers(conditions[id]);
      return { ...s, conditions };
    });

  return (
    <section class="panel sheet-section" aria-labelledby="cnd-h">
      <div class="row-between">
        <h2 id="cnd-h" style="margin: 0">
          Conditions
        </h2>
        <span class="row no-print">
          <button type="button" class="btn small" onClick={endTurn}>
            End of my Turn
          </button>
          <button type="button" class="btn small" onClick={endScene}>
            End of the Scene
          </button>
        </span>
      </div>
      <p class="small muted">
        Physical threshold {thr.physical}, madness threshold {thr.madness}. A meter that gains nothing in your Turn falls by {2 + Math.max(0, d.decayBonus)}.
      </p>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Condition meters</caption>
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">Meter</th>
              <th scope="col">State</th>
              <th scope="col" class="no-print">
                Add buildup
              </th>
            </tr>
          </thead>
          <tbody>
            {CONDITIONS.map((def) => {
              const s = c.state.conditions[def.id];
              const t = thresholdFor(def, thr);
              const attr = def.resist ? d.attrs[def.resist].total : 0;
              return (
                <tr key={def.id} data-active={!!s?.active}>
                  <th scope="row" style="text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)">
                    {def.name}
                    <div class="small muted" style="font-weight: 400">
                      {def.text}
                    </div>
                  </th>
                  <td class="num">
                    {s?.meter ?? 0} / {t}
                  </td>
                  <td>
                    {s?.active ? (
                      <span>
                        <strong>Active</strong>
                        {s.stacks > 1 ? `, ${s.stacks} stacks` : ''}
                        {s.timer !== null ? `, ${s.timer} ${def.unit === 'scene' || def.kind === 'burst' ? 'Scenes' : 'Turns'} left` : ''}
                      </span>
                    ) : (
                      <span class="muted">Clear</span>
                    )}
                  </td>
                  <td class="no-print" style="white-space: nowrap">
                    <span class="row" style="gap: 0.35rem; flex-wrap: nowrap">
                      <input class="input" style="width: 4.2rem; min-height: 2rem" type="number" min={1} max={30} aria-label={`${def.name} buildup amount`} value={amounts[def.id] ?? 1} onInput={(e) => setAmounts({ ...amounts, [def.id]: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })} />
                      <button type="button" class="btn small" onClick={() => add(def)}>
                        Add
                      </button>
                      {def.resist && (
                        <button type="button" class="btn small" title={`Resistance check: 2d8 plus ${def.resist} ${signed(attr)}`} onClick={() => rollWith(`${def.name} resistance`, attr + fatiguePenalty(c.state.fatigue), { notes: [`${def.resist} ${signed(attr)}.`] })}>
                          Resist
                        </button>
                      )}
                      {(s?.active || (s?.meter ?? 0) > 0) && (
                        <button type="button" class="btn small" onClick={() => play((st) => ({ ...st, conditions: { ...st.conditions, [def.id]: emptyCondition() } }))}>
                          Clear
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Combat(props: SheetProps): JSX.Element {
  const { d } = props;
  return (
    <div class="stack">
      <div class="row" style="gap: 1rem 1.5rem">
        <StatChip stat="armor" value={d.armor.value} big showLabel />
        <span class="stat big" title="Block, Dodge and Parry totals">
          <span class="stat-label">Block</span> {signed(d.defense.block)}
        </span>
        <span class="stat big">
          <span class="stat-label">Dodge</span> {signed(d.defense.dodge)}
        </span>
        <span class="stat big">
          <span class="stat-label">Parry</span> {signed(d.defense.parry)}
        </span>
        <StatChip stat="mov" value={d.mov.value} big showLabel />
      </div>
      <Attacks {...props} />
      <Defense {...props} />
      <Conditions {...props} />
    </div>
  );
}
