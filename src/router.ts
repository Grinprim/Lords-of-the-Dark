import { useEffect, useState } from 'preact/hooks';

export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  const [p, q] = h.split('?');
  const path = p.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  return { path, query: new URLSearchParams(q ?? ''), raw: h };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Hash link for an in-app path. Relative, so it works under any base on GitHub Pages. */
export const href = (to: string): string => '#' + (to.startsWith('/') ? to : '/' + to);

export function go(to: string, opts: { replace?: boolean } = {}): void {
  const target = href(to);
  if (opts.replace) history.replaceState(null, '', target), window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

export function setQuery(route: Route, patch: Record<string, string | null>): string {
  const q = new URLSearchParams(route.query);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') q.delete(k);
    else q.set(k, v);
  }
  const base = '/' + route.path.map(encodeURIComponent).join('/');
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
