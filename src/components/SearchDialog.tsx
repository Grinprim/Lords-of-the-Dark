import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { search } from '../search';
import { go } from '../router';
import { StatusBadge } from './common';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const hits = useMemo(() => search(q), [q]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 0);
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setSel(0), [q]);

  const pick = (i: number) => {
    const h = hits[i];
    if (!h) return;
    onClose();
    go(h.to);
  };

  return (
    <dialog ref={ref} class="search" aria-label="Search the rules" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div class="search-head">
        <input
          ref={input}
          class="input"
          type="search"
          {...({ role: 'combobox' } as Record<string, unknown>)}
          aria-expanded={hits.length > 0}
          aria-controls="search-list"
          aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
          aria-label="Search species, spells, rules and more"
          placeholder="Search species, spells, rules, items"
          value={q}
          autocomplete="off"
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(hits.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(sel);
            } else if (e.key === 'Escape') {
              // A search field clears itself on Escape. One press should close the dialog.
              e.preventDefault();
              onClose();
            }
          }}
        />
        <p class="count" aria-live="polite" style="margin: 0.4rem 0 0">
          {q.trim() ? `${hits.length}${hits.length === 30 ? '+' : ''} result${hits.length === 1 ? '' : 's'}` : 'Type to search. Arrow keys move, Enter opens, Esc closes.'}
        </p>
      </div>
      <ul class="search-results" id="search-list" role="listbox" aria-label="Results">
        {hits.map((h, i) => (
          <li key={h.to + h.title} role="presentation">
            <a
              id={`hit-${i}`}
              role="option"
              href={`#${h.to}`}
              aria-selected={i === sel}
              onClick={(e) => {
                e.preventDefault();
                pick(i);
              }}
            >
              <span>
                <strong>{h.title}</strong> {h.status && h.status !== 'approved' && <StatusBadge status={h.status} />}
              </span>
              <span class="where">{h.where}</span>
              <span class="snippet">{h.snippet.length > 140 ? h.snippet.slice(0, 137) + '...' : h.snippet}</span>
            </a>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
