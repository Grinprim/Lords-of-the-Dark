import type { JSX } from 'preact';
import { ICON_NODES, IconName, STAT_META } from '../iconNodes';
import type { StatId } from '../data/types';

export type { IconName };
export { STAT_META };

type IconNode = [string, Record<string, string | number>][];

interface IconProps {
  name: IconName;
  size?: number;
  /** Accessible label. Leave empty for decorative icons. */
  label?: string;
  class?: string;
}

export function Icon({ name, size = 18, label, class: cls }: IconProps): JSX.Element {
  const nodes = ICON_NODES[name] as unknown as IconNode;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={cls}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {nodes.map(([tag, attrs], i) => {
        const Tag = tag as 'path';
        return <Tag key={i} {...(attrs as Record<string, string>)} />;
      })}
    </svg>
  );
}

interface StatChipProps {
  stat: StatId;
  value: string | number;
  big?: boolean;
  /** Show the label next to the value. */
  showLabel?: boolean;
  suffix?: string;
  title?: string;
}

export function StatChip({ stat, value, big, showLabel, suffix, title }: StatChipProps): JSX.Element {
  const m = STAT_META[stat];
  const text = `${m.label} ${value}${suffix ?? ''}`;
  return (
    <span class={`stat${big ? ' big' : ''}`} title={title ?? m.tip} aria-label={text}>
      <Icon name={m.icon} size={big ? 22 : 16} />
      <span aria-hidden="true">
        {value}
        {suffix ?? ''}
      </span>
      {showLabel && (
        <span class="stat-label" aria-hidden="true">
          {m.short}
        </span>
      )}
    </span>
  );
}
