import { allEntries, entryHref } from './catalogs';
import { NAV } from './nav';
import { RULE_SECTIONS } from './data/rulesText';
import { LEDGER } from './data/ledger';
import { Status } from './data/types';

export interface SearchHit {
  title: string;
  where: string;
  to: string;
  snippet: string;
  score: number;
  status?: Status;
}

interface Doc {
  title: string;
  where: string;
  to: string;
  text: string;
  snippet: string;
  status?: Status;
}

const CATALOG_LABEL: Record<string, string> = {
  species: 'Species', classes: 'Classes', careers: 'Careers', paths: 'Paths', traits: 'Traits', proficiencies: 'Proficiencies', equipment: 'Equipment',
  magic: 'Magic', spiritual: 'Spiritual Arts', companions: 'Companions', crafting: 'Crafting', artifacts: 'Artifacts', world: 'World',
};

let docs: Doc[] | null = null;

function build(): Doc[] {
  const out: Doc[] = [];
  for (const n of NAV) out.push({ title: n.label, where: 'Page', to: `/${n.path}`, text: n.blurb.toLowerCase(), snippet: n.blurb });
  for (const s of RULE_SECTIONS) {
    out.push({ title: s.title, where: 'Rules', to: `/rules/${s.id}`, text: s.summary.toLowerCase(), snippet: s.summary });
    for (const b of s.blocks) {
      if (b.t === 'h') out.push({ title: b.text, where: `Rules, ${s.title}`, to: `/rules/${s.id}?h=${b.id}`, text: b.text.toLowerCase(), snippet: s.summary });
    }
  }
  for (const e of allEntries()) {
    out.push({
      title: e.name,
      where: `${CATALOG_LABEL[e.catalog] ?? e.catalog}${e.section && e.section !== e.catalog ? ', ' + e.section : ''}`,
      to: entryHref(e),
      text: e.searchText ?? e.name.toLowerCase(),
      snippet: e.summary,
      status: e.status,
    });
  }
  for (const l of LEDGER) out.push({ title: l.decision, where: 'Decision ledger', to: '/narrator/ledger', text: `${l.area} ${l.decision} ${l.note ?? ''}`.toLowerCase(), snippet: l.note ?? l.area, status: l.status });
  return out;
}

export function search(query: string, limit = 30): SearchHit[] {
  const tokens = query.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  if (!tokens.length) return [];
  docs ??= build();
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const title = d.title.toLowerCase();
    let score = 0;
    let all = true;
    for (const t of tokens) {
      if (title === t) score += 100;
      else if (title.startsWith(t)) score += 60;
      else if (title.split(/[^a-z0-9']+/).some((w) => w.startsWith(t))) score += 40;
      else if (title.includes(t)) score += 25;
      else if (d.text.includes(t)) score += 5;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ title: d.title, where: d.where, to: d.to, snippet: d.snippet, score, status: d.status });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}
