export interface NavItem {
  path: string;
  label: string;
  blurb: string;
  group: string;
}

/** Page order follows the specification. The Character Sheet comes last. */
export const NAV: NavItem[] = [
  { path: '', label: 'Home', blurb: 'Where to begin.', group: 'Start' },
  { path: 'start', label: 'Getting Started', blurb: 'The game on one page.', group: 'Start' },
  { path: 'rules', label: 'Rules', blurb: 'Dice, turns, combat, conditions, recovery and death.', group: 'Rules' },
  { path: 'species', label: 'Species', blurb: 'Twelve peoples and their gifts.', group: 'Build' },
  { path: 'classes', label: 'Classes', blurb: 'Seven classes with six abilities each.', group: 'Build' },
  { path: 'careers', label: 'Careers', blurb: 'Forty-five Careers with ranks.', group: 'Build' },
  { path: 'paths', label: 'Paths', blurb: 'Thirty-three Paths in three ranks.', group: 'Build' },
  { path: 'traits', label: 'Traits and Proficiencies', blurb: 'What Trait Points buy.', group: 'Build' },
  { path: 'equipment', label: 'Equipment', blurb: 'Weapons, armor, shields and trinkets.', group: 'Gear and Magic' },
  { path: 'magic', label: 'Magic', blurb: 'Seven schools and 248 spells.', group: 'Gear and Magic' },
  { path: 'spiritual', label: 'Spiritual Arts', blurb: 'Monk, Shaman and Dragonkin forms.', group: 'Gear and Magic' },
  { path: 'companions', label: 'Companions and Summons', blurb: 'Creatures that follow you.', group: 'Gear and Magic' },
  { path: 'crafting', label: 'Crafting', blurb: 'Six disciplines, recipes and enchantments.', group: 'Gear and Magic' },
  { path: 'artifacts', label: 'Artifacts and Makers', blurb: 'Rare relics and the One Ring.', group: 'World' },
  { path: 'world', label: 'World and Bestiary', blurb: 'Creatures, threat and reference numbers.', group: 'World' },
  { path: 'narrator', label: 'Narrator Tools', blurb: 'Rolls, defenses, conditions and the decision ledger.', group: 'Tools' },
  { path: 'library', label: 'Character Library', blurb: 'Your saved characters.', group: 'Characters' },
  { path: 'create', label: 'Character Creation', blurb: 'Build or level up a character.', group: 'Characters' },
  { path: 'sheet', label: 'Character Sheet', blurb: 'Play with your character.', group: 'Characters' },
];

export const NAV_BY_PATH: Record<string, NavItem> = Object.fromEntries(NAV.map((n) => [n.path, n]));
