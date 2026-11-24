import { Status } from './types';

export interface LedgerEntry {
  id: string;
  area: string;
  decision: string;
  status: Status;
  source: string;
  note?: string;
}

/**
 * The decision ledger. The latest approved rules in the specification override the legacy site.
 * Anything that fills a gap is labeled proposal. Nothing here is world canon.
 */
export const LEDGER: LedgerEntry[] = [
  {
    id: 'precedence',
    area: 'Sources',
    decision: 'The latest approved specification overrides the legacy site wherever they disagree.',
    status: 'approved',
    source: 'Specification',
  },
  {
    id: 'legacy-fatigue',
    area: 'Recovery',
    decision: 'Six stacks of Fatigue are no longer fatal by rule. The consequence is left to the Narrator.',
    status: 'legacy',
    source: 'Legacy site',
    note: 'The old site called six stacks fatal. The latest rules do not restate it.',
  },
  {
    id: 'legacy-limbs',
    area: 'Death',
    decision: 'Limb loss and grafting from the old site are kept as a Narrator option only.',
    status: 'legacy',
    source: 'Legacy site',
  },
  {
    id: 'legacy-level1-ceiling',
    area: 'Attributes',
    decision: 'The old level 1 attribute ceiling of 6 is kept as a creation warning, not a hard block.',
    status: 'legacy',
    source: 'Legacy site',
  },
  {
    id: 'human-determination',
    area: 'Species',
    decision: 'Human Determination raises the Grace cap by 2.',
    status: 'owner-review',
    source: 'Specification',
    note: 'The wording is compressed. Please confirm the size of the bonus.',
  },
  {
    id: 'burst-conditions',
    area: 'Conditions',
    decision: 'Burst conditions cap at 5 stacks and activate at the cap. Frost and Madness last 4 Scenes. Reapplying adds 1 stack, up to 8.',
    status: 'owner-review',
    source: 'Specification',
    note: 'The source text is compressed. The tracker follows this reading.',
  },
  {
    id: 'careers-generated',
    area: 'Careers',
    decision: 'Career abilities beyond the foundation of each Career are generated proposals.',
    status: 'proposal',
    source: 'Gap fill',
    note: 'Shaman is the exception. Its abilities are fully specified.',
  },
  {
    id: 'recipes',
    area: 'Crafting',
    decision: 'The 36 recipe names, tiers and Challenge Scores are proposals built from the discipline tier ladder.',
    status: 'proposal',
    source: 'Gap fill',
  },
  {
    id: 'bestiary',
    area: 'World',
    decision: 'Bestiary entries are names and suggested natures only. The Narrator writes lore and numbers.',
    status: 'proposal',
    source: 'Gap fill',
  },
  {
    id: 'artifact-examples',
    area: 'Artifacts',
    decision: 'The six example artifacts are provisional illustrations of the design bands.',
    status: 'provisional',
    source: 'Specification',
  },
  {
    id: 'ring-stages',
    area: 'Artifacts',
    decision: 'The five corruption stages of the One Ring are provisional. The Ring powers and history are reserved.',
    status: 'provisional',
    source: 'Specification',
  },
  {
    id: 'consumable-durations',
    area: 'Crafting',
    decision: 'Temporary consumable effect durations are provisional.',
    status: 'provisional',
    source: 'Specification',
  },
  {
    id: 'summon-vi',
    area: 'Companions',
    decision: 'Tier VI summons are upcast only. Their extensions are set by the Narrator.',
    status: 'approved',
    source: 'Specification',
  },
  {
    id: 'mp-naming',
    area: 'Interface',
    decision: 'MP always means Mastery Points. Mana is written out or shown with the droplet icon.',
    status: 'approved',
    source: 'Specification',
  },
  {
    id: 'storage',
    area: 'Persistence',
    decision: 'Characters live in this browser only. There is no server and no login. Export a PDF or a backup file to move a character.',
    status: 'approved',
    source: 'Specification',
  },
  {
    id: 'accessory-identical',
    area: 'Equipment',
    decision: 'Accessories of the same kind count as identical effects. Only the highest one applies.',
    status: 'owner-review',
    source: 'Implementation',
    note: 'Confirm this is the intended reading.',
  },
  {
    id: 'block-critical-order',
    area: 'Combat',
    decision: 'A critical doubles damage first. A successful Block then halves the doubled damage, rounded down.',
    status: 'owner-review',
    source: 'Implementation',
    note: 'A Dodge or a Parry that succeeds negates the attack, so no critical applies.',
  },
  {
    id: 'fatigue-sleep',
    area: 'Recovery',
    decision: 'Enough Sleep removes 1 Fatigue and replaces the full recovery for a Fatigued character. Only the Sleep HP bonus applies.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'dragon-revert',
    area: 'Dragonkin',
    decision: 'Reverting to Normal costs the form revert cost. With too little Mana the form ends free and the character gains 1 Fatigue. Missed upkeep works the same way.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'form-gear-suspension',
    area: 'Dragonkin',
    decision: 'In a large form, weapons, armor, shields and catalysts are suspended. Cloaks and accessories stay active.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'condition-thresholds',
    area: 'Conditions',
    decision: 'Each condition fills against the physical or the madness threshold. Poison, Dazed, Hesitation and Frightened use their own threshold values.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'non-proficiency',
    area: 'Equipment',
    decision: 'Using gear without its proficiency shows a warning on the sheet. The builder adds no numeric penalty.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'composite-spells',
    area: 'Magic',
    decision: 'Composite spells start at tier III. A caster learns them from their own school, like any other spell. No second school is needed.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'career-upgrade-prereq',
    area: 'Careers',
    decision: 'An upgrade ability may be chosen without holding the basic ability it improves.',
    status: 'owner-review',
    source: 'Implementation',
    note: 'Say so if an upgrade should need its basic.',
  },
  {
    id: 'rank-three-reading',
    area: 'Careers',
    decision: 'Rank III picks one ability from the upgrades and the mastery abilities. Advanced abilities belong to rank II.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'pack-weight',
    area: 'Equipment',
    decision: 'Only items in a worn or held slot add weight. Items in the pack add none.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'levelup-hp',
    area: 'Level up',
    decision: 'A level-up raises maximum Health and Mana. Current Health and Mana stay as they are. The level-up flow does not refill them.',
    status: 'owner-review',
    source: 'Implementation',
  },
  {
    id: 'overrides',
    area: 'Narrator',
    decision: 'A Narrator override replaces a computed total. It needs a written reason. Without one it is ignored and the sheet says so.',
    status: 'approved',
    source: 'Specification',
  },
  {
    id: 'pdf-charset',
    area: 'Persistence',
    decision: 'The PDF uses standard fonts. Characters outside Latin-1 print as a question mark. The embedded data keeps the original text.',
    status: 'provisional',
    source: 'Implementation',
  },
];

export function ledgerByStatus(status: Status): LedgerEntry[] {
  return LEDGER.filter((e) => e.status === status);
}

export function openOwnerDecisions(): LedgerEntry[] {
  return LEDGER.filter((e) => e.status === 'owner-review' || e.status === 'proposal');
}
