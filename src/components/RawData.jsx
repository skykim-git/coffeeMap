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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

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

// Diagonal arrow-up-right for "has region" link indicator
const IconArrowOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11" style={{ marginLeft: '4px', verticalAlign: 'middle', opacity: 0.55 }}>
    <line x1="7" y1="17" x2="17" y2="7"/>
    <polyline points="7 7 17 7 17 17"/>
  </svg>
);

// ─── Mobile Brew Card ─────────────────────────────────────────────────────────

const BrewCard = ({ brew, regionById, onFavorite, onEdit, onDelete, onBeanClick }) => {
  const hasRegion    = !!brew.regionRef && !!regionById[brew.regionRef];
  const roastPalette = ROAST_COLORS[brew.roastLevel] || null;

  const ratio = brew.groundCoffeeWeight && brew.waterIn
    ? (parseFloat(brew.waterIn) / parseFloat(brew.groundCoffeeWeight)).toFixed(1)
    : null;

  const ratioBarWidth = brew.groundCoffeeWeight && brew.waterIn
    ? Math.min(100, (parseFloat(brew.groundCoffeeWeight) / parseFloat(brew.waterIn)) * 100 * 16)
    : 0;

  return (
    <div className="brew-card">

      {/* ── Header ── */}
      <div className="brew-card-header">
        <div className="brew-card-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button className="brew-card-bean" onClick={() => onBeanClick(brew)}>
              {fmt(brew.beans)}
            </button>
            {hasRegion && <IconArrowOut />}
          </div>
          <div className="brew-card-sub">
            {brew.method && <span>{brew.method}</span>}
            {brew.method && brew.roastLevel && <span className="brew-card-dot">·</span>}
            {brew.roastLevel && (
              <span style={roastPalette ? { color: roastPalette.color } : {}}>
                {brew.roastLevel}
              </span>
            )}
            {(brew.method || brew.roastLevel) && brew.date && <span className="brew-card-dot">·</span>}
            {brew.date && <span>{formatDate(brew.date)}</span>}
          </div>
        </div>

        <div className="brew-card-actions">
          <button
            className={`brew-card-fav-btn${brew.favorite ? ' active' : ''}`}
            onClick={() => onFavorite(brew)}
            title={brew.favorite ? 'Unfavourite' : 'Favourite'}
          >
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

      {/* ── Two-column body ── */}
      <div className="brew-card-body">

        {/* Left: brew parameters */}
        <div className="brew-card-left">
          <span className="brew-card-section-label">Brew parameters</span>
          <div className="brew-card-params-grid">
            <div className="brew-card-param">
              <span className="brew-param-key">Coffee</span>
              <span className="brew-param-val">{brew.groundCoffeeWeight ? `${brew.groundCoffeeWeight}g` : '—'}</span>
            </div>
            <div className="brew-card-param">
              <span className="brew-param-key">Water</span>
              <span className="brew-param-val">{brew.waterIn ? `${brew.waterIn}g` : '—'}</span>
            </div>
            <div className="brew-card-param">
              <span className="brew-param-key">Temp</span>
              <span className="brew-param-val">{brew.waterTemp ? `${brew.waterTemp}°C` : '—'}</span>
            </div>
            <div className="brew-card-param">
              <span className="brew-param-key">Time</span>
              <span className="brew-param-val">{brew.brewTime || '—'}</span>
            </div>
          </div>
          {ratio && (
            <div className="brew-card-ratio">
              <div className="brew-card-ratio-bar">
                <div className="brew-card-ratio-fill" style={{ width: `${ratioBarWidth}%` }} />
              </div>
              <div className="brew-card-ratio-label">
                <span>{brew.groundCoffeeWeight}g coffee</span>
                <span>1:{ratio}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: grind & recipe */}
        <div className="brew-card-right">
          <span className="brew-card-section-label">Grind & Recipe</span>
          <div className="brew-card-info-rows">
            {brew.grinder      && <div className="brew-card-info-row"><span>Grinder</span><span>{brew.grinder}</span></div>}
            {brew.grindSetting && <div className="brew-card-info-row"><span>Setting</span><span>{brew.grindSetting}</span></div>}
            {brew.brewingRecipe && <div className="brew-card-info-row"><span>Recipe</span><span>{brew.brewingRecipe}</span></div>}
            {brew.savedBeanId && (
              <button
                onClick={() => onBeanClick(brew)}
                style={{ marginTop: '4px', background: 'none', border: '1px solid #D7CCC8', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#5D4037', cursor: 'pointer', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><circle cx="12" cy="8" r="5"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
                {brew.savedBeanLabel || 'Saved Bean'}
              </button>
            )}
            {!brew.grinder && !brew.grindSetting && !brew.brewingRecipe && !brew.savedBeanId && (
              <div style={{ fontSize: '12px', color: '#BCAAA4', fontStyle: 'italic' }}>No grind info saved</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Flavor tags ── */}
      {Array.isArray(brew.flavorTags) && brew.flavorTags.length > 0 && (
        <div className="brew-card-flavors">
          {brew.flavorTags.map((tag, i) => (
            <span key={i} className="brew-card-flavor-tag" style={{ background: getFlavorStyle(tag) }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Notes ── */}
      {brew.notes && <div className="brew-card-notes">"{brew.notes}"</div>}
    </div>
  );
};

// ─── Flavor Tag Editor (used in EditModal) ────────────────────────────────────

function FlavorTagEditor({ tags, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const current  = Array.isArray(tags) ? tags : [];

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
        Columns {hiddenCount > 0 && <span style={{ background: open ? 'rgba(255,255,255,0.25)' : '#EFEBE9', color: open ? 'white' : '#8D6E63', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' }}>{hiddenCount} hidden</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'white', borderRadius: '12px', border: '1px solid #E8E0DC', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 50, width: '220px', padding: '8px 0', animation: 'fadeSlideDown 0.15s ease' }}>
          {groups.map(g => (
            <div key={g.label}>
              <div style={{ padding: '6px 14px 3px', fontSize: '9px', fontWeight: '800', color: '#BCAAA4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.label}</div>
              {g.keys.map(key => {
                const col = ALL_COLUMNS.find(c => c.key === key);
                if (!col) return null;
                return <ColumnCheckbox key={key} label={col.label} checked={!!visibleCols[key]} locked={!!col.alwaysVisible} onChange={() => !col.alwaysVisible && onChange({ ...visibleCols, [key]: !visibleCols[key] })} />;
              })}
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
      <div style={s.editModal} className="rawdata-edit-modal">
        <div style={s.editHeader}>
          <IconEdit />
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
          <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} style={{ ...s.input, height: '80px', resize: 'vertical', fontFamily: 'sans-serif' }} placeholder="Tasting notes…" />
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
      <div style={s.deleteModalIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
          <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>
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

// ─── Bean Filter Banner ───────────────────────────────────────────────────────

const BeanFilterBanner = ({ beanName, onClear }) => (
  <div style={s.filterBanner}>
    <span style={s.filterBannerText}>
      Showing brews for <strong>{beanName}</strong>
    </span>
    <button style={s.filterBannerClear} onClick={onClear}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      Clear filter
    </button>
  </div>
);

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ active, direction }) => (
  <span style={{ marginLeft: '4px', opacity: active ? 1 : 0.3, fontSize: '10px' }}>
    {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}
  </span>
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
      setBrews(prev => prev.map(b => b.id === brew.id ? { ...b, favorite: !newVal } : b));
    }
  };

  const handleBeanClick = (brew) => {
    if (brew.regionRef && regionById[brew.regionRef]) {
      onNavigateToRegion && onNavigateToRegion(brew.regionRef);
    } else {
      setBrewNoRegion(brew);
    }
  };

  const allMethods = useMemo(() => {
    const methods = new Set(brews.map(b => b.method).filter(Boolean));
    return ['All', ...Array.from(methods).sort()];
  }, [brews]);

  const filtered = useMemo(() => {
    let rows = brews.filter(brew => {
      if (showFavOnly && !brew.favorite) return false;
      if (beanFilter && brew.beans !== beanFilter) return false;
      if (methodFilter !== 'All' && brew.method !== methodFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return BEAN_FIELDS.some(f => {
        const v = brew[f];
        if (Array.isArray(v)) return v.some(t => t?.toLowerCase().includes(q));
        return String(v ?? '').toLowerCase().includes(q);
      });
    });

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
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

      {beanFilter && <BeanFilterBanner beanName={beanFilter} onClear={onClearBeanFilter} />}

      {/* Toolbar */}
      <div className="rawdata-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ ...s.searchWrap, flex: '1 1 200px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8D6E63" strokeWidth="1.75" strokeLinecap="round" width="14" height="14" style={{ position: 'absolute', left: '10px', top: '9px' }}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={s.searchInput} placeholder="Search beans, variety, process…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            style={{ ...s.filterPill, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', ...(showFavOnly ? { background: '#F59E0B', color: 'white', border: '1px solid #F59E0B' } : {}) }}
            onClick={() => setShowFavOnly(v => !v)}
          >
            <svg viewBox="0 0 24 24" fill={showFavOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg> Favourites
          </button>
          <span className="rawdata-col-visibility">
            <ColumnVisibilityPanel visibleCols={visibleCols} onChange={setVisibleCols} />
          </span>
        </div>
        <div style={s.filterRow}>
          {allMethods.map(m => (
            <button key={m} style={{ ...s.filterPill, ...(methodFilter === m ? s.filterPillActive : {}) }} onClick={() => setMethodFilter(m)}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── Mobile: Card list ── */}
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

      {/* ── Desktop: Table ── */}
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
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: brew.favorite ? '#F59E0B' : '#D7CCC8', transition: 'color 0.15s, transform 0.15s', transform: brew.favorite ? 'scale(1.15)' : 'scale(1)', filter: brew.favorite ? 'drop-shadow(0 0 4px #F59E0B88)' : 'none' }}
                              onClick={() => handleToggleFavorite(brew)}>
                              <svg viewBox="0 0 24 24" fill={brew.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                            </button>
                          </td>
                        );
                      case 'beans':
                        return (
                          <td key="beans" style={{ ...s.td, ...s.tdBeans }}>
                            <button style={s.beanBtn} onClick={() => handleBeanClick(brew)}>
                              <span style={s.beanBtnText}>{fmt(brew.beans)}</span>
                              {hasRegion && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="#A1887F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11" style={{ flexShrink: 0 }}>
                                  <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      case 'date':
                        return <td key="date" style={{ ...s.td, ...s.dateCell }}>{formatDate(brew.date)}</td>;
                      case 'roastLevel': {
                        const p = ROAST_COLORS[brew.roastLevel];
                        return <td key="roastLevel" style={s.td}>{brew.roastLevel ? <span style={{ ...s.badge, background: p?.bg || '#F5F0EC', color: p?.color || '#5D4037' }}>{brew.roastLevel}</span> : <span style={s.dash}>—</span>}</td>;
                      }
                      case 'processing': {
                        const p = PROCESS_COLORS[brew.processing];
                        return <td key="processing" style={s.td}>{brew.processing ? <span style={{ ...s.badge, background: p?.bg || '#F5F0EC', color: p?.color || '#5D4037' }}>{brew.processing}</span> : <span style={s.dash}>—</span>}</td>;
                      }
                      case 'flavorTags':
                        return (
                          <td key="flavorTags" style={{ ...s.td, ...s.tdTags }}>
                            {Array.isArray(brew.flavorTags) && brew.flavorTags.length > 0
                              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {brew.flavorTags.map((t, i) => <span key={i} style={{ ...s.badge, background: getFlavorStyle(t), color: 'white' }}>{t}</span>)}
                                </div>
                              : <span style={s.dash}>—</span>}
                          </td>
                        );
                      case 'notes':
                        return <td key="notes" style={{ ...s.td, ...s.tdNotes }}>{brew.notes ? <span style={s.noteText}>"{brew.notes}"</span> : <span style={s.dash}>—</span>}</td>;
                      default:
                        return <td key={col.key} style={s.td}>{fmt(brew[col.key])}</td>;
                    }
                  })}
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <button style={s.editBtn} onClick={() => setBrewToEdit(brew)} title="Edit">
                      <IconEdit />
                    </button>
                    {' '}
                    <button style={s.deleteBtn} onClick={() => setBrewToDelete(brew)} title="Delete">
                      <IconTrash />
                    </button>
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

  filterBanner:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: '#FFF8E1', borderBottom: '1px solid #FFE082', flexShrink: 0 },
  filterBannerText:  { fontSize: '13px', color: '#5D4037' },
  filterBannerClear: { display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'none', border: '1px solid #A1887F', borderRadius: '20px', fontSize: '12px', color: '#5D4037', cursor: 'pointer', fontWeight: '600' },

  searchWrap:  { position: 'relative', flex: 1 },
  searchInput: { width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' },
  filterRow:   { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterPill:  { padding: '4px 12px', borderRadius: '20px', border: '1px solid #D7CCC8', fontSize: '11px', cursor: 'pointer', background: 'none' },
  filterPillActive: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #2C1810' },

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
  editBtn:     { background: '#F5F0EC', border: 'none', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer', color: '#5D4037', display: 'inline-flex', alignItems: 'center' },
  deleteBtn:   { background: '#FFEBEE', border: 'none', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer', color: '#C62828', display: 'inline-flex', alignItems: 'center' },
  beanBtn:     { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textAlign: 'left', fontFamily: 'inherit' },
  beanBtnText: { fontSize: '13px', fontWeight: '600', color: '#2C1810', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#A1887F', textUnderlineOffset: '3px' },

  noRegionModal:    { background: 'white', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  noRegionHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)' },
  noRegionCloseBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', color: '#F5E6D3' },
  noRegionBody:     { padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },

  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  editModal:   { background: 'white', borderRadius: '12px', width: '560px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  editHeader:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #EFEBE9', background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', flexShrink: 0, color: '#F5E6D3' },
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