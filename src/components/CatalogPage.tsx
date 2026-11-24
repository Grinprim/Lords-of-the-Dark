import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { CatalogId, Entry } from '../data/types';
import { entriesFor, entryHref, findEntry, SECTIONED } from '../catalogs';
import { Route, go, href, setQuery } from '../router';
import { A, CopyLink, Empty, PageHead, StatusBadge, Tabs, Notice } from './common';
import { StatChip } from './icons';

export interface CatalogConfig {
  catalog: CatalogId;
  title: string;
  lede: string;
  eyebrow?: string;
  sections?: { id: string; label: string; lede?: string }[];
  /** Plates for short, characterful lists. Rows for long ones. Keyed by section, or "*". */
  layout?: Record<string, 'plates' | 'rows'>;
  /** Facets offered as filters. Keyed by section, or "*". Without it, every facet with 2 to 16 values is offered. */
  facets?: Record<string, string[]>;
  pageSize?: number;
}

const PAGE = 60;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function relatedLinks(e: Entry): { to: string; label: string }[] {
  const out: { to: string; label: string }[] = [];
  for (const r of e.related ?? []) {
    const target = findEntry(r.catalog, r.id);
    if (!target) continue;
    out.push({ to: entryHref(target), label: r.label ?? target.name });
  }
  return out;
}

export function EntryDetail({ entry }: { entry: Entry }): JSX.Element {
  const links = relatedLinks(entry);
  return (
    <article class="detail-body" aria-labelledby="entry-title">
      <div class="row-between" style="align-items: flex-start">
        <h2 id="entry-title">{entry.name}</h2>
        <span class="row no-print">
          <StatusBadge status={entry.status} />
          <CopyLink />
        </span>
      </div>
      {entry.stats && entry.stats.length > 0 && (
        <div class="stats" style="margin: 0.25rem 0 0.9rem">
          {entry.stats.map((s) => (
            <StatChip key={s.stat} stat={s.stat} value={s.value} showLabel />
          ))}
        </div>
      )}
      <p class="serif" style="font-size: 1.05rem; max-width: var(--measure)">
        {entry.summary}
      </p>
      {entry.note && <Notice kind={entry.status === 'owner-review' ? 'warn' : 'info'} title="Note">{entry.note}</Notice>}
      {entry.fields && entry.fields.length > 0 && (
        <dl class="defs" style="margin: 1rem 0">
          {entry.fields.map(([k, v]) => (
            <>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </>
          ))}
        </dl>
      )}
      {entry.body?.map((p, i) => (
        <p key={i} class="prose" style="font-size: 1rem">
          {p}
        </p>
      ))}
      {entry.bullets && entry.bullets.length > 0 && (
        <ul class="entry-bullets">
          {entry.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {links.length > 0 && (
        <section aria-label="Related entries" style="margin-top: 1.25rem">
          <h3 class="eyebrow">Related</h3>
          <div class="related">
            {links.map((l) => (
              <A key={l.to} to={l.to} class="tag">
                {l.label}
              </A>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function facetOptions(entries: Entry[], names: string[] | undefined): Record<string, string[]> {
  const seen = new Map<string, Set<string>>();
  for (const e of entries) for (const [k, v] of Object.entries(e.facets)) {
    if (names && !names.includes(k)) continue;
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k)!.add(v);
  }
  const out: Record<string, string[]> = {};
  for (const [k, set] of seen) {
    if (!names && (set.size < 2 || set.size > 16)) continue;
    if (set.size < 2) continue;
    out[k] = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  if (names) {
    const ordered: Record<string, string[]> = {};
    for (const n of names) if (out[n]) ordered[n] = out[n];
    return ordered;
  }
  return out;
}

function Row({ e, current, to }: { e: Entry; current: boolean; to: string }): JSX.Element {
  return (
    <li>
      <a href={href(to)} aria-current={current ? 'true' : undefined}>
        <span class="name">{e.name}</span>
        <span class="row" style="gap: 0.4rem; justify-content: flex-end">
          {e.stats?.slice(0, 3).map((s) => <StatChip key={s.stat} stat={s.stat} value={s.value} />)}
          {e.status !== 'approved' && <StatusBadge status={e.status} />}
        </span>
        <span class="sub">{e.summary.length > 120 ? e.summary.slice(0, 117) + '...' : e.summary}</span>
      </a>
    </li>
  );
}

function Plate({ e, to }: { e: Entry; to: string }): JSX.Element {
  return (
    <a class="plate" href={href(to)}>
      <span class="row-between" style="align-items: flex-start">
        <span class="name">{e.name}</span>
        {e.status !== 'approved' && <StatusBadge status={e.status} />}
      </span>
      <span class="sub">{e.summary.length > 150 ? e.summary.slice(0, 147) + '...' : e.summary}</span>
      <span class="stats">
        {Object.values(e.facets)
          .filter((f) => f.toLowerCase() !== e.name.toLowerCase())
          .slice(0, 2)
          .map((f, i) => (
            <span class="tag" key={i}>
              {f}
            </span>
          ))}
      </span>
    </a>
  );
}

export function CatalogPage({ config, route }: { config: CatalogConfig; route: Route }): JSX.Element {
  const sectioned = SECTIONED.has(config.catalog) && !!config.sections?.length;
  const sectionIds = config.sections?.map((s) => s.id) ?? [];
  const section = sectioned ? (sectionIds.includes(route.path[1] ?? '') ? route.path[1] : sectionIds[0]) : undefined;
  const id = sectioned ? route.path[2] : route.path[1];
  const base = `/${route.path[0]}`;
  const listBase = sectioned ? `${base}/${section}` : base;

  const all = useMemo(() => entriesFor(config.catalog, section), [config.catalog, section]);
  const names = config.facets?.[section ?? '*'] ?? config.facets?.['*'];
  const options = useMemo(() => facetOptions(all, names), [all, names]);

  const q = route.query.get('q') ?? '';
  const [typed, setTyped] = useState(q);
  useEffect(() => setTyped(q), [q, section]);
  const debounced = useDebounced(typed, 180);
  useEffect(() => {
    if (debounced !== q) go(setQuery({ ...route, path: listBase.split('/').filter(Boolean).concat(id ? [id] : []) }, { q: debounced || null }), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const active: Record<string, string> = {};
  for (const k of Object.keys(options)) {
    const v = route.query.get('f_' + k);
    if (v) active[k] = v;
  }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(
    () => all.filter((e) => words.every((w) => (e.searchText ?? '').includes(w)) && Object.entries(active).every(([k, v]) => e.facets[k] === v)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, q, JSON.stringify(active)],
  );

  const [limit, setLimit] = useState(config.pageSize ?? PAGE);
  useEffect(() => setLimit(config.pageSize ?? PAGE), [q, section, JSON.stringify(active)]);

  const selected = id ? all.find((e) => e.id === id) : undefined;
  const layout = config.layout?.[section ?? '*'] ?? config.layout?.['*'] ?? 'rows';
  const toEntry = (e: Entry) => `${listBase}/${encodeURIComponent(e.id)}${route.query.toString() ? '?' + route.query.toString() : ''}`;
  const sectionMeta = config.sections?.find((s) => s.id === section);
  const filtering = words.length > 0 || Object.keys(active).length > 0;

  // Keep the detail in view on a phone, and send the reader to the top of it.
  useEffect(() => {
    if (selected && matchMedia('(max-width: 960px)').matches) window.scrollTo({ top: 0 });
  }, [selected?.id]);

  const controls = (
    <div class="cat-controls no-print">
      <div class="row">
        <label class="field" style="flex: 1 1 16rem">
          <span class="visually-hidden">Search this list</span>
          <input
            class="input"
            type="search"
            placeholder={`Search ${sectionMeta?.label.toLowerCase() ?? config.title.toLowerCase()}`}
            value={typed}
            onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
          />
        </label>
        {filtering && (
          <A class="btn small quiet" to={listBase + (id ? '/' + id : '')}>
            Clear filters
          </A>
        )}
      </div>
      {Object.keys(options).length > 0 && (
        <div class="filters">
          {Object.entries(options).map(([k, values]) => (
            <label key={k} class="field">
              <span>{k}</span>
              <select
                class="input"
                value={active[k] ?? ''}
                onChange={(e) =>
                  go(setQuery({ ...route, path: listBase.split('/').filter(Boolean).concat(id ? [id] : []) }, { ['f_' + k]: (e.target as HTMLSelectElement).value || null }), { replace: true })
                }
              >
                <option value="">Any</option>
                {values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <p class="count" role="status" aria-live="polite">
        {filtered.length} of {all.length} shown
      </p>
    </div>
  );

  const list = (
    <>
      {filtered.length === 0 ? (
        <Empty>Nothing matches. Clear a filter or try fewer words.</Empty>
      ) : layout === 'plates' && !selected ? (
        <div class="plates">
          {filtered.slice(0, limit).map((e) => (
            <Plate key={e.id} e={e} to={toEntry(e)} />
          ))}
        </div>
      ) : (
        <ul class="list-rows">
          {filtered.slice(0, limit).map((e) => (
            <Row key={e.id} e={e} to={toEntry(e)} current={e.id === id} />
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <p style="margin-top: 0.75rem">
          <button type="button" class="btn" onClick={() => setLimit((l) => l + (config.pageSize ?? PAGE))}>
            Show {Math.min(config.pageSize ?? PAGE, filtered.length - limit)} more
          </button>
        </p>
      )}
    </>
  );

  return (
    <>
      <PageHead title={config.title} lede={sectionMeta?.lede ?? config.lede} eyebrow={config.eyebrow} />
      {sectioned && (
        <Tabs
          label={`${config.title} sections`}
          current={section ?? ''}
          items={config.sections!.map((s) => ({ id: s.id, label: s.label, to: `${base}/${s.id}` }))}
        />
      )}
      {id && !selected && (
        <Notice kind="warn" title="Not found">
          No entry called {id} exists here. <A to={listBase}>Back to the list</A>.
        </Notice>
      )}
      {selected ? (
        <div class="split cat" data-has-detail="true">
          <div class="cat-list">
            {controls}
            {list}
          </div>
          <div class="detail">
            <div class="mobile-only back-link no-print">
              <A to={listBase + (route.query.toString() ? '?' + route.query.toString() : '')} class="btn small">
                Back to the list
              </A>
            </div>
            <EntryDetail entry={selected} />
          </div>
        </div>
      ) : (
        <div class="cat">
          {controls}
          {list}
        </div>
      )}
    </>
  );
}
