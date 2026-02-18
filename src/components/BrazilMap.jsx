import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

// Firebase
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';

// Import components
import ByNotes from './ByNotes';
import RawData from './RawData';

// ─── Build region tree from flat Firestore docs ───────────────────────────────
// newcoffeeregions collection: { name, nameLocal, level, parentId, coordinate }
// level: "country" | "region" | "subregion" | "town"

export const buildRegionTree = (docs) => {
  const byId = {};
  docs.forEach(d => { byId[d.id] = { ...d, children: [] }; });

  const roots = [];
  docs.forEach(d => {
    if (!d.parentId) {
      roots.push(byId[d.id]);
    } else if (byId[d.parentId]) {
      byId[d.parentId].children.push(byId[d.id]);
    }
  });
  return { roots, byId };
};

// Parse "lat, lng" string → [lat, lng] array or null
export const parseCoord = (str) => {
  if (!str) return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  return null;
};

// Build breadcrumb label from a doc up to root
export const buildPath = (docId, byId) => {
  const parts = [];
  let cur = byId[docId];
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parentId ? byId[cur.parentId] : null;
  }
  return parts.join(' › ');
};

// ─── Stop words ───────────────────────────────────────────────────────────────
const stopWords = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','been','be','have','has','had','do','does',
  'did','will','would','could','should','may','might','must','can','it','its',
  'this','that','these','those','i','you','he','she','we','they','what','which',
  'who','when','where','why','how','not','no','yes','if','than','so','very',
  'just','too','quite','more','less','some','any','all','each','every','both',
  'few','many','much','seem','seemed','seems','hard','sure','confirmed','really',
  'slightly','bit','good','better','brewing','brewed','coffee','cup','itself',
  'first','noticeable','compared','clear','strong','prominent','identify',
  'texture','sip',
]);

// ─── Brew stats helpers ───────────────────────────────────────────────────────

const getBrewsForRegion = (regionDoc, brewRecords) =>
  brewRecords.filter(b => b.regionRef === regionDoc.id);

const extractFlavorNotes = (regionId, brewRecords) => {
  const brews = brewRecords.filter(b => b.regionRef === regionId);
  if (!brews.length) return [];

  const tagSet = {};
  brews.forEach(brew => {
    if (Array.isArray(brew.flavorTags)) {
      brew.flavorTags.forEach(t => { tagSet[t] = (tagSet[t] || 0) + 1; });
    }
  });

  const allNotes = brews.map(b => b.notes).filter(n => n && n !== '?').join(' ');
  if (allNotes) {
    allNotes.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))
      .forEach(w => {
        const cap = w.charAt(0).toUpperCase() + w.slice(1);
        tagSet[cap] = (tagSet[cap] || 0) + 1;
      });
  }

  return Object.entries(tagSet).sort((a,b) => b[1]-a[1]).slice(0,3).map(([w]) => w);
};

const getBrewStatsForRegion = (regionId, brewRecords) => {
  const brews = brewRecords.filter(b => b.regionRef === regionId);
  if (!brews.length) return null;

  const toCounts = arr => arr.reduce((acc, v) => { acc[v] = (acc[v]||0)+1; return acc; }, {});
  const valid = arr => arr.filter(v => v !== '?' && v !== '' && v != null);

  return {
    temperature:  toCounts(valid(brews.map(b => b.waterTemp))),
    grindSetting: toCounts(valid(brews.map(b => b.grindSetting))),
    method:       toCounts(valid(brews.map(b => b.method))),
    waterAmount:  toCounts(valid(brews.map(b => b.waterIn))),
    totalBrews:   brews.length,
  };
};

// ─── Brew Stats Popup ────────────────────────────────────────────────────────

const BrewStatsPopup = ({ regionDoc, parentDoc, brewRecords }) => {
  const stats = getBrewStatsForRegion(regionDoc.id, brewRecords);
  const flavorNotes = extractFlavorNotes(regionDoc.id, brewRecords);

  const getFlavorEmoji = (flavor) => {
    const map = {
      citrus:'🍊',chocolate:'🍫',fruity:'🍇',berry:'🫐',raspberry:'🫐',banana:'🍌',
      apple:'🍏',grape:'🍇',mango:'🥭',pineapple:'🍍',tropical:'🌴',honey:'🍯',
      caramel:'🍮',nutty:'🥜',floral:'🌸',aroma:'🌺',acidic:'💧',
    };
    return map[flavor.toLowerCase()] || '☕';
  };

  const BarChart = ({ data }) => {
    const entries = Object.entries(data).sort((a,b) => b[1]-a[1]);
    const max = Math.max(...entries.map(e => e[1]));
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {entries.map(([value, count]) => (
          <div key={value} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ minWidth:'80px', fontSize:'12px', fontWeight:'600', color:'#2C1810' }}>{value}</div>
            <div style={{ flex:1, height:'24px', backgroundColor:'#EFEBE9', borderRadius:'6px', overflow:'hidden' }}>
              <div style={{ width:`${(count/max)*100}%`, height:'100%', background:'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'8px' }}>
                <span style={{ fontSize:'11px', fontWeight:'700', color:'white' }}>{count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minWidth:'280px', maxWidth:'360px', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ marginBottom:'16px', marginTop:'20px' }}>
        <div style={{ fontSize:'20px', fontWeight:'700', color:'#2C1810', marginBottom:'4px' }}>{regionDoc.name}</div>
        <div style={{ fontSize:'13px', color:'#8D6E63' }}>
          {regionDoc.nameLocal}{parentDoc ? ` • ${parentDoc.name}` : ''}
        </div>
        <div style={{ fontSize:'11px', color:'#BCAAA4', marginTop:'2px', textTransform:'capitalize' }}>
          {regionDoc.level}
        </div>
      </div>

      {flavorNotes.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', margin:'16px 0' }}>
          {flavorNotes.map((note, i) => (
            <span key={i} style={{ background:'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', color:'#2C1810', padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px' }}>
              {getFlavorEmoji(note)} {note}
            </span>
          ))}
        </div>
      )}

      {stats && (
        <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'20px' }}>
          {stats.method && Object.keys(stats.method).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Brew Method</div>
              <BarChart data={stats.method} />
            </div>
          )}
          {stats.temperature && Object.keys(stats.temperature).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Temperature</div>
              <BarChart data={Object.fromEntries(Object.entries(stats.temperature).map(([k,v]) => [`${k}°C`, v]))} />
            </div>
          )}
          {stats.grindSetting && Object.keys(stats.grindSetting).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Grind Setting</div>
              <BarChart data={stats.grindSetting} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Flavor Picker ────────────────────────────────────────────────────────────

const FLAVOR_PALETTE = {
  citrus:'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  chocolate:'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
  aroma:'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  fruity:'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  honey:'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  raspberry:'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',
  banana:'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  green:'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  apple:'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  grape:'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  mango:'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  acidic:'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
  nutty:'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
  pineapple:'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  tropical:'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
  floral:'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  caramel:'linear-gradient(135deg, #D4A574 0%, #b8860b 100%)',
  berry:'linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%)',
  intense:'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
};

const FLAVOR_EMOJI_MAP = {
  citrus:'🍊',chocolate:'🍫',fruity:'🍇',berry:'🫐',raspberry:'🫐',banana:'🍌',
  apple:'🍏',grape:'🍇',mango:'🥭',pineapple:'🍍',tropical:'🌴',honey:'🍯',
  caramel:'🍮',nutty:'🥜',floral:'🌸',aroma:'🌺',acidic:'💧',intense:'🔥',green:'🌿',
};

const MASTER_FLAVORS = [
  'Citrus','Chocolate','Fruity','Berry','Raspberry','Banana','Apple','Grape','Mango',
  'Pineapple','Tropical','Honey','Caramel','Nutty','Floral','Aroma','Acidic','Intense',
  'Green','Jasmine','Rose','Vanilla','Spicy','Earthy','Herbal','Winey','Butter','Toffee',
  'Peach','Apricot','Plum','Cherry','Blueberry','Strawberry','Lemon','Orange','Grapefruit',
  'Lime','Almond','Hazelnut','Walnut','Smoke','Cedar','Sweet','Bright','Clean','Juicy',
];

const getFlavorStyle = (word) => FLAVOR_PALETTE[word?.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';
const getFlavorEmoji = (word) => FLAVOR_EMOJI_MAP[word?.toLowerCase()] || '☕';

function FlavorPicker({ selectedFlavors, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = MASTER_FLAVORS.filter(f => f.toLowerCase().includes(q) && !selectedFlavors.includes(f));
    const exactMatch = MASTER_FLAVORS.find(f => f.toLowerCase() === q);
    if (!exactMatch && query.trim().length > 1 && !selectedFlavors.includes(query.trim())) {
      results.push(`"${query.trim()}"`);
    }
    return results.slice(0, 10);
  }, [query, selectedFlavors]);

  const addFlavor = (raw) => {
    const flavor = raw.startsWith('"') ? raw.slice(1,-1) : raw;
    const cap = flavor.charAt(0).toUpperCase() + flavor.slice(1).toLowerCase();
    if (!selectedFlavors.includes(cap)) onChange([...selectedFlavors, cap]);
    setQuery(''); setOpen(false); inputRef.current?.focus();
  };

  const removeFlavor = (f) => onChange(selectedFlavors.filter(x => x !== f));

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ width:'100%' }}>
      {selectedFlavors.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'8px' }}>
          {selectedFlavors.map(f => (
            <span key={f} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:getFlavorStyle(f), color:'white', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
              {getFlavorEmoji(f)} {f}
              <button type="button" onClick={() => removeFlavor(f)} style={{ background:'rgba(255,255,255,0.25)', border:'none', borderRadius:'50%', width:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'10px', color:'white', lineHeight:1, padding:0, marginLeft:'2px' }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div ref={dropdownRef} style={{ position:'relative' }}>
        <input ref={inputRef} style={{ ...ms.input, paddingLeft:'34px' }} type="text" placeholder="Search flavors…" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={e => { if (e.key==='Enter' && filtered.length>0) { e.preventDefault(); addFlavor(filtered[0]); } if (e.key==='Escape') setOpen(false); }}
          autoComplete="off"
        />
        <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', pointerEvents:'none' }}>🔍</span>
        {open && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'white', border:'1px solid #D7CCC8', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1,-1) : item;
              return (
                <button key={i} type="button" onMouseDown={e => { e.preventDefault(); addFlavor(item); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:i<filtered.length-1?'1px solid #F5F0EC':'none' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}
                >
                  <span style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0, background:getFlavorStyle(label), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>{getFlavorEmoji(label)}</span>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:'#2C1810' }}>{isCustom ? `Add "${label}"` : label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Region Picker (cascading dropdowns) ─────────────────────────────────────

function RegionPicker({ allRegionDocs, value, onChange }) {
  // value: { countryId, regionId, subregionId, townId }
  // onChange: (newValue) => void

  const { byId } = React.useMemo(() => buildRegionTree(allRegionDocs), [allRegionDocs]);

  const countries   = allRegionDocs.filter(d => d.level === 'country');
  const regions     = value.countryId   ? allRegionDocs.filter(d => d.level === 'region'    && d.parentId === value.countryId)   : [];
  const subregions  = value.regionId    ? allRegionDocs.filter(d => d.level === 'subregion' && d.parentId === value.regionId)    : [];
  const towns       = value.subregionId ? allRegionDocs.filter(d => d.level === 'town'      && d.parentId === value.subregionId) : [];

  // The deepest selected ID is the regionRef to save
  const deepestId = value.townId || value.subregionId || value.regionId || value.countryId || null;

  const handleCountry = (id) => onChange({ countryId: id, regionId: '', subregionId: '', townId: '' });
  const handleRegion  = (id) => onChange({ ...value, regionId: id, subregionId: '', townId: '' });
  const handleSubregion = (id) => onChange({ ...value, subregionId: id, townId: '' });
  const handleTown    = (id) => onChange({ ...value, townId: id });

  const selectStyle = { ...ms.input, background: '#FAFAFA' };
  const labelStyle  = { ...ms.label };

  // Build display path for the current selection
  const displayPath = deepestId ? buildPath(deepestId, byId) : null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>

        {/* Country */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Country <span style={ms.required}>*</span></label>
          <select style={selectStyle} value={value.countryId || ''} onChange={e => handleCountry(e.target.value)} required>
            <option value="">Select country…</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.nameLocal ? ` (${c.nameLocal})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Region */}
        {value.countryId && (
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Region</label>
            <select style={selectStyle} value={value.regionId || ''} onChange={e => handleRegion(e.target.value)}>
              <option value="">Select region…</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.nameLocal ? ` (${r.nameLocal})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subregion */}
        {value.regionId && subregions.length > 0 && (
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Subregion</label>
            <select style={selectStyle} value={value.subregionId || ''} onChange={e => handleSubregion(e.target.value)}>
              <option value="">Select subregion…</option>
              {subregions.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.nameLocal ? ` (${s.nameLocal})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Town / Microlot */}
        {value.subregionId && towns.length > 0 && (
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Farm / Microlot</label>
            <select style={selectStyle} value={value.townId || ''} onChange={e => handleTown(e.target.value)}>
              <option value="">Select microlot…</option>
              {towns.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.nameLocal ? ` (${t.nameLocal})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected path preview */}
      {displayPath && (
        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#FFF3E0', borderRadius: '6px', fontSize: '11px', color: '#8D6E63', fontWeight: '600' }}>
          📍 {displayPath}
        </div>
      )}
    </div>
  );
}

// ─── Add Brew Modal ───────────────────────────────────────────────────────────

const BREW_METHODS      = ['V60','Chemex','AeroPress','French Press','Espresso','Moka Pot','Cold Brew','Siphon','Other'];
const PROCESSING_METHODS = ['Natural','Washed','Honey','Anaerobic','Wet-Hulled','Semi-Washed','Other'];
const ROAST_LEVELS      = ['Light','Light-Medium','Medium','Medium-Dark','Dark','Extra Dark'];

const INITIAL_FEATURES = {
  date:true, beans:true, variety:true, processing:true, roastLevel:true,
  method:true, grinder:true, grindSetting:true,
  groundCoffeeWeight:true, waterTemp:true, waterIn:true, brewTime:true,
  daysPast:true, flavorTags:true, notes:true, brewingRecipe:true, extra:true,
};

const EMPTY_FORM = {
  beans:'', variety:'', processing:'', roastLevel:'',
  method:'', grinder:'', waterTemp:'', grindSetting:'',
  groundCoffeeWeight:'', waterIn:'', notes:'', brewingRecipe:'', extra:'',
  brewTime:'', daysPast:'', flavorTags:[],
  date: new Date().toISOString().split('T')[0],
};

const EMPTY_REGION_SEL = { countryId:'', regionId:'', subregionId:'', townId:'' };

function AddBrewModal({ onClose, onSubmitted, allRegionDocs }) {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [regionSel, setRegionSel]   = useState(EMPTY_REGION_SEL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const [activeFeatures, setActiveFeatures] = useState(() => {
    const saved = localStorage.getItem('coffee_feature_settings');
    return saved ? JSON.parse(saved) : INITIAL_FEATURES;
  });

  useEffect(() => {
    localStorage.setItem('coffee_feature_settings', JSON.stringify(activeFeatures));
  }, [activeFeatures]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleFeature = (field) => setActiveFeatures(prev => ({ ...prev, [field]: !prev[field] }));

  // Deepest selected regionRef
  const regionRef = regionSel.townId || regionSel.subregionId || regionSel.regionId || regionSel.countryId || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const brewRef = collection(db, 'users', user.uid, 'brews');

      const submissionData = Object.keys(EMPTY_FORM).reduce((acc, key) => {
        if (!activeFeatures[key]) {
          acc[key] = null;
        } else {
          const val = form[key];
          if (key === 'flavorTags') {
            acc[key] = Array.isArray(val) && val.length > 0 ? val : null;
          } else if (['waterTemp','waterIn','daysPast','groundCoffeeWeight'].includes(key)) {
            acc[key] = val ? Number(val) : null;
          } else {
            acc[key] = val?.toString().trim() || null;
          }
        }
        return acc;
      }, {});

      // Attach region reference
      submissionData.regionRef = regionRef;

      // Build a human-readable path for easy display (e.g. "Ethiopia › Sidama › Bensa")
      if (regionRef) {
        const { byId } = buildRegionTree(allRegionDocs);
        submissionData.regionPath = buildPath(regionRef, byId);
      } else {
        submissionData.regionPath = null;
      }

      await addDoc(brewRef, { ...submissionData, createdAt: serverTimestamp() });
      onSubmitted(submissionData);
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  const renderField = (label, field, type, placeholder, widthStyle, options = null) => {
    const isActive = activeFeatures[field];
    return (
      <div style={{ ...widthStyle, position:'relative', opacity:isActive ? 1 : 0.4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
          <label style={ms.label}>{label} {isActive && <span style={ms.required}>*</span>}</label>
          <button type="button" onClick={() => toggleFeature(field)} style={{ ...ms.deactivateIcon, color:isActive?'#8D6E63':'#BF360C' }}>
            {isActive ? '✕' : '+'}
          </button>
        </div>
        {type === 'select' ? (
          <select style={ms.input} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive}>
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea style={{ ...ms.input, ...ms.textarea }} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive} rows={2} />
        ) : (
          <input style={ms.input} type={type} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive} />
        )}
      </div>
    );
  };

  return (
    <div style={ms.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...ms.modal, maxWidth:'650px' }}>
        <div style={ms.header}>
          <div style={ms.headerLeft}><span style={{ fontSize:'20px' }}>☕</span><span style={ms.title}>Add Brew</span></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={ms.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={ms.grid}>

            {/* ── Origin ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Origin</div>
            </div>
            <div style={{ width:'100%' }}>
              <RegionPicker
                allRegionDocs={allRegionDocs}
                value={regionSel}
                onChange={setRegionSel}
              />
            </div>

            {/* ── Date & Beans ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Record</div>
            </div>
            {renderField("Date",  "date",  "date", "", ms.fieldHalf)}
            {renderField("Beans", "beans", "text", "Roaster / Label", ms.fieldHalf)}

            {/* ── Bean Info ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Bean Info</div>
            </div>
            {renderField("Variety",    "variety",    "text",   "Geisha, Bourbon…",  ms.fieldThird)}
            {renderField("Processing", "processing", "select", "",                  ms.fieldThird, PROCESSING_METHODS)}
            {renderField("Roast Level","roastLevel", "select", "",                  ms.fieldThird, ROAST_LEVELS)}

            {/* ── Brew Setup ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Brew Setup</div>
            </div>
            {renderField("Brew Method",      "method",              "select", "",          ms.fieldThird, BREW_METHODS)}
            {renderField("Grinder",          "grinder",             "text",   "Comandante…", ms.fieldThird)}
            {renderField("Setting",          "grindSetting",        "text",   "20 clicks",   ms.fieldThird)}
            {renderField("Coffee (g)",        "groundCoffeeWeight",  "number", "15",          ms.fieldThird)}
            {renderField("Temp (°C)",         "waterTemp",           "number", "93",          ms.fieldThird)}
            {renderField("Water (ml)",        "waterIn",             "number", "250",         ms.fieldThird)}
            {renderField("Brew Time",         "brewTime",            "text",   "2:30",        ms.fieldThird)}
            {renderField("Days Post Roast",   "daysPast",            "number", "14",          ms.fieldThird)}

            {/* ── Tasting ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Tasting</div>
            </div>

            <div style={{ width:'100%', opacity:activeFeatures.flavorTags ? 1 : 0.4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <label style={ms.label}>Flavor Tags {activeFeatures.flavorTags && <span style={ms.required}>*</span>}</label>
                <button type="button" onClick={() => toggleFeature('flavorTags')} style={{ ...ms.deactivateIcon, color:activeFeatures.flavorTags?'#8D6E63':'#BF360C' }}>
                  {activeFeatures.flavorTags ? '✕' : '+'}
                </button>
              </div>
              {activeFeatures.flavorTags
                ? <FlavorPicker selectedFlavors={form.flavorTags} onChange={tags => set('flavorTags', tags)} />
                : <div style={{ ...ms.input, color:'#BCAAA4', fontSize:'12px' }}>Flavor tags disabled</div>
              }
            </div>

            {renderField("Tasting Notes", "notes", "textarea", "Body, finish, acidity…", ms.fieldFull)}

            {/* ── Recipe & Extra ── */}
            <div style={{ width:'100%' }}>
              <div style={ms.sectionDivider}>Recipe & Notes</div>
            </div>
            {renderField("Brewing Recipe", "brewingRecipe", "textarea", "Pour schedule: 0s bloom 45g, 45s +100g…", ms.fieldFull)}
            {renderField("Extra Notes",    "extra",         "textarea", "Water recipe, equipment notes…",           ms.fieldFull)}
          </div>

          <div style={ms.actions}>
            <button type="button" style={ms.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit"  style={ms.submitBtn} disabled={submitting}>
              {submitting ? 'Saving...' : '+ Save Brew'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal styles
const ms = {
  backdrop:    { position:'fixed', inset:0, background:'rgba(20,10,4,0.65)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'40px', paddingLeft:'16px', paddingRight:'16px', overflowY:'auto' },
  modal:       { background:'#FFFDF9', borderRadius:'12px', width:'100%', maxWidth:'650px', boxShadow:'0 24px 64px rgba(0,0,0,0.35)', overflow:'hidden', animation:'slideDown 0.2s ease', marginBottom:'40px' },
  header:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #EFEBE9', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', position:'sticky', top:0, zIndex:10 },
  headerLeft:  { display:'flex', alignItems:'center', gap:'10px' },
  title:       { fontSize:'16px', fontWeight:'700', color:'#F5E6D3', letterSpacing:'0.2px' },
  closeBtn:    { background:'rgba(255,255,255,0.12)', border:'none', borderRadius:'6px', color:'#D4A574', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'13px', fontWeight:'700' },
  errorBox:    { background:'#FFF3E0', border:'1px solid #FFCC80', borderRadius:0, padding:'10px 24px', fontSize:'13px', color:'#E65100', fontWeight:'500' },
  sectionDivider: { fontSize:'10px', fontWeight:'800', color:'#A1887F', textTransform:'uppercase', letterSpacing:'1.2px', borderBottom:'1px solid #EFEBE9', paddingBottom:'6px', marginTop:'4px' },
  grid:        { display:'flex', flexWrap:'wrap', gap:'14px', padding:'20px 24px' },
  fieldFull:   { width:'100%' },
  fieldHalf:   { width:'calc(50% - 7px)' },
  fieldThird:  { width:'calc(33.33% - 10px)', marginBottom:'2px' },
  label:       { display:'block', fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' },
  required:    { color:'#BF360C' },
  input:       { width:'100%', padding:'9px 12px', border:'1px solid #D7CCC8', borderRadius:'6px', fontSize:'13px', color:'#2C1810', background:'#FAFAFA', outline:'none', boxSizing:'border-box', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif', transition:'border-color 0.15s ease' },
  textarea:    { resize:'vertical', minHeight:'72px', lineHeight:'1.5' },
  actions:     { display:'flex', justifyContent:'flex-end', gap:'10px', padding:'16px 24px', borderTop:'1px solid #EFEBE9', background:'#FAF7F4', position:'sticky', bottom:0 },
  cancelBtn:   { padding:'9px 18px', background:'transparent', border:'1px solid #D7CCC8', borderRadius:'6px', fontSize:'13px', fontWeight:'600', color:'#8D6E63', cursor:'pointer' },
  submitBtn:   { padding:'9px 20px', background:'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer', boxShadow:'0 2px 8px rgba(93,64,55,0.3)' },
  deactivateIcon: { background:'none', border:'none', color:'#D7CCC8', cursor:'pointer', fontSize:'10px', padding:'2px 5px', borderRadius:'4px', transition:'all 0.2s' },
};

// ─── Map utility components ───────────────────────────────────────────────────

function MapEventHandler({ onZoomChange, onMoveChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => { const c = map.getCenter(); onMoveChange({ lat: c.lat.toFixed(4), lng: c.lng.toFixed(4) }); },
  });
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="custom-zoom-controls">
      <div className="control-group">
        <button onClick={() => map.zoomIn()}  className="zoom-button" title="Zoom in">+</button>
        <button onClick={() => map.zoomOut()} className="zoom-button" title="Zoom out">−</button>
        <button onClick={() => map.setView([15,-20],3)} className="zoom-button" title="Reset view">⊡</button>
      </div>
    </div>
  );
}

function BoundaryFitter({ coordinates, resetView, zoomLevel = 7 }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) map.setView(coordinates, zoomLevel, { animate:true, duration:0.5 });
    else if (resetView) map.setView([15,-20], 3, { animate:true, duration:0.5 });
  }, [coordinates, resetView, zoomLevel, map]);
  return null;
}

function PopupCloser({ shouldClose, onClosed }) {
  const map = useMap();
  useEffect(() => { if (shouldClose) { map.closePopup(); onClosed(); } }, [shouldClose, map, onClosed]);
  return null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const countryIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#8b4513" stroke="white" stroke-width="3"/>
      <text x="20" y="27" font-size="20" text-anchor="middle" fill="white">☕</text>
    </svg>`),
  iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-20],
});

const regionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#a0522d" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`),
  iconSize:[32,32], iconAnchor:[16,16], popupAnchor:[0,-16],
});

const subRegionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#d2691e" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>`),
  iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-12],
});

const townIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" fill="#cd853f" stroke="white" stroke-width="2"/>
      <circle cx="9" cy="9" r="2.5" fill="white"/>
    </svg>`),
  iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-9],
});

const levelIcon = { country:countryIcon, region:regionIcon, subregion:subRegionIcon, town:townIcon };

// ─── Loading / Error screens ──────────────────────────────────────────────────

const LoadingScreen = () => (
  <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap:'16px' }}>
    <div style={{ fontSize:'48px' }}>☕</div>
    <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'16px', fontWeight:'600' }}>Loading your coffee map...</div>
  </div>
);

const ErrorScreen = ({ message }) => (
  <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap:'16px' }}>
    <div style={{ fontSize:'48px' }}>⚠️</div>
    <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'16px', fontWeight:'600' }}>Failed to load regions</div>
    <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px' }}>{message}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

function BrazilMap() {
  const [allRegionDocs, setAllRegionDocs] = useState([]);   // flat docs from newcoffeeregions
  const [brewRecords, setBrewRecords]     = useState([]);
  const [brewsLoading, setBrewsLoading]   = useState(true);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const [currentZoom, setCurrentZoom]     = useState(3);
  const [currentCenter, setCurrentCenter] = useState({ lat:'15.0000', lng:'-20.0000' });
  const [selectedDoc, setSelectedDoc]     = useState(null);   // clicked region doc
  const [resetView, setResetView]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState('coffee-map');
  const [closePopup, setClosePopup]       = useState(false);
  const [showBrewModal, setShowBrewModal] = useState(false);

  // ── Fetch newcoffeeregions ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'newcoffeeregions'));
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllRegionDocs(docs);
      } catch (err) {
        console.error('Error fetching newcoffeeregions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRegions();
  }, []);

  // ── Fetch user brews ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBrewRecords([]); setBrewsLoading(false); return; }
      try {
        setBrewsLoading(true);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
        const brews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        brews.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
        setBrewRecords(brews);
      } catch (err) {
        console.error('Error fetching brews:', err);
      } finally {
        setBrewsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Derived: which region docs have been brewed? ──────────────────────────
  const { byId } = React.useMemo(() => buildRegionTree(allRegionDocs), [allRegionDocs]);

  // Collect all region IDs that appear in brew records (directly or via ancestry)
  const brewedDocIds = React.useMemo(() => {
    const ids = new Set();
    brewRecords.forEach(b => {
      if (!b.regionRef) return;
      // Add the regionRef itself and all ancestors
      let cur = byId[b.regionRef];
      while (cur) {
        ids.add(cur.id);
        cur = cur.parentId ? byId[cur.parentId] : null;
      }
    });
    return ids;
  }, [brewRecords, byId]);

  // Visible map docs = all docs that have coordinates (show everything on map)
  const mapDocs = React.useMemo(() =>
    allRegionDocs.filter(d => parseCoord(d.coordinate)),
    [allRegionDocs]
  );

  // Stats
  const totalBrews   = brewRecords.length;
  const brewedCountries = React.useMemo(() =>
    allRegionDocs.filter(d => d.level === 'country' && brewedDocIds.has(d.id)).length,
    [allRegionDocs, brewedDocIds]
  );
  const brewedRegions = React.useMemo(() =>
    allRegionDocs.filter(d => d.level !== 'country' && brewedDocIds.has(d.id)).length,
    [allRegionDocs, brewedDocIds]
  );

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  const worldBounds = [[-60,-180],[75,180]];

  // Determine which level to show based on zoom / selection
  const visibleLevels = () => {
    if (!selectedDoc) {
      if (currentZoom >= 8)  return ['town','subregion','region','country'];
      if (currentZoom >= 6)  return ['subregion','region'];
      if (currentZoom >= 4)  return ['region','country'];
      return ['country'];
    }
    const level = selectedDoc.level;
    if (level === 'country')   return ['region','subregion'];
    if (level === 'region')    return ['subregion','town'];
    return ['town','subregion'];
  };

  const visibleDocs = mapDocs.filter(d => {
    const levels = visibleLevels();
    if (!levels.includes(d.level)) return false;
    // If a doc is selected, only show its children
    if (selectedDoc) {
      let cur = byId[d.id];
      while (cur) {
        if (cur.parentId === selectedDoc.id) return true;
        cur = cur.parentId ? byId[cur.parentId] : null;
      }
      return false;
    }
    return true;
  });

  const handleDocClick = (doc) => {
    setSelectedDoc(doc);
    setResetView(false);
  };

  const handleBackToMap = () => {
    setClosePopup(true);
    if (selectedDoc?.parentId) {
      setSelectedDoc(byId[selectedDoc.parentId] || null);
    } else {
      setSelectedDoc(null);
      setResetView(true);
    }
  };

  const handleBrewSubmitted = (newBrew) => {
    setBrewRecords(prev => {
      const updated = [...prev, newBrew];
      updated.sort((a,b) => (a.date??'').localeCompare(b.date??''));
      return updated;
    });
  };

  const tastedRegionsList = allRegionDocs
    .filter(d => d.level === 'country' && brewedDocIds.has(d.id))
    .map(country => ({
      ...country,
      brewCount: brewRecords.filter(b => {
        let cur = byId[b.regionRef];
        while (cur) { if (cur.id === country.id) return true; cur = cur.parentId ? byId[cur.parentId] : null; }
        return false;
      }).length,
      children: allRegionDocs.filter(d => d.parentId === country.id && brewedDocIds.has(d.id)),
    }));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer center={[15,-20]} zoom={3} minZoom={2} maxZoom={18} maxBounds={worldBounds} zoomControl={false} style={{ height:'100%', width:'100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />

              {visibleDocs.map(doc => {
                const coord = parseCoord(doc.coordinate);
                if (!coord) return null;
                const parentDoc = doc.parentId ? byId[doc.parentId] : null;
                const icon = levelIcon[doc.level] || subRegionIcon;
                const isBrewed = brewedDocIds.has(doc.id);

                return (
                  <Marker key={doc.id} position={coord} icon={icon} eventHandlers={{ click: () => handleDocClick(doc) }}
                    opacity={isBrewed ? 1 : 0.45}
                  >
                    <Popup maxWidth={380}>
                      {isBrewed
                        ? <BrewStatsPopup regionDoc={doc} parentDoc={parentDoc} brewRecords={brewRecords} />
                        : (
                          <div style={{ padding:'12px', fontFamily:'sans-serif' }}>
                            <div style={{ fontSize:'16px', fontWeight:'700', color:'#2C1810' }}>{doc.name}</div>
                            {doc.nameLocal && <div style={{ fontSize:'12px', color:'#8D6E63' }}>{doc.nameLocal}</div>}
                            <div style={{ fontSize:'11px', color:'#BCAAA4', marginTop:'6px', fontStyle:'italic' }}>No brews logged yet</div>
                          </div>
                        )
                      }
                    </Popup>
                  </Marker>
                );
              })}

              <MapEventHandler onZoomChange={setCurrentZoom} onMoveChange={setCurrentCenter} />
              <ZoomControls />
              <PopupCloser shouldClose={closePopup} onClosed={() => setClosePopup(false)} />
              <BoundaryFitter
                coordinates={selectedDoc ? parseCoord(selectedDoc.coordinate) : null}
                resetView={resetView}
                zoomLevel={selectedDoc?.level === 'town' ? 13 : selectedDoc?.level === 'subregion' ? 11 : selectedDoc?.level === 'region' ? 8 : 3}
              />
            </MapContainer>
          </div>
        );
      case 'by-notes':
        return <div className="map-wrapper"><ByNotes allRegionDocs={allRegionDocs} /></div>;
      case 'raw-data':
        return <div className="map-wrapper"><RawData /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="brazil-map-container">
      {showBrewModal && (
        <AddBrewModal
          onClose={() => setShowBrewModal(false)}
          onSubmitted={handleBrewSubmitted}
          allRegionDocs={allRegionDocs}
        />
      )}

      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">☕</div>
            <div className="logo-text"><h1>Coffee Journey</h1><p>Taste Map</p></div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : totalBrews}</div>
            <div className="stat-label">Total Brews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : brewedRegions}</div>
            <div className="stat-label">Regions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : brewedCountries}</div>
            <div className="stat-label">Countries</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{allRegionDocs.length}</div>
            <div className="stat-label">On Map</div>
          </div>
        </div>

        <div className="nav-tabs">
          <button className={`sidebar-tab ${activeTab==='coffee-map'?'active':''}`} onClick={() => setActiveTab('coffee-map')}><span className="tab-icon">🗺️</span>Coffee Map</button>
          <button className={`sidebar-tab ${activeTab==='by-notes'?'active':''}`}   onClick={() => setActiveTab('by-notes')}><span className="tab-icon">📝</span>Tasting Notes</button>
          <button className={`sidebar-tab ${activeTab==='raw-data'?'active':''}`}   onClick={() => setActiveTab('raw-data')}><span className="tab-icon">📊</span>Brew Data</button>
        </div>

        <div className="regions-list">
          <h3>Tasted Regions</h3>
          {tastedRegionsList.map(country => (
            <div key={country.id} className="region-item" onClick={() => handleDocClick(country)}>
              <div className="region-header">
                <div>
                  <div className="region-name">{country.name}</div>
                  <div className="region-name-local">{country.nameLocal}</div>
                </div>
                <div className="region-badge">{country.brewCount} brews</div>
              </div>
              {country.children.length > 0 && (
                <div className="region-subregions">
                  {country.children.map(c => (
                    <span key={c.id} className="subregion-pill">{c.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="sidebar-back-button" onClick={() => setSidebarOpen(false)} title="Close Menu">←</button>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <div className="top-bar">
          <div className="breadcrumb">
            <div className="breadcrumb-item breadcrumb-home">
              🏠 {selectedDoc ? 'World' : 'World Map'}
            </div>
            {selectedDoc && (
              <>
                <span>›</span>
                {/* Build ancestry breadcrumb */}
                {(() => {
                  const chain = [];
                  let cur = selectedDoc;
                  while (cur) { chain.unshift(cur); cur = cur.parentId ? byId[cur.parentId] : null; }
                  return chain.map((d, i) => (
                    <React.Fragment key={d.id}>
                      {i > 0 && <span>›</span>}
                      <div className={`breadcrumb-item ${i === chain.length-1 ? 'breadcrumb-current' : ''}`}>{d.name}</div>
                    </React.Fragment>
                  ));
                })()}
              </>
            )}
          </div>
          <div className="top-bar-actions">
            {selectedDoc && activeTab === 'coffee-map' && (
              <button className="btn btn-secondary" onClick={handleBackToMap}>← Back</button>
            )}
            <button className="btn btn-primary"   onClick={() => setShowBrewModal(true)}>+ Add Brew</button>
            <button className="btn btn-secondary" onClick={() => setSidebarOpen(v => !v)}>☰ Menu</button>
            <button className="btn btn-secondary" onClick={() => signOut(auth)} title="Sign out">↪ Sign Out</button>
          </div>
        </div>

        {renderTabContent()}
      </main>
    </div>
  );
}

export default BrazilMap;