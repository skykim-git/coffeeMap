import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IcSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IcCoffee = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
);

const IcGlobe = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="9"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>
  </svg>
);

const IcTrophy = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
);

const IcThermo = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
);

const IcFloral = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" width={size} height={size}>
    <circle cx="12" cy="12" r="3"/>
    <ellipse cx="12" cy="5" rx="2.5" ry="3" opacity=".6"/>
    <ellipse cx="19" cy="12" rx="3" ry="2.5" opacity=".6"/>
    <ellipse cx="12" cy="19" rx="2.5" ry="3" opacity=".6"/>
    <ellipse cx="5" cy="12" rx="3" ry="2.5" opacity=".6"/>
  </svg>
);

const IcBarChart = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const IcTrash = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IcEdit = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IcPin = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#5D4037' : '#D7CCC8'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IcStar = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? '#F59E0B' : 'none'} stroke={filled ? '#F59E0B' : '#D7CCC8'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);

const IcSortNeutral = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" width="9" height="9" style={{ marginLeft: 3, opacity: 0.3 }}>
    <polyline points="18,15 12,9 6,15"/>
  </svg>
);
const IcSortAsc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="9" height="9" style={{ marginLeft: 3 }}>
    <polyline points="18,15 12,9 6,15"/>
  </svg>
);
const IcSortDesc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="9" height="9" style={{ marginLeft: 3 }}>
    <polyline points="6,9 12,15 18,9"/>
  </svg>
);

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

const DEFAULT_VISIBLE = ALL_COLUMNS.reduce((acc, col) => {
  acc[col.key] = true;
  return acc;
}, {});

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

// ─── Column Visibility Checkbox ───────────────────────────────────────────────

const ColumnCheckbox = ({ label, checked, locked, onChange }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 10px', borderRadius: '8px', cursor: locked ? 'default' : 'pointer',
        background: hovered && !locked ? '#F5F0EC' : 'transparent',
        transition: 'background 0.12s', opacity: locked ? 0.45 : 1, userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        flexShrink: 0, width: '18px', height: '18px', borderRadius: '5px',
        border: checked ? '2px solid #5D4037' : '2px solid #C4B5AC',
        background: checked ? '#5D4037' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: checked ? '0 1px 4px rgba(93,64,55,0.25)' : 'none',
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{label}</span>
      {locked && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#BCAAA4', fontWeight: '500' }}>always on</span>}
      <input type="checkbox" checked={checked} onChange={onChange} disabled={locked} style={{ display: 'none' }} />
    </label>
  );
};

// ─── Column Visibility Popover ────────────────────────────────────────────────

const ColumnVisibilityPanel = ({ visibleCols, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hiddenCount = ALL_COLUMNS.filter(c => !c.alwaysVisible && !visibleCols[c.key]).length;

  const toggleAll = (val) => {
    const next = { ...visibleCols };
    ALL_COLUMNS.forEach(c => { if (!c.alwaysVisible) next[c.key] = val; });
    onChange(next);
  };

  const groups = [
    { label: 'Bean Info',   keys: ['variety', 'processing', 'roastLevel', 'roastingDate'] },
    { label: 'Brew Setup',  keys: ['method', 'grinder', 'grindSetting', 'groundCoffeeWeight', 'waterTemp', 'waterIn', 'brewTime'] },
    { label: 'Tasting',     keys: ['flavorTags', 'notes'] },
    { label: 'Extra',       keys: ['brewingRecipe', 'extra'] },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '20px',
          border: open ? '1px solid #8D6E63' : '1px solid #D7CCC8',
          background: open ? '#5D4037' : 'white',
          color: open ? 'white' : '#5D4037',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="6.25" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="10.5" width="10" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
        Columns
        {hiddenCount > 0 && (
          <span style={{
            background: open ? 'rgba(255,255,255,0.25)' : '#5D4037', color: 'white',
            borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: '700',
          }}>{hiddenCount} hidden</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white', borderRadius: '12px', border: '1px solid #E8E0DA',
          boxShadow: '0 12px 40px rgba(44,24,16,0.15)', width: '240px', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F0EBE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Visible Columns</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => toggleAll(true)}  style={s.microBtn}>All</button>
              <button onClick={() => toggleAll(false)} style={s.microBtn}>None</button>
            </div>
          </div>
          <div style={{ padding: '6px 4px 0' }}>
            {ALL_COLUMNS.filter(c => c.alwaysVisible).map(col => (
              <ColumnCheckbox key={col.key} label={col.label === '★' ? 'Favourite' : col.label} checked={true} locked={true} onChange={() => {}} />
            ))}
          </div>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: '800', color: '#A1887F', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{group.label}</div>
              <div style={{ padding: '0 4px 4px' }}>
                {group.keys.map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  if (!col) return null;
                  return (
                    <ColumnCheckbox key={key} label={col.label} checked={!!visibleCols[key]} locked={false}
                      onChange={() => onChange({ ...visibleCols, [key]: !visibleCols[key] })} />
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ height: '6px' }} />
        </div>
      )}
    </div>
  );
};

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
          background: getFlavorStyle(tag), color: 'white',
          padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
          fontWeight: '700', whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}>
          {tag}
        </span>
      ))}
    </div>
  );
};

const SortIcon = ({ active, direction }) => {
  if (!active) return <IcSortNeutral />;
  return direction === 'asc' ? <IcSortAsc /> : <IcSortDesc />;
};

const StatCard = ({ value, label, icon }) => (
  <div style={s.statCard}>
    <div style={{ ...s.statIcon, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8D6E63' }}>{icon}</div>
    <div style={s.statValue}>{value}</div>
    <div style={s.statLabel}>{label}</div>
  </div>
);

const BeanFilterBanner = ({ beanName, onClear }) => (
  <div style={s.filterBanner}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'flex', alignItems: 'center', color: '#5D4037' }}><IcCoffee size={14} /></span>
      <span style={s.filterBannerText}>Showing brews for <strong>{beanName}</strong></span>
    </div>
    <button onClick={onClear} style={s.filterBannerClear} title="Clear filter">✕ Show all brews</button>
  </div>
);

// ─── Inline Flavor Tag Editor ─────────────────────────────────────────────────

function FlavorTagEditor({ tags, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const inputRef          = React.useRef(null);
  const wrapRef           = React.useRef(null);
  const current           = Array.isArray(tags) ? tags : [];

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
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: getFlavorStyle(f), color: 'white', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
              {f}
              <button type="button" onClick={() => remove(f)} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', color: 'white', padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <input ref={inputRef} style={{ ...s.input, paddingLeft: '28px', fontSize: '12px' }} placeholder="Search or add flavors…" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => query && setOpen(true)} onKeyDown={e => { if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); add(filtered[0]); } if (e.key === 'Escape') setOpen(false); }} autoComplete="off" />
        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#8D6E63' }}><IcSearch /></span>
        {open && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: 'white', border: '1px solid #D7CCC8', borderRadius: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden' }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1, -1) : item;
              return (
                <button key={i} type="button" onMouseDown={e => { e.preventDefault(); add(item); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < filtered.length - 1 ? '1px solid #F5F0EC' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, background: getFlavorStyle(label), display: 'inline-block' }} />
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
  const Row = ({ children, full = false }) => (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto', ...s.inputGrp }}>{children}</div>
  );
  const Label = ({ children }) => <label style={s.editLabel}>{children}</label>;

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.editModal}>
        <div style={s.editHeader}>
          <span style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.9)' }}><IcEdit size={16} /></span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>Edit Brew Record</h3>
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>✕</button>
        </div>
        <div style={s.editBody}>
          <div style={s.editGrid}>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Record</div>
            <Row><Label>Date</Label><input style={s.input} type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} /></Row>
            <Row><Label>Beans</Label><input style={s.input} value={form.beans || ''} onChange={e => set('beans', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Bean Info</div>
            <Row><Label>Variety</Label><input style={s.input} placeholder="Geisha, Bourbon…" value={form.variety || ''} onChange={e => set('variety', e.target.value)} /></Row>
            <Row><Label>Processing</Label><select style={s.input} value={form.processing || ''} onChange={e => set('processing', e.target.value)}><option value="">Select…</option>{PROCESSING_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></Row>
            <Row><Label>Roast Level</Label><select style={s.input} value={form.roastLevel || ''} onChange={e => set('roastLevel', e.target.value)}><option value="">Select…</option>{ROAST_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></Row>
            <Row><Label>Roasting Date</Label><input style={s.input} type="date" value={form.roastingDate || ''} onChange={e => set('roastingDate', e.target.value)} /></Row>
            <div style={{ gridColumn: '1 / -1', ...s.editSection }}>Brew Setup</div>
            <Row><Label>Brew Method</Label><select style={s.input} value={form.method || ''} onChange={e => set('method', e.target.value)}><option value="">Select…</option>{BREW_METHODS.map(o => <option key={o} value={o}>{o}</option>)}</select></Row>
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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteModal = ({ brew, onConfirm, onCancel, deleting }) => (
  <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
    <div style={s.deleteModal}>
      <div style={{ ...s.deleteModalIcon, display: 'flex', justifyContent: 'center', color: '#EF5350' }}>
        <IcTrash size={28} />
      </div>
      <div style={s.deleteModalTitle}>Delete this brew?</div>
      <div style={s.deleteModalSub}><strong>{brew.beans}</strong>{brew.date ? ` · ${formatDate(brew.date)}` : ''}{brew.method ? ` · ${brew.method}` : ''}</div>
      <div style={s.deleteModalNote}>This action cannot be undone.</div>
      <div style={s.deleteModalActions}>
        <button style={s.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
        <button style={s.deleteConfirmBtn} onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Brew'}</button>
      </div>
    </div>
  </div>
);

// ─── No-Region Modal ──────────────────────────────────────────────────────────

const NoRegionModal = ({ brew, onClose }) => (
  <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={s.noRegionModal}>
      <div style={s.noRegionHeader}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#F5E6D3' }}>No Region Linked</span>
        <button style={s.noRegionCloseBtn} onClick={onClose}>✕</button>
      </div>
      <div style={s.noRegionBody}>
        <div style={{ fontSize: '13px', color: '#5D4037', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>{brew.beans}</strong> has no region linked. To navigate the map, edit this brew and assign a region.
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

  useEffect(() => {
    localStorage.setItem('rawdata_col_visibility', JSON.stringify(visibleCols));
  }, [visibleCols]);

  const COLUMNS = useMemo(
    () => ALL_COLUMNS.filter(c => c.alwaysVisible || visibleCols[c.key]),
    [visibleCols]
  );

  useEffect(() => {
    if (beanFilter) { setSearch(''); setMethodFilter('All'); }
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
    } catch { } finally { setActionLoading(false); }
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
    try {
      await updateDoc(doc(db, 'users', currentUid, 'brews', brew.id), { favorite: newVal });
    } catch {
      setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: brew.favorite } : b));
    }
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

  const allMethods = useMemo(() => {
    const set = new Set(brews.map(b => b.method).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [brews]);

  const filtered = useMemo(() => {
    let rows = [...brews];
    if (beanFilter) rows = rows.filter(b => b.beans === beanFilter);
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
      {brewToDelete && <DeleteModal brew={brewToDelete} onConfirm={handleDeleteConfirm} onCancel={() => setBrewToDelete(null)} deleting={actionLoading} />}
      {brewToEdit   && <EditModal   brew={brewToEdit}   onSave={handleUpdateBrew}        onCancel={() => setBrewToEdit(null)}   saving={actionLoading} />}
      {brewNoRegion && <NoRegionModal brew={brewNoRegion} onClose={() => setBrewNoRegion(null)} />}

      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ display: 'flex', alignItems: 'center', color: '#5D4037' }}><IcBarChart size={20} /></span>
          <div>
            <div style={s.headerTitle}>Brew Data</div>
            <div style={s.headerSub}>{brews.length} records in your journal</div>
          </div>
        </div>
      </div>

      {beanFilter && <BeanFilterBanner beanName={beanFilter} onClear={onClearBeanFilter} />}

      {stats && (
        <div style={s.statsRow}>
          <StatCard value={stats.total}       label="Total Brews"    icon={<IcCoffee size={15} />} />
          <StatCard value={stats.uniqueBeans} label="Unique Origins" icon={<IcGlobe size={15} />} />
          <StatCard value={stats.topMethod}   label="Fav. Method"    icon={<IcTrophy size={15} />} />
          <StatCard value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} label="Avg. Temp" icon={<IcThermo size={15} />} />
          {stats.topFlavor && (
            <StatCard
              value={<span style={{ background: getFlavorStyle(stats.topFlavor), color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' }}>{stats.topFlavor}</span>}
              label="Top Flavor" icon={<IcFloral size={15} />}
            />
          )}
        </div>
      )}

      <div style={s.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={s.searchWrap}>
              <span style={{ ...s.searchIcon, display: 'flex', alignItems: 'center', color: '#8D6E63' }}><IcSearch /></span>
              <input style={s.searchInput} placeholder="Search beans, variety, process, recipe…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              style={{ ...s.filterPill, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', ...(showFavOnly ? { background: '#F59E0B', color: 'white', border: '1px solid #F59E0B' } : {}) }}
              onClick={() => setShowFavOnly(v => !v)}
            >
              <IcStar filled={showFavOnly} /> Favourites
            </button>
          </div>
          <ColumnVisibilityPanel visibleCols={visibleCols} onChange={setVisibleCols} />
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
                  {COLUMNS.map(col => {
                    switch (col.key) {
                      case 'favorite':
                        return (
                          <td key="favorite" style={{ ...s.td, ...s.tdFav }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'transform 0.15s', transform: brew.favorite ? 'scale(1.15)' : 'scale(1)', filter: brew.favorite ? 'drop-shadow(0 1px 3px rgba(245,158,11,0.5))' : 'none', display: 'flex', alignItems: 'center' }} title={brew.favorite ? 'Unfavourite' : 'Favourite'} onClick={() => handleToggleFavorite(brew)}>
                              <IcStar filled={brew.favorite} />
                            </button>
                          </td>
                        );
                      case 'date':
                        return <td key="date" style={s.td}><span style={s.dateCell}>{formatDate(brew.date)}</span></td>;
                      case 'beans':
                        return (
                          <td key="beans" style={{ ...s.td, ...s.tdBeans }}>
                            <button onClick={() => handleBeanClick(brew)} title={hasRegion ? `View on map: ${regionById[brew.regionRef]?.name}` : 'No region linked'} style={s.beanBtn}>
                              <span style={s.beanBtnText}>{fmt(brew.beans)}</span>
                              <span style={{ ...s.beanBtnIcon, opacity: hasRegion ? 1 : 0.4, display: 'flex', alignItems: 'center' }}><IcPin active={hasRegion} /></span>
                            </button>
                          </td>
                        );
                      case 'variety':         return <td key="variety"         style={s.td}>{fmt(brew.variety)}</td>;
                      case 'processing':      return <td key="processing"      style={s.td}><ColorBadge value={brew.processing}  colorMap={PROCESSING_COLORS} /></td>;
                      case 'roastLevel':      return <td key="roastLevel"      style={s.td}><ColorBadge value={brew.roastLevel}  colorMap={ROAST_COLORS} /></td>;
                      case 'method':          return <td key="method"          style={s.td}><ColorBadge value={brew.method}      colorMap={METHOD_COLORS} /></td>;
                      case 'grinder':         return <td key="grinder"         style={s.td}>{fmt(brew.grinder)}</td>;
                      case 'grindSetting':    return <td key="grindSetting"    style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.grindSetting)}</td>;
                      case 'groundCoffeeWeight': return <td key="groundCoffeeWeight" style={{ ...s.td, ...s.tdCenter }}>{brew.groundCoffeeWeight ? `${brew.groundCoffeeWeight}g` : '—'}</td>;
                      case 'waterTemp':       return <td key="waterTemp"       style={{ ...s.td, ...s.tdCenter }}>{brew.waterTemp ? `${brew.waterTemp}°` : '—'}</td>;
                      case 'waterIn':         return <td key="waterIn"         style={{ ...s.td, ...s.tdCenter }}>{brew.waterIn ? `${brew.waterIn}ml` : '—'}</td>;
                      case 'brewTime':        return <td key="brewTime"        style={{ ...s.td, ...s.tdCenter }}>{fmt(brew.brewTime)}</td>;
                      case 'roastingDate':    return <td key="roastingDate"    style={{ ...s.td, ...s.tdCenter }}>{formatDate(brew.roastingDate)}</td>;
                      case 'flavorTags':      return <td key="flavorTags"      style={{ ...s.td, ...s.tdTags }}><FlavorTagsCell tags={brew.flavorTags} /></td>;
                      case 'notes':           return <td key="notes"           style={{ ...s.td, ...s.tdNotes }}>{brew.notes ? <span style={s.noteText}>{brew.notes}</span> : '—'}</td>;
                      case 'brewingRecipe':   return <td key="brewingRecipe"   style={{ ...s.td, ...s.tdNotes }}>{brew.brewingRecipe ? <span style={s.noteText}>{brew.brewingRecipe}</span> : '—'}</td>;
                      case 'extra':           return <td key="extra"           style={{ ...s.td, ...s.tdNotes }}>{fmt(brew.extra)}</td>;
                      default: return null;
                    }
                  })}
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button style={{ ...s.editBtn, display: 'flex', alignItems: 'center' }}   onClick={() => setBrewToEdit(brew)}><IcEdit size={13} /></button>
                      <button style={{ ...s.deleteBtn, display: 'flex', alignItems: 'center' }} onClick={() => setBrewToDelete(brew)}><IcTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#8D6E63' }}>
                  {beanFilter ? <>No brews found for <strong>{beanFilter}</strong>.</> : 'No brews match your search.'}
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
  root:        { display: 'flex', flexDirection: 'column', height: '100%', background: '#FDFAF7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header:      { padding: '16px 20px', borderBottom: '1px solid #EFEBE9', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '10px' },
  headerTitle: { fontSize: '16px', fontWeight: '700', color: '#2C1810' },
  headerSub:   { fontSize: '12px', color: '#8D6E63', marginTop: '2px' },

  filterBanner:     { background: '#FFF8E1', borderBottom: '1px solid #FFE082', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  filterBannerText: { fontSize: '13px', color: '#5D4037' },
  filterBannerClear:{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#8D6E63', fontWeight: '600', padding: '4px 8px', borderRadius: '4px' },

  statsRow:    { display: 'flex', gap: '12px', padding: '14px 20px', background: 'white', borderBottom: '1px solid #EFEBE9', flexWrap: 'wrap' },
  statCard:    { background: '#FAF7F4', borderRadius: '10px', padding: '10px 16px', minWidth: '90px', textAlign: 'center', border: '1px solid #EFEBE9' },
  statIcon:    { fontSize: '16px', marginBottom: '4px' },
  statValue:   { fontSize: '18px', fontWeight: '700', color: '#2C1810' },
  statLabel:   { fontSize: '10px', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },

  toolbar:     { padding: '12px 20px', background: 'white', borderBottom: '1px solid #EFEBE9', display: 'flex', flexDirection: 'column', gap: '8px' },
  searchWrap:  { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon:  { position: 'absolute', left: '10px', pointerEvents: 'none' },
  searchInput: { padding: '7px 12px 7px 30px', border: '1px solid #D7CCC8', borderRadius: '20px', fontSize: '12px', outline: 'none', width: '260px', background: '#FAFAFA' },
  filterRow:   { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterPill:  { padding: '4px 12px', borderRadius: '20px', border: '1px solid #D7CCC8', fontSize: '11px', cursor: 'pointer', background: 'none' },
  filterPillActive: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #2C1810' },

  tableWrap:   { flex: 1, overflow: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', minWidth: '600px', tableLayout: 'fixed' },
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

  beanBtn:     { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', textAlign: 'left', fontFamily: 'inherit' },
  beanBtnText: { fontSize: '13px', fontWeight: '600', color: '#2C1810', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#A1887F', textUnderlineOffset: '3px' },
  beanBtnIcon: { fontSize: '11px', flexShrink: 0 },

  noRegionModal:    { background: 'white', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  noRegionHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  noRegionCloseBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', color: '#F5E6D3' },
  noRegionBody:     { padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },

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

  deleteModal:        { background: 'white', padding: '24px', borderRadius: '12px', textAlign: 'center', maxWidth: '300px' },
  deleteModalIcon:    { marginBottom: '12px' },
  deleteModalTitle:   { fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  deleteModalSub:     { fontSize: '13px', color: '#5D4037', marginBottom: '8px' },
  deleteModalNote:    { fontSize: '11px', color: '#B71C1C', marginBottom: '20px' },
  deleteModalActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  deleteConfirmBtn:   { padding: '9px 20px', background: '#C62828', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' },

  badge:       { padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' },
  dateCell:    { fontSize: '12px', fontWeight: '600' },
  dash:        { color: '#BCAAA4' },
  noteText:    { color: '#5D4037' },
  centerWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' },
  spinnerRing: { width: '24px', height: '24px', border: '3px solid #EFEBE9', borderTopColor: '#5D4037', borderRadius: '50%', animation: 'spin 1s infinite linear' },
  microBtn:    { padding: '2px 9px', borderRadius: '10px', border: '1px solid #D7CCC8', background: 'none', fontSize: '11px', fontWeight: '600', color: '#8D6E63', cursor: 'pointer' },
};

export default RawData;