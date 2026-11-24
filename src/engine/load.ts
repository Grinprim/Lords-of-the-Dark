// Load compares the weight (W) of all equipped items to capacity.

export type LoadBand = 'light' | 'normal' | 'heavy' | 'overloaded';

export interface LoadResult {
  weight: number;
  capacity: number;
  percent: number;
  band: LoadBand;
  /** Change to MOV. Overloaded characters cannot move. */
  movModifier: number;
  canMove: boolean;
  canDodge: boolean;
  label: string;
}

/**
 * Under 50 percent: MOV +1.
 * 50 to 75 percent: normal.
 * Over 75 and under 100 percent: MOV -1.
 * 100 percent or more: no movement and no Dodge.
 */
export function loadBand(weight: number, capacity: number): LoadResult {
  const cap = Math.max(1, capacity);
  const w = Math.max(0, weight);
  const percent = (w / cap) * 100;
  if (w >= cap) {
    return { weight: w, capacity: cap, percent, band: 'overloaded', movModifier: 0, canMove: false, canDodge: false, label: 'Overloaded. No movement and no Dodge.' };
  }
  // Compare with integers so 75 percent exactly stays in the normal band.
  if (w * 100 > cap * 75) {
    return { weight: w, capacity: cap, percent, band: 'heavy', movModifier: -1, canMove: true, canDodge: true, label: 'Heavy. MOV -1.' };
  }
  if (w * 100 < cap * 50) {
    return { weight: w, capacity: cap, percent, band: 'light', movModifier: 1, canMove: true, canDodge: true, label: 'Light. MOV +1.' };
  }
  return { weight: w, capacity: cap, percent, band: 'normal', movModifier: 0, canMove: true, canDodge: true, label: 'Normal.' };
}
