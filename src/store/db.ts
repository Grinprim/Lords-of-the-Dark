import { DBSchema, IDBPDatabase, openDB } from 'idb';
import type { Character } from '../engine/character';
import { newId } from '../engine/character';

export interface Snapshot {
  id: string;
  charId: string;
  at: string;
  reason: string;
  data: Character;
}

interface LotdDB extends DBSchema {
  characters: { key: string; value: Character };
  snapshots: { key: string; value: Snapshot; indexes: { 'by-char': string } };
}

const DB_NAME = 'lotd';
const DB_VERSION = 1;
export const MAX_SNAPSHOTS_PER_CHARACTER = 12;

export interface Backend {
  persistent: boolean;
  list(): Promise<Character[]>;
  get(id: string): Promise<Character | undefined>;
  put(c: Character): Promise<void>;
  remove(id: string): Promise<void>;
  addSnapshot(c: Character, reason: string): Promise<Snapshot>;
  snapshots(charId: string): Promise<Snapshot[]>;
  removeSnapshots(charId: string): Promise<void>;
}

/** IndexedDB backend. */
export async function openBackend(name = DB_NAME): Promise<Backend> {
  const db: IDBPDatabase<LotdDB> = await openDB<LotdDB>(name, DB_VERSION, {
    upgrade(d) {
      d.createObjectStore('characters', { keyPath: 'id' });
      const snaps = d.createObjectStore('snapshots', { keyPath: 'id' });
      snaps.createIndex('by-char', 'charId');
    },
  });
  return {
    persistent: true,
    list: () => db.getAll('characters'),
    get: (id) => db.get('characters', id),
    async put(c) {
      await db.put('characters', c);
    },
    async remove(id) {
      await db.delete('characters', id);
    },
    async addSnapshot(c, reason) {
      const snap: Snapshot = { id: newId('s'), charId: c.id, at: new Date().toISOString(), reason, data: JSON.parse(JSON.stringify(c)) };
      await db.put('snapshots', snap);
      const all = await db.getAllFromIndex('snapshots', 'by-char', c.id);
      all.sort((a, b) => a.at.localeCompare(b.at));
      for (const old of all.slice(0, Math.max(0, all.length - MAX_SNAPSHOTS_PER_CHARACTER))) await db.delete('snapshots', old.id);
      return snap;
    },
    async snapshots(charId) {
      const all = await db.getAllFromIndex('snapshots', 'by-char', charId);
      return all.sort((a, b) => b.at.localeCompare(a.at));
    },
    async removeSnapshots(charId) {
      const all = await db.getAllKeysFromIndex('snapshots', 'by-char', charId);
      for (const k of all) await db.delete('snapshots', k);
    },
  };
}

/** Memory backend. Used when the browser refuses IndexedDB. Nothing survives a reload. */
export function memoryBackend(): Backend {
  const chars = new Map<string, Character>();
  const snaps: Snapshot[] = [];
  return {
    persistent: false,
    async list() {
      return [...chars.values()].map((c) => JSON.parse(JSON.stringify(c)) as Character);
    },
    async get(id) {
      const c = chars.get(id);
      return c ? (JSON.parse(JSON.stringify(c)) as Character) : undefined;
    },
    async put(c) {
      chars.set(c.id, JSON.parse(JSON.stringify(c)));
    },
    async remove(id) {
      chars.delete(id);
    },
    async addSnapshot(c, reason) {
      const s: Snapshot = { id: newId('s'), charId: c.id, at: new Date().toISOString(), reason, data: JSON.parse(JSON.stringify(c)) };
      snaps.push(s);
      const mine = snaps.filter((x) => x.charId === c.id).sort((a, b) => a.at.localeCompare(b.at));
      for (const old of mine.slice(0, Math.max(0, mine.length - MAX_SNAPSHOTS_PER_CHARACTER))) snaps.splice(snaps.indexOf(old), 1);
      return s;
    },
    async snapshots(charId) {
      return snaps.filter((s) => s.charId === charId).sort((a, b) => b.at.localeCompare(a.at));
    },
    async removeSnapshots(charId) {
      for (let i = snaps.length - 1; i >= 0; i--) if (snaps[i].charId === charId) snaps.splice(i, 1);
    },
  };
}

export async function openBestBackend(): Promise<Backend> {
  try {
    if (typeof indexedDB === 'undefined') return memoryBackend();
    return await openBackend();
  } catch {
    return memoryBackend();
  }
}
