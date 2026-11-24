import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { RECHARGE_LABEL } from '../../data/types';
import { SLOT_LABEL } from '../../data/equipment';
import { SPELL_BY_ID } from '../../data/magic';
import { SCHOOL_BY_ID } from '../../data/magic';
import { TIER_LABEL } from '../../data/progression';
import { DRAGON_FORMS, MONK_TECHNIQUES, MONK_TIERS, SHAMAN_ASPECTS } from '../../data/spiritual';
import { COMPANION_ABILITIES, COMPANION_SIZE_BY_ID } from '../../data/companions';
import { newId } from '../../engine/character';
import { slotsFor } from '../../engine/derive';
import { activationCost, payUpkeep, transformTo, upkeepCost } from '../../engine/transform';
import { resolvedMana, setConcentration, spendMana, spendUse, usesLeft } from '../../engine/recovery';
import { A, Notice, StatusBadge } from '../../components/common';
import { StatChip } from '../../components/icons';
import { TextField } from '../../components/forms';
import { snapshotNow } from '../../store/store';
import { SheetProps, signed } from './shared';

const th = 'text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)';

// ---- Equipment ----

export function EquipmentTab({ c, d }: SheetProps): JSX.Element {
  const slots = slotsFor(c);
  const worn = new Set(d.equipped.map((e) => e.view.item.uid));
  const pack = c.items.filter((it) => !worn.has(it.uid));
  const band = d.load.band === 'overloaded' ? 'Overloaded. No movement and no Dodge.' : d.load.movModifier > 0 ? 'Light load.' : d.load.movModifier < 0 ? 'Heavy load.' : 'Normal load.';
  return (
    <div class="stack">
      <div class="row-between">
        <p class="row" style="margin: 0; gap: 1rem">
          <StatChip stat="weight" value={`${d.weight} / ${d.capacity.value}`} big showLabel />
          <span class="muted">{band}</span>
        </p>
        <A to="/create/gear" class="btn small no-print">
          Change gear
        </A>
      </div>
      {d.ignoredItems.map((ig) => (
        <Notice key={ig.uid} kind="warn" title="Not counted">
          {ig.reason}
        </Notice>
      ))}
      <section class="sheet-section" aria-labelledby="slot-h">
        <h2 id="slot-h">Worn and held</h2>
        <div class="table-wrap">
          <table>
            <caption class="visually-hidden">Equipped items by slot</caption>
            <thead>
              <tr>
                <th scope="col">Slot</th>
                <th scope="col">Item</th>
                <th scope="col">ATK</th>
                <th scope="col">DMG</th>
                <th scope="col">Armor</th>
                <th scope="col">Block</th>
                <th scope="col">W</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const e = d.equipped.find((x) => x.slot === slot);
                const v = e?.view;
                return (
                  <tr key={slot}>
                    <th scope="row" style={th}>
                      {SLOT_LABEL[slot]}
                    </th>
                    <td>
                      {v ? (
                        <>
                          <strong>{v.name}</strong>
                          {v.suspended && <span class="small muted"> (suspended)</span>}
                          {v.warnings.map((w, i) => (
                            <div key={i} class="small" style="color: var(--warn)">
                              {w}
                            </div>
                          ))}
                        </>
                      ) : (
                        <span class="muted">Empty</span>
                      )}
                    </td>
                    <td class="num">{v?.atk !== undefined ? signed(v.atk) : ''}</td>
                    <td class="num">{v?.dmg ?? ''}</td>
                    <td class="num">{v?.armor ?? ''}</td>
                    <td class="num">{v?.block ?? ''}</td>
                    <td class="num">{v ? v.w : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section class="sheet-section" aria-labelledby="pack-h">
        <h2 id="pack-h">Pack ({pack.length})</h2>
        {pack.length === 0 ? (
          <p class="muted">Nothing in the pack. Pack items add no weight.</p>
        ) : (
          <ul class="plain">
            {pack.map((it) => (
              <li key={it.uid} style="border-bottom: 1px solid var(--line); padding: 0.35rem 0">
                <strong>{it.name}</strong> <span class="small muted">{it.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div class="write-lines" aria-hidden="true" />
    </div>
  );
}

// ---- Magic and spiritual arts ----

export function MagicTab(props: SheetProps): JSX.Element {
  const { c, d, play, edit, rollWith, say } = props;
  const mana = resolvedMana(c.state, d.mana.value);
  const known = c.spells.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const hasMonk = c.careers.some((k) => k.careerId === 'monk');
  const hasShaman = c.careers.some((k) => k.careerId === 'shaman');
  const dragon = c.speciesId === 'dragonkin';
  const [log, setLog] = useState<string[]>([]);

  const pay = (name: string, cost: number, conc: boolean) => {
    const ok = play((s) => {
      const r = spendMana(s, d.mana.value, cost);
      if (!r) return null;
      return conc ? setConcentration(r, name) : r;
    });
    say(ok ? `${name}: spent ${cost} Mana.${conc ? ' You are concentrating on it.' : ''}` : `${name} costs ${cost} Mana. You have ${mana}.`);
  };

  if (!d.hasMana && !d.spellcasting && !hasMonk && !hasShaman && !dragon && c.companions.length === 0) {
    return (
      <Notice kind="info" title="No magic here">
        This character has no spells, techniques, Aspects, forms or companions. Add them in the <A to="/create/magic">creator</A>.
      </Notice>
    );
  }

  const doTransform = (id: string) => {
    const r = transformTo(c, id);
    if (r.ok) edit((x) => void Object.assign(x, r.character));
    setLog(r.log);
  };

  return (
    <div class="stack">
      {d.hasMana && (
        <p class="row" style="margin: 0; gap: 1rem">
          <StatChip stat="mana" value={`${mana} / ${d.mana.value}`} big showLabel />
          {d.spellcasting && <StatChip stat="atk" value={signed(d.attack.spell)} big showLabel title="Spell attack bonus" />}
          {c.state.concentration && (
            <span class="row">
              <StatChip stat="concentration" value="1" showLabel />
              <strong>{c.state.concentration}</strong>
              <button type="button" class="btn small" onClick={() => play((s) => setConcentration(s, null))}>
                End it
              </button>
            </span>
          )}
        </p>
      )}

      {d.spellcasting && (
        <section class="sheet-section" aria-labelledby="sp-h">
          <h2 id="sp-h">Spells ({known.length})</h2>
          {known.length === 0 ? (
            <p class="muted">No spells learned. Pick them in the creator.</p>
          ) : (
            <ul class="plain list-rows">
              {known.map((s) => (
                <li key={s.id} class="spell-row">
                  <div>
                    <A to={`/magic/spells/${s.id}`}>
                      <strong class="serif">{s.name}</strong>
                    </A>{' '}
                    <span class="small muted">
                      {TIER_LABEL[s.tier]}, {SCHOOL_BY_ID[s.schoolId]?.name}. {s.base.mana} Mana, {s.base.actions} {s.base.actions === 1 ? 'Action' : 'Actions'}
                      {s.base.concentration ? ', concentration' : ''}.
                    </span>
                    <div class="small">{s.base.effect}</div>
                    {s.base.dmg !== null && (
                      <div class="small muted">
                        ATK {signed((s.base.atk ?? 0) + d.attack.spell)}, DMG {s.base.dmg}
                        {s.base.dmgType ? ` ${s.base.dmgType}` : ''}. Range {s.base.range}.
                      </div>
                    )}
                  </div>
                  <span class="row no-print" style="flex-wrap: nowrap; align-self: start">
                    <button type="button" class="btn small primary" disabled={mana < s.base.mana} title={mana < s.base.mana ? `Needs ${s.base.mana} Mana.` : undefined} onClick={() => pay(s.name, s.base.mana, s.base.concentration)}>
                      Cast
                    </button>
                    {s.base.dmg !== null && (
                      <button type="button" class="btn small" onClick={() => rollWith(`${s.name} attack`, (s.base.atk ?? 0) + d.attack.spell, { notes: [`Spell attack ${signed(d.attack.spell)}.`] })}>
                        Roll
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {hasMonk && (
        <section class="sheet-section" aria-labelledby="mk-h">
          <h2 id="mk-h">Monk</h2>
          <label class="check no-print">
            <input type="checkbox" checked={c.monk.manifested} onChange={() => edit((x) => void (x.monk.manifested = !x.monk.manifested))} />
            Manifestation is active (it uses a weapon slot)
          </label>
          <ul class="plain list-rows">
            {c.monk.techniques.map((id) => MONK_TECHNIQUES.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).map((t) => (
              <li key={t.id} class="spell-row">
                <div>
                  <strong class="serif">{t.name}</strong>{' '}
                  <span class="small muted">
                    {MONK_TIERS.find((m) => m.id === t.tier)?.name}. {t.mana === 0 ? 'Free' : `${t.mana} Mana`}
                    {t.concentration ? ', concentration' : ''}.
                  </span>
                  <div class="small">{t.text}</div>
                </div>
                <button type="button" class="btn small primary no-print" onClick={() => (t.mana > 0 ? pay(t.name, t.mana, t.concentration) : say(`${t.name} is free to use.`))}>
                  Use
                </button>
              </li>
            ))}
          </ul>
          {c.monk.techniques.length === 0 && <p class="muted">No techniques yet.</p>}
        </section>
      )}

      {hasShaman && (
        <section class="sheet-section" aria-labelledby="sh-h">
          <h2 id="sh-h">Shaman Aspects</h2>
          <div class="filters no-print">
            <label class="field">
              <span>Active Aspect</span>
              <select class="input" value={c.shaman.active ?? ''} onChange={(e) => edit((x) => void (x.shaman.active = (e.target as HTMLSelectElement).value || null))}>
                <option value="">None</option>
                {c.shaman.aspects.map((id) => (
                  <option key={id} value={id}>
                    {SHAMAN_ASPECTS.find((a) => a.id === id)?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
            <label class="field" style="max-width: 8rem">
              <span>Rank</span>
              <select class="input" value={c.shaman.activeRank} onChange={(e) => edit((x) => void (x.shaman.activeRank = Number((e.target as HTMLSelectElement).value)))}>
                {[1, 2, 3].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul class="plain">
            {c.shaman.aspects.map((id) => SHAMAN_ASPECTS.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a).map((a) => (
              <li key={a.id} style="border-bottom: 1px solid var(--line); padding: 0.35rem 0">
                <strong>{a.name}</strong>{' '}
                <span class="small muted">
                  {a.stat} {a.values.join(' / ')} by rank. {a.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dragon && (
        <section class="sheet-section" aria-labelledby="dr-h">
          <h2 id="dr-h">Dragonkin form</h2>
          <p>
            Current form: <strong>{DRAGON_FORMS.find((f) => f.id === c.dragon.form)?.name ?? c.dragon.form}</strong>. Forms are provisional in the specification.
          </p>
          <div class="row no-print">
            {DRAGON_FORMS.filter((f) => !f.exceptional && f.id !== c.dragon.form).map((f) => {
              const cost = f.id === 'normal' ? (DRAGON_FORMS.find((x) => x.id === c.dragon.form)?.revert ?? 0) : activationCost(c, f.id);
              const closed = f.id !== 'normal' && d.level < f.level;
              return (
                <button key={f.id} type="button" class="btn small" disabled={closed} title={closed ? `Opens at level ${f.level}.` : undefined} onClick={() => doTransform(f.id)}>
                  {f.id === 'normal' ? 'Revert' : `Take ${f.name}`} ({cost} Mana)
                </button>
              );
            })}
            {c.dragon.form !== 'normal' && (
              <button
                type="button"
                class="btn small"
                onClick={() => {
                  const r = payUpkeep(c);
                  edit((x) => void Object.assign(x, r.character));
                  setLog(r.log);
                }}
              >
                Pay upkeep ({upkeepCost(c, c.dragon.form)} Mana)
              </button>
            )}
          </div>
          {log.length > 0 && (
            <p class="small" role="status" aria-live="polite">
              {log.join(' ')}
            </p>
          )}
        </section>
      )}

      {c.companions.length > 0 && (
        <section class="sheet-section" aria-labelledby="co-h">
          <h2 id="co-h">Companions and summons</h2>
          <ul class="plain">
            {c.companions.map((k) => (
              <li key={k.id} style="border-bottom: 1px solid var(--line); padding: 0.4rem 0">
                <strong class="serif">{k.name || 'Unnamed'}</strong>{' '}
                <span class="small muted">
                  {k.kind === 'companion' ? 'Companion' : 'Summon'}, {COMPANION_SIZE_BY_ID[k.size]?.name ?? k.size}
                </span>
                {k.abilities.length > 0 && <div class="small">{k.abilities.map((a) => COMPANION_ABILITIES.find((x) => x.id === a)?.name ?? a).join(', ')}</div>}
                {k.notes && <div class="small muted">{k.notes}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---- Features ----

const ORIGIN_LABEL: Record<string, string> = { species: 'Species', class: 'Class', career: 'Career', path: 'Paths', trait: 'Traits', spiritual: 'Spiritual Arts', form: 'Form' };

export function FeaturesTab({ c, d, play }: SheetProps): JSX.Element {
  const origins = Object.keys(ORIGIN_LABEL).filter((o) => d.features.some((f) => f.origin === o));
  return (
    <div class="stack">
      {d.uses.length > 0 && (
        <section class="sheet-section" aria-labelledby="use-h">
          <h2 id="use-h">Uses</h2>
          <ul class="plain">
            {d.uses.map((u) => {
              const left = usesLeft(c.state, u);
              return (
                <li key={u.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.4rem 0">
                  <span>
                    <strong>{u.name}</strong> <span class="small muted">{RECHARGE_LABEL[u.per]}</span>
                  </span>
                  <span class="row">
                    <span class="num">
                      {left} of {u.count} left
                    </span>
                    <button type="button" class="btn small no-print" disabled={left === 0} onClick={() => play((s) => spendUse(s, u))}>
                      Spend one
                    </button>
                    <button type="button" class="btn small no-print" disabled={left === u.count} onClick={() => play((s) => ({ ...s, spent: { ...s.spent, [u.id]: 0 } }))}>
                      Restore
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {origins.map((o) => (
        <section key={o} class="sheet-section" aria-labelledby={`f-${o}`}>
          <h2 id={`f-${o}`}>{ORIGIN_LABEL[o]}</h2>
          <ul class="plain">
            {d.features.filter((f) => f.origin === o).map((f) => (
              <li key={f.id + f.source} style="border-bottom: 1px solid var(--line); padding: 0.45rem 0">
                <div class="row" style="gap: 0.5rem">
                  <strong class="serif">{f.name}</strong>
                  <span class="small muted">{f.source}</span>
                  {f.status !== 'approved' && <StatusBadge status={f.status} />}
                </div>
                <div class="small">{f.text}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {d.conditional.length > 0 && (
        <section class="sheet-section" aria-labelledby="cond-eff-h">
          <h2 id="cond-eff-h">Bonuses that apply only sometimes</h2>
          <p class="small muted">These are never added to the totals above. They apply when the stated case is true.</p>
          <ul class="plain">
            {d.conditional.map((e, i) => (
              <li key={i} style="border-bottom: 1px solid var(--line); padding: 0.35rem 0">
                <strong>
                  {signed(e.v)} {e.label ?? e.stat}
                </strong>{' '}
                <span class="small muted">{e.when}. From {e.source}.</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---- Notes, overrides, snapshots ----

const OVERRIDE_STATS: [string, string][] = [
  ['hp', 'Health'], ['armor', 'Armor'], ['mana', 'Mana'], ['mov', 'Movement'], ['capacity', 'Capacity'],
];

export function NotesTab({ c, d, edit, say }: SheetProps): JSX.Element {
  const [stat, setStat] = useState('hp');
  const [value, setValue] = useState(0);
  const [reason, setReason] = useState('');
  return (
    <div class="stack">
      <section class="sheet-section" aria-labelledby="nt-h">
        <h2 id="nt-h">Notes</h2>
        <TextField label="Character notes" multiline value={c.notes} maxLength={6000} onInput={(v) => edit((x) => void (x.notes = v))} />
        <div class="write-lines" aria-hidden="true" />
      </section>

      <section class="sheet-section no-print" aria-labelledby="ov-h">
        <h2 id="ov-h">Narrator overrides</h2>
        <p class="muted">
          A Narrator may set a total by decision. An override replaces the computed total and needs a written reason. The computed total stays visible below so you can see what changed.
        </p>
        {d.overridden.length > 0 && (
          <ul class="plain">
            {d.overridden.map((o, i) => (
              <li key={i}>
                <strong>{OVERRIDE_STATS.find(([id]) => id === o.stat)?.[1] ?? o.stat}</strong>: {o.from} became {o.to}. <span class="muted">{o.reason}</span>
              </li>
            ))}
          </ul>
        )}
        <ul class="plain">
          {c.overrides.map((o) => (
            <li key={o.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.4rem 0">
              <span>
                {OVERRIDE_STATS.find(([id]) => id === o.stat)?.[1] ?? o.stat} set to <strong>{o.value}</strong>. <span class="muted">{o.reason || 'No reason, so it is ignored.'}</span>
              </span>
              <button type="button" class="btn small danger" onClick={() => edit((x) => void (x.overrides = x.overrides.filter((y) => y.id !== o.id)))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div class="filters" style="align-items: flex-end; margin-top: 0.75rem">
          <label class="field">
            <span>Total</span>
            <select class="input" value={stat} onChange={(e) => setStat((e.target as HTMLSelectElement).value)}>
              {OVERRIDE_STATS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label class="field" style="max-width: 7rem">
            <span>New value</span>
            <input class="input" type="number" min={0} max={999} value={value} onInput={(e) => setValue(Number((e.target as HTMLInputElement).value) || 0)} />
          </label>
          <TextField label="Reason (required)" value={reason} maxLength={200} onInput={setReason} width="22rem" />
          <button
            type="button"
            class="btn"
            disabled={reason.trim() === ''}
            title={reason.trim() === '' ? 'Write a reason first.' : undefined}
            onClick={() => {
              edit((x) => void x.overrides.push({ id: newId('o'), stat, value, reason: reason.trim() }));
              setReason('');
            }}
          >
            Add override
          </button>
        </div>
        {reason.trim() === '' && <p class="small muted">The Add button stays off until a reason is written.</p>}
      </section>

      <section class="sheet-section no-print" aria-labelledby="snap-h">
        <h2 id="snap-h">Snapshots</h2>
        <p class="muted">A snapshot is a saved copy of this character you can restore later. One is made automatically before a level-up, a replace or a delete.</p>
        <div class="row">
          <button
            type="button"
            class="btn"
            onClick={async () => {
              await snapshotNow(c.id, 'Manual snapshot');
              say('Snapshot saved. Restore it from the Library.');
            }}
          >
            Save a snapshot now
          </button>
          <A to="/library" class="btn">
            Open the Library
          </A>
        </div>
      </section>
    </div>
  );
}
