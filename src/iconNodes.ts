// Icon geometry and stat labels without any UI framework. The web UI and the PDF export both read this file.
import {
  Award, Brain, ChevronDown, ChevronRight, Droplet, Footprints, Heart, Shield, Sparkles, Sword, Swords, TimerReset, Weight, Zap,
  Search, Menu, X, Sun, Moon, Printer, Download, Upload, Plus, Minus, Trash2, Copy, Check, TriangleAlert, Info, Save, ArrowLeft, ArrowRight, Dices,
} from 'lucide';
import type { StatId } from './data/types';

export const ICON_NODES = {
  heart: Heart, droplet: Droplet, shield: Shield, swords: Swords, sword: Sword, footprints: Footprints, weight: Weight,
  sparkles: Sparkles, zap: Zap, timerReset: TimerReset, brain: Brain, award: Award,
  search: Search, menu: Menu, x: X, sun: Sun, moon: Moon, printer: Printer, download: Download, upload: Upload,
  plus: Plus, minus: Minus, trash: Trash2, copy: Copy, check: Check, alert: TriangleAlert, info: Info, save: Save,
  chevronRight: ChevronRight, chevronDown: ChevronDown, arrowLeft: ArrowLeft, arrowRight: ArrowRight, dice: Dices,
} as const;

export type IconName = keyof typeof ICON_NODES;

/** One icon and one label for each stat, used everywhere. MP always means Mastery Points. */
export const STAT_META: Record<StatId, { icon: IconName; label: string; short: string; tip: string }> = {
  hp: { icon: 'heart', label: 'Health', short: 'HP', tip: 'Health: how much damage you can take.' },
  mana: { icon: 'droplet', label: 'Mana', short: 'Mana', tip: 'Mana: the resource that pays for spells.' },
  armor: { icon: 'shield', label: 'Armor', short: 'Armor', tip: 'Armor: the total an attack must meet to hit.' },
  atk: { icon: 'swords', label: 'Attack', short: 'ATK', tip: 'Attack: added to your attack roll.' },
  dmg: { icon: 'sword', label: 'Damage', short: 'DMG', tip: 'Damage: dealt when an attack hits.' },
  mov: { icon: 'footprints', label: 'Movement', short: 'MOV', tip: 'Movement: tiles you can move with one Move Action.' },
  weight: { icon: 'weight', label: 'Weight', short: 'W', tip: 'Weight and capacity.' },
  grace: { icon: 'sparkles', label: 'Grace', short: 'Grace', tip: 'Grace: spend it all before a roll for +1 each.' },
  actions: { icon: 'zap', label: 'Actions', short: 'Actions', tip: 'Actions you have each Turn.' },
  reactions: { icon: 'timerReset', label: 'Reactions', short: 'Reactions', tip: 'Reactions you have each Scene.' },
  concentration: { icon: 'brain', label: 'Concentration', short: 'Conc.', tip: 'Concentration: the effect you are holding.' },
  mp: { icon: 'award', label: 'Mastery Points', short: 'MP', tip: 'Mastery Points: earned by play and spent on Path ranks. Not Mana.' },
};
