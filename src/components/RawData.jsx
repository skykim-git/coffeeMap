import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/RawData.mobile.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'favorite',           label: '★',              width: '40px',  alwaysVisible: true },
  { key: 'date',               label: 'Date',           width: '90px',  alwaysVisible: true },
  { key: 'beans',              label: 'Bean / Origin',  width: '160px', alwaysVisible: true },
  { key: 'variety',            label: 'Variety',        width: '100px' },
  { key: 'processing',         label: 'Process',        width: '90px'  },
  { key: 'roastLevel',         label: 'Roast',          width: '100px' },
  { key: 'method',             label: 'Method',         width: '100px' },
  { key: 'grinder',            label: 'Grinder',        width: '100px' },
  { key: 'grindSetting',       label: 'Grind',          width: '80px'  },
  { key: 'groundCoffeeWeight', label: 'Coffee (g)',     width: '80px'  },
  { key: 'waterTemp',          label: 'Temp',           width: '60px'  },
  { key: 'waterIn',            label: 'Water',          width: '70px'  },
  { key: 'brewTime',           label: 'Brew Time',      width: '70px'  },
  { key: 'roastingDate',       label: 'Roast Date',     width: '90px'  },
  { key: 'flavorTags',         label: 'Flavors',        width: '220px' },
  { key: 'notes',              label: 'Tasting Notes',  width: '180px' },
  { key: 'brewingRecipe',      label: 'Recipe',         width: '180px' },
  { key: 'extra',              label: 'Extra Info',     width: '150px' },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.reduce((acc, col) => { acc[col.key] = true; return acc; }, {});

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
  citrus:'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',chocolate:'linear-gradient(135deg, #8B4513 0%, #654321 100%)',aroma:'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',fruity:'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',honey:'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',raspberry:'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',banana:'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',green:'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',apple:'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',grape:'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',mango:'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',acidic:'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',nutty:'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',pineapple:'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',tropical:'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',floral:'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',caramel:'linear-gradient(135deg, #D4A574 0%, #b8860b 100%)',berry:'linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%)',intense:'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',describe:'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
};

const FLAVOR_EMOJI_MAP = {
  citrus:'🍊',chocolate:'🍫',fruity:'🍇',berry:'🫐',raspberry:'🫐',banana:'🍌',apple:'🍏',grape:'🍇',mango:'🥭',pineapple:'🍍',tropical:'🌴',honey:'🍯',caramel:'🍮',nutty:'🥜',floral:'🌸',aroma:'🌺',acidic:'💧',intense:'🔥',green:'🌿',describe:'📝',
};

const MASTER_FLAVORS = [
  'Citrus','Chocolate','Fruity','Berry','Raspberry','Banana','Apple','Grape','Mango','Pineapple','Tropical','Honey','Caramel','Nutty','Floral','Aroma','Acidic','Intense','Green','Jasmine','Rose','Vanilla','Spicy','Earthy','Herbal','Winey','Butter','Toffee','Peach','Apricot','Plum','Cherry','Blueberry','Strawberry','Lemon','Orange','Grapefruit','Lime','Almond','Hazelnut','Walnut','Smoke','Cedar','Sweet','Bright','Clean','Juicy',
];

const getFlavorStyle = (word) => FLAVOR_PALETTE[word?.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';
const getFlavorEmoji = (word) => FLAVOR_EMOJI_MAP[word?.toLowerCase()] || '☕';

const fmt = (val, fallback = '—') => (val === null || val === undefined || val === '') ? fallback : val;

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const ColorBadge = ({ value, colorMap }) => {
  if (!value) return <span style={s.dash}>—</span>;
  const palette = colorMap[value] || { bg: '#EFEBE9', color: '#4E342E' };
  return <span style={{ ...s.badge, background: palette.bg, color: palette.color }}>{value}</span>;
};

const FlavorTagsCell = ({ tags }) => {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return <span style={s.dash}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {tags.map((tag, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: getFlavorStyle(tag), color: 'white', padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
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

const BeanFilterBanner = ({ beanName, onClear }) => (
  <div style={s.filterBanner}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '14px' }}>☕</span>
      <span style={s.filterBannerText}>Showing brews for <strong>{beanName}</strong></span>
    </div>
    <button onClick={onClear} style={s.filterBannerClear}>✕ Show all</button>
  </div>
);

// ─── Flavor Tag Editor ────────────────────────────────────────────────────────

function FlavorTagEditor({ tags, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const current   = Array.isArray(tags) ? tags : [];

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches = MASTER_FLAVORS.filter(f => f.toLowerCase().includes(q) && !current.includes(f));
    const exact = MASTER_FLAVORS.find(f => f.toLowerCase() === q);
    if (!exact && query.trim().length > 1 && !current.includes(query.trim())) matches.push(`"${query.trim()}"`);
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
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: getFlavorStyle(f), color: 'white', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
              {getFlavorEmoji(f)} {f}
              <button type="button" onClick={() => remove(f)} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', color: 'white', padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <input ref={inputRef} style={{ ...s.input, paddingLeft: '28px', fontSize: '12px' }} placeholder="Search or add flavors…" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => query && setOpen(true)} onKeyDown={e => { if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); add(filtered[0]); } if (e.key === 'Escape') setOpen(false); }} autoComplete="off" />
        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', pointerEvents: 'none' }}>🔍</span>
        {open && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: 'white', border: '1px solid #D7CCC8', borderRadius: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden' }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1, -1) : item;
              return (
                <button key={i} type="button" onMouseDown={e => { e.preventDefault(); add(item); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < filtered.length - 1 ? '1px solid #F5F0EC' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, background: getFlavorStyle(label), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{getFlavorEmoji(label)}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{isCustom ? `Add "${label}"` : label}</span>
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
  const Row = ({ children, full = false }) => <div style={{ gridColumn: full ? '1 / -1' : 'auto', ...s.inputGrp }}>{children}</div>;
  const Label = ({ children }) => <label style={s.editLabel}>{children}</label>;

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.editModal}>
        <div style={s.editHeader}>
          <span style={{ fontSize: '18px' }}>✏️</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#2C1810' }}>Edit Brew Record</h3>
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#8D6E63', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={s.editBody}>
          <div style={s.editGrid}>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Record</div>
            <Row><Label>Date</Label><input style={s.input} type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} /></Row>
            <Row><Label>Beans</Label><input style={s.input} value={form.beans || ''} onChange={e => set('beans', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Bean Info</div>
            <Row><Label>Variety</Label><input style={s.input} placeholder="Geisha, Bourbon…" value={form.variety || ''} onChange={e => set('variety', e.target.value)} /></Row>
            <Row><Label>Processing</Label><select style={s.input} value={form.processing || ''} onChange={e => set('processing', e.target.value)}><option value="">Select…</option>{PROCESSING_OPTS.map(o => <option key={o}>{o}</option>)}</select></Row>
            <Row><Label>Roast Level</Label><select style={s.input} value={form.roastLevel || ''} onChange={e => set('roastLevel', e.target.value)}><option value="">Select…</option>{ROAST_OPTS.map(o => <option key={o}>{o}</option>)}</select></Row>
            <Row><Label>Roasting Date</Label><input style={s.input} type="date" value={form.roastingDate || ''} onChange={e => set('roastingDate', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Brew Setup</div>
            <Row><Label>Brew Method</Label><select style={s.input} value={form.method || ''} onChange={e => set('method', e.target.value)}><option value="">Select…</option>{BREW_METHODS.map(o => <option key={o}>{o}</option>)}</select></Row>
            <Row><Label>Grinder</Label><input style={s.input} value={form.grinder || ''} onChange={e => set('grinder', e.target.value)} /></Row>
            <Row><Label>Grind Setting</Label><input style={s.input} value={form.grindSetting || ''} onChange={e => set('grindSetting', e.target.value)} /></Row>
            <Row><Label>Coffee (g)</Label><input style={s.input} type="number" min="0" step="0.1" value={form.groundCoffeeWeight || ''} onChange={e => set('groundCoffeeWeight', e.target.value)} /></Row>
            <Row><Label>Temp (°C)</Label><input style={s.input} type="number" value={form.waterTemp || ''} onChange={e => set('waterTemp', e.target.value)} /></Row>
            <Row><Label>Water (ml)</Label><input style={s.input} type="number" value={form.waterIn || ''} onChange={e => set('waterIn', e.target.value)} /></Row>
            <Row><Label>Brew Time</Label><input style={s.input} placeholder="2:30" value={form.brewTime || ''} onChange={e => set('brewTime', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Tasting</div>
            <Row full><Label>Flavor Tags</Label><FlavorTagEditor tags={form.flavorTags} onChange={tags => set('flavorTags', tags)} /></Row>
            <Row full><Label>Tasting Notes</Label><textarea style={{ ...s.input, height: '64px', resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Recipe & Notes</div>
            <Row full><Label>Brewing Recipe</Label><textarea style={{ ...s.input, height: '64px', resize: 'vertical' }} placeholder="Pour schedule, bloom, ratios…" value={form.brewingRecipe || ''} onChange={e => set('brewingRecipe', e.target.value)} /></Row>
            <Row full><Label>Extra Notes</Label><textarea style={{ ...s.input, height: '50px', resize: 'vertical' }} value={form.extra || ''} onChange={e => set('extra', e.target.value)} /></Row>
          </div>
        </div>
        <div style={s.editFooter}>
          <button style={s.cancelBtn} onClick={onCancel} disabled={saving}>Cancel</button>
          <button style={s.saveBtn} onClick={() => onSave(form)} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ brew, onConfirm, onCancel, deleting }) => (
  <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
    <div style={s.deleteModal}>
      <div style={s.deleteModalIcon}>🗑️</div>
      <div style={s.deleteModalTitle}>Delete this brew?</div>
      <div style={s.deleteModalSub}><strong>{brew.beans}</strong>{brew.date ? ` · ${formatDate(brew.date)}` : ''}</div>
      <div style={s.deleteModalNote}>This action cannot be undone.</div>
      <div style={s.deleteModalActions}>
        <button style={s.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
        <button style={s.deleteConfirmBtn} onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Brew'}</button>
      </div>
    </div>
  </div>
);

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
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#2C1810', marginBottom: '8px' }}>No region linked</div>
        <div style={{ fontSize: '13px', color: '#8D6E63', lineHeight: '1.6', maxWidth: '280px', marginBottom: '16px', textAlign: 'center' }}>
          Link this brew to a region via <strong>Add Brew</strong> on the map tab.
        </div>
      </div>
      <div style={{ padding: '14px 20px', borderTop: '1px solid #EFEBE9', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={s.cancelBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

// ─── Mobile Brew Card ─────────────────────────────────────────────────────────

const BrewCard = ({ brew, hasRegion, onBeanClick, onEdit, onDelete, onToggleFav }) => {
  const badges = [
    brew.method && { label: brew.method, colors: METHOD_COLORS[brew.method] },
    brew.processing && { label: brew.processing, colors: PROCESSING_COLORS[brew.processing] },
    brew.roastLevel && { label: brew.roastLevel, colors: ROAST_COLORS[brew.roastLevel] },
  ].filter(Boolean);

  const metaItems = [
    brew.groundCoffeeWeight && `${brew.groundCoffeeWeight}g`,
    brew.waterTemp && `${brew.waterTemp}°C`,
    brew.waterIn && `${brew.waterIn}ml`,
    brew.brewTime && brew.brewTime,
    brew.grindSetting && `Grind: ${brew.grindSetting}`,
  ].filter(Boolean);

  return (
    <div className="brew-card">
      <div className="brew-card-header">
        <div className="brew-card-title">
          <button
            onClick={() => onBeanClick(brew)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '6px' }}
          >
            <span className="brew-card-bean">{fmt(brew.beans)}</span>
            <span style={{ fontSize: '11px', color: hasRegion ? '#5D4037' : '#D7CCC8', flexShrink: 0, marginTop: '2px' }}>{hasRegion ? '📍' : '○'}</span>
          </button>
          <div className="brew-card-date">{formatDate(brew.date)}</div>
        </div>
        <div className="brew-card-actions">
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: brew.favorite ? '#F59E0B' : '#D7CCC8', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => onToggleFav(brew)}
            title={brew.favorite ? 'Unfavourite' : 'Favourite'}
          >
            {brew.favorite ? '★' : '☆'}
          </button>
          <button style={{ ...s.editBtn, minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onEdit(brew)}>✏️</button>
          <button style={{ ...s.deleteBtn, minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onDelete(brew)}>🗑</button>
        </div>
      </div>

      <div className="brew-card-body">
        {badges.length > 0 && (
          <div className="brew-card-badges">
            {badges.map((b, i) => (
              <span key={i} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: b.colors?.bg || '#EFEBE9', color: b.colors?.color || '#4E342E' }}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {metaItems.length > 0 && (
          <div className="brew-card-meta-row">
            {metaItems.map((item, i) => (
              <span key={i} className="brew-card-meta-item">{item}</span>
            ))}
          </div>
        )}

        {brew.flavorTags && brew.flavorTags.length > 0 && (
          <div className="brew-card-flavors">
            {brew.flavorTags.slice(0, 5).map((tag, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: getFlavorStyle(tag), color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                {getFlavorEmoji(tag)} {tag}
              </span>
            ))}
          </div>
        )}

        {brew.notes && brew.notes !== '?' && (
          <div className="brew-card-notes">"{brew.notes}"</div>
        )}
      </div>
    </div>
  );
};

// ─── Column Visibility (desktop) ──────────────────────────────────────────────

const ColumnCheckbox = ({ label, checked, locked, onChange }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', cursor: locked ? 'default' : 'pointer', background: hovered && !locked ? '#F5F0EC' : 'transparent', transition: 'background 0.12s', opacity: locked ? 0.45 : 1, userSelect: 'none' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '5px', border: checked ? '2px solid #5D4037' : '2px solid #C4B5AC', background: checked ? '#5D4037' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s' }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{label}</span>
      {locked && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#BCAAA4' }}>always on</span>}
      <input type="checkbox" checked={checked} onChange={onChange} disabled={locked} style={{ display: 'none' }} />
    </label>
  );
};

const ColumnVisibilityPanel = ({ visibleCols, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const hiddenCount = ALL_COLUMNS.filter(c => !c.alwaysVisible && !visibleCols[c.key]).length;
  const toggleAll = (val) => { const next = { ...visibleCols }; ALL_COLUMNS.forEach(c => { if (!c.alwaysVisible) next[c.key] = val; }); onChange(next); };
  const groups = [
    { label: 'Bean Info',  keys: ['variety','processing','roastLevel','roastingDate'] },
    { label: 'Brew Setup', keys: ['method','grinder','grindSetting','groundCoffeeWeight','waterTemp','waterIn','brewTime'] },
    { label: 'Tasting',    keys: ['flavorTags','notes'] },
    { label: 'Extra',      keys: ['brewingRecipe','extra'] },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }} className="rawdata-col-panel">
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: open ? '1px solid #8D6E63' : '1px solid #D7CCC8', background: open ? '#5D4037' : 'white', color: open ? 'white' : '#5D4037', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="6.25" width="8" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="10.5" width="10" height="1.5" rx="0.75" fill="currentColor"/></svg>
        Columns {hiddenCount > 0 && <span style={{ background: open ? 'rgba(255,255,255,0.25)' : '#5D4037', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>{hiddenCount} hidden</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: '12px', border: '1px solid #E8E0DA', boxShadow: '0 12px 40px rgba(44,24,16,0.15)', width: '240px', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F0EBE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Visible Columns</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => toggleAll(true)}  style={s.microBtn}>All</button>
              <button onClick={() => toggleAll(false)} style={s.microBtn}>None</button>
            </div>
          </div>
          <div style={{ padding: '6px 4px 0' }}>
            {ALL_COLUMNS.filter(c => c.alwaysVisible).map(col => <ColumnCheckbox key={col.key} label={col.label === '★' ? 'Favourite' : col.label} checked={true} locked={true} onChange={() => {}} />)}
          </div>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#BCAAA4', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 14px 4px', borderTop: '1px solid #F5F0EC' }}>{group.label}</div>
              <div style={{ padding: '0 4px' }}>
                {group.keys.map(key => { const col = ALL_COLUMNS.find(c => c.key === key); if (!col) return null; return <ColumnCheckbox key={key} label={col.label} checked={!!visibleCols[key]} locked={false} onChange={() => onChange({ ...visibleCols, [key]: !visibleCols[key] })} />; })}
              </div>
            </div>
          ))}
          <div style={{ height: '8px' }} />
        </div>
      )}
    </div>
  );
};

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

  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem('rawdata_col_visibility');
      return saved ? { ...DEFAULT_VISIBLE, ...JSON.parse(saved) } : DEFAULT_VISIBLE;
    } catch { return DEFAULT_VISIBLE; }
  });

  useEffect(() => { localStorage.setItem('rawdata_col_visibility', JSON.stringify(visibleCols)); }, [visibleCols]);

  const COLUMNS = useMemo(() => ALL_COLUMNS.filter(c => c.alwaysVisible || visibleCols[c.key]), [visibleCols]);

  useEffect(() => { if (beanFilter) { setSearch(''); setMethodFilter('All'); } }, [beanFilter]);

  const regionById = useMemo(() => { const map = {}; allRegionDocs.forEach(d => { map[d.id] = d; }); return map; }, [allRegionDocs]);

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
        } else { setCurrentUid(null); setBrews([]); }
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
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
    } catch {} finally { setActionLoading(false); }
  };

  const handleUpdateBrew = async (updatedData) => {
    if (!currentUid || !brewToEdit) return;
    setActionLoading(true);
    try {
      const brewRef = doc(db, 'users', currentUid, 'brews', brewToEdit.id);
      const { id, _source, ...payload } = updatedData;
      ['groundCoffeeWeight', 'waterTemp', 'waterIn'].forEach(k => { payload[k] = payload[k] !== '' && payload[k] != null ? Number(payload[k]) : null; });
      if (!Array.isArray(payload.flavorTags) || payload.flavorTags.length === 0) payload.flavorTags = null;
      await updateDoc(brewRef, payload);
      setBrews(prev => prev.map(b => b.id === brewToEdit.id ? { ...b, ...updatedData } : b));
      setBrewToEdit(null);
    } catch { alert('Failed to update brew.'); } finally { setActionLoading(false); }
  };

  const handleToggleFavorite = async (brew) => {
    if (!currentUid) return;
    const newVal = !brew.favorite;
    setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: newVal } : b));
    try { await updateDoc(doc(db, 'users', currentUid, 'brews', brew.id), { favorite: newVal }); }
    catch { setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: brew.favorite } : b)); }
  };

  const handleBeanClick = (brew) => {
    if (!brew.regionRef) { setBrewNoRegion(brew); return; }
    const regionDoc = regionById[brew.regionRef];
    if (!regionDoc) { setBrewNoRegion(brew); return; }
    onNavigateToRegion?.(regionDoc);
  };

  const stats = useMemo(() => {
    if (brews.length === 0) return null;
    const methods = brews.map(b => b.method).filter(Boolean);
    const methodFreq = methods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
    const topMethod = Object.entries(methodFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const beans = [...new Set(brews.map(b => b.beans).filter(Boolean))];
    const temps = brews.map(b => b.waterTemp).filter(v => v && v !== '?');
    const avgTemp = temps.length ? Math.round(temps.reduce((a, b) => a + Number(b), 0) / temps.length) : null;
    const allTags = brews.flatMap(b => Array.isArray(b.flavorTags) ? b.flavorTags : []);
    const tagFreq = allTags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const topFlavor = Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total: brews.length, uniqueBeans: beans.length, topMethod, avgTemp, topFlavor };
  }, [brews]);

  const allMethods = useMemo(() => { const set = new Set(brews.map(b => b.method).filter(Boolean)); return ['All', ...Array.from(set).sort()]; }, [brews]);

  const filtered = useMemo(() => {
    let rows = [...brews];
    if (beanFilter) rows = rows.filter(b => b.beans === beanFilter);
    if (showFavOnly) rows = rows.filter(b => b.favorite);
    if (methodFilter !== 'All') rows = rows.filter(b => b.method === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(b => {
        const tagMatch = Array.isArray(b.flavorTags) && b.flavorTags.some(t => t.toLowerCase().includes(q));
        return tagMatch || [b.beans, b.method, b.notes, b.grindSetting, b.grinder, b.extra, b.variety, b.processing, b.roastLevel, b.brewingRecipe].some(v => v && String(v).toLowerCase().includes(q));
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
      {brewToDelete && <DeleteModal brew={brewToDelete} onConfirm={handleDeleteConfirm} onCancel={() => setBrewToDelete(null)} deleting={actionLoading} />}
      {brewToEdit   && <EditModal   brew={brewToEdit}   onSave={handleUpdateBrew}        onCancel={() => setBrewToEdit(null)}   saving={actionLoading} />}
      {brewNoRegion && <NoRegionModal brew={brewNoRegion} onClose={() => setBrewNoRegion(null)} />}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <div>
            <div style={s.headerTitle}>Brew Data</div>
            <div style={s.headerSub}>{brews.length} records</div>
          </div>
        </div>
      </div>

      {beanFilter && <BeanFilterBanner beanName={beanFilter} onClear={onClearBeanFilter} />}

      {/* Stats row — scrollable on mobile */}
      {stats && (
        <div className="rawdata-stats-row" style={s.statsRow}>
          <StatCard value={stats.total}       label="Total Brews"    icon="☕" />
          <StatCard value={stats.uniqueBeans} label="Origins"        icon="🌍" />
          <StatCard value={stats.topMethod}   label="Fav. Method"    icon="🏆" />
          <StatCard value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} label="Avg. Temp" icon="🌡️" />
          {stats.topFlavor && (
            <StatCard
              value={<span style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:getFlavorStyle(stats.topFlavor), color:'white', padding:'2px 10px', borderRadius:'12px', fontSize:'13px', fontWeight:'700' }}>{getFlavorEmoji(stats.topFlavor)} {stats.topFlavor}</span>}
              label="Top Flavor" icon="👅"
            />
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div className="rawdata-toolbar-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <div className="rawdata-search-wrap" style={{ ...s.searchWrap, flex: 1, maxWidth: '360px' }}>
              <span style={s.searchIcon}>🔍</span>
              <input style={{ ...s.searchInput, width: '100%' }} placeholder="Search beans, notes…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              style={{ ...s.filterPill, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', minHeight: '36px', ...(showFavOnly ? { background: '#F59E0B', color: 'white', border: '1px solid #F59E0B' } : {}) }}
              onClick={() => setShowFavOnly(v => !v)}
            >
              <span>{showFavOnly ? '★' : '☆'}</span>
            </button>
          </div>
          {/* Column panel hidden on mobile via CSS */}
          <ColumnVisibilityPanel visibleCols={visibleCols} onChange={setVisibleCols} />
        </div>
        <div style={{ ...s.filterRow, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: '2px' }}>
          {allMethods.map(m => (
            <button key={m} style={{ ...s.filterPill, flexShrink: 0, minHeight: '32px', ...(methodFilter === m ? s.filterPillActive : {}) }} onClick={() => setMethodFilter(m)}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="rawdata-table-wrap" style={s.tableWrap}>
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
                  {COLUMNS.map(col => {
                    switch (col.key) {
                      case 'favorite': return <td key="favorite" style={{ ...s.td, ...s.tdFav }}><button style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'2px', color: brew.favorite ? '#F59E0B' : '#D7CCC8' }} onClick={() => handleToggleFavorite(brew)}>{brew.favorite ? '★' : '☆'}</button></td>;
                      case 'date': return <td key="date" style={s.td}><span style={s.dateCell}>{formatDate(brew.date)}</span></td>;
                      case 'beans': return <td key="beans" style={{ ...s.td, ...s.tdBeans }}><button onClick={() => handleBeanClick(brew)} style={s.beanBtn}><span style={s.beanBtnText}>{fmt(brew.beans)}</span><span style={{ ...s.beanBtnIcon, color: hasRegion ? '#5D4037' : '#D7CCC8' }}>{hasRegion ? '📍' : '○'}</span></button></td>;
                      case 'variety': return <td key="variety" style={s.td}>{fmt(brew.variety)}</td>;
                      case 'processing': return <td key="processing" style={s.td}><ColorBadge value={brew.processing} colorMap={PROCESSING_COLORS} /></td>;
                      case 'roastLevel': return <td key="roastLevel" style={s.td}><ColorBadge value={brew.roastLevel} colorMap={ROAST_COLORS} /></td>;
                      case 'method': return <td key="method" style={s.td}><ColorBadge value={brew.method} colorMap={METHOD_COLORS} /></td>;
                      case 'grinder': return <td key="grinder" style={s.td}>{fmt(brew.grinder)}</td>;
                      case 'grindSetting': return <td key="grindSetting" style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.grindSetting)}</td>;
                      case 'groundCoffeeWeight': return <td key="groundCoffeeWeight" style={{ ...s.td, ...s.tdCenter }}>{brew.groundCoffeeWeight ? `${brew.groundCoffeeWeight}g` : '—'}</td>;
                      case 'waterTemp': return <td key="waterTemp" style={{ ...s.td, ...s.tdCenter }}>{brew.waterTemp ? `${brew.waterTemp}°` : '—'}</td>;
                      case 'waterIn': return <td key="waterIn" style={{ ...s.td, ...s.tdCenter }}>{brew.waterIn ? `${brew.waterIn}ml` : '—'}</td>;
                      case 'brewTime': return <td key="brewTime" style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.brewTime)}</td>;
                      case 'roastingDate': return <td key="roastingDate" style={{ ...s.td, ...s.tdCenter }}>{formatDate(brew.roastingDate)}</td>;
                      case 'flavorTags': return <td key="flavorTags" style={{ ...s.td, ...s.tdTags }}><FlavorTagsCell tags={brew.flavorTags} /></td>;
                      case 'notes': return <td key="notes" style={{ ...s.td, ...s.tdNotes }}>{brew.notes ? <span style={s.noteText}>{brew.notes}</span> : '—'}</td>;
                      case 'brewingRecipe': return <td key="brewingRecipe" style={{ ...s.td, ...s.tdNotes }}>{brew.brewingRecipe ? <span style={s.noteText}>{brew.brewingRecipe}</span> : '—'}</td>;
                      case 'extra': return <td key="extra" style={{ ...s.td, ...s.tdNotes }}>{fmt(brew.extra)}</td>;
                      default: return null;
                    }
                  })}
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
              <tr><td colSpan={COLUMNS.length + 1} style={{ textAlign:'center', padding:'40px', color:'#8D6E63' }}>
                {beanFilter ? <>No brews found for <strong>{beanFilter}</strong>.</> : 'No brews match your search.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE: card list ── */}
      <div className="brew-card-list">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8D6E63', fontSize: '14px' }}>
            {beanFilter ? <>No brews for <strong>{beanFilter}</strong>.</> : 'No brews match your search.'}
          </div>
        ) : filtered.map((brew) => (
          <BrewCard
            key={brew.id}
            brew={brew}
            hasRegion={!!brew.regionRef && !!regionById[brew.regionRef]}
            onBeanClick={handleBeanClick}
            onEdit={setBrewToEdit}
            onDelete={setBrewToDelete}
            onToggleFav={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root:        { height:'100%', display:'flex', flexDirection:'column', background:'#FAF7F4', fontFamily:'sans-serif', overflow:'auto' },
  header:      { display:'flex', padding:'14px 16px', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', flexShrink:0 },
  headerLeft:  { display:'flex', alignItems:'center', gap:'12px' },
  headerTitle: { fontSize:'16px', fontWeight:'700', color:'#F5E6D3' },
  headerSub:   { fontSize:'11px', color:'rgba(245,230,211,0.5)' },
  filterBanner:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'#FFF8E1', borderBottom:'1px solid #FFE082', flexShrink:0 },
  filterBannerText:  { fontSize:'13px', color:'#5D4037' },
  filterBannerClear: { padding:'5px 10px', background:'none', border:'1px solid #A1887F', borderRadius:'20px', fontSize:'12px', color:'#5D4037', cursor:'pointer', fontWeight:'600', whiteSpace:'nowrap' },
  statsRow: { 
    display: 'flex', 
    flexDirection: 'row',
    flexWrap: 'nowrap', // Force them to stay in the same horizon
    background: '#D7CCC8', 
    gap: '1px', 
    width: '100%',
    overflowX: 'hidden' // Prevents the whole page from shaking
  },

  // statCard needs to be allowed to shrink
  statCard: { 
    flex: '1 1 0px',      // The "0px" allows cards to shrink smaller than their content
    minWidth: '0',        // Crucial: allows the card to be narrower than the text/image inside
    background: '#FFFDF9', 
    padding: '8px 2px',   // Tighten padding for mobile
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  // statIcon (the "images") should scale based on screen width
  statIcon: { 
    fontSize: 'clamp(14px, 4vw, 20px)', // Scales between 14px and 20px based on screen size
    marginBottom: '2px' 
  },

  statValue: {
    fontSize: 'clamp(10px, 3vw, 14px)', // Numbers get smaller on small screens
    fontWeight: '800'
  },
  statLabel:   { fontSize:'9px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase' },
  toolbar:     { padding:'10px 12px', background:'#FFFDF9', borderBottom:'1px solid #EFEBE9', display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 },
  searchWrap:  { position:'relative' },
  searchInput: { padding:'8px 12px 8px 30px', border:'1px solid #D7CCC8', borderRadius:'6px', fontSize:'13px', minHeight:'36px' },
  searchIcon:  { position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px' },
  filterRow:   { display:'flex', gap:'6px' },
  filterPill:  { padding:'4px 10px', borderRadius:'20px', border:'1px solid #D7CCC8', fontSize:'11px', cursor:'pointer', background:'none', flexShrink:0 },
  filterPillActive: { background:'#2C1810', color:'#F5E6D3', border:'1px solid #2C1810' },
  tableWrap:   { flex:1, overflow:'auto' },
  table:       { width:'100%', borderCollapse:'collapse', minWidth:'600px', tableLayout:'fixed' },
  th:          { position:'sticky', top:0, background:'#EFEBE9', padding:'10px 16px', fontSize:'10px', textAlign:'left', zIndex:1, cursor:'pointer', userSelect:'none' },
  tr:          { borderBottom:'1px solid #F3EDEA' },
  trEven:      { background:'#FFFDF9' },
  td:          { padding:'8px 16px', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', verticalAlign:'middle' },
  tdBeans:     { fontWeight:'600', whiteSpace:'normal', padding:'6px 16px' },
  tdFav:       { textAlign:'center', padding:'4px 6px', width:'40px' },
  tdCenter:    { textAlign:'center' },
  tdNotes:     { whiteSpace:'normal', fontStyle:'italic', fontSize:'12px' },
  tdTags:      { whiteSpace:'normal', verticalAlign:'middle', padding:'6px 16px' },
  editBtn:     { background:'#E3F2FD', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', minWidth:'32px', minHeight:'32px' },
  deleteBtn:   { background:'#FFEBEE', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', minWidth:'32px', minHeight:'32px' },
  beanBtn:     { background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'5px', textAlign:'left', fontFamily:'inherit' },
  beanBtnText: { fontSize:'13px', fontWeight:'600', color:'#2C1810', textDecoration:'underline', textDecorationStyle:'dotted', textDecorationColor:'#A1887F', textUnderlineOffset:'3px' },
  beanBtnIcon: { fontSize:'11px', flexShrink:0 },
  noRegionModal:    { background:'white', borderRadius:'12px', width:'min(400px, calc(100vw - 32px))', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.25)', overflow:'hidden' },
  noRegionHeader:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  noRegionCloseBtn: { background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'13px', color:'#F5E6D3' },
  noRegionBody:     { padding:'32px 24px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' },
  backdrop:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'16px' },
  editModal:   { background:'white', borderRadius:'12px', width:'min(560px, 100%)', maxHeight:'88dvh', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.25)', overflow:'hidden' },
  editHeader:  { display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px', borderBottom:'1px solid #EFEBE9', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  editBody:    { flex:1, overflowY:'auto', padding:'16px' },
  editGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px' },
  editSection: { fontSize:'10px', fontWeight:'800', color:'#A1887F', textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid #EFEBE9', paddingBottom:'4px', marginTop:'4px', gridColumn:'1/-1' },
  editFooter:  { display:'flex', justifyContent:'flex-end', gap:'10px', padding:'12px 16px', borderTop:'1px solid #EFEBE9', background:'#FAF7F4' },
  editLabel:   { fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px', display:'block' },
  inputGrp:    { display:'flex', flexDirection:'column' },
  input:       { padding:'8px 10px', border:'1px solid #D7CCC8', borderRadius:'6px', fontSize:'13px', fontFamily:'sans-serif', color:'#2C1810', background:'#FAFAFA', outline:'none', boxSizing:'border-box', width:'100%', minHeight:'40px' },
  saveBtn:     { padding:'10px 20px', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', color:'white', border:'none', borderRadius:'6px', fontWeight:'700', cursor:'pointer', fontSize:'13px', minHeight:'44px' },
  cancelBtn:   { padding:'10px 20px', background:'none', border:'1px solid #D7CCC8', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#8D6E63', minHeight:'44px' },
  deleteModal:        { background:'white', padding:'24px', borderRadius:'12px', textAlign:'center', width:'min(300px, calc(100vw - 32px))' },
  deleteModalIcon:    { fontSize:'32px', marginBottom:'12px' },
  deleteModalTitle:   { fontSize:'16px', fontWeight:'700', marginBottom:'8px' },
  deleteModalSub:     { fontSize:'13px', color:'#5D4037', marginBottom:'8px' },
  deleteModalNote:    { fontSize:'11px', color:'#B71C1C', marginBottom:'20px' },
  deleteModalActions: { display:'flex', gap:'12px', justifyContent:'center' },
  deleteConfirmBtn:   { padding:'10px 20px', background:'#C62828', color:'white', border:'none', borderRadius:'6px', fontWeight:'700', cursor:'pointer', minHeight:'44px' },
  badge:       { padding:'3px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:'700' },
  dateCell:    { fontSize:'12px', fontWeight:'600' },
  dash:        { color:'#BCAAA4' },
  noteText:    { color:'#5D4037' },
  centerWrap:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'12px' },
  spinnerRing: { width:'24px', height:'24px', border:'3px solid #EFEBE9', borderTopColor:'#5D4037', borderRadius:'50%', animation:'spin 1s infinite linear' },
  microBtn:    { padding:'2px 9px', borderRadius:'10px', border:'1px solid #D7CCC8', background:'none', fontSize:'11px', fontWeight:'600', color:'#8D6E63', cursor:'pointer' },
};

export default RawData;