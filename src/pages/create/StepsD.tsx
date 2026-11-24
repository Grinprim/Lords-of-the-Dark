import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { pendingChoices } from '../../engine/choices';
import { Issue, hasErrors, validateCharacter } from '../../engine/validation';
import { flushSaves } from '../../store/store';
import { A, Notice, download } from '../../components/common';
import { StatChip } from '../../components/icons';
import { TextField } from '../../components/forms';
import type { StepProps } from './StepsA';
import type { Paper } from '../../pdf/export';
import { AREA_STEP } from '../../createSteps';

export { AREA_STEP, STEPS } from '../../createSteps';

const SEV_LABEL: Record<Issue['severity'], string> = { error: 'Must fix', warning: 'Check', info: 'Note' };

export function IssueList({ issues, here }: { issues: Issue[]; here?: string }): JSX.Element | null {
  if (issues.length === 0) return null;
  return (
    <ul class="plain issue-list">
      {issues.map((i) => (
        <li key={i.id} data-sev={i.severity}>
          <span class="issue-sev">{SEV_LABEL[i.severity]}</span>
          <span>
            <span class="muted small">{i.area}. </span>
            {i.message}
            {AREA_STEP[i.area] && AREA_STEP[i.area] !== 'review' && AREA_STEP[i.area] !== here && (
              <>
                {' '}
                <A to={`/create/${AREA_STEP[i.area]}`} class="small">
                  Go to step
                </A>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StepReview({ c, d, update, paper }: StepProps & { paper: Paper }): JSX.Element {
  const issues = validateCharacter(c, d);
  const pending = pendingChoices(c, d);
  const blocked = hasErrors(issues);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const errors = issues.filter((i) => i.severity === 'error');
  const others = issues.filter((i) => i.severity !== 'error');

  const exportPdf = async () => {
    setBusy(true);
    setFail('');
    try {
      await flushSaves();
      const { buildCharacterPdf, pdfFileName } = await import('../../pdf/export');
      download(pdfFileName(c), await buildCharacterPdf(c, { paper }), 'application/pdf');
    } catch {
      setFail('The PDF could not be made. Try again, or export a backup from the Library.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="stack">
      <section aria-labelledby="sum-h">
        <h3 id="sum-h">The numbers</h3>
        <div class="row" style="gap: 1.25rem">
          <StatChip stat="hp" value={d.hp.value} big showLabel />
          <StatChip stat="armor" value={d.armor.value} big showLabel />
          {d.hasMana && <StatChip stat="mana" value={d.mana.value} big showLabel />}
          <StatChip stat="mov" value={d.mov.value} big showLabel />
          <StatChip stat="weight" value={`${d.weight}/${d.capacity.value}`} big showLabel />
        </div>
        <p class="small muted">These are recomputed from your choices each time. They are never typed in by hand.</p>
      </section>

      <section aria-labelledby="todo-h">
        <h3 id="todo-h">Choices still open ({pending.length})</h3>
        {pending.length === 0 ? (
          <p class="muted">Nothing is waiting on you.</p>
        ) : (
          <ul class="plain">
            {pending.map((p) => (
              <li key={p.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.4rem 0">
                <span>{p.text}</span>
                <A to={`/create/${p.step}`} class="small">
                  Open step
                </A>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="iss-h">
        <h3 id="iss-h">Problems ({errors.length}) and checks ({others.length})</h3>
        {issues.length === 0 ? <p class="muted">No problems found.</p> : <IssueList issues={[...errors, ...others]} />}
      </section>

      <section aria-labelledby="fin-h" class="panel">
        <h3 id="fin-h">Finish</h3>
        {blocked ? (
          <Notice kind="error" title="Fix these first">
            {errors.length} {errors.length === 1 ? 'problem' : 'problems'} must be fixed before the sheet opens. Open choices above are fine. They are reminders, not errors.
          </Notice>
        ) : (
          <p class="muted">No blocking problems. Open choices can wait. You can finish them at the table.</p>
        )}
        <div class="row">
          {blocked ? (
            <button type="button" class="btn primary" disabled aria-describedby="fin-why">
              Open the sheet
            </button>
          ) : (
            <a class="btn primary" href="#/sheet">
              Open the sheet
            </a>
          )}
          <button type="button" class="btn" disabled={busy} onClick={exportPdf}>
            {busy ? 'Making PDF' : 'Save as PDF'}
          </button>
          <A to="/library" class="btn">
            Library
          </A>
        </div>
        {blocked && (
          <p id="fin-why" class="small" style="color: var(--bad); margin: 0.5rem 0 0">
            Disabled because {errors.length} {errors.length === 1 ? 'problem needs' : 'problems need'} fixing.
          </p>
        )}
        {fail && <Notice kind="error">{fail}</Notice>}
        <p class="small muted" style="margin-bottom: 0">
          The PDF carries a copy of the character inside it. Keep the file and you can import it again.
        </p>
      </section>

      <section aria-labelledby="notes-h">
        <h3 id="notes-h">Character notes</h3>
        <TextField label="Notes" multiline value={c.notes} maxLength={6000} hint="Backstory, bonds, anything you want on the sheet." onInput={(v) => update((x) => void (x.notes = v))} />
      </section>
    </div>
  );
}
