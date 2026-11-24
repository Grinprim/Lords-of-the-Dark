import type { JSX } from 'preact';
import { ATTR_IDS, ATTR_NAMES } from '../../data/types';
import { SLOT_LABEL } from '../../data/equipment';
import { SPELL_BY_ID } from '../../data/magic';
import { TIER_LABEL } from '../../data/progression';
import { RECHARGE_LABEL } from '../../data/types';
import { CONDITIONS, thresholdFor } from '../../engine/conditions';
import { slotsFor } from '../../engine/derive';
import { resolvedHp, resolvedMana } from '../../engine/recovery';
import { A, Notice } from '../../components/common';
import { SheetProps, signed } from './shared';

const th = 'text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)';

function Box({ label, value, blank }: { label: string; value: string | number; blank?: boolean }): JSX.Element {
  return (
    <div class="print-box">
      <span class="small">{label}</span>
      <strong class="num">{value}</strong>
      {blank && <span class="print-write" aria-hidden="true" />}
    </div>
  );
}

/** A plain, ink-friendly sheet. Open it, then print or save as PDF from the browser. */
export function PrintSheet({ c, d }: Pick<SheetProps, 'c' | 'd'>): JSX.Element {
  const slots = slotsFor(c);
  const known = c.spells.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const hp = resolvedHp(c.state, d.hp.value);
  const mana = resolvedMana(c.state, d.mana.value);
  return (
    <div class="print-sheet">
      <div class="no-print stack" style="margin-bottom: 1.5rem">
        <Notice kind="info" title="Before you print">
          This page is plain on purpose: white paper, black ink, no menus. Use your browser's print command, or choose Save as PDF there. A printed copy, a scan or a PDF that has been printed again does not carry the data inside it, so it cannot be imported later. For a copy you can import, use Save as PDF on the sheet or a backup from the Library.
        </Notice>
        <div class="row">
          <button type="button" class="btn primary" onClick={() => window.print()}>
            Print this page
          </button>
          <A to="/sheet" class="btn">
            Back to the sheet
          </A>
        </div>
      </div>

      <header class="print-head">
        <h1>{c.name || 'Unnamed character'}</h1>
        <p>
          {d.speciesName} {d.className}, level {d.level}.{c.player ? ` Player: ${c.player}.` : ''}
        </p>
        {c.concept && <p>{c.concept}</p>}
      </header>

      <section class="sheet-section">
        <div class="print-boxes">
          <Box label="Health" value={`${hp} / ${d.hp.value}`} blank />
          {d.hasMana && <Box label="Mana" value={`${mana} / ${d.mana.value}`} blank />}
          <Box label="Armor" value={d.armor.value} />
          <Box label="Movement" value={d.mov.value} />
          <Box label="Actions" value={d.actions} />
          <Box label="Reactions" value={d.reactions} />
          <Box label="Grace (start / cap)" value={`${d.graceStart} / ${d.graceCap}`} blank />
          <Box label="Weight / capacity" value={`${d.weight} / ${d.capacity.value}`} />
          <Box label="Fatigue" value={c.state.fatigue} blank />
          <Box label="Final Blow" value={`${c.state.finalBlow ?? d.finalBlowMax} / ${d.finalBlowMax}`} blank />
        </div>
      </section>

      <section class="sheet-section">
        <h2>Attributes</h2>
        <div class="table-wrap">
<table>
          <thead>
            <tr>
              {ATTR_IDS.map((a) => (
                <th key={a} scope="col" title={ATTR_NAMES[a]}>
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {ATTR_IDS.map((a) => (
                <td key={a} class="num">
                  {signed(d.attrs[a].total)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
</div>
      </section>

      <section class="sheet-section">
        <h2>Attacks and defense</h2>
        <div class="table-wrap">
<table>
          <thead>
            <tr>
              <th scope="col">Attack</th>
              <th scope="col">ATK</th>
              <th scope="col">DMG</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {d.attacks.map((a, i) => (
              <tr key={i}>
                <th scope="row" style={th}>
                  {a.name}
                </th>
                <td class="num">{signed(a.atk)}</td>
                <td class="num">{a.dmg}</td>
                <td>{a.note}</td>
              </tr>
            ))}
            {d.spellcasting && (
              <tr>
                <th scope="row" style={th}>
                  Spell attack
                </th>
                <td class="num">{signed(d.attack.spell)}</td>
                <td>by spell</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
</div>
        <p>
          Block {signed(d.defense.block)}. Dodge {signed(d.defense.dodge)}. Parry {signed(d.defense.parry)}.
        </p>
      </section>

      <section class="sheet-section">
        <h2>Gear</h2>
        <div class="table-wrap">
<table>
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Item</th>
              <th scope="col">ATK</th>
              <th scope="col">DMG</th>
              <th scope="col">Armor</th>
              <th scope="col">W</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const v = d.equipped.find((e) => e.slot === slot)?.view;
              return (
                <tr key={slot}>
                  <th scope="row" style={th}>
                    {SLOT_LABEL[slot]}
                  </th>
                  <td>{v?.name ?? ''}</td>
                  <td class="num">{v?.atk !== undefined ? signed(v.atk) : ''}</td>
                  <td class="num">{v?.dmg ?? ''}</td>
                  <td class="num">{v?.armor ?? ''}</td>
                  <td class="num">{v?.w ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
</div>
      </section>

      {known.length > 0 && (
        <section class="sheet-section">
          <h2>Spells</h2>
          <div class="table-wrap">
<table>
            <thead>
              <tr>
                <th scope="col">Spell</th>
                <th scope="col">Tier</th>
                <th scope="col">Mana</th>
                <th scope="col">Effect</th>
              </tr>
            </thead>
            <tbody>
              {known.map((s) => (
                <tr key={s.id}>
                  <th scope="row" style={th}>
                    {s.name}
                  </th>
                  <td>{TIER_LABEL[s.tier]}</td>
                  <td class="num">{s.base.mana}</td>
                  <td>{s.base.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </section>
      )}

      <section class="sheet-section">
        <h2>Features</h2>
        <ul class="plain">
          {d.features.map((f) => (
            <li key={f.id + f.source}>
              <strong>{f.name}</strong> ({f.source}). {f.text}
            </li>
          ))}
        </ul>
      </section>

      {d.uses.length > 0 && (
        <section class="sheet-section">
          <h2>Uses</h2>
          <ul class="plain">
            {d.uses.map((u) => (
              <li key={u.id}>
                {u.name} <span class="small">({RECHARGE_LABEL[u.per]})</span>{' '}
                {Array.from({ length: Math.min(u.count, 12) }, (_, i) => (
                  <span key={i} class="print-tick" aria-hidden="true" />
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="sheet-section">
        <h2>Condition thresholds</h2>
        <p>
          {CONDITIONS.map((def) => `${def.name} ${thresholdFor(def, d.thresholds)}`).filter((_, i, a) => a.indexOf(_) === i).join('. ')}.
        </p>
        <div class="write-lines" aria-hidden="true" />
      </section>

      <section class="sheet-section">
        <h2>Notes</h2>
        {c.notes && <p style="white-space: pre-wrap">{c.notes}</p>}
        <div class="write-lines" aria-hidden="true" />
        <div class="write-lines" aria-hidden="true" />
      </section>

      <p class="small print-foot">Lords of the Dark. Rules version {c.rulesVersion}. Totals were computed from the choices on the character.</p>
    </div>
  );
}
