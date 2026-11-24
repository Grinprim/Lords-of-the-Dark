import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useRoute } from './router';
import { Shell } from './components/Shell';
import { NAV_BY_PATH } from './nav';
import { HomePage } from './pages/Home';
import { StartPage } from './pages/Start';
import { RulesPage } from './pages/Rules';
import { NarratorPage } from './pages/Narrator';
import { LibraryPage } from './pages/Library';
import { CreatePage } from './pages/Create';
import { SheetPage } from './pages/Sheet';
import { CatalogPage } from './components/CatalogPage';
import { CATALOG_PAGES } from './pages/catalogPages';
import { PageHead, Notice, A } from './components/common';

export function App(): JSX.Element {
  const route = useRoute();
  const top = route.path[0] ?? '';

  useEffect(() => {
    const nav = NAV_BY_PATH[top];
    document.title = nav && top ? `${nav.label} | Lords of the Dark` : 'Lords of the Dark';
  }, [top]);

  // Move focus to the page when the section changes, so keyboard and screen reader users start at the top.
  // The first load keeps focus at the start of the page, so the skip link is the first Tab stop.
  const firstLoad = useRef(true);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const main = document.getElementById('main-content');
    window.scrollTo({ top: 0 });
    main?.focus({ preventScroll: true });
  }, [top]);

  let page: JSX.Element;
  if (top === '') page = <HomePage />;
  else if (top === 'start') page = <StartPage />;
  else if (top === 'rules') page = <RulesPage route={route} />;
  else if (CATALOG_PAGES[top]) page = <CatalogPage config={CATALOG_PAGES[top]} route={route} />;
  else if (top === 'narrator') page = <NarratorPage route={route} />;
  else if (top === 'library') page = <LibraryPage route={route} />;
  else if (top === 'create') page = <CreatePage route={route} />;
  else if (top === 'sheet') page = <SheetPage route={route} />;
  else
    page = (
      <>
        <PageHead title="Page not found" />
        <Notice kind="warn" title="Not found">
          There is nothing at this address. <A to="/">Go to the home page</A> or use the search.
        </Notice>
      </>
    );

  return <Shell route={route}>{page}</Shell>;
}
