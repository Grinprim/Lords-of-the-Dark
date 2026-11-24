// The nine creation steps and which step settles which validation area.

/** Which wizard step settles which validation area. */
export const AREA_STEP: Record<string, string> = {
  Identity: 'basics',
  Level: 'basics',
  Species: 'species',
  Class: 'class',
  Attributes: 'attributes',
  Careers: 'careers',
  Paths: 'careers',
  Traits: 'traits',
  Proficiencies: 'traits',
  Magic: 'magic',
  'Spiritual Arts': 'magic',
  Dragonkin: 'magic',
  Equipment: 'gear',
  Companions: 'gear',
  Notes: 'gear',
  Overrides: 'review',
  State: 'review',
};

export const STEPS: { id: string; label: string; summary: string }[] = [
  { id: 'basics', label: 'Basics', summary: 'Name, player and level.' },
  { id: 'species', label: 'Species', summary: 'Where your character comes from.' },
  { id: 'class', label: 'Class', summary: 'How your character fights or works.' },
  { id: 'attributes', label: 'Attributes', summary: 'Spend your Attribute Points.' },
  { id: 'careers', label: 'Careers and Paths', summary: 'A trade and the Paths it opens.' },
  { id: 'traits', label: 'Traits', summary: 'Trait Points, Traits and proficiencies.' },
  { id: 'magic', label: 'Magic and arts', summary: 'Spells, techniques, Aspects and forms.' },
  { id: 'gear', label: 'Gear and companions', summary: 'What you carry and who travels with you.' },
  { id: 'review', label: 'Review', summary: 'Check everything, then open the sheet.' },
];

