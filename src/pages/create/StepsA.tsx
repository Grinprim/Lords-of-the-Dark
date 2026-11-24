import type { JSX } from 'preact';
import { ATTR_IDS, ATTR_NAMES, ATTR_ROLE, AttrId } from '../../data/types';
import { ATTR_MAX, ATTR_MIN } from '../../data/progression';
import { SPECIES } from '../../data/species';
import { CLASSES } from '../../data/classes';
import { SPECIES_BY_ID } from '../../data/species';
import type { Character } from '../../engine/character';
import type { Derived } from '../../engine/derive';
import { Choice, NumberField, Stepper, TextField } from '../../components/forms';
import { A, Notice, StatusBadge } from '../../components/common';

export interface StepProps {
  c: Character;
  d: Derived;
  update: (fn: (c: Character) => void) => void;
}

export function StepBasics({ c, update }: StepProps): JSX.Element {
  return (
    <div class="stack">
      <div class="grid-auto">
        <TextField label="Character name" value={c.name} maxLength={80} onInput={(v) => update((x) => void (x.name = v))} />
        <TextField label="Player" value={c.player} maxLength={80} onInput={(v) => update((x) => void (x.player = v))} />
      </div>
      <TextField label="Concept" value={c.concept} maxLength={300} placeholder="One line about who this character is." onInput={(v) => update((x) => void (x.concept = v))} />
      <NumberField
        label="Level"
        min={1}
        max={30}
        value={c.level}
        onChange={(n) => update((x) => void (x.level = n))}
        hint="Level opens Paths, Careers, spell tiers and more. Use the level-up flow to see what each level gives."
      />
      <p class="small muted">
        Changed your mind about a level later? <A to="/create/levelup">Use the level-up flow</A>. It saves a snapshot first.
      </p>
    </div>
  );
}

export function StepSpecies({ c, update }: StepProps): JSX.Element {
  const human = SPECIES_BY_ID.human;
  const picked = new Set(c.humanAttrs);
  return (
    <div class="stack">
      <fieldset class="plain-fieldset">
        <legend class="eyebrow">Species</legend>
        <div class="choice-grid">
          {SPECIES.map((s) => (
            <Choice
              key={s.id}
              name="species"
              title={s.name}
              checked={c.speciesId === s.id}
              onChange={() =>
                update((x) => {
                  x.speciesId = s.id;
                  if (s.id !== 'human') {
                    x.humanAttrs = [];
                    x.humanFeature = null;
                  }
                  if (s.id !== 'dragonkin') x.dragon = { ...x.dragon, form: 'normal', properties: [] };
                })
              }
              badge={s.features.some((f) => f.status === 'owner-review') ? <StatusBadge status="owner-review" /> : undefined}
            >
              {s.chooseThree ? '+1 to three attributes of your choice' : Object.entries(s.mods).map(([a, v]) => `${(v as number) >= 0 ? '+' : ''}${v} ${a}`).join(', ')}
              <br />
              {s.summary}
            </Choice>
          ))}
        </div>
      </fieldset>

      {c.speciesId === 'human' && (
        <div class="panel">
          <h3>Human choices</h3>
          <fieldset class="plain-fieldset">
            <legend class="small">
              Pick three different attributes for +1 each. {picked.size} of 3 chosen.
            </legend>
            <div class="row">
              {ATTR_IDS.map((a) => {
                const on = picked.has(a);
                const full = picked.size >= 3 && !on;
                return (
                  <label key={a} class="check tag-check" data-checked={on} title={full ? 'Three are already chosen. Clear one first.' : ATTR_NAMES[a]}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={() =>
                        update((x) => {
                          x.humanAttrs = on ? x.humanAttrs.filter((y) => y !== a) : [...x.humanAttrs, a];
                        })
                      }
                    />
                    {a}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset class="plain-fieldset" style="margin-top: 1rem">
            <legend class="small">Pick one option.</legend>
            <div class="choice-grid">
              {human.features.map((f) => (
                <Choice
                  key={f.id}
                  name="human-feature"
                  title={f.name}
                  checked={c.humanFeature === f.id}
                  onChange={() => update((x) => void (x.humanFeature = f.id))}
                  badge={f.status !== 'approved' ? <StatusBadge status={f.status} /> : undefined}
                >
                  {f.text}
                </Choice>
              ))}
            </div>
          </fieldset>
        </div>
      )}
      <p class="small muted">
        Want the full detail? Read the <A to="/species">species catalogue</A>.
      </p>
    </div>
  );
}

export function StepClass({ c, update }: StepProps): JSX.Element {
  return (
    <div class="stack">
      <fieldset class="plain-fieldset">
        <legend class="eyebrow">Class</legend>
        <div class="choice-grid">
          {CLASSES.map((k) => (
            <Choice key={k.id} name="class" title={k.name} checked={c.classId === k.id} onChange={() => update((x) => void (x.classId = k.id))}>
              +1 {k.attrs[0]} and +1 {k.attrs[1]}
              <br />
              {k.summary}
              {k.grantsSpellcasting && (
                <>
                  <br />
                  <em>Grants spellcasting.</em>
                </>
              )}
            </Choice>
          ))}
        </div>
      </fieldset>
      <p class="small muted">
        Changing class may close some Careers you picked. The Careers step will tell you. See the <A to="/classes">class catalogue</A> for every ability.
      </p>
    </div>
  );
}

export function StepAttributes({ c, d, update }: StepProps): JSX.Element {
  const left = d.ap.remaining;
  return (
    <div class="stack">
      <div class="row-between">
        <p style="margin: 0">
          <strong class="num" style="font-size: 1.4rem; font-family: var(--font-serif)">
            {left}
          </strong>{' '}
          of {d.ap.total} Attribute Points left.
        </p>
        <button type="button" class="btn small" onClick={() => update((x) => void (x.attrs = Object.fromEntries(ATTR_IDS.map((a) => [a, 0])) as Record<AttrId, number>))}>
          Clear spent points
        </button>
      </div>
      {left < 0 && <Notice kind="error" title="Over budget">You spent {-left} more than you have. Lower some attributes.</Notice>}
      <div class="table-wrap">
        <table class="attr-table">
          <caption class="visually-hidden">Attributes</caption>
          <thead>
            <tr>
              <th scope="col">Attribute</th>
              <th scope="col">Spend</th>
              <th scope="col" class="num">Species</th>
              <th scope="col" class="num">Class</th>
              <th scope="col" class="num">Path</th>
              <th scope="col" class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {ATTR_IDS.map((a) => {
              const row = d.attrs[a];
              const noPoints = left <= 0;
              const capped = row.ordinary >= ATTR_MAX;
              return (
                <tr key={a}>
                  <th scope="row">
                    {a} <span class="muted small">{ATTR_NAMES[a]}</span>
                    <div class="small muted" style="font-weight: 400; text-transform: none; letter-spacing: 0">{ATTR_ROLE[a]}</div>
                  </th>
                  <td>
                    <Stepper
                      label={`${ATTR_NAMES[a]} points`}
                      value={c.attrs[a]}
                      min={0}
                      max={noPoints || capped ? c.attrs[a] : 99}
                      minReason="Nothing spent here."
                      maxReason={capped ? `Ordinary attributes stop at ${ATTR_MAX}.` : 'No Attribute Points left.'}
                      onChange={(n) => update((x) => void (x.attrs[a] = n))}
                    />
                  </td>
                  <td class="num">{row.species || '-'}</td>
                  <td class="num">{row.klass || '-'}</td>
                  <td class="num">{row.path || '-'}</td>
                  <td class="num">
                    <strong>{row.total}</strong>
                    {row.ordinary < ATTR_MIN && <span class="badge owner-review">Below {ATTR_MIN}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="small muted">
        Ordinary attributes stop at {ATTR_MAX}. Only a Path can push past it. The floor is {ATTR_MIN}. Attributes never add to damage on their own.
      </p>
    </div>
  );
}
