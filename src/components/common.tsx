import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { STATUS_HELP, STATUS_LABEL, Status } from '../data/types';
import { Icon } from './icons';
import { href } from '../router';

/** Status is always spelled out. Colour only helps. */
export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return (
    <span class={`badge ${status}`} title={STATUS_HELP[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHead({ title, lede, eyebrow, children }: { title: string; lede?: string; eyebrow?: string; children?: ComponentChildren }): JSX.Element {
  return (
    <header class="page-head">
      {eyebrow && <p class="eyebrow">{eyebrow}</p>}
      <div class="row-between">
        <h1>{title}</h1>
        {children && <div class="row no-print">{children}</div>}
      </div>
      {lede && <p>{lede}</p>}
    </header>
  );
}

export function Notice({ kind = 'info', title, children }: { kind?: 'info' | 'warn' | 'error' | 'ok'; title?: string; children: ComponentChildren }): JSX.Element {
  return (
    <div class={`note ${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export function A({ to, children, class: cls, current, title }: { to: string; children: ComponentChildren; class?: string; current?: boolean; title?: string }): JSX.Element {
  return (
    <a href={href(to)} class={cls} aria-current={current ? 'page' : undefined} title={title}>
      {children}
    </a>
  );
}

export function Tabs({ items, current, label }: { items: { id: string; label: string; to: string }[]; current: string; label: string }): JSX.Element {
  return (
    <nav class="tabs" aria-label={label}>
      {items.map((t) => (
        <a key={t.id} class="tab" href={href(t.to)} aria-current={t.id === current ? 'page' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

/** A short message that fades from the screen reader queue after a few seconds. */
export function useToast(): { message: string | null; show: (m: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    message,
    show(m: string) {
      setMessage(m);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), 4000);
    },
  };
}

export function Toast({ message }: { message: string | null }): JSX.Element {
  return (
    <div class="toast-region" role="status" aria-live="polite">
      {message && <div class="toast">{message}</div>}
    </div>
  );
}

export function CopyLink({ label = 'Copy link' }: { label?: string }): JSX.Element {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      class="btn small quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* Clipboard can be blocked. The address bar still holds the link. */
        }
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={14} />
      {done ? 'Copied' : label}
    </button>
  );
}

export function Empty({ children }: { children: ComponentChildren }): JSX.Element {
  return <p class="muted empty">{children}</p>;
}

export function download(name: string, data: BlobPart | Uint8Array, type: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
