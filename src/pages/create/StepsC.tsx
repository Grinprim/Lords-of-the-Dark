import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { SCHOOLS, SPELLS, SCHOOL_BY_ID } from '../../data/magic';
import { TIER_LABEL, DRAGON_FORM_LEVELS } from '../../data/progression';
import {
  DRAGON_AFFINITIES, DRAGON_FORMS, DRAGON_PROPERTIES, DRAGON_PROPERTY_LEVELS, MONK_TECHNIQUES, MONK_TIERS, SHAMAN_ASPECTS,
} from '../../data/spiritual';
import {
  ACCESSORY_KINDS, ACCESSORY_RANK_NAMES, ARMORS, ARMOR_INFUSIONS, CATALYSTS, CATALYST_PROPERTIES, CLOAKS, INFUSIONS, RARITIES, SHIELDS, SHIELD_MODS, SLOT_LABEL,
  VARIANTS, WEAPONS, WEAPON_TIERS, WEAPON_BY_ID, ARMOR_BY_ID, SHIELD_BY_ID, CLOAK_BY_ID, CATALYST_BY_ID, SlotId,
} from '../../data/equipment';
import { COMPANION_ABILITIES, COMPANION_SIZES, COMPANION_SIZE_BY_ID, companionAbilitySlots } from '../../data/companions';
import { Item, ItemKind, newId } from '../../engine/character';
import { slotsFor } from '../../engine/derive';
import { itemKindFits } from '../../engine/items';
import { canEquip, canLearnSpell } from '../../engine/validation';
import { Choice, NumberField, TextField } from '../../components/forms';
import { A, Notice } from '../../components/common';
import type { StepProps } from './StepsA';

const roman = (n: number) => ['', 'I', 'II', 'III'][n] ?? String(n);

// ---- Magic and spiritual arts ----

function SpellPicker({ c, d, update }: StepProps): JSX.Element {
  const [tier, setTier] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const schools = [c.casterSchool, ...c.exceptionalSchools].filter((x): x is string => !!x);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = useMemo(
    () => SPELLS.filter((s) => schools.includes(s.schoolId) && (tier === '' || String(s.tier) === tier) && words.every((w) => `${s.name} ${s.base.effect}`.toLowerCase().includes(w))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schools.join(','), tier, q],
  );
  const known = c.spells.map((id) => SPELLS.find((s) => s.id === id)).filter((s): s is (typeof SPELLS)[number] => !!s);
  return (
    <div class="stack">
      <div>
        <h4>Spells you know ({known.length})</h4>
        {known.length === 0 ? (
          <p class="muted small">None yet.</p>
        ) : (
          <ul class="plain">
            {known.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)).map((s) => (
              <li key={s.id} class="row-between" style="border-bottom: 1px solid var(--line); padding: 0.3rem 0">
                <span>
                  <A to={`/magic/spells/${s.id}`}>{s.name}</A> <span class="muted small">{TIER_LABEL[s.tier]}, {SCHOOL_BY_ID[s.schoolId]?.name}</span>
                </span>
                <button type="button" class="btn small" onClick={() => update((x) => void (x.spells = x.spells.filter((y) => y !== s.id)))}>
                  Forget
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4>Tiers open to you</h4>
        <ul class="plain tier-grid">
          {d.spellTiers.filter((t) => t.tier < 6).map((t) => {
            const n = c.spells.filter((id) => SPELLS.find((s) => s.id === id)?.tier === t.tier).length;
            const allowed = t.allowed + (c.extraSpellSlots[String(t.tier)] ?? 0);
            return (
              <li key={t.tier} class="tier-cell" data-open={t.available}>
                <strong>{TIER_LABEL[t.tier]}</strong>
                <span class="small">{t.available ? `${n} of ${allowed}` : 'Closed'}</span>
                {!t.available && <span class="small muted">{t.reason}</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h4>Learn a spell</h4>
        <div class="filters" style="margin-bottom: 0.5rem">
          <label class="field" style="flex: 1 1 12rem">
            <span class="visually-hidden">Search spells</span>
            <input class="input" type="search" placeholder="Search your school" value={q} onInput={(e) => (setQ((e.target as HTMLInputElement).value), setLimit(30))} />
          </label>
          <label class="field">
            <span class="visually-hidden">Tier</span>
            <select class="input" value={tier} onChange={(e) => (setTier((e.target as HTMLSelectElement).value), setLimit(30))}>
              <option value="">Any tier</option>
              {[0, 1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p class="count" role="status" aria-live="polite">{list.length} spell{list.length === 1 ? '' : 's'} in your school</p>
        <ul class="list-rows spell-pick">
          {list.slice(0, limit).map((s) => {
            const has = c.spells.includes(s.id);
            const el = canLearnSpell(c, d, s.id);
            return (
              <li key={s.id} class="spell-row">
                <div>
                  <A to={`/magic/spells/${s.id}`}><strong class="serif">{s.name}</strong></A> <span class="muted small">{TIER_LABEL[s.tier]}, {s.base.mana} Mana</span>
                  <div class="small muted">{s.base.effect}</div>
                  {!has && !el.ok && <div class="choice-reason">{el.reason}</div>}
                </div>
                {has ? (
                  <button type="button" class="btn small" onClick={() => update((x) => void (x.spells = x.spells.filter((y) => y !== s.id)))}>
                    Forget
                  </button>
                ) : (
                  <button type="button" class="btn small primary" disabled={!el.ok} title={el.reason} onClick={() => update((x) => void x.spells.push(s.id))}>
                    Learn
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {list.length > limit && (
          <p>
            <button type="button" class="btn" onClick={() => setLimit(limit + 30)}>
              Show more
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export function StepMagic(props: StepProps): JSX.Element {
  const { c, d, update } = props;
  const hasMonk = c.careers.some((k) => k.careerId === 'monk');
  const hasShaman = c.careers.some((k) => k.careerId === 'shaman');
  const dragon = c.speciesId === 'dragonkin';
  const ordinary = SCHOOLS.filter((s) => !s.restricted);
  const propAllowed = DRAGON_PROPERTY_LEVELS.filter((l) => l <= d.level).length;
  const nothing = !d.spellcasting && !hasMonk && !hasShaman && !dragon;
  return (
    <div class="stack">
      {nothing && (
        <Notice kind="info" title="Nothing to choose here">
          Spells need the Spellcasting Trait. Monk techniques need the Monk Career, Shaman Aspects need the Shaman Career, and forms need the Dragonkin species. You can still open this step later.
          <p style="margin: 0.5rem 0 0">
            <A to="/create/traits">Back to Traits</A> or <A to="/create/careers">Careers</A>.
          </p>
        </Notice>
      )}

      {d.spellcasting && (
        <section aria-labelledby="school-h">
          <h3 id="school-h">School of magic</h3>
          <p class="muted">Each caster has one ordinary school. {d.casterBranch ? `Your caster Path is ${d.casterBranch}.` : 'Your caster Path sets Sorcery or Incantation.'}</p>
          <div class="choice-grid">
            {ordinary.map((s) => {
              const wrongBranch = !!d.casterBranch && s.branch !== d.casterBranch;
              return (
                <Choice
                  key={s.id}
                  name="school"
                  title={s.name}
                  checked={c.casterSchool === s.id}
                  disabled={wrongBranch}
                  reason={wrongBranch ? `Your caster Path is ${d.casterBranch}. ${s.name} belongs to ${s.branch}.` : undefined}
                  onChange={() => update((x) => void (x.casterSchool = s.id))}
                >
                  {s.branch === 'sorcery' ? 'Sorcery' : 'Incantation'}. {s.summary}
                </Choice>
              );
            })}
          </div>
          {c.casterSchool && <SpellPicker {...props} />}
        </section>
      )}

      {hasMonk && (
        <section aria-labelledby="monk-h">
          <h3 id="monk-h">Monk techniques</h3>
          <p class="muted">A Monk learns 2 Basic techniques to start. Tiers open with level.</p>
          <div class="choice-grid">
            {MONK_TECHNIQUES.map((t) => {
              const tier = MONK_TIERS.find((m) => m.id === t.tier);
              const closed = !!tier && d.level < tier.level;
              const on = c.monk.techniques.includes(t.id);
              return (
                <Choice
                  key={t.id}
                  type="checkbox"
                  name="monk"
                  title={t.name}
                  checked={on}
                  disabled={closed && !on}
                  reason={closed ? `The ${tier?.name} tier opens at level ${tier?.level}.` : undefined}
                  onChange={() => update((x) => void (x.monk.techniques = on ? x.monk.techniques.filter((y) => y !== t.id) : [...x.monk.techniques, t.id]))}
                  badge={<span class="tag">{t.mana === 0 ? 'Free' : `${t.mana} Mana`}</span>}
                >
                  {t.text}
                </Choice>
              );
            })}
          </div>
        </section>
      )}

      {hasShaman && (
        <section aria-labelledby="sh-h">
          <h3 id="sh-h">Shaman Aspects</h3>
          <div class="choice-grid">
            {SHAMAN_ASPECTS.map((a) => {
              const on = c.shaman.aspects.includes(a.id);
              return (
                <Choice key={a.id} type="checkbox" name="aspect" title={a.name} checked={on} onChange={() => update((x) => void (x.shaman.aspects = on ? x.shaman.aspects.filter((y) => y !== a.id) : [...x.shaman.aspects, a.id]))}>
                  {a.text}
                </Choice>
              );
            })}
          </div>
        </section>
      )}

      {dragon && (
        <section aria-labelledby="dr-h">
          <h3 id="dr-h">Dragonkin</h3>
          <p class="muted">Forms and properties are provisional in the specification.</p>
          <label class="field" style="max-width: 16rem">
            <span>Affinity</span>
            <select class="input" value={c.dragon.affinity ?? ''} onChange={(e) => update((x) => void (x.dragon.affinity = (e.target as HTMLSelectElement).value || null))}>
              <option value="">Not chosen</option>
              {DRAGON_AFFINITIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <span class="field-hint">Abyss is exceptional. Holy is not available. An extra affinity is a story event.</span>
          </label>
          <h4 style="margin-top: 1rem">Properties. You may hold {propAllowed}.</h4>
          <div class="choice-grid">
            {DRAGON_PROPERTIES.map((p) => {
              const on = c.dragon.properties.includes(p.id);
              const closed = d.level < p.minLevel;
              const full = c.dragon.properties.length >= propAllowed && !on;
              const reason = closed ? `Needs level ${p.minLevel}.` : full ? `You may hold ${propAllowed} at level ${d.level}.` : undefined;
              return (
                <Choice key={p.id} type="checkbox" name="dprop" title={p.name} checked={on} disabled={(closed || full) && !on} reason={reason} onChange={() => update((x) => void (x.dragon.properties = on ? x.dragon.properties.filter((y) => y !== p.id) : [...x.dragon.properties, p.id]))}>
                  {p.text}
                </Choice>
              );
            })}
          </div>
          <h4 style="margin-top: 1rem">Form</h4>
          <div class="choice-grid">
            {DRAGON_FORMS.filter((f) => !f.exceptional).map((f, i) => {
              const lvl = DRAGON_FORM_LEVELS[i] ?? f.level;
              const closed = d.level < lvl;
              return (
                <Choice key={f.id} name="dform" title={f.name} checked={c.dragon.form === f.id} disabled={closed} reason={closed ? `Opens at level ${lvl}.` : undefined} onChange={() => update((x) => void (x.dragon.form = f.id))}>
                  Size {f.size}. HP +{f.hp}, Armor +{f.armor}.
                </Choice>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Gear and companions ----

const KIND_LABEL: Record<ItemKind, string> = { weapon: 'Weapon', armor: 'Armor', shield: 'Shield', cloak: 'Cloak', accessory: 'Accessory', catalyst: 'Catalyst', custom: 'Custom item' };
const EFFECT_STATS: [string, string][] = [
  ['hp', 'Health'], ['mana', 'Mana'], ['armor', 'Armor'], ['mov', 'Movement'], ['capacity', 'Capacity'], ['graceStart', 'Starting Grace'], ['graceCap', 'Grace cap'], ['thresholdAll', 'All thresholds'],
];

function itemSummary(it: Item): string {
  switch (it.kind) {
    case 'weapon': {
      const b = WEAPON_BY_ID[it.baseId ?? ''];
      const t = WEAPON_TIERS.find((x) => x.id === it.tierId);
      return `${b?.name ?? 'Weapon'}${t ? `, ${t.name}` : ''}${it.variant && it.variant !== 'none' ? `, ${it.variant}` : ''}${it.infusion && it.infusion !== 'none' ? `, ${it.infusion}` : ''}`;
    }
    case 'armor':
      return `${ARMOR_BY_ID[it.baseId ?? '']?.name ?? 'Armor'}${it.infusion && it.infusion !== 'none' ? `, ${it.infusion}` : ''}`;
    case 'shield':
      return `${SHIELD_BY_ID[it.baseId ?? '']?.name ?? 'Shield'}${it.shieldMod && it.shieldMod !== 'none' ? `, ${it.shieldMod}` : ''}`;
    case 'cloak':
      return CLOAK_BY_ID[it.baseId ?? '']?.name ?? 'Cloak';
    case 'accessory':
      return `${ACCESSORY_KINDS.find((k) => k.id === it.accessoryKind)?.name ?? 'Accessory'} ${ACCESSORY_RANK_NAMES[(it.accessoryRank ?? 1) - 1] ?? ''}`;
    case 'catalyst':
      return `${CATALYST_BY_ID[it.baseId ?? '']?.name ?? 'Catalyst'}${it.property ? `, ${CATALYST_PROPERTIES.find((p) => p.id === it.property!.id)?.name} ${roman(it.property.rank)}` : ''}`;
    default:
      return `ATK ${it.atk ?? 0}, DMG ${it.dmg ?? 0}, Armor ${it.armor ?? 0}, W ${it.w ?? 0}`;
  }
}

function AddItem({ update }: { update: StepProps['update'] }): JSX.Element {
  const [kind, setKind] = useState<ItemKind>('weapon');
  const [name, setName] = useState('');
  const [baseId, setBaseId] = useState('longsword');
  const [tierId, setTierId] = useState('entry');
  const [variant, setVariant] = useState('none');
  const [infusion, setInfusion] = useState('none');
  const [shieldMod, setShieldMod] = useState('none');
  const [accKind, setAccKind] = useState('health');
  const [accRank, setAccRank] = useState(1);
  const [propId, setPropId] = useState('');
  const [propRank, setPropRank] = useState(1);
  const [rarity, setRarity] = useState('');
  const [custom, setCustom] = useState({ atk: 0, dmg: 0, armor: 0, block: 0, w: 1, hands: 1 as 1 | 2, effStat: '', effV: 0, exceptional: false, notes: '' });

  const bases: Record<string, { id: string; name: string }[]> = { weapon: WEAPONS, armor: ARMORS, shield: SHIELDS, cloak: CLOAKS, catalyst: CATALYSTS };
  const pickKind = (k: ItemKind) => {
    setKind(k);
    setBaseId(bases[k]?.[0]?.id ?? '');
    setName('');
  };

  const add = () => {
    const base = bases[kind]?.find((b) => b.id === baseId);
    const label = name.trim() || (kind === 'accessory' ? `${ACCESSORY_KINDS.find((k) => k.id === accKind)?.name} charm` : (base?.name ?? KIND_LABEL[kind]));
    const it: Item = { uid: newId('i'), kind, name: label };
    if (kind === 'weapon') Object.assign(it, { baseId, tierId, variant, infusion });
    if (kind === 'armor') Object.assign(it, { baseId, infusion });
    if (kind === 'shield') Object.assign(it, { baseId, shieldMod });
    if (kind === 'cloak') it.baseId = baseId;
    if (kind === 'accessory') Object.assign(it, { accessoryKind: accKind, accessoryRank: accRank });
    if (kind === 'catalyst') {
      it.baseId = baseId;
      if (propId) it.property = { id: propId, rank: propRank };
    }
    if (rarity) it.rarity = rarity;
    if (kind === 'custom') {
      Object.assign(it, { atk: custom.atk, dmg: custom.dmg, armor: custom.armor, block: custom.block, w: custom.w, hands: custom.hands, exceptional: custom.exceptional });
      if (custom.effStat) it.effects = [{ stat: custom.effStat, v: custom.effV, label: label }];
      if (custom.notes.trim()) it.notes = custom.notes.trim();
    }
    update((x) => void x.items.push(it));
    setName('');
  };

  return (
    <div class="panel">
      <h4>Add an item</h4>
      <div class="grid-auto" style="margin-bottom: 0.75rem">
        <label class="field">
          <span>Kind</span>
          <select class="input" value={kind} onChange={(e) => pickKind((e.target as HTMLSelectElement).value as ItemKind)}>
            {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {bases[kind] && (
          <label class="field">
            <span>Base</span>
            <select class="input" value={baseId} onChange={(e) => setBaseId((e.target as HTMLSelectElement).value)}>
              {bases[kind].map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'weapon' && (
          <>
            <label class="field">
              <span>Tier</span>
              <select class="input" value={tierId} onChange={(e) => setTierId((e.target as HTMLSelectElement).value)}>
                {WEAPON_TIERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (+{t.atk} ATK, +{t.dmg} DMG)
                  </option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>Variant</span>
              <select class="input" value={variant} onChange={(e) => setVariant((e.target as HTMLSelectElement).value)}>
                {VARIANTS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>Infusion</span>
              <select class="input" value={infusion} onChange={(e) => setInfusion((e.target as HTMLSelectElement).value)}>
                {INFUSIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === 'armor' && (
          <label class="field">
            <span>Infusion</span>
            <select class="input" value={infusion} onChange={(e) => setInfusion((e.target as HTMLSelectElement).value)}>
              {ARMOR_INFUSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}: {v.text}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'shield' && (
          <label class="field">
            <span>Modification</span>
            <select class="input" value={shieldMod} onChange={(e) => setShieldMod((e.target as HTMLSelectElement).value)}>
              {SHIELD_MODS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}: {v.text}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'accessory' && (
          <>
            <label class="field">
              <span>Accessory kind</span>
              <select class="input" value={accKind} onChange={(e) => setAccKind((e.target as HTMLSelectElement).value)}>
                {ACCESSORY_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>Rank</span>
              <select class="input" value={accRank} onChange={(e) => setAccRank(Number((e.target as HTMLSelectElement).value))}>
                {ACCESSORY_RANK_NAMES.map((n, i) => (
                  <option key={n} value={i + 1}>
                    {n}: {ACCESSORY_KINDS.find((k) => k.id === accKind)?.values[i]} {ACCESSORY_KINDS.find((k) => k.id === accKind)?.unit}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === 'catalyst' && (
          <>
            <label class="field">
              <span>Property</span>
              <select class="input" value={propId} onChange={(e) => setPropId((e.target as HTMLSelectElement).value)}>
                <option value="">None</option>
                {CATALYST_PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {propId && (
              <label class="field">
                <span>Property rank</span>
                <select class="input" value={propRank} onChange={(e) => setPropRank(Number((e.target as HTMLSelectElement).value))}>
                  {[1, 2, 3].map((r) => (
                    <option key={r} value={r}>
                      {roman(r)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        {kind !== 'custom' && (
          <label class="field">
            <span>Rarity</span>
            <select class="input" value={rarity} onChange={(e) => setRarity((e.target as HTMLSelectElement).value)}>
              <option value="">Not stated</option>
              {RARITIES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <TextField label="Name (optional)" value={name} maxLength={80} onInput={setName} />
      </div>

      {kind === 'custom' && (
        <div class="stack" style="margin-bottom: 0.75rem">
          <p class="small muted">A custom item holds exactly what you type. Use it for Narrator gifts and artifacts. Tick Exceptional only if the Narrator allows it to pass the ordinary ceilings.</p>
          <div class="filters">
            <NumberField label="ATK" value={custom.atk} min={-20} max={30} onChange={(n) => setCustom({ ...custom, atk: n })} width="6rem" />
            <NumberField label="DMG" value={custom.dmg} min={0} max={60} onChange={(n) => setCustom({ ...custom, dmg: n })} width="6rem" />
            <NumberField label="Armor" value={custom.armor} min={0} max={30} onChange={(n) => setCustom({ ...custom, armor: n })} width="6rem" />
            <NumberField label="Block" value={custom.block} min={0} max={20} onChange={(n) => setCustom({ ...custom, block: n })} width="6rem" />
            <NumberField label="Weight" value={custom.w} min={0} max={100} onChange={(n) => setCustom({ ...custom, w: n })} width="6rem" />
            <label class="field">
              <span>Hands</span>
              <select class="input" value={custom.hands} onChange={(e) => setCustom({ ...custom, hands: Number((e.target as HTMLSelectElement).value) === 2 ? 2 : 1 })}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
          </div>
          <div class="filters">
            <label class="field">
              <span>Effect on</span>
              <select class="input" value={custom.effStat} onChange={(e) => setCustom({ ...custom, effStat: (e.target as HTMLSelectElement).value })}>
                <option value="">No effect</option>
                {EFFECT_STATS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {custom.effStat && <NumberField label="Amount" value={custom.effV} min={-50} max={50} onChange={(n) => setCustom({ ...custom, effV: n })} width="6rem" />}
            <label class="check">
              <input type="checkbox" checked={custom.exceptional} onChange={() => setCustom({ ...custom, exceptional: !custom.exceptional })} />
              Exceptional
            </label>
          </div>
          <TextField label="Notes" multiline value={custom.notes} maxLength={600} onInput={(v) => setCustom({ ...custom, notes: v })} />
        </div>
      )}
      <button type="button" class="btn primary" onClick={add}>
        Add to gear
      </button>
    </div>
  );
}

export function StepGear(props: StepProps): JSX.Element {
  const { c, d, update } = props;
  const slots = slotsFor(c);
  const [cName, setCName] = useState('');
  const [cKind, setCKind] = useState<'companion' | 'summon'>('companion');
  const [cSize, setCSize] = useState('minor');
  const usedBy = (uid: string) => Object.entries(c.equipment).find(([, u]) => u === uid)?.[0] as SlotId | undefined;
  const abilitySlots = companionAbilitySlots(d.level);

  return (
    <div class="stack">
      <div class="row" style="gap: 1.5rem">
        <span class="num">
          Weight <strong>{d.weight}</strong> of {d.capacity.value} capacity ({Math.round(d.load.percent)}%)
        </span>
        <span class="badge approved" title="Load band">{d.load.band === 'overloaded' ? 'Overloaded' : d.load.movModifier > 0 ? 'Light load' : d.load.movModifier < 0 ? 'Heavy load' : 'Normal load'}</span>
      </div>

      <p class="small muted" style="margin: 0">Weight counts the items in your slots. Items in your pack are not counted.</p>

      <section aria-labelledby="slots-h">
        <h3 id="slots-h">What you wear and hold</h3>
        <div class="grid-auto">
          {slots.map((slot) => {
            const options = c.items.filter((it) => itemKindFits(it.kind, slot));
            const current = c.equipment[slot] ?? '';
            return (
              <label key={slot} class="field">
                <span>{SLOT_LABEL[slot]}</span>
                <select
                  class="input"
                  value={current}
                  onChange={(e) =>
                    update((x) => {
                      const uid = (e.target as HTMLSelectElement).value;
                      // One item sits in one slot. Moving it frees the old slot.
                      for (const s of Object.keys(x.equipment) as SlotId[]) if (x.equipment[s] === uid) delete x.equipment[s];
                      if (uid) x.equipment[slot] = uid;
                      else delete x.equipment[slot];
                    })
                  }
                >
                  <option value="">Empty</option>
                  {options.map((it) => {
                    const el = canEquip(c, d, it.uid, slot);
                    const other = usedBy(it.uid);
                    return (
                      <option key={it.uid} value={it.uid} disabled={!el.ok}>
                        {it.name}
                        {other && other !== slot ? ` (now in ${SLOT_LABEL[other]})` : ''}
                      </option>
                    );
                  })}
                </select>
              </label>
            );
          })}
        </div>
        {d.ignoredItems.map((ig) => (
          <Notice key={ig.uid} kind="warn" title="Not counted">{ig.reason}</Notice>
        ))}
        {d.equipped.flatMap((e) => e.view.warnings.map((w, i) => <p key={`${e.slot}-${i}`} class="small" style="color: var(--warn)">{SLOT_LABEL[e.slot]}: {w}</p>))}
      </section>

      <section aria-labelledby="inv-h">
        <h3 id="inv-h">Everything you own ({c.items.length})</h3>
        {c.items.length === 0 ? (
          <p class="muted">Nothing yet. Add items below. Starting gear is a table agreement with your Narrator.</p>
        ) : (
          <ul class="plain">
            {c.items.map((it) => (
              <li key={it.uid} class="item-row">
                <div style="min-width: 0">
                  <input class="input item-name" aria-label="Item name" value={it.name} maxLength={80} onInput={(e) => update((x) => { const t = x.items.find((i) => i.uid === it.uid); if (t) t.name = (e.target as HTMLInputElement).value; })} />
                  <div class="small muted">
                    {KIND_LABEL[it.kind]}. {itemSummary(it)}
                    {usedBy(it.uid) ? `. In ${SLOT_LABEL[usedBy(it.uid)!]}.` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  class="btn small danger"
                  onClick={() =>
                    update((x) => {
                      x.items = x.items.filter((i) => i.uid !== it.uid);
                      for (const s of Object.keys(x.equipment) as SlotId[]) if (x.equipment[s] === it.uid) delete x.equipment[s];
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddItem update={update} />
      </section>

      <section aria-labelledby="comp-h">
        <h3 id="comp-h">Companions and summons</h3>
        <p class="muted small">
          Companion capacity {d.companionUsed} of {d.companionCapacity}. Summon capacity {d.summonUsed} of {d.summonCapacity}. You hold {abilitySlots} companion abilit{abilitySlots === 1 ? 'y' : 'ies'} at level {d.level}.
        </p>
        {c.companions.map((k) => (
          <div key={k.id} class="panel" style="margin-bottom: 0.6rem">
            <div class="row-between">
              <strong class="serif">{k.name || 'Unnamed'}</strong>
              <span class="row">
                <span class="tag">{k.kind === 'companion' ? 'Companion' : 'Summon'}</span>
                <span class="tag">{COMPANION_SIZE_BY_ID[k.size]?.name ?? k.size}</span>
                <button type="button" class="btn small danger" onClick={() => update((x) => void (x.companions = x.companions.filter((y) => y.id !== k.id)))}>
                  Remove
                </button>
              </span>
            </div>
            {k.kind === 'companion' && (
              <fieldset class="plain-fieldset" style="margin-top: 0.5rem">
                <legend class="small">Abilities ({k.abilities.length} of {abilitySlots})</legend>
                <div class="row">
                  {COMPANION_ABILITIES.map((a) => {
                    const on = k.abilities.includes(a.id);
                    const full = k.abilities.length >= abilitySlots && !on;
                    return (
                      <label key={a.id} class="check tag-check" data-checked={on} title={full ? 'No ability slots left.' : a.text}>
                        <input type="checkbox" checked={on} disabled={full} onChange={() => update((x) => { const t = x.companions.find((y) => y.id === k.id); if (t) t.abilities = on ? t.abilities.filter((y) => y !== a.id) : [...t.abilities, a.id]; })} />
                        {a.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <TextField label="Notes" value={k.notes} maxLength={400} onInput={(v) => update((x) => { const t = x.companions.find((y) => y.id === k.id); if (t) t.notes = v; })} />
          </div>
        ))}
        <div class="row" style="align-items: flex-end">
          <TextField label="Name" value={cName} maxLength={60} onInput={setCName} width="14rem" />
          <label class="field">
            <span>Kind</span>
            <select class="input" value={cKind} onChange={(e) => setCKind((e.target as HTMLSelectElement).value as 'companion' | 'summon')}>
              <option value="companion">Companion</option>
              <option value="summon">Summon</option>
            </select>
          </label>
          <label class="field">
            <span>Size</span>
            <select class="input" value={cSize} onChange={(e) => setCSize((e.target as HTMLSelectElement).value)}>
              {COMPANION_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (uses {s.capacity})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            class="btn"
            onClick={() => {
              update((x) => void x.companions.push({ id: newId('k'), name: cName.trim(), kind: cKind, size: cSize, abilities: [], notes: '' }));
              setCName('');
            }}
          >
            Add
          </button>
        </div>
        {COMPANION_SIZE_BY_ID[cSize] && d.level < COMPANION_SIZE_BY_ID[cSize].minLevel && cKind === 'companion' && (
          <p class="small" style="color: var(--warn)">{COMPANION_SIZE_BY_ID[cSize].name} companions open at level {COMPANION_SIZE_BY_ID[cSize].minLevel}. The sheet will warn.</p>
        )}
      </section>
    </div>
  );
}
