import { useEffect, useState } from 'preact/hooks';
import { Character, cloneCharacter, newCharacter, newId } from '../engine/character';
import { Backend, Snapshot, memoryBackend, openBestBackend } from './db';

export type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error' | 'memory';

export interface StoreState {
  ready: boolean;
  characters: Character[];
  activeId: string | null;
  status: SaveStatus;
  lastSaved: string | null;
  error: string | null;
  persistent: boolean;
}

let state: StoreState = { ready: false, characters: [], activeId: null, status: 'loading', lastSaved: null, error: null, persistent: true };
let backend: Backend = memoryBackend();
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const saveCounts = new Map<string, number>();
const SAVE_DEBOUNCE_MS = 350;
const SNAPSHOT_EVERY = 25;

function set(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

export function useStore(): StoreState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

function readActive(): string | null {
  try {
    return localStorage.getItem('lotd-active');
  } catch {
    return null;
  }
}

function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem('lotd-active', id);
    else localStorage.removeItem('lotd-active');
  } catch {
    /* Storage can be blocked. The active character is then only remembered for this visit. */
  }
}

/** Open the database and load every character. Call once at start. */
export async function initStore(useBackend?: Backend): Promise<void> {
  try {
    backend = useBackend ?? (await openBestBackend());
    const list = await backend.list();
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const c of list) rememberOwner(c.id);
    const saved = readActive();
    const activeId = saved && list.some((c) => c.id === saved) ? saved : (list[0]?.id ?? null);
    set({ ready: true, characters: list, activeId, status: backend.persistent ? 'idle' : 'memory', persistent: backend.persistent, error: null });
  } catch (e) {
    backend = memoryBackend();
    set({ ready: true, characters: [], activeId: null, status: 'memory', persistent: false, error: e instanceof Error ? e.message : 'Storage failed.' });
  }
}

export function activeCharacter(): Character | null {
  return state.characters.find((c) => c.id === state.activeId) ?? null;
}

export function setActive(id: string | null) {
  writeActive(id);
  set({ activeId: id });
}

async function persist(id: string): Promise<void> {
  const c = state.characters.find((x) => x.id === id);
  if (!c) return;
  set({ status: 'saving' });
  try {
    await backend.put(c);
    const n = (saveCounts.get(id) ?? 0) + 1;
    saveCounts.set(id, n);
    if (n % SNAPSHOT_EVERY === 0) await backend.addSnapshot(c, 'Automatic snapshot');
    set({ status: backend.persistent ? 'saved' : 'memory', lastSaved: new Date().toISOString(), error: null });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Save failed.' });
  }
}

function schedule(id: string) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      void persist(id);
    }, SAVE_DEBOUNCE_MS),
  );
}

/** Write any pending change now. Used before export and when the page hides. */
export async function flushSaves(): Promise<void> {
  const ids = [...timers.keys()];
  for (const id of ids) {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    await persist(id);
  }
}

/** Replace a character with a changed copy. The change autosaves. */
export function updateCharacter(id: string, fn: (c: Character) => Character | void): void {
  const cur = state.characters.find((c) => c.id === id);
  if (!cur) return;
  const draft = cloneCharacter(cur);
  const next = fn(draft) ?? draft;
  next.updatedAt = new Date().toISOString();
  set({ characters: state.characters.map((c) => (c.id === id ? next : c)), status: 'saving' });
  schedule(id);
}

export async function createCharacter(partial: Partial<Character> = {}): Promise<Character> {
  const c = newCharacter(partial);
  rememberOwner(c.id);
  set({ characters: [c, ...state.characters], status: 'saving' });
  writeActive(c.id);
  set({ activeId: c.id });
  await persist(c.id);
  return c;
}

export async function deleteCharacter(id: string, opts: { keepSnapshots?: boolean } = {}): Promise<void> {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  const c = state.characters.find((x) => x.id === id);
  try {
    // Keep one last snapshot so a deletion can be undone from the library.
    if (c && opts.keepSnapshots !== false) await backend.addSnapshot(c, 'Before deletion');
    await backend.remove(id);
    const rest = state.characters.filter((x) => x.id !== id);
    const nextActive = state.activeId === id ? (rest[0]?.id ?? null) : state.activeId;
    writeActive(nextActive);
    set({ characters: rest, activeId: nextActive, status: backend.persistent ? 'saved' : 'memory', error: null });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Delete failed.' });
  }
}

export async function snapshotNow(id: string, reason: string): Promise<void> {
  const c = state.characters.find((x) => x.id === id);
  if (c) await backend.addSnapshot(c, reason);
}

export async function listSnapshots(id: string): Promise<Snapshot[]> {
  return backend.snapshots(id);
}

export async function listAllDeletedSnapshots(): Promise<Snapshot[]> {
  const live = new Set(state.characters.map((c) => c.id));
  const chars = await backend.list();
  void chars;
  const out: Snapshot[] = [];
  // Snapshots are indexed by character. Look through every id we have seen in storage keys.
  for (const id of knownSnapshotOwners()) if (!live.has(id)) out.push(...(await backend.snapshots(id)));
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

const owners = new Set<string>();
export function rememberOwner(id: string) {
  owners.add(id);
  try {
    const raw = JSON.parse(localStorage.getItem('lotd-owners') ?? '[]') as string[];
    if (!raw.includes(id)) localStorage.setItem('lotd-owners', JSON.stringify([...raw, id].slice(-200)));
  } catch {
    /* ignore */
  }
}
function knownSnapshotOwners(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('lotd-owners') ?? '[]') as string[];
    return [...new Set([...raw, ...owners])];
  } catch {
    return [...owners];
  }
}

/** Put a snapshot back as a live character. A live character is snapshotted first. */
export async function restoreSnapshot(snap: Snapshot): Promise<void> {
  const existing = state.characters.find((c) => c.id === snap.charId);
  if (existing) await backend.addSnapshot(existing, 'Before restore');
  const restored = cloneCharacter(snap.data);
  restored.updatedAt = new Date().toISOString();
  await backend.put(restored);
  set({
    characters: [restored, ...state.characters.filter((c) => c.id !== restored.id)],
    activeId: restored.id,
    status: backend.persistent ? 'saved' : 'memory',
    lastSaved: new Date().toISOString(),
  });
  writeActive(restored.id);
}

export type ImportMode = 'duplicate' | 'replace' | 'new';

/** Add an imported character. Replacing keeps a snapshot of what it overwrote. */
export async function importCharacter(c: Character, mode: ImportMode): Promise<Character> {
  const incoming = cloneCharacter(c);
  const existing = state.characters.find((x) => x.id === incoming.id);
  if (existing && mode === 'replace') {
    await backend.addSnapshot(existing, 'Before import replace');
  } else if (existing) {
    incoming.id = newId();
    incoming.name = existing && mode === 'duplicate' ? `${incoming.name || 'Character'} (copy)` : incoming.name;
  }
  incoming.updatedAt = new Date().toISOString();
  await backend.put(incoming);
  rememberOwner(incoming.id);
  set({
    characters: [incoming, ...state.characters.filter((x) => x.id !== incoming.id)],
    activeId: incoming.id,
    status: backend.persistent ? 'saved' : 'memory',
    lastSaved: new Date().toISOString(),
  });
  writeActive(incoming.id);
  return incoming;
}

export function statusLabel(s: StoreState): string {
  switch (s.status) {
    case 'loading':
      return 'Opening storage';
    case 'saving':
      return 'Saving';
    case 'saved':
      return s.lastSaved ? `Saved ${new Date(s.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved';
    case 'error':
      return 'Not saved. Storage failed';
    case 'memory':
      return 'Not stored. Export a PDF to keep it';
    default:
      return s.characters.length ? 'All changes saved' : 'No characters yet';
  }
}

/** The character being worked on, or null. Re-renders when it changes. */
export function useActive(): Character | null {
  const st = useStore();
  return st.characters.find((c) => c.id === st.activeId) ?? null;
}
