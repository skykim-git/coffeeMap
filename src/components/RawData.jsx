import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/RawData.mobile.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => v || '—';
const formatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const ROAST_COLORS = {
  Light:        { bg: '#FFF3E0', color: '#E65100' },
  'Medium-Light':{ bg: '#FFE0B2', color: '#BF360C' },
  Medium:       { bg: '#FFCCBC', color: '#BF360C' },
  'Medium-Dark':{ bg: '#D7CCC8', color: '#4E342E' },
  Dark:         { bg: '#4E342E', color: '#FFCCBC' },
};

const PROCESS_COLORS = {
  Washed:       { bg: '#E3F2FD', color: '#1565C0' },
  Natural:      { bg: '#F3E5F5', color: '#6A1B9A' },
  Honey:        { bg: '#FFF9C4', color: '#F57F17' },
  Anaerobic:    { bg: '#E8F5E9', color: '#2E7D32' },
  'Wet-Hulled': { bg: '#E0F7FA', color: '#00695C' },
};

const FLAVOR_MAP = {
  fruity:    ['#E91E63','#C2185B'], citrus:   ['#FF9800','#E65100'],
  chocolate: ['#795548','#4E342E'], nutty:    ['#8D6E63','#5D4037'],
  floral:    ['#9C27B0','#6A1B9A'], spicy:    ['#F44336','#B71C1C'],
  caramel:   ['#FF8F00','#E65100'], earthy:   ['#607D8B','#37474F'],
  berry:     ['#880E4F','#E91E63'], tropical: ['#FBC02D','#F57F17'],
  sweet:     ['#EC407A','#AD1457'], bright:   ['#039BE5','#0277BD'],
  clean:     ['#26A69A','#00796B'], complex:  ['#5E35B1','#311B92'],
};

const getFlavorStyle = (tag) => {
  if (!tag) return '#BCAAA4';
  const key = Object.keys(FLAVOR_MAP).find(k => tag.toLowerCase().includes(k));
  const pair = key ? FLAVOR_MAP[key] : ['#A1887F','#6D4C41'];
  return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
};

const getFlavorEmoji = () => '';

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'favorite',            label: '★',            width: '40px',  alwaysVisible: true  },
  { key: 'date',                label: 'Date',          width: '90px',  alwaysVisible: true  },
  { key: 'beans',               label: 'Beans',         width: '160px', alwaysVisible: true  },
  { key: 'variety',             label: 'Variety',       width: '100px' },
  { key: 'processing',          label: 'Process',       width: '100px' },
  { key: 'roastLevel',          label: 'Roast',         width: '110px' },
  { key: 'roastingDate',        label: 'Roast Date',    width: '90px'  },
  { key: 'method',              label: 'Method',        width: '100px', alwaysVisible: true  },
  { key: 'grinder',             label: 'Grinder',       width: '100px' },
  { key: 'grindSetting',        label: 'Grind',         width: '80px'  },
  { key: 'groundCoffeeWeight',  label: 'Coffee (g)',    width: '80px'  },
  { key: 'waterTemp',           label: 'Temp (°C)',     width: '80px'  },
  { key: 'waterIn',             label: 'Water (g)',     width: '80px'  },
  { key: 'brewTime',            label: 'Brew Time',     width: '80px'  },
  { key: 'flavorTags',          label: 'Flavor Tags',   width: '180px' },
  { key: 'notes',               label: 'Notes',         width: '200px' },
  { key: 'brewingRecipe',       label: 'Recipe',        width: '120px' },
  { key: 'extra',               label: 'Extra',         width: '120px' },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.reduce((acc, c) => {
  acc[c.key] = c.alwaysVisible ?? false;
  return acc;
}, {});

const BEAN_FIELDS = [
  'beans','method','variety','processing','roastLevel','roastingDate',
  'grinder','grindSetting','groundCoffeeWeight','waterTemp','waterIn',
  'brewTime','flavorTags','notes','brewingRecipe','extra','date','regionRef','favorite',
];

// ─── Mobile Brew Card ─────────────────────────────────────────────────────────

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconStar = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);

const BrewCard = ({ brew, regionById, onFavorite, onEdit, onDelete, onBeanClick }) => {
  const hasRegion = !!brew.regionRef && !!regionById[brew.regionRef];
  const roastPalette   = ROAST_COLORS[brew.roastLevel]   || null;
  const processPalette = PROCESS_COLORS[brew.processing]  || null;

  return (
    <div className="brew-card">
      <div className="brew-card-header">
        <div className="brew-card-title">
          <button className="brew-card-bean" onClick={() => onBeanClick(brew)}>
            {fmt(brew.beans)}{hasRegion ? ' ↗' : ''}
          </button>
          <div className="brew-card-badges" style={{ marginTop: '6px' }}>
            {brew.method && <span className="brew-card-badge">{brew.method}</span>}
            {brew.roastLevel && roastPalette && (
              <span className="brew-card-badge" style={{ background: roastPalette.bg, color: roastPalette.color }}>{brew.roastLevel}</span>
            )}
          </div>
        </div>
        <div className="brew-card-actions">
          <button className={`brew-card-fav-btn${brew.favorite ? ' active' : ''}`} onClick={() => onFavorite(brew)} title={brew.favorite ? 'Unfavourite' : 'Favourite'}>
            <IconStar filled={brew.favorite} />
          </button>
          <button className="brew-card-icon-btn" onClick={() => onEdit(brew)} title="Edit">
            <IconEdit />
          </button>
          <button className="brew-card-icon-btn brew-card-icon-btn--delete" onClick={() => onDelete(brew)} title="Delete">
            <IconTrash />
          </button>
        </div>
      </div>
      <div className="brew-card-body">
        <div className="brew-card-date">{formatDate(brew.date)}</div>

        {/* Key brew metrics */}
        {(brew.groundCoffeeWeight || brew.waterIn || brew.waterTemp || brew.brewTime || brew.grindSetting) && (
          <div className="brew-card-meta-row">
            {brew.groundCoffeeWeight && <span className="brew-card-stat-chip">{brew.groundCoffeeWeight}g coffee</span>}
            {brew.waterIn            && <span className="brew-card-stat-chip">{brew.waterIn}g water</span>}
            {brew.waterTemp          && <span className="brew-card-stat-chip">{brew.waterTemp}°C</span>}
            {brew.brewTime           && <span className="brew-card-stat-chip">{brew.brewTime}</span>}
            {brew.grindSetting       && <span className="brew-card-stat-chip">grind {brew.grindSetting}</span>}
          </div>
        )}

        {/* Processing + variety */}
        {(brew.processing || brew.variety) && (
          <div className="brew-card-badges">
            {brew.processing && processPalette && (
              <span className="brew-card-badge" style={{ background: processPalette.bg, color: processPalette.color }}>{brew.processing}</span>
            )}
            {brew.variety && <span className="brew-card-badge">{brew.variety}</span>}
          </div>
        )}

        {/* Flavor tags */}
        {Array.isArray(brew.flavorTags) && brew.flavorTags.length > 0 && (
          <div className="brew-card-flavors">
            {brew.flavorTags.map((tag, i) => (
              <span key={i} className="brew-card-flavor-tag" style={{ background: getFlavorStyle(tag) }}>
                {getFlavorEmoji(tag)} {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {brew.notes && <div className="brew-card-notes">"{brew.notes}"</div>}
      </div>
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
  <span style={{ marginLeft: '4px', opacity: active ? 1 : 0.3, display: 'inline-flex', verticalAlign: 'middle' }}>
    {active ? (
      direction === 'asc'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="10" height="10"><polyline points="18,15 12,9 6,15"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="10" height="10"><polyline points="6,9 12,15 18,9"/></svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" width="10" height="10"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="8" y2="18"/><polyline points="15,15 18,18 21,15"/><line x1="18" y1="9" x2="18" y2="18"/></svg>
    )}
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
      <svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
      <span style={s.filterBannerText}>Showing brews for <strong>{beanName}</strong></span>
    </div>
    <button onClick={onClear} style={s.filterBannerClear} title="Clear filter">✕ Show all</button>
  </div>
);

// ─── Flavor Tag Editor ────────────────────────────────────────────────────────

function FlavorTagEditor({ tags, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const inputRef          = useRef(null);
  const wrapRef           = useRef(null);
  const current           = Array.isArray(tags) ? tags : [];

  const SUGGESTED = ['fruity','citrus','chocolate','nutty','floral','spicy','caramel','earthy','berry','tropical','sweet','bright','clean','complex','winey','savory','smoky','buttery','jasmine','peach','plum','cherry'];

  const filtered = query.trim()
    ? SUGGESTED.filter(s => s.includes(query.toLowerCase()) && !current.includes(s))
    : SUGGESTED.filter(s => !current.includes(s));

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (tag) => { onChange([...current, tag]); setQuery(''); inputRef.current?.focus(); };
  const remove = (tag) => onChange(current.filter(t => t !== tag));
  const addCustom = () => {
    const t = query.trim().toLowerCase();
    if (t && !current.includes(t)) { onChange([...current, t]); setQuery(''); }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '6px 8px', border: '1px solid #D7CCC8', borderRadius: '6px', background: '#FAFAFA', minHeight: '38px', cursor: 'text' }}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        {current.map(tag => (
          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: getFlavorStyle(tag), color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
            {getFlavorEmoji(tag)} {tag}
            <button onClick={(e) => { e.stopPropagation(); remove(tag); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 2px', fontSize: '12px', lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } if (e.key === 'Escape') setOpen(false); }}
          placeholder={current.length ? '' : 'Add flavor tags…'} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '12px', minWidth: '80px', flex: 1 }} />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E0D5CF', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: '160px', overflowY: 'auto', marginTop: '4px' }}>
          {filtered.slice(0, 12).map(tag => (
            <div key={tag} onMouseDown={() => add(tag)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F0EC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: getFlavorStyle(tag), color: 'white', padding: '1px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{getFlavorEmoji(tag)} {tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column Checkbox ──────────────────────────────────────────────────────────

const ColumnCheckbox = ({ label, checked, locked, onChange }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '6px', cursor: locked ? 'default' : 'pointer', background: hovered && !locked ? '#F5F0EC' : 'transparent', transition: 'background 0.12s', opacity: locked ? 0.45 : 1, userSelect: 'none' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '5px', border: checked ? '2px solid #5D4037' : '2px solid #C4B5AC', background: checked ? '#5D4037' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s', boxShadow: checked ? '0 1px 4px rgba(93,64,55,0.25)' : 'none' }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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

  const groups = [
    { label: 'Bean Info',  keys: ['variety', 'processing', 'roastLevel', 'roastingDate'] },
    { label: 'Brew Setup', keys: ['method', 'grinder', 'grindSetting', 'groundCoffeeWeight', 'waterTemp', 'waterIn', 'brewTime'] },
    { label: 'Tasting',    keys: ['flavorTags', 'notes'] },
    { label: 'Extra',      keys: ['brewingRecipe', 'extra'] },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: open ? '1px solid #8D6E63' : '1px solid #D7CCC8', background: open ? '#5D4037' : 'white', color: open ? 'white' : '#5D4037', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Columns {hiddenCount > 0 && <span style={{ background: open ? 'rgba(255,255,255,0.25)' : '#EFEBE9', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>+{hiddenCount} hidden</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'white', border: '1px solid #E0D5CF', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 300, width: '220px', maxHeight: '400px', overflowY: 'auto', animation: 'fadeSlideDown 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px', borderBottom: '1px solid #F5F0EC' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Columns</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { const next = { ...visibleCols }; ALL_COLUMNS.forEach(c => { if (!c.alwaysVisible) next[c.key] = true; }); onChange(next); }} style={s.microBtn}>All</button>
              <button onClick={() => { const next = { ...visibleCols }; ALL_COLUMNS.forEach(c => { if (!c.alwaysVisible) next[c.key] = false; }); onChange(next); }} style={s.microBtn}>None</button>
            </div>
          </div>
          <div style={{ padding: '4px 4px 4px' }}>
            {ALL_COLUMNS.filter(c => c.alwaysVisible).map(col => (
              <ColumnCheckbox key={col.key} label={col.key === 'favorite' ? 'Favourite' : col.label} checked={true} locked={true} onChange={() => {}} />
            ))}
          </div>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#BCAAA4', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 14px 4px', borderTop: '1px solid #F5F0EC' }}>{group.label}</div>
              <div style={{ padding: '0 4px' }}>
                {group.keys.map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  if (!col) return null;
                  return <ColumnCheckbox key={key} label={col.label} checked={!!visibleCols[key]} locked={false} onChange={() => onChange({ ...visibleCols, [key]: !visibleCols[key] })} />;
                })}
              </div>
            </div>
          ))}
          <div style={{ height: '8px' }} />
        </div>
      )}
      <style>{`@keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
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
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#2C1810', marginBottom: '8px' }}>No region linked to this brew</div>
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal = ({ brew, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({ ...brew });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fields = [
    { key: 'beans',               label: 'Beans',               type: 'text' },
    { key: 'date',                label: 'Date',                type: 'date' },
    { key: 'method',              label: 'Method',              type: 'text' },
    { key: 'variety',             label: 'Variety',             type: 'text' },
    { key: 'processing',          label: 'Processing',          type: 'text' },
    { key: 'roastLevel',          label: 'Roast Level',         type: 'text' },
    { key: 'roastingDate',        label: 'Roasting Date',       type: 'date' },
    { key: 'grinder',             label: 'Grinder',             type: 'text' },
    { key: 'grindSetting',        label: 'Grind Setting',       type: 'text' },
    { key: 'groundCoffeeWeight',  label: 'Coffee Weight (g)',   type: 'number' },
    { key: 'waterTemp',           label: 'Water Temp (°C)',     type: 'number' },
    { key: 'waterIn',             label: 'Water In (g)',        type: 'number' },
    { key: 'brewTime',            label: 'Brew Time',           type: 'text' },
    { key: 'brewingRecipe',       label: 'Recipe',              type: 'text' },
    { key: 'extra',               label: 'Extra Notes',         type: 'text' },
  ];

  const beanSection = fields.slice(0, 6);
  const brewSection = fields.slice(6);

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.editModal}>
        <div style={s.editHeader}>
          <span style={{ fontSize: '18px' }}>✏️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#F5E6D3' }}>Edit Brew</div>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,211,0.6)' }}>{brew.beans}</div>
          </div>
        </div>
        <div style={s.editBody}>
          <div style={s.editSection}>Bean Info</div>
          <div style={s.editGrid}>
            {beanSection.map(f => (
              <div key={f.key} style={s.inputGrp}>
                <label style={s.editLabel}>{f.label}</label>
                <input type={f.type} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} style={s.input} />
              </div>
            ))}
          </div>
          <div style={{ ...s.editSection, marginTop: '16px' }}>Brew Setup</div>
          <div style={s.editGrid}>
            {brewSection.map(f => (
              <div key={f.key} style={s.inputGrp}>
                <label style={s.editLabel}>{f.label}</label>
                <input type={f.type} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} style={s.input} />
              </div>
            ))}
          </div>
          <div style={{ ...s.editSection, marginTop: '16px' }}>Flavor Tags</div>
          <FlavorTagEditor tags={form.flavorTags} onChange={v => set('flavorTags', v)} />
          <div style={{ ...s.editSection, marginTop: '16px' }}>Tasting Notes</div>
          <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} style={{ ...s.input, height: '80px', resize: 'vertical' }} />
        </div>
        <div style={s.editFooter}>
          <button style={s.cancelBtn} onClick={onCancel} disabled={saving}>Cancel</button>
          <button style={s.saveBtn} onClick={() => onSave(form)} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({ brew, onConfirm, onCancel, deleting }) => (
  <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
    <div style={s.deleteModal}>
      <div style={s.deleteModalIcon}><svg viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></div>
      <div style={s.deleteModalTitle}>Delete this brew?</div>
      <div style={s.deleteModalSub}>{brew.beans}{brew.date ? ` · ${formatDate(brew.date)}` : ''}{brew.method ? ` · ${brew.method}` : ''}</div>
      <div style={s.deleteModalNote}>This action cannot be undone.</div>
      <div style={s.deleteModalActions}>
        <button style={s.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
        <button style={s.deleteConfirmBtn} onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Brew'}</button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

function RawData({ onNavigateToRegion, allRegionDocs = [], beanFilter = null, onClearBeanFilter, externalBrews }) {
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUid(user.uid);
      else { setCurrentUid(null); setBrews([]); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (externalBrews) {
      const sorted = [...externalBrews].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setBrews(sorted.map(b => ({ _source: 'firestore', ...b })));
      setLoading(false);
    } else if (currentUid) {
      setLoading(true);
      getDocs(collection(db, 'users', currentUid, 'brews'))
        .then(snapshot => {
          const docs = snapshot.docs.map(d => ({ id: d.id, _source: 'firestore', ...d.data() }));
          docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setBrews(docs);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [externalBrews, currentUid]);

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

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#F5E6D3" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
          <div>
            <div style={s.headerTitle}>Brew Data</div>
            <div style={s.headerSub}>{brews.length} records in your journal</div>
          </div>
        </div>
      </div>

      {beanFilter && <BeanFilterBanner beanName={beanFilter} onClear={onClearBeanFilter} />}

      {/* Stats row — horizontal scroll on mobile */}
      {stats && (
        <div className="rawdata-stats-row">
          <StatCard value={stats.total}       label="Total Brews"    icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>} />
          <StatCard value={stats.uniqueBeans} label="Unique Origins" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>} />
          <StatCard value={stats.topMethod}   label="Fav. Method"    icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>} />
          <StatCard value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} label="Avg. Temp" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>} />
          {stats.topFlavor && (
            <StatCard
              value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: getFlavorStyle(stats.topFlavor), color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' }}>{stats.topFlavor}</span>}
              label="Top Flavor" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 22C6.5 22 2 17.5 2 12 2 9.5 4 6 6 4c0 2 1 4 4 4 0-4 2.5-6 4-6 0 3 2 5 4 5 0-2 2-3 3-3-1 3 0 5 0 7 0 5.5-4.5 11-9 11z"/></svg>}
            />
          )}
        </div>
      )}

      {/* Toolbar — always visible */}
      <div className="rawdata-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ ...s.searchWrap, flex: '1 1 200px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8D6E63" strokeWidth="1.75" strokeLinecap="round" width="14" height="14" style={{ position: 'absolute', left: '10px', top: '9px' }}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={s.searchInput} placeholder="Search beans, variety, process…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Favourites pill */}
          <button
            style={{ ...s.filterPill, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', ...(showFavOnly ? { background: '#F59E0B', color: 'white', border: '1px solid #F59E0B' } : {}) }}
            onClick={() => setShowFavOnly(v => !v)}
          >
            <svg viewBox="0 0 24 24" fill={showFavOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg> Favourites
          </button>

          {/* Column visibility — hidden on mobile via CSS */}
          <span className="rawdata-col-visibility">
            <ColumnVisibilityPanel visibleCols={visibleCols} onChange={setVisibleCols} />
          </span>
        </div>

        {/* Method filter pills */}
        <div style={s.filterRow}>
          {allMethods.map(m => (
            <button key={m} style={{ ...s.filterPill, ...(methodFilter === m ? s.filterPillActive : {}) }} onClick={() => setMethodFilter(m)}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── Mobile: Card list (shown via CSS at ≤1024px) ── */}
      <div className="brew-card-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8D6E63', fontStyle: 'italic' }}>
            {beanFilter ? <>No brews found for <strong>{beanFilter}</strong>.</> : 'No brews match your search.'}
          </div>
        ) : (
          filtered.map((brew, idx) => (
            <BrewCard
              key={brew.id || idx}
              brew={brew}
              regionById={regionById}
              onFavorite={handleToggleFavorite}
              onEdit={setBrewToEdit}
              onDelete={setBrewToDelete}
              onBeanClick={handleBeanClick}
            />
          ))
        )}
      </div>

      {/* ── Desktop: Table (hidden via CSS at ≤1024px) ── */}
      <div className="rawdata-table-wrap">
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
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: brew.favorite ? '#F59E0B' : '#D7CCC8', transition: 'color 0.15s, transform 0.15s', transform: brew.favorite ? 'scale(1.15)' : 'scale(1)', filter: brew.favorite ? 'drop-shadow(0 1px 3px rgba(245,158,11,0.5))' : 'none', display: 'flex' }} title={brew.favorite ? 'Unfavourite' : 'Favourite'} onClick={() => handleToggleFavorite(brew)}>
                                <svg viewBox="0 0 24 24" fill={brew.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
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
                                <span style={{ ...s.beanBtnIcon, color: hasRegion ? '#5D4037' : '#D7CCC8', opacity: hasRegion ? 1 : 0.4 }}>↗</span>
                              </button>
                            </td>
                          );
                        case 'roastLevel':
                          return <td key="roastLevel" style={s.td}><ColorBadge value={brew.roastLevel} colorMap={ROAST_COLORS} /></td>;
                        case 'processing':
                          return <td key="processing" style={s.td}><ColorBadge value={brew.processing} colorMap={PROCESS_COLORS} /></td>;
                        case 'flavorTags':
                          return <td key="flavorTags" style={{ ...s.td, ...s.tdTags }}><FlavorTagsCell tags={brew.flavorTags} /></td>;
                        case 'notes':
                          return <td key="notes" style={{ ...s.td, ...s.tdNotes }}>{brew.notes ? `"${brew.notes}"` : <span style={s.dash}>—</span>}</td>;
                        default:
                          return <td key={col.key} style={s.td}>{fmt(brew[col.key])}</td>;
                      }
                    })}
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      <button style={s.editBtn} onClick={() => setBrewToEdit(brew)} title="Edit">✏️</button>
                      {' '}
                      <button style={s.deleteBtn} onClick={() => setBrewToDelete(brew)} title="Delete">🗑️</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ ...s.td, textAlign: 'center', color: '#8D6E63', fontStyle: 'italic', padding: '40px' }}>
                    {beanFilter ? <>No brews found for <strong>{beanFilter}</strong>.</> : 'No brews match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root:        { height: '100%', display: 'flex', flexDirection: 'column', background: '#FAF7F4', fontFamily: 'sans-serif', overflow: 'hidden' },
  header:      { display: 'flex', padding: '18px 24px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', flexShrink: 0 },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '12px' },
  headerTitle: { fontSize: '16px', fontWeight: '700', color: '#F5E6D3' },
  headerSub:   { fontSize: '11px', color: 'rgba(245,230,211,0.5)' },

  filterBanner:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: '#FFF8E1', borderBottom: '1px solid #FFE082', flexShrink: 0 },
  filterBannerText:  { fontSize: '13px', color: '#5D4037' },
  filterBannerClear: { display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'none', border: '1px solid #A1887F', borderRadius: '20px', fontSize: '12px', color: '#5D4037', cursor: 'pointer', fontWeight: '600' },

  statsRow:    { display: 'flex', background: '#D7CCC8', gap: '1px', flexShrink: 0 }, // fallback, layout via .rawdata-stats-row
  statCard:    { flex: '1 0 80px', background: '#FFFDF9', padding: '14px', textAlign: 'center' },
  statIcon:    { fontSize: '16px', marginBottom: '4px' },
  statValue:   { fontSize: '18px', fontWeight: '800' },
  statLabel:   { fontSize: '9px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' },

  toolbar:     { padding: '12px 24px', background: '#FFFDF9', borderBottom: '1px solid #EFEBE9', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }, // layout via .rawdata-toolbar
  searchWrap:  { position: 'relative', flex: 1 },
  searchInput: { width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' },
  searchIcon:  { position: 'absolute', left: '10px', top: '8px', fontSize: '12px' },
  filterRow:   { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterPill:  { padding: '4px 12px', borderRadius: '20px', border: '1px solid #D7CCC8', fontSize: '11px', cursor: 'pointer', background: 'none' },
  filterPillActive: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #2C1810' },

  // Desktop table
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

  // Modals
  noRegionModal:    { background: 'white', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  noRegionHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  noRegionCloseBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', color: '#F5E6D3' },
  noRegionBody:     { padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  editModal:   { background: 'white', borderRadius: '12px', width: '560px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  editHeader:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #EFEBE9', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', flexShrink: 0 },
  editBody:    { flex: 1, overflowY: 'auto', padding: '20px' },
  editGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  editSection: { fontSize: '10px', fontWeight: '800', color: '#A1887F', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #EFEBE9', paddingBottom: '4px', marginTop: '4px' },
  editFooter:  { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #EFEBE9', background: '#FAF7F4', flexShrink: 0 },
  editLabel:   { fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' },
  inputGrp:    { display: 'flex', flexDirection: 'column' },
  input:       { padding: '8px 10px', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '13px', fontFamily: 'sans-serif', color: '#2C1810', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box', width: '100%' },
  saveBtn:     { padding: '9px 20px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  cancelBtn:   { padding: '9px 20px', background: 'none', border: '1px solid #D7CCC8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#8D6E63' },
  deleteModal:        { background: 'white', padding: '24px', borderRadius: '12px', textAlign: 'center', maxWidth: '300px' },
  deleteModalIcon:    { fontSize: '32px', marginBottom: '12px' },
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