import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'favorite',           label: '★',              width: '40px'  },
  { key: 'date',               label: 'Date',           width: '90px'  },
  { key: 'beans',              label: 'Bean / Origin',  width: '160px' },
  { key: 'variety',            label: 'Variety',        width: '100px' },
  { key: 'processing',         label: 'Process',        width: '90px'  },
  { key: 'roastLevel',         label: 'Roast',          width: '100px' },
  { key: 'method',             label: 'Method',         width: '100px' },
  { key: 'grinder',            label: 'Grinder',        width: '100px' },
  { key: 'grindSetting',       label: 'Grind',          width: '80px'  },
  { key: 'groundCoffeeWeight', label: 'Coffee (g)',     width: '80px'  },
  { key: 'waterTemp',          label: 'Temp',           width: '60px'  },
  { key: 'waterIn',            label: 'Water',          width: '70px'  },
  { key: 'brewTime',           label: 'Time',           width: '70px'  },
  { key: 'roastingDate',       label: 'Roast Date',     width: '90px'  },
  { key: 'flavorTags',         label: 'Flavors',        width: '220px' },
  { key: 'notes',              label: 'Tasting Notes',  width: '180px' },
  { key: 'brewingRecipe',      label: 'Recipe',         width: '180px' },
  { key: 'extra',              label: 'Extra Info',     width: '150px' },
];

const BREW_METHODS    = ['V60', 'Chemex', 'AeroPress', 'French Press', 'Espresso', 'Moka Pot', 'Cold Brew', 'Siphon', 'Other'];
const PROCESSING_OPTS = ['Natural', 'Washed', 'Honey', 'Anaerobic', 'Wet-Hulled', 'Semi-Washed', 'Other'];
const ROAST_OPTS      = ['Light', 'Light-Medium', 'Medium', 'Medium-Dark', 'Dark', 'Extra Dark'];

const METHOD_COLORS = {
  'V60':          { bg: '#E8F5E9', color: '#2E7D32' },
  'Chemex':       { bg: '#E3F2FD', color: '#1565C0' },
  'AeroPress':    { bg: '#F3E5F5', color: '#6A1B9A' },
  'French Press': { bg: '#FFF8E1', color: '#F57F17' },
  'Espresso':     { bg: '#FFEBEE', color: '#B71C1C' },
  'Moka Pot':     { bg: '#FBE9E7', color: '#BF360C' },
  'Cold Brew':    { bg: '#E0F7FA', color: '#006064' },
  'Siphon':       { bg: '#F9FBE7', color: '#558B2F' },
  'Other':        { bg: '#EFEBE9', color: '#4E342E' },
};

const PROCESSING_COLORS = {
  'Natural':     { bg: '#FFF3E0', color: '#E65100' },
  'Washed':      { bg: '#E3F2FD', color: '#0D47A1' },
  'Honey':       { bg: '#FFFDE7', color: '#F57F17' },
  'Anaerobic':   { bg: '#F3E5F5', color: '#4A148C' },
  'Wet-Hulled':  { bg: '#E0F2F1', color: '#004D40' },
  'Semi-Washed': { bg: '#F1F8E9', color: '#33691E' },
  'Other':       { bg: '#EFEBE9', color: '#4E342E' },
};

const ROAST_COLORS = {
  'Light':        { bg: '#FFF9C4', color: '#827717' },
  'Light-Medium': { bg: '#FFE0B2', color: '#E65100' },
  'Medium':       { bg: '#FFCCBC', color: '#BF360C' },
  'Medium-Dark':  { bg: '#D7CCC8', color: '#4E342E' },
  'Dark':         { bg: '#5D4037', color: '#FFCCBC' },
  'Extra Dark':   { bg: '#212121', color: '#BDBDBD' },
};

const FLAVOR_PALETTE = {
  citrus:    'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  chocolate: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
  aroma:     'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  fruity:    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  honey:     'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  raspberry: 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',
  banana:    'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  green:     'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  apple:     'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  grape:     'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  mango:     'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  acidic:    'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
  nutty:     'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
  pineapple: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  tropical:  'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
  floral:    'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  caramel:   'linear-gradient(135deg, #D4A574 0%, #b8860b 100%)',
  berry:     'linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%)',
  intense:   'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  describe:  'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
};

const FLAVOR_EMOJI_MAP = {
  citrus: '🍊', chocolate: '🍫', fruity: '🍇', berry: '🫐',
  raspberry: '🫐', banana: '🍌', apple: '🍏', grape: '🍇',
  mango: '🥭', pineapple: '🍍', tropical: '🌴', honey: '🍯',
  caramel: '🍮', nutty: '🥜', floral: '🌸', aroma: '🌺',
  acidic: '💧', intense: '🔥', green: '🌿', describe: '📝',
};

const MASTER_FLAVORS = [
  'Citrus', 'Chocolate', 'Fruity', 'Berry', 'Raspberry', 'Banana', 'Apple',
  'Grape', 'Mango', 'Pineapple', 'Tropical', 'Honey', 'Caramel', 'Nutty',
  'Floral', 'Aroma', 'Acidic', 'Intense', 'Green', 'Jasmine', 'Rose',
  'Vanilla', 'Spicy', 'Earthy', 'Herbal', 'Winey', 'Butter', 'Toffee',
  'Peach', 'Apricot', 'Plum', 'Cherry', 'Blueberry', 'Strawberry',
  'Lemon', 'Orange', 'Grapefruit', 'Lime', 'Almond', 'Hazelnut',
  'Walnut', 'Smoke', 'Cedar', 'Sweet', 'Bright', 'Clean', 'Juicy',
];

const getFlavorStyle = (word) =>
  FLAVOR_PALETTE[word?.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';

const getFlavorEmoji = (word) =>
  FLAVOR_EMOJI_MAP[word?.toLowerCase()] || '☕';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val, fallback = '—') =>
  val === null || val === undefined || val === '' ? fallback : val;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    if (typeof dateStr === 'object' && dateStr.toDate) {
      return dateStr.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    }
    const d = new Date(String(dateStr).includes('T') ? dateStr : dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return String(dateStr); }
};

// ─── No Region Modal ──────────────────────────────────────────────────────────

const NoRegionModal = ({ brew, onClose }) => (
  <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={s.noRegionModal}>
      <div style={s.noRegionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🌍</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#F5E6D3' }}>Bean Origin</div>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,211,0.6)', marginTop: '1px' }}>{brew.beans}</div>
          </div>
        </div>
        <button onClick={onClose} style={s.noRegionCloseBtn}>✕</button>
      </div>
      <div style={s.noRegionBody}>
        <div style={{ fontSize: '44px', marginBottom: '12px', opacity: 0.35 }}>🗺️</div>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#2C1810', marginBottom: '8px' }}>
          No region linked to this brew
        </div>
        <div style={{ fontSize: '13px', color: '#8D6E63', lineHeight: '1.6', maxWidth: '280px', marginBottom: '16px' }}>
          Link this brew to a region on the map by editing it and selecting a location via <strong>Add Brew</strong> on the map tab.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
          {['Ethiopia', 'Kenya', 'Colombia', 'Guatemala', 'Brazil', 'Panama', 'Yemen', 'Indonesia'].map(c => (
            <span key={c} style={{ padding: '3px 10px', background: '#F5F0EC', borderRadius: '20px', fontSize: '11px', color: '#5D4037', fontWeight: '600' }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 20px', borderTop: '1px solid #EFEBE9', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={s.cancelBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const ColorBadge = ({ value, colorMap }) => {
  if (!value) return <span style={s.dash}>—</span>;
  const palette = colorMap[value] || { bg: '#EFEBE9', color: '#4E342E' };
  return <span style={{ ...s.badge, background: palette.bg, color: palette.color }}>{value}</span>;
};

const FlavorTagsCell = ({ tags }) => {
  if (!tags || !Array.isArray(tags) || tags.length === 0)
    return <span style={s.dash}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {tags.map((tag, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          background: getFlavorStyle(tag), color: 'white',
          padding: '2px 7px', borderRadius: '20px', fontSize: '11px',
          fontWeight: '700', whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}>
          {getFlavorEmoji(tag)} {tag}
        </span>
      ))}
    </div>
  );
};

const SortIcon = ({ active, direction }) => (
  <span style={{ marginLeft: '4px', opacity: active ? 1 : 0.3, fontSize: '10px' }}>
    {active ? (direction === 'asc' ? '▲' : '▼') : '⬍'}
  </span>
);

const StatCard = ({ value, label, icon }) => (
  <div style={s.statCard}>
    <div style={s.statIcon}>{icon}</div>
    <div style={s.statValue}>{value}</div>
    <div style={s.statLabel}>{label}</div>
  </div>
);

// ─── Bean Filter Banner ───────────────────────────────────────────────────────

const BeanFilterBanner = ({ beanName, onClear }) => (
  <div style={s.filterBanner}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '14px' }}>☕</span>
      <span style={s.filterBannerText}>
        Showing brews for <strong>{beanName}</strong>
      </span>
    </div>
    <button onClick={onClear} style={s.filterBannerClear} title="Clear filter">
      ✕ Show all brews
    </button>
  </div>
);

// ─── Inline Flavor Tag Editor ─────────────────────────────────────────────────

function FlavorTagEditor({ tags, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const inputRef          = React.useRef(null);
  const wrapRef           = React.useRef(null);

  const current = Array.isArray(tags) ? tags : [];

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches = MASTER_FLAVORS.filter(f => f.toLowerCase().includes(q) && !current.includes(f));
    const exact = MASTER_FLAVORS.find(f => f.toLowerCase() === q);
    if (!exact && query.trim().length > 1 && !current.includes(query.trim()))
      matches.push(`"${query.trim()}"`);
    return matches.slice(0, 8);
  }, [query, current]);

  const add = (raw) => {
    const flavor = raw.startsWith('"') ? raw.slice(1, -1) : raw;
    const cap = flavor.charAt(0).toUpperCase() + flavor.slice(1).toLowerCase();
    if (!current.includes(cap)) onChange([...current, cap]);
    setQuery(''); setOpen(false); inputRef.current?.focus();
  };

  const remove = (f) => onChange(current.filter(t => t !== f));

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      {current.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {current.map(f => (
            <span key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: getFlavorStyle(f), color: 'white',
              padding: '3px 9px', borderRadius: '20px',
              fontSize: '11px', fontWeight: '700',
            }}>
              {getFlavorEmoji(f)} {f}
              <button type="button" onClick={() => remove(f)} style={{
                background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%',
                width: '14px', height: '14px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: '9px',
                color: 'white', padding: 0, lineHeight: 1,
              }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          style={{ ...s.input, paddingLeft: '28px', fontSize: '12px' }}
          placeholder="Search or add flavors…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); add(filtered[0]); }
            if (e.key === 'Escape') setOpen(false);
          }}
          autoComplete="off"
        />
        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', pointerEvents: 'none' }}>🔍</span>
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0,
            background: 'white', border: '1px solid #D7CCC8', borderRadius: '6px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden',
          }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1, -1) : item;
              return (
                <button key={i} type="button"
                  onMouseDown={e => { e.preventDefault(); add(item); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: i < filtered.length - 1 ? '1px solid #F5F0EC' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                    background: getFlavorStyle(label),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                  }}>{getFlavorEmoji(label)}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>
                    {isCustom ? `Add "${label}"` : label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal = ({ brew, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({ ...brew });
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const Row = ({ children, full = false }) => (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto', ...s.inputGrp }}>{children}</div>
  );
  const Label = ({ children }) => <label style={s.editLabel}>{children}</label>;

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.editModal}>
        <div style={s.editHeader}>
          <span style={{ fontSize: '18px' }}>✏️</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#2C1810' }}>Edit Brew Record</h3>
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#8D6E63' }}>✕</button>
        </div>
        <div style={s.editBody}>
          <div style={s.editGrid}>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Record</div>
            <Row>
              <Label>Date</Label>
              <input style={s.input} type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} />
            </Row>
            <Row>
              <Label>Beans</Label>
              <input style={s.input} value={form.beans || ''} onChange={e => set('beans', e.target.value)} />
            </Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Bean Info</div>
            <Row>
              <Label>Variety</Label>
              <input style={s.input} placeholder="Geisha, Bourbon…" value={form.variety || ''} onChange={e => set('variety', e.target.value)} />
            </Row>
            <Row>
              <Label>Processing</Label>
              <select style={s.input} value={form.processing || ''} onChange={e => set('processing', e.target.value)}>
                <option value="">Select…</option>
                {PROCESSING_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Row>
            <Row>
              <Label>Roast Level</Label>
              <select style={s.input} value={form.roastLevel || ''} onChange={e => set('roastLevel', e.target.value)}>
                <option value="">Select…</option>
                {ROAST_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Row>
            <Row>
              <Label>Roasting Date</Label>
              <input style={s.input} type="date" value={form.roastingDate || ''} onChange={e => set('roastingDate', e.target.value)} />
            </Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Brew Setup</div>
            <Row>
              <Label>Brew Method</Label>
              <select style={s.input} value={form.method || ''} onChange={e => set('method', e.target.value)}>
                <option value="">Select…</option>
                {BREW_METHODS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Row>
            <Row>
              <Label>Grinder</Label>
              <input style={s.input} value={form.grinder || ''} onChange={e => set('grinder', e.target.value)} />
            </Row>
            <Row>
              <Label>Grind Setting</Label>
              <input style={s.input} value={form.grindSetting || ''} onChange={e => set('grindSetting', e.target.value)} />
            </Row>
            <Row>
              <Label>Coffee (g)</Label>
              <input style={s.input} type="number" min="0" step="0.1" value={form.groundCoffeeWeight || ''} onChange={e => set('groundCoffeeWeight', e.target.value)} />
            </Row>
            <Row>
              <Label>Temp (°C)</Label>
              <input style={s.input} type="number" value={form.waterTemp || ''} onChange={e => set('waterTemp', e.target.value)} />
            </Row>
            <Row>
              <Label>Water (ml)</Label>
              <input style={s.input} type="number" value={form.waterIn || ''} onChange={e => set('waterIn', e.target.value)} />
            </Row>
            <Row>
              <Label>Brew Time</Label>
              <input style={s.input} placeholder="2:30" value={form.brewTime || ''} onChange={e => set('brewTime', e.target.value)} />
            </Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Tasting</div>
            <Row full>
              <Label>Flavor Tags</Label>
              <FlavorTagEditor tags={form.flavorTags} onChange={tags => set('flavorTags', tags)} />
            </Row>
            <Row full>
              <Label>Tasting Notes</Label>
              <textarea style={{ ...s.input, height: '64px', resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
            </Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Recipe & Notes</div>
            <Row full>
              <Label>Brewing Recipe</Label>
              <textarea style={{ ...s.input, height: '64px', resize: 'vertical' }} placeholder="Pour schedule, bloom, ratios…" value={form.brewingRecipe || ''} onChange={e => set('brewingRecipe', e.target.value)} />
            </Row>
            <Row full>
              <Label>Extra Notes</Label>
              <textarea style={{ ...s.input, height: '50px', resize: 'vertical' }} value={form.extra || ''} onChange={e => set('extra', e.target.value)} />
            </Row>
          </div>
        </div>
        <div style={s.editFooter}>
          <button style={s.cancelBtn} onClick={onCancel} disabled={saving}>Cancel</button>
          <button style={s.saveBtn} onClick={() => onSave(form)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteModal = ({ brew, onConfirm, onCancel, deleting }) => (
  <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
    <div style={s.deleteModal}>
      <div style={s.deleteModalIcon}>🗑️</div>
      <div style={s.deleteModalTitle}>Delete this brew?</div>
      <div style={s.deleteModalSub}>
        <strong>{brew.beans}</strong>
        {brew.date ? ` · ${formatDate(brew.date)}` : ''}
        {brew.method ? ` · ${brew.method}` : ''}
      </div>
      <div style={s.deleteModalNote}>This action cannot be undone.</div>
      <div style={s.deleteModalActions}>
        <button style={s.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
        <button style={s.deleteConfirmBtn} onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Brew'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

function RawData({ onNavigateToRegion, allRegionDocs = [], beanFilter = null, onClearBeanFilter }) {
  const [brews, setBrews]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [currentUid, setCurrentUid]     = useState(null);
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState('date');
  const [sortDir, setSortDir]           = useState('desc');
  const [methodFilter, setMethodFilter] = useState('All');
  const [brewToDelete, setBrewToDelete] = useState(null);
  const [brewToEdit, setBrewToEdit]     = useState(null);
  const [brewNoRegion, setBrewNoRegion] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFavOnly, setShowFavOnly]   = useState(false);

  // Reset method filter + search when beanFilter changes
  useEffect(() => {
    if (beanFilter) {
      setSearch('');
      setMethodFilter('All');
    }
  }, [beanFilter]);

  const regionById = useMemo(() => {
    const map = {};
    allRegionDocs.forEach(d => { map[d.id] = d; });
    return map;
  }, [allRegionDocs]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        if (user) {
          setCurrentUid(user.uid);
          const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
          const docs = snapshot.docs.map(d => ({ id: d.id, _source: 'firestore', ...d.data() }));
          docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setBrews(docs);
        } else {
          setCurrentUid(null);
          setBrews([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!brewToDelete || !currentUid) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'users', currentUid, 'brews', brewToDelete.id));
      setBrews(prev => prev.filter(b => b.id !== brewToDelete.id));
      setBrewToDelete(null);
    } catch { /* silent */ }
    finally { setActionLoading(false); }
  };

  const handleUpdateBrew = async (updatedData) => {
    if (!currentUid || !brewToEdit) return;
    setActionLoading(true);
    try {
      const brewRef = doc(db, 'users', currentUid, 'brews', brewToEdit.id);
      const { id, _source, ...payload } = updatedData;
      ['groundCoffeeWeight', 'waterTemp', 'waterIn'].forEach(k => {
        payload[k] = payload[k] !== '' && payload[k] != null ? Number(payload[k]) : null;
      });
      if (!Array.isArray(payload.flavorTags) || payload.flavorTags.length === 0) {
        payload.flavorTags = null;
      }
      await updateDoc(brewRef, payload);
      setBrews(prev => prev.map(b => b.id === brewToEdit.id ? { ...b, ...updatedData } : b));
      setBrewToEdit(null);
    } catch { alert('Failed to update brew.'); }
    finally { setActionLoading(false); }
  };

  const handleToggleFavorite = async (brew) => {
    if (!currentUid) return;
    const newVal = !brew.favorite;
    setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: newVal } : b));
    try {
      await updateDoc(doc(db, 'users', currentUid, 'brews', brew.id), { favorite: newVal });
    } catch {
      setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: brew.favorite } : b));
    }
  };

  const handleBeanClick = (brew) => {
    if (!brew.regionRef) {
      setBrewNoRegion(brew);
      return;
    }
    const regionDoc = regionById[brew.regionRef];
    if (!regionDoc) {
      setBrewNoRegion(brew);
      return;
    }
    onNavigateToRegion?.(regionDoc);
  };

  const stats = useMemo(() => {
    if (brews.length === 0) return null;
    const methods  = brews.map(b => b.method).filter(Boolean);
    const methodFreq = methods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
    const topMethod = Object.entries(methodFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const beans    = [...new Set(brews.map(b => b.beans).filter(Boolean))];
    const temps    = brews.map(b => b.waterTemp).filter(v => v && v !== '?');
    const avgTemp  = temps.length ? Math.round(temps.reduce((a, b) => a + Number(b), 0) / temps.length) : null;
    const allTags  = brews.flatMap(b => Array.isArray(b.flavorTags) ? b.flavorTags : []);
    const tagFreq  = allTags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const topFlavor = Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total: brews.length, uniqueBeans: beans.length, topMethod, avgTemp, topFlavor };
  }, [brews]);

  const allMethods = useMemo(() => {
    const set = new Set(brews.map(b => b.method).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [brews]);

  const filtered = useMemo(() => {
    let rows = [...brews];

    // ── Bean filter from SavedBeansTab ──
    if (beanFilter) {
      rows = rows.filter(b => b.beans === beanFilter);
    }

    if (showFavOnly) rows = rows.filter(b => b.favorite);
    if (methodFilter !== 'All') rows = rows.filter(b => b.method === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(b => {
        const tagMatch = Array.isArray(b.flavorTags) && b.flavorTags.some(t => t.toLowerCase().includes(q));
        return tagMatch || [b.beans, b.method, b.notes, b.grindSetting, b.grinder, b.extra, b.variety, b.processing, b.roastLevel, b.brewingRecipe]
          .some(v => v && String(v).toLowerCase().includes(q));
      });
    }
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = ''; if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [brews, search, methodFilter, sortKey, sortDir, showFavOnly, beanFilter]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) return (
    <div style={s.centerWrap}>
      <div style={s.spinnerRing} />
      <p>Brewing your data…</p>
    </div>
  );

  return (
    <div style={s.root}>
      {brewToDelete  && <DeleteModal brew={brewToDelete}  onConfirm={handleDeleteConfirm} onCancel={() => setBrewToDelete(null)}  deleting={actionLoading} />}
      {brewToEdit    && <EditModal   brew={brewToEdit}    onSave={handleUpdateBrew}        onCancel={() => setBrewToEdit(null)}    saving={actionLoading} />}
      {brewNoRegion  && <NoRegionModal brew={brewNoRegion} onClose={() => setBrewNoRegion(null)} />}

      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <div>
            <div style={s.headerTitle}>Brew Data</div>
            <div style={s.headerSub}>{brews.length} records in your journal</div>
          </div>
        </div>
      </div>

      {/* ── Bean filter banner ── */}
      {beanFilter && (
        <BeanFilterBanner beanName={beanFilter} onClear={onClearBeanFilter} />
      )}

      {stats && (
        <div style={s.statsRow}>
          <StatCard value={stats.total}       label="Total Brews"    icon="☕" />
          <StatCard value={stats.uniqueBeans} label="Unique Origins" icon="🌍" />
          <StatCard value={stats.topMethod}   label="Fav. Method"    icon="🏆" />
          <StatCard value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} label="Avg. Temp" icon="🌡️" />
          {stats.topFlavor && (
            <StatCard
              value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: getFlavorStyle(stats.topFlavor), color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' }}>
                  {getFlavorEmoji(stats.topFlavor)} {stats.topFlavor}
                </span>
              }
              label="Top Flavor"
              icon="👅"
            />
          )}
        </div>
      )}

      <div style={s.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Search beans, variety, process, recipe…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            style={{ ...s.filterPill, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', ...(showFavOnly ? { background: '#F59E0B', color: 'white', border: '1px solid #F59E0B' } : {}) }}
            onClick={() => setShowFavOnly(v => !v)}
          >
            <span style={{ fontSize: '13px' }}>{showFavOnly ? '★' : '☆'}</span> Favourites
          </button>
        </div>
        <div style={s.filterRow}>
          {allMethods.map(m => (
            <button key={m} style={{ ...s.filterPill, ...(methodFilter === m ? s.filterPillActive : {}) }} onClick={() => setMethodFilter(m)}>{m}</button>
          ))}
        </div>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} style={{ ...s.th, width: col.width }} onClick={() => handleSort(col.key)}>
                  {col.label} <SortIcon active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
              <th style={{ ...s.th, width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((brew, idx) => {
              const hasRegion = !!brew.regionRef && !!regionById[brew.regionRef];
              return (
                <tr key={brew.id || idx} style={{ ...s.tr, ...(idx % 2 === 0 ? s.trEven : {}) }}>
                  <td style={{ ...s.td, ...s.tdFav }}>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px', color: brew.favorite ? '#F59E0B' : '#D7CCC8', transition: 'color 0.15s, transform 0.15s', transform: brew.favorite ? 'scale(1.15)' : 'scale(1)', filter: brew.favorite ? 'drop-shadow(0 1px 3px rgba(245,158,11,0.5))' : 'none' }}
                      title={brew.favorite ? 'Unfavourite' : 'Favourite'}
                      onClick={() => handleToggleFavorite(brew)}
                    >
                      {brew.favorite ? '★' : '☆'}
                    </button>
                  </td>
                  <td style={s.td}><span style={s.dateCell}>{formatDate(brew.date)}</span></td>

                  <td style={{ ...s.td, ...s.tdBeans }}>
                    <button
                      onClick={() => handleBeanClick(brew)}
                      title={hasRegion ? `View on map: ${regionById[brew.regionRef]?.name}` : 'No region linked to this brew'}
                      style={s.beanBtn}
                    >
                      <span style={s.beanBtnText}>{fmt(brew.beans)}</span>
                      <span style={{ ...s.beanBtnIcon, color: hasRegion ? '#5D4037' : '#D7CCC8', opacity: hasRegion ? 1 : 0.4 }}
                        title={hasRegion ? regionById[brew.regionRef]?.name : 'No region linked'}
                      >
                        {hasRegion ? '📍' : '○'}
                      </span>
                    </button>
                  </td>

                  <td style={s.td}>{fmt(brew.variety)}</td>
                  <td style={s.td}><ColorBadge value={brew.processing} colorMap={PROCESSING_COLORS} /></td>
                  <td style={s.td}><ColorBadge value={brew.roastLevel} colorMap={ROAST_COLORS} /></td>
                  <td style={s.td}><ColorBadge value={brew.method} colorMap={METHOD_COLORS} /></td>
                  <td style={s.td}>{fmt(brew.grinder)}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.grindSetting)}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{brew.groundCoffeeWeight ? `${brew.groundCoffeeWeight}g` : '—'}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{brew.waterTemp ? `${brew.waterTemp}°` : '—'}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{brew.waterIn ? `${brew.waterIn}ml` : '—'}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.brewTime)}</td>
                  <td style={{ ...s.td, ...s.tdCenter }}>{formatDate(brew.roastingDate)}</td>
                  <td style={{ ...s.td, ...s.tdTags }}><FlavorTagsCell tags={brew.flavorTags} /></td>
                  <td style={{ ...s.td, ...s.tdNotes }}>{brew.notes ? <span style={s.noteText}>{brew.notes}</span> : '—'}</td>
                  <td style={{ ...s.td, ...s.tdNotes }}>{brew.brewingRecipe ? <span style={s.noteText}>{brew.brewingRecipe}</span> : '—'}</td>
                  <td style={{ ...s.td, ...s.tdNotes }}>{fmt(brew.extra)}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button style={s.editBtn}   onClick={() => setBrewToEdit(brew)}>✏️</button>
                      <button style={s.deleteBtn} onClick={() => setBrewToDelete(brew)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#8D6E63' }}>
                  {beanFilter
                    ? <>No brews found for <strong>{beanFilter}</strong>.</>
                    : 'No brews match your search.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root:        { height: '100%', display: 'flex', flexDirection: 'column', background: '#FAF7F4', fontFamily: 'sans-serif', overflow: 'hidden' },
  header:      { display: 'flex', padding: '18px 24px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '12px' },
  headerTitle: { fontSize: '16px', fontWeight: '700', color: '#F5E6D3' },
  headerSub:   { fontSize: '11px', color: 'rgba(245,230,211,0.5)' },

  // ── Bean filter banner ──
  filterBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 24px',
    background: '#FFF8E1',
    borderBottom: '1px solid #FFE082',
  },
  filterBannerText: { fontSize: '13px', color: '#5D4037' },
  filterBannerClear: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 12px', background: 'none',
    border: '1px solid #A1887F', borderRadius: '20px',
    fontSize: '12px', color: '#5D4037', cursor: 'pointer',
    fontWeight: '600', transition: 'background 0.15s',
  },

  statsRow:    { display: 'flex', background: '#D7CCC8', gap: '1px' },
  statCard:    { flex: 1, background: '#FFFDF9', padding: '14px', textAlign: 'center' },
  statIcon:    { fontSize: '16px', marginBottom: '4px' },
  statValue:   { fontSize: '18px', fontWeight: '800' },
  statLabel:   { fontSize: '9px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' },
  toolbar:     { padding: '12px 24px', background: '#FFFDF9', borderBottom: '1px solid #EFEBE9', display: 'flex', flexDirection: 'column', gap: '10px' },
  searchWrap:  { position: 'relative', maxWidth: '360px' },
  searchInput: { width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '13px' },
  searchIcon:  { position: 'absolute', left: '10px', top: '8px', fontSize: '12px' },
  filterRow:   { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterPill:  { padding: '4px 12px', borderRadius: '20px', border: '1px solid #D7CCC8', fontSize: '11px', cursor: 'pointer', background: 'none' },
  filterPillActive: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #2C1810' },
  tableWrap:   { flex: 1, overflow: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', minWidth: '1400px', tableLayout: 'fixed' },
  th:          { position: 'sticky', top: 0, background: '#EFEBE9', padding: '10px 16px', fontSize: '10px', textAlign: 'left', zIndex: 1, cursor: 'pointer', userSelect: 'none' },
  tr:          { borderBottom: '1px solid #F3EDEA' },
  trEven:      { background: '#FFFDF9' },
  td:          { padding: '8px 16px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  tdBeans:     { fontWeight: '600', whiteSpace: 'normal', padding: '6px 16px' },
  tdFav:       { textAlign: 'center', padding: '4px 6px', width: '40px' },
  tdCenter:    { textAlign: 'center' },
  tdNotes:     { whiteSpace: 'normal', fontStyle: 'italic', fontSize: '12px' },
  tdTags:      { whiteSpace: 'normal', verticalAlign: 'middle', padding: '6px 16px' },
  editBtn:     { background: '#E3F2FD', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn:   { background: '#FFEBEE', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },

  beanBtn: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '5px', textAlign: 'left', fontFamily: 'inherit',
  },
  beanBtnText: {
    fontSize: '13px', fontWeight: '600', color: '#2C1810',
    textDecoration: 'underline', textDecorationStyle: 'dotted',
    textDecorationColor: '#A1887F', textUnderlineOffset: '3px',
  },
  beanBtnIcon: { fontSize: '11px', flexShrink: 0 },

  noRegionModal: {
    background: 'white', borderRadius: '12px', width: '400px',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
  },
  noRegionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
  },
  noRegionCloseBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', fontSize: '13px', color: '#F5E6D3',
  },
  noRegionBody: {
    padding: '32px 24px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },

  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  editModal:   { background: 'white', borderRadius: '12px', width: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  editHeader:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #EFEBE9', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  editBody:    { flex: 1, overflowY: 'auto', padding: '20px' },
  editGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  editSection: { fontSize: '10px', fontWeight: '800', color: '#A1887F', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #EFEBE9', paddingBottom: '4px', marginTop: '4px' },
  editFooter:  { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #EFEBE9', background: '#FAF7F4' },
  editLabel:   { fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' },
  inputGrp:    { display: 'flex', flexDirection: 'column' },
  input:       { padding: '8px 10px', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '13px', fontFamily: 'sans-serif', color: '#2C1810', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box', width: '100%' },
  saveBtn:     { padding: '9px 20px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  cancelBtn:   { padding: '9px 20px', background: 'none', border: '1px solid #D7CCC8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#8D6E63' },

  deleteModal:      { background: 'white', padding: '24px', borderRadius: '12px', textAlign: 'center', maxWidth: '300px' },
  deleteModalIcon:  { fontSize: '32px', marginBottom: '12px' },
  deleteModalTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  deleteModalSub:   { fontSize: '13px', color: '#5D4037', marginBottom: '8px' },
  deleteModalNote:  { fontSize: '11px', color: '#B71C1C', marginBottom: '20px' },
  deleteModalActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  deleteConfirmBtn: { padding: '9px 20px', background: '#C62828', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' },

  badge:       { padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' },
  dateCell:    { fontSize: '12px', fontWeight: '600' },
  dash:        { color: '#BCAAA4' },
  noteText:    { color: '#5D4037' },
  centerWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' },
  spinnerRing: { width: '24px', height: '24px', border: '3px solid #EFEBE9', borderTopColor: '#5D4037', borderRadius: '50%', animation: 'spin 1s infinite linear' },
};

export default RawData;