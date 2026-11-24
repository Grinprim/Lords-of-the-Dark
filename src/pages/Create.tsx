import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Route, go, href } from '../router';
import { A, Notice, PageHead } from '../components/common';
import { StatChip } from '../components/icons';
import { NumberField } from '../components/forms';
import {
  createCharacter, flushSaves, setActive, snapshotNow, updateCharacter, useStore,
} from '../store/store';
import { readPaper } from '../store/paper';
import { Character } from '../engine/character';
import { derive } from '../engine/derive';
import { pendingChoices } from '../engine/choices';
import { gainsBetween, levelDiff } from '../engine/levelup';
import { MAX_LEVEL } from '../data/progression';
import { Issue, validateCharacter } from '../engine/validation';
import { SPECIES_BY_ID } from '../data/species';
import { CLASS_BY_ID } from '../data/classes';
import { StepAttributes, StepBasics, StepClass, StepSpecies } from './create/StepsA';
import { StepCareers, StepTraits } from './create/StepsB';
import { StepGear, StepMagic } from './create/StepsC';
import { AREA_STEP, IssueList, STEPS, StepReview } from './create/StepsD';

const describe = (c: Character) => `${SPECIES_BY_ID[c.speciesId]?.name ?? c.speciesId} ${CLASS_BY_ID[c.classId]?.name ?? c.classId}, level ${c.level}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function stepCounts(issues: Issue[], pending: ReturnType<typeof pendingChoices>, step: string): { errors: number; open: number } {
  const all = step === 'review';
  const errors = issues.filter((i) => i.severity === 'error' && (all || (AREA_STEP[i.area] ?? 'review') === step)).length;
  const open = all ? pending.length : pending.filter((p) => p.step === step).length;
  return { errors, open };
}

function Landing({ characters, activeId }: { characters: Character[]; activeId: string | null }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const active = characters.find((c) => c.id === activeId) ?? null;
  const start = async () => {
    setBusy(true);
    const c = await createCharacter({});
    setBusy(false);
    go(`/create/basics?c=${c.id}`);
  };
  const others = characters.filter((c) => c.id !== active?.id);
  return (
    <>
      <PageHead eyebrow="Character Creation" title="Build a character" lede="Nine short steps. Your work saves as you go, and you can leave and come back." />
      <div class="split">
        <section class="stack">
          <button type="button" class="btn primary big" onClick={start} disabled={busy}>
            {busy ? 'Starting' : 'Start a new character'}
          </button>
          <p class="muted">
            You begin with a blank draft at level 1. Every choice that is not allowed shows the reason beside it, so you are never left guessing.
          </p>
          {characters.length === 0 && <p class="muted">You have no characters yet. Nothing is stored on a server. Your browser holds them.</p>}
        </section>

        {active && <ResumeCard c={active} />}
      </div>

      {others.length > 0 && (
        <section aria-labelledby="others-h" style="margin-top: 2.5rem">
          <h2 id="others-h">Other characters</h2>
          <ul class="plain list-rows">
            {others.map((c) => {
              const d = derive(c);
              const open = pendingChoices(c, d).length;
              return (
                <li key={c.id} class="row-between" style="padding: 0.6rem 0; border-bottom: 1px solid var(--line)">
                  <span>
                    <strong class="serif">{c.name || 'Unnamed'}</strong> <span class="muted small">{describe(c)}</span>
                    <span class="small muted">. {open} {plural(open, 'choice', 'choices')} open.</span>
                  </span>
                  <span class="row">
                    <A to={`/create/basics?c=${c.id}`} class="btn small">
                      Continue
                    </A>
                    <A to={`/create/levelup?c=${c.id}`} class="btn small">
                      Level up
                    </A>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="how-h" style="margin-top: 2.5rem">
        <h2 id="how-h">What the nine steps are</h2>
        <ol class="steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <span class="steps-row">
                <span class="step-n">{i + 1}</span>
                <span>
                  <strong>{s.label}</strong>
                  <br />
                  <span class="muted small">{s.summary}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ResumeCard({ c }: { c: Character }): JSX.Element {
  const d = derive(c);
  const issues = validateCharacter(c, d);
  const open = pendingChoices(c, d).length;
  const errors = issues.filter((i) => i.severity === 'error').length;
  return (
    <section class="panel" aria-labelledby="resume-h">
      <p class="eyebrow">Continue where you stopped</p>
      <h2 id="resume-h" style="margin-top: 0">
        {c.name || 'Unnamed character'}
      </h2>
      <p class="muted">{describe(c)}</p>
      <p class="small">
        {open} {plural(open, 'choice', 'choices')} open. {errors} {plural(errors, 'problem', 'problems')} to fix.
      </p>
      <div class="row">
        <A to={`/create/basics?c=${c.id}`} class="btn primary">
          Continue
        </A>
        <A to={`/create/levelup?c=${c.id}`} class="btn">
          Level up
        </A>
        <A to="/sheet" class="btn">
          Open sheet
        </A>
      </div>
    </section>
  );
}

function LevelUp({ c }: { c: Character }): JSX.Element {
  const [target, setTarget] = useState(Math.min(MAX_LEVEL, c.level + 1));
  const [applied, setApplied] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const d = derive(c);

  if (applied !== null) {
    const open = pendingChoices(c, d);
    return (
      <div class="stack">
        <Notice kind="ok" title={`Now level ${c.level}`}>
          A snapshot of the old level was saved first. You can restore it from the Library.
        </Notice>
        <section aria-labelledby="after-h">
          <h2 id="after-h">Choices to make now ({open.length})</h2>
          {open.length === 0 ? (
            <p class="muted">Nothing is waiting. The new level needs no extra choices.</p>
          ) : (
            <ul class="plain">
              {open.map((p) => (
                <li key={p.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.45rem 0">
                  <span>{p.text}</span>
                  <A to={`/create/${p.step}?c=${c.id}`} class="small">
                    Open step
                  </A>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div class="row">
          <A to={`/create/review?c=${c.id}`} class="btn primary">
            Review
          </A>
          <A to="/sheet" class="btn">
            Open sheet
          </A>
        </div>
      </div>
    );
  }

  const gains = gainsBetween(c, c.level, target);
  const diff = levelDiff(c, target);
  const atMax = c.level >= MAX_LEVEL;
  const apply = async () => {
    setBusy(true);
    await flushSaves();
    await snapshotNow(c.id, `Before level-up to ${target}`);
    updateCharacter(c.id, (x) => void (x.level = target));
    setApplied(target);
    setBusy(false);
  };

  return (
    <div class="stack">
      <p class="muted" style="max-width: 60ch">
        Pick the level you are going to. This page shows what each level gives from the tables, then saves a snapshot and raises the level. Your current Health and Mana stay as they are. The rules text does not say they refill on a level.
      </p>
      {atMax ? (
        <Notice kind="info">This character is at level {MAX_LEVEL}, the highest level.</Notice>
      ) : (
        <NumberField label="Go to level" value={target} min={c.level + 1} max={MAX_LEVEL} onChange={setTarget} hint={`You are level ${c.level}.`} />
      )}

      {!atMax && (
        <>
          <section aria-labelledby="gain-h">
            <h2 id="gain-h">What you gain</h2>
            <ol class="plain gains">
              {gains.map((g) => (
                <li key={g.level}>
                  <strong class="serif">Level {g.level}</strong>
                  <ul>
                    {g.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="diff-h">
            <h2 id="diff-h">Your numbers</h2>
            <div class="table-wrap">
              <table>
                <caption class="visually-hidden">Totals before and after the level change</caption>
                <thead>
                  <tr>
                    <th scope="col">Total</th>
                    <th scope="col">Now</th>
                    <th scope="col">At level {target}</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((r) => (
                    <tr key={r.stat}>
                      <th scope="row" style="text-transform: none; letter-spacing: 0; font-size: 0.95rem; color: var(--ink)">
                        {r.stat}
                      </th>
                      <td class="num">{r.before}</td>
                      <td class="num">
                        <strong>{r.after}</strong>
                        {r.after !== r.before && <span class="muted small"> ({r.after > r.before ? '+' : ''}{r.after - r.before})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div class="row">
            <button type="button" class="btn primary" onClick={apply} disabled={busy}>
              {busy ? 'Saving' : `Save a snapshot and go to level ${target}`}
            </button>
            <A to={`/create/basics?c=${c.id}`} class="btn">
              Cancel
            </A>
          </div>
        </>
      )}
    </div>
  );
}

export function CreatePage({ route }: { route?: Route }): JSX.Element {
  const store = useStore();
  const r = route as Route;
  const sub = r?.path[1] ?? '';
  const qid = r?.query.get('c') ?? null;

  // A link with ?c=<id> makes that character the active one.
  useEffect(() => {
    if (qid && store.ready && store.activeId !== qid && store.characters.some((x) => x.id === qid)) setActive(qid);
  }, [qid, store.ready, store.activeId, store.characters.length]);

  if (!store.ready) return <PageHead title="Character Creation" lede="Opening storage." />;
  if (sub === '') return <Landing characters={store.characters} activeId={store.activeId} />;

  const c = store.characters.find((x) => x.id === (qid ?? store.activeId)) ?? null;
  if (!c) {
    return (
      <>
        <PageHead eyebrow="Character Creation" title="No character open" lede="Start one, or open one from the Library." />
        <div class="row">
          <A to="/create" class="btn primary">
            Start here
          </A>
          <A to="/library" class="btn">
            Library
          </A>
        </div>
      </>
    );
  }

  if (sub === 'levelup') {
    return (
      <>
        <PageHead eyebrow={c.name || 'Unnamed character'} title="Level up" lede={describe(c)} />
        <LevelUp key={c.id} c={c} />
      </>
    );
  }

  const idx = STEPS.findIndex((s) => s.id === sub);
  if (idx < 0) return <Redirect to={`/create/basics?c=${c.id}`} />;
  return <Creator c={c} idx={idx} stepId={STEPS[idx].id} />;
}

function Redirect({ to }: { to: string }): JSX.Element {
  useEffect(() => go(to, { replace: true }), [to]);
  return <PageHead title="Character Creation" lede="Opening the first step." />;
}

function Creator({ c, idx, stepId }: { c: Character; idx: number; stepId: string }): JSX.Element {
  const d = derive(c);
  const issues = validateCharacter(c, d);
  const pending = pendingChoices(c, d);
  const step = STEPS[idx];
  const update = (fn: (x: Character) => void) => updateCharacter(c.id, fn);
  const props = { c, d, update };
  const here = issues.filter((i) => (AREA_STEP[i.area] ?? 'review') === stepId && stepId !== 'review');
  const stepHref = (id: string) => `/create/${id}?c=${c.id}`;
  const prev = STEPS[idx - 1];
  const next = STEPS[idx + 1];

  return (
    <>
      <PageHead eyebrow={`Step ${idx + 1} of ${STEPS.length}`} title={step.label} lede={step.summary} />
      <div class="creator">
        <aside class="creator-nav" aria-label="Creation steps">
          <p class="creator-who">
            <strong class="serif">{c.name || 'Unnamed character'}</strong>
            <span class="muted small">{describe(c)}</span>
          </p>
          <ol class="creator-steps">
            {STEPS.map((s, i) => {
              const n = stepCounts(issues, pending, s.id);
              const note = n.errors > 0 ? `${n.errors} to fix` : n.open > 0 ? `${n.open} open` : 'Clear';
              return (
                <li key={s.id}>
                  <a href={href(stepHref(s.id))} aria-current={s.id === stepId ? 'step' : undefined} data-bad={n.errors > 0}>
                    <span class="step-n">{i + 1}</span>
                    <span class="creator-step-text">
                      <span>{s.label}</span>
                      <small>{note}</small>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
          <div class="creator-sum" aria-label="Running totals">
            <StatChip stat="hp" value={d.hp.value} showLabel />
            <StatChip stat="armor" value={d.armor.value} showLabel />
            {d.hasMana && <StatChip stat="mana" value={d.mana.value} showLabel />}
            <StatChip stat="mov" value={d.mov.value} showLabel />
            <span class="stat" title="Attribute Points left">
              <span class="num">{d.ap.remaining}</span> <span class="stat-label">AP left</span>
            </span>
            <span class="stat" title="Trait Points left">
              <span class="num">{d.tp.remaining}</span> <span class="stat-label">TP left</span>
            </span>
          </div>
        </aside>

        <div class="creator-main">
          {here.length > 0 && <IssueList issues={here} here={stepId} />}
          {stepId === 'basics' && <StepBasics {...props} />}
          {stepId === 'species' && <StepSpecies {...props} />}
          {stepId === 'class' && <StepClass {...props} />}
          {stepId === 'attributes' && <StepAttributes {...props} />}
          {stepId === 'careers' && <StepCareers {...props} />}
          {stepId === 'traits' && <StepTraits {...props} />}
          {stepId === 'magic' && <StepMagic {...props} />}
          {stepId === 'gear' && <StepGear {...props} />}
          {stepId === 'review' && <StepReview {...props} paper={readPaper()} />}

          <nav class="creator-foot" aria-label="Step navigation">
            {prev ? (
              <A to={stepHref(prev.id)} class="btn">
                Back: {prev.label}
              </A>
            ) : (
              <A to="/create" class="btn">
                Back to start
              </A>
            )}
            {next && (
              <A to={stepHref(next.id)} class="btn primary">
                Next: {next.label}
              </A>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
