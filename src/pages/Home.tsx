import type { JSX } from 'preact';
import { NAV } from '../nav';
import { A } from '../components/common';
import { SPECIES } from '../data/species';
import { CLASSES } from '../data/classes';
import { CAREERS } from '../data/careers';
import { PATHS } from '../data/paths';
import { SPELLS } from '../data/magic';
import { useStore } from '../store/store';
import { derive } from '../engine/derive';
import { StatChip } from '../components/icons';

const FACTS: [string, number][] = [
  ['Species', SPECIES.length],
  ['Classes', CLASSES.length],
  ['Careers', CAREERS.length],
  ['Paths', PATHS.length],
  ['Spells', SPELLS.length],
];

export function HomePage(): JSX.Element {
  const store = useStore();
  const active = store.characters.find((c) => c.id === store.activeId);
  const d = active ? derive(active) : null;
  const groups = ['Build', 'Gear and Magic', 'World', 'Tools'];
  return (
    <>
      <section class="home-top">
        <div>
          <p class="eyebrow">Tabletop role-playing game</p>
          <h1 class="home-title">Lords of the Dark</h1>
          <p class="serif home-lede">
            Rules, catalogues and a character sheet that remembers your numbers. Built for the table, with the Narrator in mind.
          </p>
          <div class="row" style="margin-top: 1.25rem">
            <A class="btn primary" to="/create">Build a character</A>
            <A class="btn" to="/start">Getting started</A>
            <A class="btn quiet" to="/rules">Read the rules</A>
          </div>
        </div>
        <aside class="panel home-resume" aria-label="Your character">
          {active && d ? (
            <>
              <p class="eyebrow">Continue</p>
              <h2 style="margin-bottom: 0.15rem">{active.name.trim() || 'Unnamed character'}</h2>
              <p class="muted" style="margin-bottom: 0.75rem">
                {d.speciesName} {d.className}, level {active.level}
              </p>
              <div class="stats" style="margin-bottom: 1rem">
                <StatChip stat="hp" value={d.hp.value} showLabel />
                <StatChip stat="armor" value={d.armor.value} showLabel />
                {d.hasMana && <StatChip stat="mana" value={d.mana.value} showLabel />}
              </div>
              <div class="row">
                <A class="btn primary" to="/sheet">Open the sheet</A>
                <A class="btn" to="/library">Library</A>
              </div>
            </>
          ) : (
            <>
              <p class="eyebrow">Your characters</p>
              <h2 style="margin-bottom: 0.4rem">None yet</h2>
              <p class="muted">Characters live in this browser. Make one, or import a PDF you saved from here.</p>
              <div class="row">
                <A class="btn primary" to="/create">Start one</A>
                <A class="btn" to="/library">Import</A>
              </div>
            </>
          )}
        </aside>
      </section>

      <dl class="facts" aria-label="The game in numbers">
        {FACTS.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd class="num">{v}</dd>
          </div>
        ))}
      </dl>

      {groups.map((g) => (
        <section class="rail" key={g} aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`}>{g}</h2>
          <ul class="list-rows">
            {NAV.filter((n) => n.group === g).map((n) => (
              <li key={n.path}>
                <A to={`/${n.path}`}>
                  <span class="name">{n.label}</span>
                  <span class="sub">{n.blurb}</span>
                </A>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
