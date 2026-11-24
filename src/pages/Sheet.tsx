import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Route } from '../router';
import { A, Notice, PageHead, Tabs, Toast, download, useToast } from '../components/common';
import { setActive, flushSaves, updateCharacter, useStore } from '../store/store';
import { readPaper } from '../store/paper';
import type { Character, CharacterState } from '../engine/character';
import { derive } from '../engine/derive';
import { RollMode, RollResult, roll } from '../engine/dice';
import { hasErrors, validateCharacter } from '../engine/validation';
import { SPECIES_BY_ID } from '../data/species';
import { CLASS_BY_ID } from '../data/classes';
import { Overview } from './sheet/Overview';
import { Combat } from './sheet/Combat';
import { EquipmentTab, FeaturesTab, MagicTab, NotesTab } from './sheet/Tabs';
import { PrintSheet } from './sheet/Print';
import { RollEntry, RollLine, SheetProps } from './sheet/shared';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'combat', label: 'Combat' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'magic', label: 'Magic' },
  { id: 'features', label: 'Features' },
  { id: 'notes', label: 'Notes' },
];

const describe = (c: Character) => `${SPECIES_BY_ID[c.speciesId]?.name ?? c.speciesId} ${CLASS_BY_ID[c.classId]?.name ?? c.classId}, level ${c.level}`;

export function SheetPage({ route }: { route?: Route }): JSX.Element {
  const store = useStore();
  const toast = useToast();
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  const counter = useRef(0);
  const [busy, setBusy] = useState(false);
  const r = route as Route;
  const sub = r?.path[1] ?? 'overview';
  const qid = r?.query.get('c') ?? null;

  useEffect(() => {
    if (qid && store.ready && store.activeId !== qid && store.characters.some((x) => x.id === qid)) setActive(qid);
  }, [qid, store.ready, store.activeId, store.characters.length]);

  if (!store.ready) return <PageHead title="Character Sheet" lede="Opening storage." />;
  const c = store.characters.find((x) => x.id === (qid ?? store.activeId)) ?? null;
  if (!c) {
    return (
      <>
        <PageHead eyebrow="Character Sheet" title="No character open" lede="Open one from the Library or build a new one." />
        <div class="row">
          <A to="/library" class="btn primary">
            Library
          </A>
          <A to="/create" class="btn">
            Build a character
          </A>
        </div>
      </>
    );
  }

  const d = derive(c);

  const play: SheetProps['play'] = (fn) => {
    let applied = false;
    updateCharacter(c.id, (x) => {
      const next = fn(x.state);
      if (next) {
        x.state = next as CharacterState;
        applied = true;
      }
    });
    return applied;
  };
  const edit: SheetProps['edit'] = (fn) => updateCharacter(c.id, fn);
  const rollWith: SheetProps['rollWith'] = (label, modifier, opts = {}) => {
    const res: RollResult = roll((opts.mode ?? 'ordinary') as RollMode, modifier);
    const notes = [...(opts.notes ?? []), ...(opts.after ? opts.after(res) : [])];
    const entry: RollEntry = { id: ++counter.current, label, r: res, notes, target: opts.target ?? null };
    setRolls((prev) => [entry, ...prev].slice(0, 12));
    return entry;
  };
  const props: SheetProps = { c, d, play, edit, rollWith, say: toast.show };

  if (sub === 'print') {
    return (
      <>
        <PrintSheet c={c} d={d} />
        <Toast message={toast.message} />
      </>
    );
  }

  const issues = validateCharacter(c, d);
  const errors = issues.filter((i) => i.severity === 'error');
  const tab = TABS.some((t) => t.id === sub) ? sub : 'overview';

  const exportPdf = async () => {
    setBusy(true);
    try {
      await flushSaves();
      const { buildCharacterPdf, pdfFileName } = await import('../pdf/export');
      const fresh = store.characters.find((x) => x.id === c.id) ?? c;
      download(pdfFileName(fresh), await buildCharacterPdf(fresh, { paper: readPaper() }), 'application/pdf');
      toast.show('PDF saved. It holds a copy of the character inside.');
    } catch {
      toast.show('The PDF could not be made. Try a backup from the Library.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead eyebrow={describe(c)} title={c.name || 'Unnamed character'} lede={c.concept || undefined}>
        <A to={`/create/basics?c=${c.id}`} class="btn small">
          Edit build
        </A>
        <A to={`/create/levelup?c=${c.id}`} class="btn small">
          Level up
        </A>
        <button type="button" class="btn small" disabled={busy} onClick={exportPdf}>
          {busy ? 'Making PDF' : 'Save as PDF'}
        </button>
        <A to="/sheet/print" class="btn small">
          Print
        </A>
      </PageHead>

      {errors.length > 0 && (
        <Notice kind="error" title="This build has problems">
          {errors.length} {errors.length === 1 ? 'problem needs' : 'problems need'} fixing. Totals may be wrong until they are.{' '}
          <A to={`/create/review?c=${c.id}`}>See the list</A>.
        </Notice>
      )}
      {!hasErrors(issues) && d.warnings.length > 0 && (
        <Notice kind="warn" title="Check this">
          {d.warnings.slice(0, 3).join(' ')}
        </Notice>
      )}

      <Tabs label="Sheet sections" current={tab} items={TABS.map((t) => ({ id: t.id, label: t.label, to: `/sheet/${t.id}` }))} />

      {tab !== 'overview' && rolls[0] && (
        <div class="roll-strip no-print" role="status" aria-live="polite">
          <RollLine e={rolls[0]} />
        </div>
      )}

      {tab === 'overview' && <Overview {...props} last={rolls} />}
      {tab === 'combat' && <Combat {...props} />}
      {tab === 'equipment' && <EquipmentTab {...props} />}
      {tab === 'magic' && <MagicTab {...props} />}
      {tab === 'features' && <FeaturesTab {...props} />}
      {tab === 'notes' && <NotesTab {...props} />}
      <Toast message={toast.message} />
    </>
  );
}
