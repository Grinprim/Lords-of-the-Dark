import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { NAV, NAV_BY_PATH } from '../nav';
import { Route, href } from '../router';
import { Icon } from './icons';
import { SearchDialog } from './SearchDialog';
import { currentTheme, toggleTheme, Theme } from '../theme';
import { statusLabel, useStore } from '../store/store';
import { findEntry } from '../catalogs';
import { RULE_BY_ID } from '../data/rulesText';
import { STEPS as CREATE_STEPS } from '../createSteps';

interface Crumb {
  label: string;
  to?: string;
}

const SECTION_LABEL: Record<string, string> = {
  weapons: 'Weapons', armor: 'Armor', shields: 'Shields', cloaks: 'Cloaks', accessories: 'Accessories', properties: 'Properties', catalysts: 'Catalysts', rarity: 'Rarity',
  schools: 'Schools', spells: 'Spells', monk: 'Monk', shaman: 'Shaman', dragonkin: 'Dragonkin', sizes: 'Sizes', abilities: 'Abilities', summons: 'Summons',
  disciplines: 'Disciplines', recipes: 'Recipes', materials: 'Materials', enchantments: 'Enchantments', classes: 'Classes', examples: 'Examples', ring: 'The One Ring',
  bestiary: 'Bestiary', natures: 'Natures', threat: 'Threat', proficiencies: 'Proficiencies', ledger: 'Decision ledger', check: 'Check odds', attack: 'Attack resolver', defense: 'Defense',
  conditions: 'Conditions', rest: 'Rest and Sleep',
};

export function crumbsFor(route: Route): Crumb[] {
  const [top, second, third] = route.path;
  const trail: Crumb[] = [{ label: 'Home', to: '/' }];
  if (!top) return [{ label: 'Home' }];
  const nav = NAV_BY_PATH[top];
  const label = nav?.label ?? 'Page not found';
  if (top === 'rules') {
    const sec = second ? RULE_BY_ID[second] : undefined;
    trail.push(sec ? { label, to: '/rules' } : { label });
    if (sec) trail.push({ label: sec.title });
    return trail;
  }
  if (top === 'sheet') {
    if (!second || second === 'overview') return [...trail, { label }];
    trail.push({ label, to: '/sheet' });
    return [...trail, { label: second[0].toUpperCase() + second.slice(1) }];
  }
  if (top === 'create') {
    if (!second) return [...trail, { label }];
    trail.push({ label, to: '/create' });
    const st = CREATE_STEPS.find((x) => x.id === second);
    return [...trail, { label: second === 'levelup' ? 'Level up' : (st?.label ?? second) }];
  }
  const sectioned = ['traits', 'equipment', 'magic', 'spiritual', 'companions', 'crafting', 'artifacts', 'world', 'narrator'];
  if (sectioned.includes(top)) {
    if (!second) return [...trail, { label }];
    trail.push({ label, to: `/${top}` });
    const secLabel = SECTION_LABEL[second] ?? second;
    if (!third) return [...trail, { label: secLabel }];
    trail.push({ label: secLabel, to: `/${top}/${second}` });
    const e = findEntry(top as never, third);
    trail.push({ label: e?.name ?? third });
    return trail;
  }
  if (!second) return [...trail, { label }];
  trail.push({ label, to: `/${top}` });
  const e = findEntry(top as never, second);
  trail.push({ label: e?.name ?? second });
  return trail;
}

function useMobile(): boolean {
  const [m, setM] = useState(() => (typeof matchMedia === 'function' ? matchMedia('(max-width: 960px)').matches : false));
  useEffect(() => {
    const mq = matchMedia('(max-width: 960px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export function Shell({ route, children }: { route: Route; children: ComponentChildren }): JSX.Element {
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [theme, setThemeState] = useState<Theme>(currentTheme());
  const mobile = useMobile();
  const store = useStore();
  const main = useRef<HTMLElement>(null);
  const top = route.path[0] ?? '';

  useEffect(() => setMenu(false), [route.raw]);

  // When the drawer opens on a phone, focus moves into it. Closing it returns focus to the menu button through the button itself.
  useEffect(() => {
    if (!menu) return;
    const t = setTimeout(() => document.querySelector<HTMLElement>('#sidebar .brand')?.focus(), 0);
    return () => clearTimeout(t);
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearching(true);
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSearching(true);
      } else if (e.key === 'Escape') {
        if (document.getElementById('sidebar')?.getAttribute('data-open') === 'true') document.querySelector<HTMLElement>('.menu-btn')?.focus();
        setMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const crumbs = crumbsFor(route);
  const groups: string[] = [];
  for (const n of NAV) if (!groups.includes(n.group)) groups.push(n.group);
  const inertProps = mobile && !menu ? ({ inert: true } as Record<string, unknown>) : {};
  const status = statusLabel(store);

  return (
    <div class="app">
      <button type="button" class="skip" onClick={() => main.current?.focus()}>
        Skip to content
      </button>
      <aside class="sidebar" id="sidebar" data-open={menu} aria-label="Site sections" {...inertProps}>
        <a class="brand" href={href('/')}>
          <b>Lords of the Dark</b>
          <span>A tabletop role-playing game</span>
        </a>
        <nav aria-label="Pages">
          {groups.map((g) => (
            <div key={g}>
              <div class="group">{g}</div>
              <ul class="nav">
                {NAV.filter((n) => n.group === g).map((n) => (
                  <li key={n.path}>
                    <a href={href('/' + n.path)} aria-current={top === n.path ? 'page' : undefined}>
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <button type="button" class="scrim" data-open={menu} aria-label="Close menu" tabIndex={-1} onClick={() => setMenu(false)} />
      <div class="main">
        <header class="topbar no-print">
          <button type="button" class="btn icon menu-btn quiet" aria-label="Open menu" aria-expanded={menu} aria-controls="sidebar" onClick={() => setMenu((m) => !m)}>
            <Icon name={menu ? 'x' : 'menu'} />
          </button>
          <nav class="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} class="crumb-item">
                {i > 0 && <span aria-hidden="true">/</span>}{' '}
                {c.to ? (
                  <a href={href(c.to)}>{c.label}</a>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <span class="spacer" />
          <span class="statusbar" role="status" aria-live="polite" data-status={store.status}>
            <Icon name={store.status === 'error' ? 'alert' : 'save'} size={14} />
            <span class="hide-small">{status}</span>
          </span>
          <button type="button" class="btn small" onClick={() => setSearching(true)} aria-label="Search" aria-keyshortcuts="Control+K /">
            <Icon name="search" size={16} />
            <span class="hide-small">Search</span>
            <kbd class="hide-small">/</kbd>
          </button>
          <button
            type="button"
            class="btn small icon"
            aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
            onClick={() => setThemeState(toggleTheme())}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
        </header>
        <main id="main-content" ref={main} tabIndex={-1} class="page">
          {children}
        </main>
        <footer class="footer no-print">
          <span>Lords of the Dark. Rules version 2026.1.</span>
          <a href={href('/narrator/ledger')}>Decision ledger</a>
          <a href={href('/library')}>Character library</a>
          <span>Characters are stored in this browser only. Export a PDF to keep a copy.</span>
        </footer>
      </div>
      <SearchDialog open={searching} onClose={() => setSearching(false)} />
    </div>
  );
}
