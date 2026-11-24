import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Route, go } from '../router';
import { A, Notice, PageHead, Toast, download, useToast } from '../components/common';
import { Icon } from '../components/icons';
import {
  ImportMode, createCharacter, deleteCharacter, flushSaves, importCharacter, listAllDeletedSnapshots, listSnapshots, restoreSnapshot, setActive, useStore,
} from '../store/store';
import type { Snapshot } from '../store/db';
import type { Character } from '../engine/character';
import { derive } from '../engine/derive';
import { serializeEnvelope, serializeLibrary } from '../store/schema';
import type { ImportItem } from '../store/importer';
import type { Paper } from '../pdf/export';
import { readPaper, writePaper } from '../store/paper';
import { SPECIES_BY_ID } from '../data/species';
import { CLASS_BY_ID } from '../data/classes';

interface Pending {
  fileName: string;
  items: ImportItem[];
  skipped: string[];
}

const safeName = (c: Character) => (c.name.trim() || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'character';
const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};
const describe = (c: Character) => `${SPECIES_BY_ID[c.speciesId]?.name ?? c.speciesId} ${CLASS_BY_ID[c.classId]?.name ?? c.classId}, level ${c.level}`;

function Snapshots({ id, onRestored }: { id: string; onRestored: () => void }): JSX.Element {
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null);
  useEffect(() => {
    void listSnapshots(id).then(setSnaps);
  }, [id]);
  if (!snaps) return <p class="muted small">Loading snapshots.</p>;
  if (!snaps.length) return <p class="muted small">No snapshots yet. One is made before a replace, a restore or a delete, and every 25 saves.</p>;
  return (
    <ul class="plain">
      {snaps.map((s) => (
        <li key={s.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.35rem 0">
          <span>
            {when(s.at)} <span class="muted small">{s.reason}</span>
          </span>
          <button
            type="button"
            class="btn small"
            onClick={async () => {
              await restoreSnapshot(s);
              onRestored();
            }}
          >
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LibraryPage(_: { route?: Route }): JSX.Element {
  const store = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [modes, setModes] = useState<Record<string, ImportMode>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [paper, setPaper] = useState<Paper>(readPaper);
  const [deleted, setDeleted] = useState<Snapshot[]>([]);

  const refreshDeleted = () => void listAllDeletedSnapshots().then((all) => {
    // Keep only the newest snapshot for each deleted character.
    const seen = new Set<string>();
    setDeleted(all.filter((s) => (seen.has(s.charId) ? false : (seen.add(s.charId), true))));
  });
  useEffect(refreshDeleted, [store.characters.length]);

  const choosePaper = (p: Paper) => {
    setPaper(p);
    writePaper(p);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErrors([]);
    setPending(null);
    setBusy('Reading the file');
    try {
      const { readImportFile } = await import('../store/importer');
      const out = await readImportFile(file);
      if (!out.ok) {
        setErrors(out.errors);
      } else {
        const next: Record<string, ImportMode> = {};
        for (const it of out.items) next[it.character.id] = store.characters.some((c) => c.id === it.character.id) ? 'duplicate' : 'new';
        setModes(next);
        setPending({ fileName: file.name, items: out.items, skipped: out.skipped });
      }
    } catch {
      setErrors(['The file could not be read.']);
    } finally {
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    let last: Character | null = null;
    for (const it of pending.items) last = await importCharacter(it.character, modes[it.character.id] ?? 'duplicate');
    setPending(null);
    toast.show(pending.items.length === 1 ? `Imported ${last?.name || 'the character'}.` : `Imported ${pending.items.length} characters.`);
  };

  const exportPdf = async (c: Character) => {
    setBusy(`Making the PDF for ${c.name || 'the character'}`);
    try {
      await flushSaves();
      const fresh = store.characters.find((x) => x.id === c.id) ?? c;
      const { buildCharacterPdf, pdfFileName } = await import('../pdf/export');
      const bytes = await buildCharacterPdf(fresh, { paper });
      download(pdfFileName(fresh), bytes, 'application/pdf');
      toast.show('PDF saved. It holds a copy of the character inside.');
    } catch {
      setErrors(['The PDF could not be made. Export a .lotd backup instead.']);
    } finally {
      setBusy('');
    }
  };

  const exportBackup = async (c: Character) => {
    await flushSaves();
    download(`${safeName(c)}.lotd`, serializeEnvelope(store.characters.find((x) => x.id === c.id) ?? c), 'application/json');
    toast.show('Backup saved.');
  };

  return (
    <>
      <PageHead eyebrow="Characters" title="Character library" lede="Your characters, saved in this browser. Export a PDF or a backup to keep a copy somewhere else.">
        <A class="btn primary" to="/create">
          <Icon name="plus" size={16} /> New character
        </A>
      </PageHead>

      {!store.persistent && store.ready && (
        <Notice kind="warn" title="Not stored">
          This browser would not let the site keep data, so characters will vanish when you close the page. Export a PDF or a backup before you leave.
        </Notice>
      )}
      {store.status === 'error' && (
        <Notice kind="error" title="Save failed">
          {store.error ?? 'Storage failed.'} Export a backup now.
        </Notice>
      )}
      {busy && (
        <p role="status" class="muted">
          {busy}...
        </p>
      )}

      <div class="split-wide">
        <section aria-labelledby="chars-h">
          <h2 id="chars-h" class="visually-hidden">
            Saved characters
          </h2>
          {store.characters.length === 0 ? (
            <div class="panel">
              <h3>No characters yet</h3>
              <p class="muted">Build one with the creator, or import a PDF or backup you saved earlier.</p>
              <A class="btn primary" to="/create">
                Start a character
              </A>
            </div>
          ) : (
            <ul class="plain char-list">
              {store.characters.map((c) => {
                const d = derive(c);
                const isActive = c.id === store.activeId;
                return (
                  <li key={c.id} class="char-card" data-active={isActive}>
                    <div class="row-between" style="align-items: flex-start">
                      <div>
                        <h3 style="margin: 0">{c.name.trim() || 'Unnamed character'}</h3>
                        <p class="muted" style="margin: 0.1rem 0 0.4rem">
                          {describe(c)}. Saved {when(c.updatedAt)}.
                        </p>
                        <p class="small" style="margin: 0">
                          HP {d.hp.value}, Armor {d.armor.value}
                          {d.hasMana ? `, Mana ${d.mana.value}` : ''}.{isActive ? ' Open now.' : ''}
                        </p>
                      </div>
                    </div>
                    <div class="row" style="margin-top: 0.75rem">
                      <button type="button" class="btn small primary" onClick={() => (setActive(c.id), go('/sheet'))}>
                        Open sheet
                      </button>
                      <button type="button" class="btn small" onClick={() => (setActive(c.id), go('/create/basics'))}>
                        Edit
                      </button>
                      <button type="button" class="btn small" onClick={() => exportPdf(c)}>
                        <Icon name="download" size={14} /> PDF
                      </button>
                      <button type="button" class="btn small" onClick={() => exportBackup(c)}>
                        Backup
                      </button>
                      <button
                        type="button"
                        class="btn small"
                        onClick={async () => {
                          const copy = await importCharacter(c, 'duplicate');
                          toast.show(`Made ${copy.name}.`);
                        }}
                      >
                        <Icon name="copy" size={14} /> Duplicate
                      </button>
                      <button type="button" class="btn small danger" onClick={() => setConfirm(c.id)}>
                        <Icon name="trash" size={14} /> Delete
                      </button>
                    </div>
                    {confirm === c.id && (
                      <div class="note error" role="alertdialog" aria-label={`Delete ${c.name || 'character'}`}>
                        <strong>Delete this character</strong>
                        <p>
                          {c.name.trim() || 'This character'} will leave the library. One recovery snapshot is kept so you can bring them back from the list below.
                        </p>
                        <div class="row">
                          <button
                            type="button"
                            class="btn small danger"
                            onClick={async () => {
                              setConfirm(null);
                              await deleteCharacter(c.id);
                              toast.show('Deleted. A recovery snapshot was kept.');
                            }}
                          >
                            Delete {c.name.trim() || 'character'}
                          </button>
                          <button type="button" class="btn small" onClick={() => setConfirm(null)}>
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                    <details style="margin-top: 0.6rem">
                      <summary class="small">Recovery snapshots</summary>
                      <Snapshots id={c.id} onRestored={() => toast.show('Snapshot restored.')} />
                    </details>
                  </li>
                );
              })}
            </ul>
          )}

          {deleted.length > 0 && (
            <section style="margin-top: 2rem" aria-labelledby="del-h">
              <h2 id="del-h" style="font-size: 1.2rem">
                Deleted characters
              </h2>
              <ul class="plain">
                {deleted.map((s) => (
                  <li key={s.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.45rem 0">
                    <span>
                      {s.data.name.trim() || 'Unnamed character'} <span class="muted small">{describe(s.data)}. Kept {when(s.at)}.</span>
                    </span>
                    <button
                      type="button"
                      class="btn small"
                      onClick={async () => {
                        await restoreSnapshot(s);
                        refreshDeleted();
                        toast.show('Character restored.');
                      }}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>

        <aside class="stack">
          <section class="panel" aria-labelledby="imp-h">
            <h2 id="imp-h" style="font-size: 1.2rem">
              Import
            </h2>
            <p class="muted">Pick a PDF made here, a .lotd or .json backup, or a library backup. Nothing is saved until you confirm.</p>
            <label class="field">
              <span class="visually-hidden">Choose a file</span>
              <input ref={fileInput} class="input" type="file" accept=".pdf,.json,.lotd,application/pdf,application/json" onChange={(e) => onFile((e.target as HTMLInputElement).files?.[0])} />
            </label>
            {errors.length > 0 && (
              <Notice kind="error" title="Could not import">
                <ul style="margin: 0">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {pending && (
              <div class="import-preview" aria-label="Import preview">
                <h3 style="font-size: 1.05rem">Preview of {pending.fileName}</h3>
                <p class="small muted">Totals below are worked out again from the rules. Saved totals in a file are never trusted.</p>
                <ul class="plain">
                  {pending.items.map((it) => {
                    const c = it.character;
                    const d = derive(c);
                    const existing = store.characters.find((x) => x.id === c.id);
                    return (
                      <li key={c.id} style="border-top: 1px solid var(--line); padding: 0.6rem 0">
                        <strong>{c.name.trim() || 'Unnamed character'}</strong>
                        <div class="muted small">
                          {describe(c)}. HP {d.hp.value}, Armor {d.armor.value}
                          {d.hasMana ? `, Mana ${d.mana.value}` : ''}. {c.items.length} item{c.items.length === 1 ? '' : 's'}.
                        </div>
                        {it.warnings.map((w, i) => (
                          <div key={i} class="small">
                            {w}
                          </div>
                        ))}
                        {existing ? (
                          <fieldset class="choice-set">
                            <legend class="small">A character with this id is already in the library ({existing.name.trim() || 'Unnamed'}, saved {when(existing.updatedAt)}).</legend>
                            <label class="check">
                              <input type="radio" name={`m-${c.id}`} checked={modes[c.id] === 'duplicate'} onChange={() => setModes({ ...modes, [c.id]: 'duplicate' })} />
                              Add as a separate copy
                            </label>
                            <label class="check">
                              <input type="radio" name={`m-${c.id}`} checked={modes[c.id] === 'replace'} onChange={() => setModes({ ...modes, [c.id]: 'replace' })} />
                              Replace the existing one (a snapshot of it is kept)
                            </label>
                          </fieldset>
                        ) : (
                          <p class="small">New to this library.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {pending.skipped.length > 0 && (
                  <Notice kind="warn" title="Skipped">
                    {pending.skipped.map((s, i) => (
                      <div key={i}>{s}</div>
                    ))}
                  </Notice>
                )}
                <div class="row">
                  <button type="button" class="btn primary" onClick={confirmImport}>
                    Import {pending.items.length === 1 ? 'this character' : `${pending.items.length} characters`}
                  </button>
                  <button type="button" class="btn" onClick={() => setPending(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          <section class="panel" aria-labelledby="exp-h">
            <h2 id="exp-h" style="font-size: 1.2rem">
              Export and print
            </h2>
            <label class="field" style="max-width: 14rem">
              <span>Paper size</span>
              <select class="input" value={paper} onChange={(e) => choosePaper((e.target as HTMLSelectElement).value as Paper)}>
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
              </select>
            </label>
            <p class="small muted" style="margin-top: 0.75rem">
              A PDF made here carries a copy of the character inside it. Import reads that copy. If you print a PDF to a new file, scan it or save it from another program, the copy can be lost. Keep a .lotd backup as well.
            </p>
            <div class="row">
              <button
                type="button"
                class="btn"
                disabled={store.characters.length === 0}
                onClick={async () => {
                  await flushSaves();
                  download('lords-of-the-dark-library.lotd', serializeLibrary(store.characters), 'application/json');
                  toast.show('Library backup saved.');
                }}
              >
                Back up the whole library
              </button>
              <A class="btn" to="/sheet">
                Print from the sheet
              </A>
            </div>
          </section>

          <button
            type="button"
            class="btn quiet no-print"
            onClick={async () => {
              const c = await createCharacter({ name: '' });
              go(`/create/basics?c=${encodeURIComponent(c.id)}`);
            }}
          >
            Start a blank draft
          </button>
        </aside>
      </div>
      <Toast message={toast.message} />
    </>
  );
}
