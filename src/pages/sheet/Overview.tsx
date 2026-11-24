import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { ATTR_IDS, ATTR_NAMES } from '../../data/types';
import { CONDITION_BY_ID, fatiguePenalty } from '../../engine/conditions';
import type { RollMode } from '../../engine/dice';
import {
  applyEncounterStart, applyHpChange, applyNewDay, applyRest, applySceneStart, applySleep, applyTurnStart, finalBlow, gainGrace, resetGrace, resolvedHp,
  resolvedMana, setConcentration, spendAllGrace, stabilize,
} from '../../engine/recovery';
import type { RecoveryContext } from '../../engine/recovery';
import { StatChip } from '../../components/icons';
import { Notice } from '../../components/common';
import { Stepper } from '../../components/forms';
import { MODE_LABEL, Meter, RollLine, RollEntry, SheetProps, signed } from './shared';

function Vitals({ c, d, play, say }: SheetProps): JSX.Element {
  const [amount, setAmount] = useState(1);
  const hp = resolvedHp(c.state, d.hp.value);
  const mana = resolvedMana(c.state, d.mana.value);
  const fb = c.state.finalBlow ?? d.finalBlowMax;
  const down = hp <= 0;

  return (
    <section class="panel sheet-section" aria-labelledby="vit-h">
      <h2 id="vit-h" class="visually-hidden">
        Vitals
      </h2>
      <div class="vitals">
        <div class="vital">
          <div class="row-between">
            <StatChip stat="hp" value={`${hp} / ${d.hp.value}`} big showLabel />
          </div>
          <Meter value={hp} max={d.hp.value} label="Health" tone={hp <= d.hp.value / 4 ? 'bad' : undefined} />
          <div class="row" style="margin-top: 0.5rem">
            <label class="field" style="max-width: 6rem">
              <span class="visually-hidden">Amount</span>
              <input class="input" type="number" min={1} max={999} value={amount} onInput={(e) => setAmount(Math.max(1, Math.min(999, Number((e.target as HTMLInputElement).value) || 1)))} aria-label="Amount of damage or healing" />
            </label>
            <button type="button" class="btn small danger" onClick={() => play((s) => applyHpChange(s, d.hp.value, -amount))}>
              Take {amount}
            </button>
            <button type="button" class="btn small" onClick={() => play((s) => applyHpChange(s, d.hp.value, amount))}>
              Heal {amount}
            </button>
          </div>
        </div>

        {d.hasMana && (
          <div class="vital">
            <StatChip stat="mana" value={`${mana} / ${d.mana.value}`} big showLabel />
            <Meter value={mana} max={d.mana.value} label="Mana" />
            <div class="row" style="margin-top: 0.5rem">
              <button type="button" class="btn small" disabled={mana <= 0} onClick={() => play((s) => ({ ...s, mana: Math.max(0, mana - amount) }))}>
                Spend {amount}
              </button>
              <button type="button" class="btn small" disabled={mana >= d.mana.value} onClick={() => play((s) => ({ ...s, mana: Math.min(d.mana.value, mana + amount) }))}>
                Regain {amount}
              </button>
            </div>
          </div>
        )}

        <div class="vital">
          <StatChip stat="grace" value={`${c.state.grace} / ${d.graceCap}`} big showLabel />
          <div class="row" style="margin-top: 0.5rem">
            <button type="button" class="btn small" disabled={c.state.grace >= d.graceCap} onClick={() => play((s) => gainGrace(s, d.graceCap))}>
              Gain 1 on a failed roll
            </button>
            <button type="button" class="btn small" onClick={() => play((s) => resetGrace(s, d.graceStart, d.graceCap))} title="Grace resets at the start and end of combat.">
              Reset to {d.graceStart}
            </button>
          </div>
          <p class="small muted" style="margin: 0.4rem 0 0">Spend it all in the roller below.</p>
        </div>
      </div>

      {down && (
        <Notice kind="error" title="At 0 Health">
          A Final Blow always lands and lowers Final Blow Resistance by 1. At 0 you fall.
          <div class="row" style="margin-top: 0.5rem">
            <span class="num">
              Final Blow Resistance {fb} of {d.finalBlowMax}
            </span>
            <button
              type="button"
              class="btn small danger"
              onClick={() =>
                play((s) => {
                  const r = finalBlow(s);
                  say(r.fallen ? 'A Final Blow lands. The character falls.' : 'A Final Blow lands.');
                  return r.state;
                })
              }
            >
              A Final Blow lands
            </button>
            <button type="button" class="btn small" onClick={() => play((s) => stabilize(s, d.hp.value))}>
              Stabilize to 1 HP
            </button>
          </div>
        </Notice>
      )}

      <div class="row" style="margin-top: 1rem; gap: 1rem 1.5rem">
        <StatChip stat="armor" value={d.armor.value} showLabel />
        <StatChip stat="mov" value={d.mov.value} showLabel />
        <StatChip stat="actions" value={d.actions} showLabel />
        <StatChip stat="reactions" value={d.reactions} showLabel />
        <StatChip stat="weight" value={`${d.weight}/${d.capacity.value}`} showLabel />
        <span class="row" style="gap: 0.4rem">
          <span class="small muted">Fatigue</span>
          <Stepper label="Fatigue" value={c.state.fatigue} min={0} max={12} minReason="No Fatigue." onChange={(n) => play((s) => ({ ...s, fatigue: n }))} />
          {c.state.fatigue > 0 && <span class="small" style="color: var(--warn)">Rolls {fatiguePenalty(c.state.fatigue)}</span>}
        </span>
      </div>
      {c.state.concentration && (
        <p class="row" style="margin: 0.75rem 0 0">
          <StatChip stat="concentration" value="1" showLabel />
          <span>
            Holding <strong>{c.state.concentration}</strong>
          </span>
          <button type="button" class="btn small" onClick={() => play((s) => setConcentration(s, null))}>
            End it
          </button>
        </p>
      )}
    </section>
  );
}

function Roller({ c, d, play, rollWith }: SheetProps & { last: RollEntry[] }): JSX.Element {
  const [mode, setMode] = useState<RollMode>('ordinary');
  const [mod, setMod] = useState(0);
  const [target, setTarget] = useState<string>('');
  const [useGrace, setUseGrace] = useState(false);
  const blinded = c.state.conditions.blinded?.active;

  const go = (label: string, base: number, notes: string[] = []) => {
    let bonus = 0;
    const all = [...notes];
    if (useGrace && c.state.grace > 0) {
      play((s) => {
        const g = spendAllGrace(s);
        bonus = g.bonus;
        return g.state;
      });
      all.push(`Grace +${bonus || c.state.grace}.`);
      bonus = bonus || c.state.grace;
      setUseGrace(false);
    }
    const fat = fatiguePenalty(c.state.fatigue);
    if (fat !== 0) all.push(`Fatigue ${fat}.`);
    if (mod !== 0) all.push(`Extra ${signed(mod)}.`);
    const t = target.trim() === '' ? null : Number(target);
    rollWith(label, base + bonus + fat + mod, { mode, target: Number.isFinite(t as number) ? t : null, notes: all });
  };

  return (
    <section class="panel sheet-section no-print" aria-labelledby="roll-h">
      <h2 id="roll-h" style="margin-top: 0">
        Roll
      </h2>
      <div class="filters">
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
        <label class="field" style="max-width: 7rem">
          <span>Extra</span>
          <input class="input" type="number" min={-30} max={30} value={mod} onInput={(e) => setMod(Math.max(-30, Math.min(30, Number((e.target as HTMLInputElement).value) || 0)))} />
        </label>
        <label class="field" style="max-width: 8rem">
          <span>Target (optional)</span>
          <input class="input" type="number" min={0} max={60} value={target} onInput={(e) => setTarget((e.target as HTMLInputElement).value)} />
        </label>
        <label class="check">
          <input type="checkbox" checked={useGrace} disabled={c.state.grace === 0} onChange={() => setUseGrace(!useGrace)} />
          Spend all Grace ({c.state.grace})
        </label>
        <button type="button" class="btn" onClick={() => go('Flat roll', 0)}>
          Roll with no attribute
        </button>
      </div>
      {blinded && <p class="small" style="color: var(--warn)">You are Blinded. Your rolls have Disadvantage. Set the dice above to match.</p>}
      <p class="small muted">Advantage and Disadvantage do not stack. A source of each cancels the other, so pick one setting.</p>
      <div class="attr-grid">
        {ATTR_IDS.map((a) => (
          <button key={a} type="button" class="attr-roll" onClick={() => go(`${ATTR_NAMES[a]} check`, d.attrs[a].total)}>
            <span class="attr-id">{a}</span>
            <span class="num attr-val">{signed(d.attrs[a].total)}</span>
            <span class="small muted">{ATTR_NAMES[a]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RestPanel({ c, d, play, say }: SheetProps): JSX.Element {
  const [minutes, setMinutes] = useState(60);
  const [hours, setHours] = useState(8);
  const [active, setActive] = useState(false);
  const ctx: RecoveryContext = {
    level: d.level, maxHp: d.hp.value, maxMana: d.mana.value, hasMana: d.hasMana,
    restHpBonus: d.rest.hpBonus, restManaBonus: d.rest.manaBonus, sleepHpBonus: d.rest.sleepHpBonus, uses: d.uses,
  };
  const note = (lines: string[], head: string) => say(`${head} ${lines.join(' ')}`.trim());

  return (
    <section class="panel sheet-section no-print" aria-labelledby="rest-h">
      <h2 id="rest-h" style="margin-top: 0">
        Rest, sleep and time
      </h2>
      <div class="rest-grid">
        <div class="stack">
          <label class="field" style="max-width: 10rem">
            <span>Rest minutes</span>
            <input class="input" type="number" min={1} max={600} value={minutes} onInput={(e) => setMinutes(Math.max(1, Math.min(600, Number((e.target as HTMLInputElement).value) || 1)))} />
          </label>
          <label class="check">
            <input type="checkbox" checked={active} onChange={() => setActive(!active)} />
            I did something meaningful since the last Rest
          </label>
          <button
            type="button"
            class="btn"
            onClick={() =>
              play((s) => {
                const r = applyRest(s, ctx, minutes, { meaningfulActivity: active });
                note(r.log, `Rest: +${r.hpGained} HP, +${r.manaGained} Mana.`);
                return r.state;
              })
            }
          >
            Rest
          </button>
          {c.state.restLocked && <p class="small muted">Two Rests in a row count as one until you do something meaningful.</p>}
        </div>
        <div class="stack">
          <label class="field" style="max-width: 10rem">
            <span>Sleep hours</span>
            <input class="input" type="number" min={1} max={16} value={hours} onInput={(e) => setHours(Math.max(1, Math.min(16, Number((e.target as HTMLInputElement).value) || 1)))} />
          </label>
          <button
            type="button"
            class="btn"
            onClick={() =>
              play((s) => {
                const r = applySleep(s, ctx, hours);
                note(r.log, `Sleep: +${r.hpGained} HP, +${r.manaGained} Mana.`);
                return r.state;
              })
            }
          >
            Sleep
          </button>
          <button type="button" class="btn" onClick={() => play((s) => applyNewDay(s, d.uses))}>
            A new day begins
          </button>
        </div>
        <div class="stack">
          <button type="button" class="btn" onClick={() => play((s) => applyTurnStart(s, d.uses))}>
            Start of a Turn
          </button>
          <button type="button" class="btn" onClick={() => play((s) => applySceneStart(s, d.uses))}>
            Start of a Scene
          </button>
          <button type="button" class="btn" onClick={() => play((s) => applyEncounterStart(s, d.uses))}>
            Start of an Encounter
          </button>
        </div>
      </div>
      <p class="small muted" style="margin-bottom: 0">
        These buttons recharge the uses listed under Features. Nothing here changes your build.
      </p>
    </section>
  );
}

export function Overview(props: SheetProps & { last: RollEntry[] }): JSX.Element {
  const { c, last } = props;
  const active = Object.entries(c.state.conditions).filter(([, s]) => s.active || s.meter > 0);
  return (
    <div class="stack">
      <Vitals {...props} />
      {active.length > 0 && (
        <section class="panel sheet-section" aria-labelledby="cond-h">
          <h2 id="cond-h" style="margin-top: 0">
            Conditions now
          </h2>
          <ul class="plain">
            {active.map(([id, s]) => (
              <li key={id}>
                <strong>{CONDITION_BY_ID[id]?.name ?? id}</strong>{' '}
                <span class="small muted">
                  {s.active ? `active${s.stacks > 1 ? `, ${s.stacks} stacks` : ''}${s.timer !== null ? `, ${s.timer} left` : ''}` : `meter ${s.meter}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Roller {...props} />
      <section class="panel no-print" aria-labelledby="log-h">
        <h2 id="log-h" style="margin-top: 0">
          Roll log
        </h2>
        <div role="log" aria-live="polite">
          {last.length === 0 ? <p class="muted small" style="margin: 0">No rolls yet.</p> : last.map((e) => <RollLine key={e.id} e={e} />)}
        </div>
      </section>
      <RestPanel {...props} />
    </div>
  );
}
