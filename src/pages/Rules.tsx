import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { RULE_BY_ID, RULE_SECTIONS, Block } from '../data/rulesText';
import { apTotal, tpTotal, independentPathSlots, careerSlots, careerRank, classAbilityCount, MAX_LEVEL } from '../data/progression';
import { A, Notice, PageHead, StatusBadge } from '../components/common';
import { OddsTool } from '../components/OddsTool';
import { Route } from '../router';
import { Status } from '../data/types';

const NOTE_KIND: Record<Status, 'info' | 'warn' | 'ok'> = { approved: 'ok', provisional: 'info', legacy: 'info', 'owner-review': 'warn', proposal: 'info' };

function ProgressionTable(): JSX.Element {
  const levels = Array.from({ length: 20 }, (_, i) => i + 1);
  return (
    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">Progression by level</caption>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">AP total</th>
            <th scope="col">TP total</th>
            <th scope="col">Independent Paths</th>
            <th scope="col">Careers</th>
            <th scope="col">Primary rank</th>
            <th scope="col">Secondary rank</th>
            <th scope="col">Class abilities</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l}>
              <th scope="row" class="num">
                {l}
              </th>
              <td class="num">{apTotal(l)}</td>
              <td class="num">{tpTotal(l)}</td>
              <td class="num">{independentPathSlots(l)}</td>
              <td class="num">{careerSlots(l)}</td>
              <td class="num">{careerRank('primary', l) || '-'}</td>
              <td class="num">{careerRank('secondary', l) || '-'}</td>
              <td class="num">{classAbilityCount(l)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="small muted" style="margin-top: 0.5rem">
        The table stops at level 20. The highest level is {MAX_LEVEL}. AP stop at level 16. TP keep coming at 2 for each level after 16.
      </p>
    </div>
  );
}

function LoadTable(): JSX.Element {
  return (
    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">Load bands</caption>
        <thead>
          <tr>
            <th scope="col">Weight against capacity</th>
            <th scope="col">Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Under 50%</td><td>MOV +1</td></tr>
          <tr><td>50% to 75%</td><td>No change</td></tr>
          <tr><td>Over 75%, under 100%</td><td>MOV -1</td></tr>
          <tr><td>100% or more</td><td>You cannot move or Dodge</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ b }: { b: Block }): JSX.Element | null {
  switch (b.t) {
    case 'h':
      return <h2 id={b.id} tabIndex={-1}>{b.text}</h2>;
    case 'p':
      return <p>{b.text}</p>;
    case 'list':
      return (
        <ul>
          {b.items.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      );
    case 'formula':
      return (
        <dl class="defs panel inset" style="margin: 1rem 0">
          {b.rows.map(([k, v]) => (
            <>
              <dt>{k}</dt>
              <dd class="num">{v}</dd>
            </>
          ))}
        </dl>
      );
    case 'table':
      return (
        <div class="table-wrap" style="margin: 1rem 0">
          <table>
            {b.caption && <caption class="visually-hidden">{b.caption}</caption>}
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return (
        <Notice kind={NOTE_KIND[b.status]} title={b.status === 'approved' ? 'Rule' : 'Status'}>
          <p><StatusBadge status={b.status} /> {b.text}</p>
        </Notice>
      );
    case 'odds':
      return <div class="no-print" style="margin: 1.25rem 0"><OddsTool /></div>;
    case 'progression':
      return <ProgressionTable />;
    case 'load':
      return <LoadTable />;
  }
}

export function RulesPage({ route }: { route: Route }): JSX.Element {
  const id = route.path[1];
  const section = id ? RULE_BY_ID[id] : undefined;
  const anchor = route.query.get('h');

  useEffect(() => {
    if (!anchor) return;
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView();
      el.focus({ preventScroll: true });
    }
  }, [anchor, id]);

  if (id && !section) {
    return (
      <>
        <PageHead title="Rules" />
        <Notice kind="warn" title="Not found">No rules section called {id}. <A to="/rules">Back to the rules</A>.</Notice>
      </>
    );
  }

  if (!section) {
    return (
      <>
        <PageHead eyebrow="Rules" title="The rules" lede="Seven short chapters. Read them in order once, then use the search when you need a number." />
        <div class="split-wide">
          <ol class="list-rows" style="list-style: none; padding: 0">
            {RULE_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <A to={`/rules/${s.id}`}>
                  <span class="name">{i + 1}. {s.title}</span>
                  <span class="sub">{s.summary}</span>
                </A>
              </li>
            ))}
          </ol>
          <aside class="panel" aria-label="Quick facts">
            <h2 style="font-size: 1.15rem">In one breath</h2>
            <p>Roll 2d8. Add your modifier. Meet the target. Two 8s make a critical. All 1s make a fumble.</p>
            <p>You have 2 Actions each Turn and 1 Reaction each Scene. Armor is the number an attack must meet.</p>
            <p class="small muted">Use the odds calculator in <A to="/rules/dice">Dice and checks</A> to see exact chances.</p>
          </aside>
        </div>
      </>
    );
  }

  const index = RULE_SECTIONS.findIndex((s) => s.id === section.id);
  const prev = RULE_SECTIONS[index - 1];
  const next = RULE_SECTIONS[index + 1];
  const heads = section.blocks.filter((b): b is Extract<Block, { t: 'h' }> => b.t === 'h');

  return (
    <>
      <PageHead eyebrow={`Rules, chapter ${index + 1}`} title={section.title} lede={section.summary} />
      <div class="rules-layout">
        <div class="prose rule-body">
          {section.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
          <nav class="row-between no-print" aria-label="Chapters" style="margin-top: 2.5rem; font-family: var(--font-sans)">
            {prev ? <A class="btn" to={`/rules/${prev.id}`}>Previous: {prev.title}</A> : <span />}
            {next ? <A class="btn" to={`/rules/${next.id}`}>Next: {next.title}</A> : <span />}
          </nav>
        </div>
        <aside class="rule-aside no-print" aria-label="On this page">
          <p class="eyebrow">Chapters</p>
          <ul class="plain">
            {RULE_SECTIONS.map((s) => (
              <li key={s.id}>
                <A to={`/rules/${s.id}`} current={s.id === section.id}>{s.title}</A>
              </li>
            ))}
          </ul>
          {heads.length > 0 && (
            <>
              <p class="eyebrow" style="margin-top: 1.25rem">On this page</p>
              <ul class="plain">
                {heads.map((h) => (
                  <li key={h.id}>
                    <A to={`/rules/${section.id}?h=${h.id}`}>{h.text}</A>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
