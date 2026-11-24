import type { ComponentChildren, JSX } from 'preact';
import { Icon } from './icons';

/** A number with minus and plus buttons. Buttons say why they are off. */
export function Stepper({
  value, onChange, min = 0, max = 99, label, minReason, maxReason, size,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  minReason?: string;
  maxReason?: string;
  size?: 'big';
}): JSX.Element {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <span class={`stepper${size === 'big' ? ' big' : ''}`} role="group" aria-label={label}>
      <button type="button" class="btn small icon" aria-label={`Decrease ${label}`} disabled={atMin} title={atMin ? minReason : undefined} onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={14} />
      </button>
      <output class="num" aria-live="polite">
        {value}
      </output>
      <button type="button" class="btn small icon" aria-label={`Increase ${label}`} disabled={atMax} title={atMax ? maxReason : undefined} onClick={() => onChange(Math.min(max, value + 1))}>
        <Icon name="plus" size={14} />
      </button>
    </span>
  );
}

/** One selectable card. A disabled card always shows its reason as text. */
export function Choice({
  type = 'radio', name, checked, disabled, reason, onChange, title, children, badge,
}: {
  type?: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  disabled?: boolean;
  reason?: string;
  onChange: () => void;
  title: string;
  children?: ComponentChildren;
  badge?: ComponentChildren;
}): JSX.Element {
  return (
    <label class="choice" data-checked={checked} data-disabled={!!disabled}>
      <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} />
      <span class="choice-body">
        <span class="row-between" style="align-items: baseline; gap: 0.5rem">
          <strong class="choice-title">{title}</strong>
          {badge}
        </span>
        {children && <span class="choice-text">{children}</span>}
        {disabled && reason && <span class="choice-reason">{reason}</span>}
      </span>
    </label>
  );
}

export function TextField({
  label, value, onInput, hint, multiline, placeholder, maxLength, width,
}: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  width?: string;
}): JSX.Element {
  return (
    <label class="field" style={width ? `max-width:${width}` : undefined}>
      <span>{label}</span>
      {multiline ? (
        <textarea class="input" value={value} placeholder={placeholder} maxLength={maxLength} onInput={(e) => onInput((e.target as HTMLTextAreaElement).value)} />
      ) : (
        <input class="input" type="text" value={value} placeholder={placeholder} maxLength={maxLength} onInput={(e) => onInput((e.target as HTMLInputElement).value)} />
      )}
      {hint && <span class="field-hint">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label, value, onChange, min, max, hint, width = '8rem',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  width?: string;
}): JSX.Element {
  return (
    <label class="field" style={`max-width:${width}`}>
      <span>{label}</span>
      <input
        class="input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onInput={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          if (Number.isFinite(n)) onChange(Math.trunc(Math.max(min ?? -1e6, Math.min(max ?? 1e6, n))));
        }}
      />
      {hint && <span class="field-hint">{hint}</span>}
    </label>
  );
}
