import type { JSX } from 'preact';
import { A, PageHead } from '../components/common';
import { StatChip } from '../components/icons';

const STEPS: { n: string; title: string; text: string; to: string }[] = [
  { n: '1', title: 'Pick a species', text: 'Twelve peoples. Each gives a net +3 to your attributes. A Human chooses where the points go.', to: '/species' },
  { n: '2', title: 'Pick a class', text: 'Seven classes. Your class adds +1 to two attributes and gives six abilities as you level.', to: '/classes' },
  { n: '3', title: 'Spend attribute points', text: 'You start with 4 AP. The most you can hold in one attribute is 8 and the least is -3.', to: '/rules/attributes' },
  { n: '4', title: 'Choose a Career and a Path', text: 'A Career is a free bundle of choices. It also grants a Path. Paths grow from rank I to rank III.', to: '/careers' },
  { n: '5', title: 'Buy Traits and proficiencies', text: 'Trait Points buy Traits and proficiencies. You also get one eligible weapon proficiency free.', to: '/traits' },
  { n: '6', title: 'Take spells, if you cast', text: 'Casters pick a school and learn spells by tier. Higher tiers open with level.', to: '/magic' },
  { n: '7', title: 'Fit your gear', text: 'Weapons, armor, shields, a cloak and accessories. Weight counts against your capacity.', to: '/equipment' },
  { n: '8', title: 'Review and play', text: 'The builder checks every rule and says why a choice is not open. Then open the sheet.', to: '/create' },
];

export function StartPage(): JSX.Element {
  return (
    <>
      <PageHead eyebrow="Start" title="Getting started" lede="The whole game on one page. Read this, then build a character." />
      <div class="split-wide">
        <div class="prose">
          <h2>What you need</h2>
          <p>A few eight-sided dice, a character, and a Narrator. Everyone else is a player. This site does the arithmetic. You make the choices.</p>
          <h2>How a roll works</h2>
          <p>
            Roll two d8 and add them up. Add your modifier. If the total meets the target, you succeed. The target is a Challenge Score for a task, or the Armor of what you are hitting.
          </p>
          <ul>
            <li>Advantage: roll three d8 and add all three.</li>
            <li>Disadvantage: roll one d8.</li>
            <li>Two or more 8s is a critical. It still has to meet the target.</li>
            <li>Every die showing 1 is a fumble. It always fails.</li>
          </ul>
          <p>
            Want exact chances? Use the <A to="/rules/dice">odds calculator</A>.
          </p>
          <h2>How a turn works</h2>
          <p>
            You get 2 Actions on your Turn and 1 Reaction each Scene. Moving, attacking and most spells cost 1 Action. Keep one Action unused and you can defend with it: Block, Dodge or Parry. <A to="/rules/turns">Turns</A> and <A to="/rules/combat">combat</A> have the details.
          </p>
          <h2>The numbers on your sheet</h2>
          <div class="stats" style="margin: 0.5rem 0 1rem">
            <StatChip stat="hp" value="HP" showLabel />
            <StatChip stat="armor" value="Armor" showLabel />
            <StatChip stat="mana" value="Mana" showLabel />
            <StatChip stat="mov" value="MOV" showLabel />
            <StatChip stat="grace" value="Grace" showLabel />
            <StatChip stat="mp" value="MP" showLabel />
          </div>
          <p>
            Health is how much you can take. Armor is the number an attack must meet. Mana pays for spells. Grace is a pool you can spend before a roll. Mastery Points, shown as MP, are earned in play and buy Path ranks. They are not Mana.
          </p>
        </div>
        <aside>
          <h2 style="font-size: 1.25rem">Make a character</h2>
          <ol class="steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <A to={s.to}>
                  <span class="step-n" aria-hidden="true">{s.n}</span>
                  <span>
                    <strong>{s.title}</strong>
                    <span class="muted"> {s.text}</span>
                  </span>
                </A>
              </li>
            ))}
          </ol>
          <p style="margin-top: 1rem"><A class="btn primary" to="/create">Open the builder</A></p>
        </aside>
      </div>
    </>
  );
}
