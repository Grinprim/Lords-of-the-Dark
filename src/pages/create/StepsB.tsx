import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { PATHS, PATH_BY_ID } from '../../data/paths';
import { CAREER_BY_ID, CareerDef, careersForClass } from '../../data/careers';
import { PRIMARY_RANK_LEVELS, SECONDARY_RANK_LEVELS, careerRank, independentPathSlots, PATH_SLOT_LEVELS, pathMpSpent } from '../../data/progression';
import { TRAITS, ACADEMIC_FIELDS, traitRankLabel, TraitDef } from '../../data/traits';
import { PROFICIENCIES } from '../../data/equipment';
import type { Feature } from '../../data/types';
import type { CareerPick } from '../../engine/character';
import { canBuyProficiency, canBuyTraitRank, canRaisePathRank, canTakeCareer, canTakeIndependentPath } from '../../engine/validation';
import { Choice, Stepper } from '../../components/forms';
import { A, Notice, StatusBadge } from '../../components/common';
import { Icon } from '../../components/icons';
import type { StepProps } from './StepsA';

const roman = (n: number) => ['', 'I', 'II', 'III'][n] ?? String(n);

function AbilityChoice({
  name, f, checked, disabled, reason, onChange, prefix,
}: {
  name: string;
  f: Feature;
  checked: boolean;
  disabled: boolean;
  reason?: string;
  onChange: () => void;
  prefix?: string;
}): JSX.Element {
  return (
    <Choice type="checkbox" name={name} title={`${prefix ? prefix + ': ' : ''}${f.name}`} checked={checked} disabled={disabled} reason={reason} onChange={onChange} badge={f.status !== 'approved' ? <StatusBadge status={f.status} /> : undefined}>
      {f.text}
    </Choice>
  );
}

function RankPicker({
  def, pick, role, level, setPick,
}: {
  def: CareerDef;
  pick: CareerPick;
  role: 'primary' | 'secondary';
  level: number;
  setPick: (fn: (p: CareerPick) => void) => void;
}): JSX.Element {
  const rank = careerRank(role, level);
  const levels = role === 'primary' ? PRIMARY_RANK_LEVELS : SECONDARY_RANK_LEVELS;
  const toggle = (key: 'r1' | 'r2' | 'r3', id: string) =>
    setPick((p) => {
      p[key] = p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id];
    });
  const groups: { key: 'r1' | 'r2' | 'r3'; n: number; label: string; pool: { f: Feature; prefix?: string }[] }[] = [
    { key: 'r1', n: 2, label: 'Rank I. Pick two of the four basic abilities.', pool: def.basics.map((f) => ({ f })) },
    {
      key: 'r2', n: 2, label: 'Rank II. Pick two upgrades or advanced abilities.',
      pool: [...def.upgrades.map((f, i) => ({ f, prefix: `Upgrade of ${def.basics[i]?.name ?? 'a basic'}` })), ...def.advanced.map((f) => ({ f, prefix: 'Advanced' }))],
    },
    {
      key: 'r3', n: 1, label: 'Rank III. Pick one upgrade or one mastery ability.',
      pool: [...def.upgrades.map((f, i) => ({ f, prefix: `Upgrade of ${def.basics[i]?.name ?? 'a basic'}` })), ...def.mastery.map((f) => ({ f, prefix: 'Mastery' }))],
    },
  ];
  return (
    <div class="stack">
      {groups.map((g, gi) => {
        const open = rank >= gi + 1;
        const chosen = pick[g.key];
        return (
          <fieldset key={g.key} class="plain-fieldset">
            <legend class="small">
              <strong>{g.label}</strong> {chosen.length} of {g.n} chosen.
              {!open && <span class="muted"> Opens at level {levels[gi]}.</span>}
            </legend>
            <div class="choice-grid">
              {g.pool.map(({ f, prefix }) => {
                const on = chosen.includes(f.id);
                const full = chosen.length >= g.n && !on;
                const reason = !open ? `Rank ${roman(gi + 1)} opens at level ${levels[gi]}.` : full ? `You already chose ${g.n}. Clear one first.` : undefined;
                return <AbilityChoice key={f.id} name={`${role}-${g.key}`} f={f} prefix={prefix} checked={on} disabled={!open || full} reason={reason} onChange={() => toggle(g.key, f.id)} />;
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function CareerSection({ role, c, d, update }: StepProps & { role: 'primary' | 'secondary' }): JSX.Element {
  const openLevel = role === 'primary' ? 1 : 8;
  const pick = c.careers.find((k) => k.role === role);
  const def = pick ? CAREER_BY_ID[pick.careerId] : undefined;
  const label = role === 'primary' ? 'Primary Career' : 'Secondary Career';

  const setPick = (fn: (p: CareerPick) => void) =>
    update((x) => {
      const p = x.careers.find((k) => k.role === role);
      if (p) fn(p);
    });

  if (d.level < openLevel) {
    return (
      <section class="panel inset">
        <h3>{label}</h3>
        <p class="muted" style="margin: 0">
          Closed. It opens at level {openLevel}.
        </p>
      </section>
    );
  }

  if (!pick || !def) {
    const options = careersForClass(c.classId);
    return (
      <section>
        <h3>{label}</h3>
        <p class="muted">A Career is free. It grants a Path and three ranks of abilities.</p>
        <div class="choice-grid">
          {options.map((k) => {
            const el = canTakeCareer(c, d, k.id, role);
            return (
              <Choice
                key={k.id}
                name={`career-${role}`}
                title={k.name}
                checked={false}
                disabled={!el.ok}
                reason={el.reason}
                badge={k.status !== 'approved' ? <StatusBadge status={k.status} /> : undefined}
                onChange={() => update((x) => void x.careers.push({ careerId: k.id, role, r1: [], r2: [], r3: [] }))}
              >
                {k.summary}
              </Choice>
            );
          })}
        </div>
      </section>
    );
  }

  const owned = d.paths.find((p) => p.source === (role === 'primary' ? 'primary-career' : 'secondary-career'));
  const closedForClass = !def.classes.includes(c.classId);
  const grantedPath = pick.pathId ? PATH_BY_ID[pick.pathId] : undefined;
  const elsewhere = pick.pathId && (c.independentPaths.includes(pick.pathId) || c.careers.some((k) => k !== pick && k.pathId === pick.pathId));
  return (
    <section class="panel">
      <div class="row-between" style="align-items: flex-start">
        <div>
          <p class="eyebrow">{label}</p>
          <h3 style="margin: 0">{def.name}</h3>
        </div>
        <button type="button" class="btn small danger" onClick={() => update((x) => void (x.careers = x.careers.filter((k) => k.role !== role)))}>
          Change Career
        </button>
      </div>
      <p class="muted">{def.summary}</p>
      {closedForClass && <Notice kind="error" title="Closed for your class">{def.name} is closed to your class. Change Career or class.</Notice>}
      <p class="small">
        <strong>Foundation, automatic.</strong> {def.foundation.name}. {def.foundation.text}
      </p>

      <fieldset class="plain-fieldset" style="margin: 1rem 0">
        <legend class="small">
          <strong>Path this Career grants.</strong> Rank I is free.
        </legend>
        <div class="choice-grid">
          {def.paths.map((id) => (
            <Choice key={id} name={`path-${role}`} title={PATH_BY_ID[id]?.name ?? id} checked={pick.pathId === id} onChange={() => setPick((p) => void (p.pathId = id))}>
              {PATH_BY_ID[id]?.summary}
            </Choice>
          ))}
        </div>
      </fieldset>
      {elsewhere && (
        <Notice kind="info" title="Duplicate Path">
          You already have {grantedPath?.name}. A duplicate gives 2 Mastery Points to it. If it is already rank III, pick another Path below to take instead.
          <label class="field" style="margin-top: 0.5rem; max-width: 20rem">
            <span>Take instead</span>
            <select class="input" value={pick.altPathId ?? ''} onChange={(e) => setPick((p) => void (p.altPathId = (e.target as HTMLSelectElement).value || undefined))}>
              <option value="">Nothing</option>
              {def.paths.filter((id) => id !== pick.pathId).map((id) => (
                <option key={id} value={id}>
                  {PATH_BY_ID[id]?.name}
                </option>
              ))}
            </select>
          </label>
        </Notice>
      )}
      {owned && (
        <p class="small muted">
          Path rank now: {roman(owned.rank)}. Earned MP {owned.earnedMp}.
        </p>
      )}
      <RankPicker def={def} pick={pick} role={role} level={d.level} setPick={setPick} />
    </section>
  );
}

export function StepCareers(props: StepProps): JSX.Element {
  const { c, d, update } = props;
  const slots = independentPathSlots(d.level);
  const nextSlot = PATH_SLOT_LEVELS.find((l) => l > d.level);
  return (
    <div class="stack">
      <CareerSection {...props} role="primary" />
      <CareerSection {...props} role="secondary" />

      <section aria-labelledby="indep-h">
        <h3 id="indep-h">Independent Paths</h3>
        <p class="muted">
          {slots === 0 ? 'Independent Paths open at level 4.' : `${c.independentPaths.length} of ${slots} slots used.`}
          {nextSlot ? ` The next slot opens at level ${nextSlot}.` : ''} Rank I is free. Rank II costs 2 earned Mastery Points and rank III costs 4 more.
        </p>
        {c.independentPaths.length > 0 && (
          <ul class="plain">
            {c.independentPaths.map((id) => (
              <li key={id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.4rem 0">
                <span>
                  <strong>{PATH_BY_ID[id]?.name ?? id}</strong> <span class="muted small">{PATH_BY_ID[id]?.summary}</span>
                </span>
                <button type="button" class="btn small" onClick={() => update((x) => void (x.independentPaths = x.independentPaths.filter((p) => p !== id)))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <details style="margin-top: 0.75rem" open={c.independentPaths.length === 0 && slots > 0}>
          <summary>Add an independent Path</summary>
          <div class="choice-grid" style="margin-top: 0.75rem">
            {PATHS.map((p) => {
              const el = canTakeIndependentPath(c, d, p.id);
              return (
                <Choice
                  key={p.id}
                  name="indep"
                  title={p.name}
                  checked={false}
                  disabled={!el.ok}
                  reason={el.reason}
                  badge={p.status !== 'approved' ? <StatusBadge status={p.status} /> : undefined}
                  onChange={() => update((x) => void x.independentPaths.push(p.id))}
                >
                  {p.summary}
                </Choice>
              );
            })}
          </div>
        </details>
      </section>

      <section aria-labelledby="mp-h">
        <h3 id="mp-h">Your Paths and Mastery Points</h3>
        {d.paths.length === 0 ? (
          <p class="muted">You have no Paths yet. A Career grants one at level 1.</p>
        ) : (
          <div class="table-wrap">
            <table>
              <caption class="visually-hidden">Paths and ranks</caption>
              <thead>
                <tr>
                  <th scope="col">Path</th>
                  <th scope="col">From</th>
                  <th scope="col">Earned MP</th>
                  <th scope="col">Chosen rank</th>
                  <th scope="col">Rank in force</th>
                </tr>
              </thead>
              <tbody>
                {d.paths.map((p) => {
                  const el = canRaisePathRank(c, d, p.pathId);
                  return (
                    <tr key={p.pathId}>
                      <th scope="row" style="text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)">
                        <A to={`/paths/${p.pathId}`}>{PATH_BY_ID[p.pathId]?.name ?? p.pathId}</A>
                      </th>
                      <td>{p.source === 'independent' ? 'Independent' : p.source === 'primary-career' ? 'Primary Career' : 'Secondary Career'}</td>
                      <td>
                        <Stepper label={`${PATH_BY_ID[p.pathId]?.name} earned Mastery Points`} value={c.pathMp[p.pathId] ?? 0} min={0} max={40} onChange={(n) => update((x) => void (x.pathMp[p.pathId] = n))} />
                      </td>
                      <td>
                        <Stepper label={`${PATH_BY_ID[p.pathId]?.name} chosen rank`} value={c.pathRanks[p.pathId] ?? 1} min={1} max={3} onChange={(n) => update((x) => void (x.pathRanks[p.pathId] = n))} />
                      </td>
                      <td>
                        <strong>{roman(p.rank)}</strong>
                        {!el.ok && p.rank < 3 && <div class="small muted">{el.reason}</div>}
                        {p.chosenRank > p.rank && <div class="small" style="color: var(--warn)">Chosen rank {roman(p.chosenRank)} needs {pathMpSpent(p.chosenRank)} MP.</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p class="small muted">
          MP means Mastery Points. They are earned in play and are not Mana. Your Narrator tells you when you earn them.
        </p>
      </section>
    </div>
  );
}

// ---- Traits and proficiencies ----

function TraitRow({ t, props }: { t: TraitDef; props: StepProps }): JSX.Element {
  const { c, d, update } = props;
  const bought = c.traits[t.id] ?? [];
  const granted = d.traitGranted[t.id] ?? 0;
  const effective = d.traitRanks[t.id] ?? 0;
  const ranks = Array.from({ length: t.ranks }, (_, i) => i + 1);
  const options = c.traitOptions[t.id] ?? [];
  const optionCount = t.optionLabel ? (t.fieldOptions ? effective : t.repeatable ? bought.length : effective > 0 ? 1 : 0) : 0;
  const nextRank = Math.max(0, ...bought, granted) + 1;
  const nextEl = nextRank <= t.ranks ? canBuyTraitRank(c, d, t.id, nextRank) : null;

  return (
    <li class="trait-row" id={`trait-${t.id}`}>
      <div class="row-between" style="align-items: baseline">
        <strong class="serif">{t.name}</strong>
        <span class="row" style="gap: 0.4rem">
          {t.status !== 'approved' && <StatusBadge status={t.status} />}
          <span class="tag">{t.kind === 'exceptional' ? 'Story only' : t.repeatable ? `${t.cost[0]} TP each` : `${t.cost.reduce((a, b) => a + b, 0)} TP`}</span>
        </span>
      </div>
      <p class="small muted" style="margin: 0.15rem 0 0.4rem">{t.text}</p>
      {t.repeatable ? (
        <div class="row">
          <span class="num">Taken {bought.length}</span>
          <button type="button" class="btn small" disabled={!canBuyTraitRank(c, d, t.id, 1).ok} title={canBuyTraitRank(c, d, t.id, 1).reason} onClick={() => update((x) => void (x.traits[t.id] = [...(x.traits[t.id] ?? []), 1]))}>
            Take another
          </button>
          <button type="button" class="btn small" disabled={bought.length === 0} onClick={() => update((x) => void (x.traits[t.id] = (x.traits[t.id] ?? []).slice(0, -1)))}>
            Remove one
          </button>
        </div>
      ) : (
        <div class="row">
          {ranks.map((r) => {
            const have = bought.includes(r);
            const free = r <= granted && !have;
            const el = canBuyTraitRank(c, d, t.id, r);
            const isTop = have && Math.max(...bought) === r;
            if (have)
              return (
                <button key={r} type="button" class="btn small" aria-pressed="true" disabled={!isTop} title={isTop ? 'Remove this rank' : 'Remove the higher rank first'} onClick={() => update((x) => void (x.traits[t.id] = (x.traits[t.id] ?? []).filter((n) => n !== r)))}>
                  <Icon name="check" size={13} /> {t.ranks > 1 ? `Rank ${roman(r)}` : 'Taken'} {traitRankLabel(t, r)} <span class="muted">remove</span>
                </button>
              );
            if (free) return <span key={r} class="tag">Rank {roman(r)} from a Path</span>;
            return (
              <button key={r} type="button" class="btn small" disabled={!el.ok} title={el.reason} onClick={() => update((x) => void (x.traits[t.id] = [...(x.traits[t.id] ?? []), r]))}>
                {t.ranks > 1 ? `Rank ${roman(r)}` : 'Take'} {traitRankLabel(t, r)} ({t.cost[r - 1]} TP)
              </button>
            );
          })}
        </div>
      )}
      {nextEl && !nextEl.ok && bought.length === 0 && granted === 0 && <p class="choice-reason" style="margin: 0.3rem 0 0">{nextEl.reason}</p>}
      {optionCount > 0 && t.optionLabel && (
        <div class="grid-auto" style="margin-top: 0.5rem">
          {Array.from({ length: optionCount }, (_, i) => (
            <label key={i} class="field">
              <span>
                {t.optionLabel} {optionCount > 1 ? i + 1 : ''}
              </span>
              {t.fieldOptions ? (
                <select class="input" value={options[i] ?? ''} onChange={(e) => update((x) => { const a = [...(x.traitOptions[t.id] ?? [])]; a[i] = (e.target as HTMLSelectElement).value; x.traitOptions[t.id] = a; })}>
                  <option value="">Choose</option>
                  {ACADEMIC_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              ) : (
                <input class="input" type="text" maxLength={80} value={options[i] ?? ''} onInput={(e) => update((x) => { const a = [...(x.traitOptions[t.id] ?? [])]; a[i] = (e.target as HTMLInputElement).value; x.traitOptions[t.id] = a; })} />
              )}
            </label>
          ))}
        </div>
      )}
    </li>
  );
}

export function StepTraits(props: StepProps): JSX.Element {
  const { c, d, update } = props;
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const groups = [...new Set(TRAITS.map((t) => t.group))];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = TRAITS.filter((t) => (!group || t.group === group) && words.every((w) => `${t.name} ${t.text}`.toLowerCase().includes(w)));
  const weaponProfs = PROFICIENCIES.filter((p) => p.group === 'melee' || p.group === 'colossal' || p.group === 'ranged');
  const profGroups = [...new Set(PROFICIENCIES.map((p) => p.group))];
  return (
    <div class="stack">
      <div class="row-between">
        <p style="margin: 0">
          <strong class="num serif" style="font-size: 1.4rem">{d.tp.remaining}</strong> of {d.tp.total} Trait Points left.
        </p>
        <A to="/traits" class="small">
          Trait catalogue
        </A>
      </div>

      <section aria-labelledby="free-h">
        <h3 id="free-h">Free weapon proficiency</h3>
        <label class="field" style="max-width: 22rem">
          <span>Pick one weapon. It costs nothing.</span>
          <select class="input" value={c.freeProf ?? ''} onChange={(e) => update((x) => void (x.freeProf = (e.target as HTMLSelectElement).value || null))}>
            <option value="">Not chosen</option>
            {weaponProfs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section aria-labelledby="prof-h">
        <h3 id="prof-h">Proficiencies</h3>
        <p class="muted small">Armor, shields, weapons and tools. A proficiency you do not hold gives a warning on the sheet. It does not add a penalty by itself.</p>
        {profGroups.map((g) => (
          <details key={g} style="margin-bottom: 0.4rem">
            <summary>
              {g === 'exceptional-armor' ? 'Exceptional armor' : g[0].toUpperCase() + g.slice(1)} ({PROFICIENCIES.filter((p) => p.group === g && d.profs.has(p.id)).length} of {PROFICIENCIES.filter((p) => p.group === g).length})
            </summary>
            <div class="choice-grid" style="margin: 0.6rem 0 1rem">
              {PROFICIENCIES.filter((p) => p.group === g).map((p) => {
                const own = c.profs.includes(p.id);
                const have = d.profs.has(p.id);
                const el = canBuyProficiency(c, d, p.id);
                return (
                  <Choice
                    key={p.id}
                    type="checkbox"
                    name={`prof-${g}`}
                    title={p.name}
                    checked={have}
                    disabled={!own && !el.ok}
                    reason={el.reason}
                    onChange={() => update((x) => void (x.profs = own ? x.profs.filter((y) => y !== p.id) : [...x.profs, p.id]))}
                  >
                    {have && !own ? (c.freeProf === p.id ? 'Your free proficiency.' : 'Given by a Path or class.') : `${p.cost} TP`}
                  </Choice>
                );
              })}
            </div>
          </details>
        ))}
      </section>

      <section aria-labelledby="traits-h">
        <h3 id="traits-h">Traits</h3>
        <div class="filters no-print" style="margin-bottom: 0.75rem">
          <label class="field" style="flex: 1 1 14rem">
            <span class="visually-hidden">Search Traits</span>
            <input class="input" type="search" placeholder="Search Traits" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          </label>
          <label class="field">
            <span class="visually-hidden">Group</span>
            <select class="input" value={group} onChange={(e) => setGroup((e.target as HTMLSelectElement).value)}>
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p class="count" role="status" aria-live="polite">{shown.length} of {TRAITS.length} shown</p>
        <ul class="plain trait-list">
          {shown.map((t) => (
            <TraitRow key={t.id} t={t} props={props} />
          ))}
        </ul>
      </section>
    </div>
  );
}
