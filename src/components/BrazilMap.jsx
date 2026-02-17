import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

// Firebase
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';

// Import components
import ByNotes from './ByNotes';
import RawData from './RawData';

// Words to exclude from flavor notes
const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'not', 'no', 'yes', 'if', 'than',
  'so', 'very', 'just', 'too', 'quite', 'more', 'less', 'some', 'any',
  'all', 'each', 'every', 'both', 'few', 'many', 'much', 'seem', 'seemed',
  'seems', 'hard', 'sure', 'confirmed', 'really', 'slightly', 'bit', 'good',
  'better', 'brewing', 'brewed', 'coffee', 'cup', 'itself', 'first', 'noticeable',
  'compared', 'clear', 'strong', 'prominent', 'identify', 'texture', 'sip'
]);

// ─── Bean ↔ SubRegion matching ────────────────────────────────────────────────
//
// A brew record "matches" a subRegion if the brew's `beans` string contains
// at least one meaningful word from the subRegion's `name` OR `nameLocal`.
// This is much more forgiving than the old exact-match on `beanName`.
//
// Examples that now match subRegion { name: "Bensa Odako", nameLocal: "벤사 오다코" }:
//   ✓ "Ethiopia Sidama Bensa Odako G1 Natural"   (exact beanName — still works)
//   ✓ "Bensa Odako Natural"                       (partial)
//   ✓ "Ethiopia Bensa"                            (single word)
//   ✓ "벤사 오다코"                                (Korean name)

// Short generic words we don't want to match on (e.g. "La", "El", "de")
const NAME_STOP_WORDS = new Set([
  'la', 'el', 'de', 'do', 'da', 'los', 'las', 'san', 'santa',
  'g1', 'g2', 'natural', 'washed', 'honey', 'anaerobic',
]);

const tokenize = (str) =>
  (str || '')
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')   // keep Korean characters too
    .split(/\s+/)
    .filter(t => t.length > 1 && !NAME_STOP_WORDS.has(t));

const beanMatchesSubRegion = (beanName, subRegion) => {
  const beanTokens = new Set(tokenize(beanName));
  if (beanTokens.size === 0) return false;

  // Collect meaningful tokens from name + nameLocal + legacy beanName
  const regionTokens = [
    ...tokenize(subRegion.name),
    ...tokenize(subRegion.nameLocal),
    ...tokenize(subRegion.beanName),   // keep backward compat for exact beanName
  ];

  // At least ONE region token must appear in the bean string
  return regionTokens.some(rt => beanTokens.has(rt));
};

// ─── Data helpers (accept brewRecords as param for live refresh) ─────────────

const getTastedRegions = (allCoffeeRegions, brewRecords) => {
  return allCoffeeRegions
    .map(region => {
      const tastedSubRegions = (region.subRegions || []).filter(subRegion =>
        brewRecords.some(brew => beanMatchesSubRegion(brew.beans, subRegion))
      );
      if (tastedSubRegions.length === 0) return null;
      const brewCount = tastedSubRegions.reduce((total, subRegion) => {
        return total + brewRecords.filter(brew => beanMatchesSubRegion(brew.beans, subRegion)).length;
      }, 0);
      return { ...region, subRegions: tastedSubRegions, brewCount };
    })
    .filter(Boolean);
};

const getBrewStats = (allCoffeeRegions, brewRecords) => {
  const tastedRegions = getTastedRegions(allCoffeeRegions, brewRecords);
  const regionBrewCounts = {};
  tastedRegions.forEach(region => {
    regionBrewCounts[region.country] = region.brewCount;
  });
  const mostUsedRegion = Object.entries(regionBrewCounts).sort((a, b) => b[1] - a[1])[0];
  return {
    totalBrews: brewRecords.length,
    regionCount: tastedRegions.length,
    regions: regionBrewCounts,
    mostUsedRegion: mostUsedRegion ? mostUsedRegion[0] : null,
    dateRange: {
      start: brewRecords[0]?.date || null,
      end: brewRecords[brewRecords.length - 1]?.date || null
    }
  };
};

// ─── Flavor helpers ──────────────────────────────────────────────────────────

const extractFlavorNotes = (subRegion, brewRecords) => {
  // Match using the new fuzzy logic
  const brews = brewRecords.filter(brew => beanMatchesSubRegion(brew.beans, subRegion));
  if (brews.length === 0) return [];
  const allNotes = brews
    .map(brew => brew.notes)
    .filter(note => note && note !== '?' && note.trim() !== '')
    .join(' ');
  if (!allNotes) return [];
  const words = allNotes
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));
  const wordCounts = {};
  words.forEach(word => { wordCounts[word] = (wordCounts[word] || 0) + 1; });
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

const getBrewStatsForSubregion = (subRegion, brewRecords) => {
  const brews = brewRecords.filter(brew => beanMatchesSubRegion(brew.beans, subRegion));
  if (brews.length === 0) return null;
  const toCounts = (arr) =>
    arr.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
  const valid = (arr) => arr.filter(v => v !== '?' && v !== '' && v !== null && v !== undefined);
  return {
    temperature: toCounts(valid(brews.map(b => b.waterTemp))),
    grindSetting: toCounts(valid(brews.map(b => b.grindSetting))),
    method: toCounts(valid(brews.map(b => b.method))),
    waterAmount: toCounts(valid(brews.map(b => b.waterIn))),
    totalBrews: brews.length
  };
};

// ─── Brew Stats Popup ────────────────────────────────────────────────────────

const BrewStatsPopup = ({ subRegion, parentRegion, brewRecords }) => {
  const stats = getBrewStatsForSubregion(subRegion, brewRecords);
  const flavorNotes = extractFlavorNotes(subRegion, brewRecords);

  const getFlavorEmoji = (flavor) => {
    const emojiMap = {
      'citrus': '🍊', 'chocolate': '🍫', 'fruity': '🍇', 'berry': '🫐',
      'raspberry': '🫐', 'banana': '🍌', 'apple': '🍏', 'grape': '🍇',
      'mango': '🥭', 'pineapple': '🍍', 'tropical': '🌴', 'honey': '🍯',
      'caramel': '🍮', 'nutty': '🥜', 'floral': '🌸', 'aroma': '🌺', 'acidic': '💧'
    };
    return emojiMap[flavor.toLowerCase()] || '☕';
  };

  return (
    <div style={{ minWidth: '280px', maxWidth: '360px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ marginBottom: '16px', marginTop: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#2C1810', marginBottom: '4px' }}>{subRegion.name}</div>
        <div style={{ fontSize: '13px', color: '#8D6E63' }}>{subRegion.nameLocal} • {parentRegion?.name}</div>
      </div>
      {flavorNotes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '16px 0' }}>
          {flavorNotes.map((note, index) => (
            <span key={index} style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', color: '#2C1810', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{getFlavorEmoji(note)}</span>{note}
            </span>
          ))}
        </div>
      )}
      {stats && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats.method && Object.keys(stats.method).length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Brew Method</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.method).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.method));
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '80px', fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{value}</div>
                        <div style={{ flex: 1, height: '24px', backgroundColor: '#EFEBE9', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {stats.temperature && Object.keys(stats.temperature).length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Temperature</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.temperature).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.temperature));
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '80px', fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{value}°C</div>
                        <div style={{ flex: 1, height: '24px', backgroundColor: '#EFEBE9', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {stats.grindSetting && Object.keys(stats.grindSetting).length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Grind Setting</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.grindSetting).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.grindSetting));
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '80px', fontSize: '12px', fontWeight: '600', color: '#2C1810' }}>{value}</div>
                        <div style={{ flex: 1, height: '24px', backgroundColor: '#EFEBE9', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Flavor Picker ───────────────────────────────────────────────────────────

const FLAVOR_PALETTE = {
  citrus:     'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  chocolate:  'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
  aroma:      'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  fruity:     'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  honey:      'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  raspberry:  'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',
  banana:     'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  green:      'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  apple:      'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  grape:      'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  mango:      'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  acidic:     'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
  nutty:      'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
  pineapple:  'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
  tropical:   'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
  floral:     'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
  caramel:    'linear-gradient(135deg, #D4A574 0%, #b8860b 100%)',
  berry:      'linear-gradient(135deg, #6c5ce7 0%, #5f27cd 100%)',
  intense:    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  describe:   'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
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

const getFlavorStyle = (word) => {
  const key = word.toLowerCase();
  return FLAVOR_PALETTE[key] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';
};

const getFlavorEmoji = (word) =>
  FLAVOR_EMOJI_MAP[word.toLowerCase()] || '☕';

function FlavorPicker({ selectedFlavors, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = MASTER_FLAVORS.filter(f =>
      f.toLowerCase().includes(q) && !selectedFlavors.includes(f)
    );
    const exactMatch = MASTER_FLAVORS.find(f => f.toLowerCase() === q);
    if (!exactMatch && query.trim().length > 1 && !selectedFlavors.includes(query.trim())) {
      results.push(`"${query.trim()}"`);
    }
    return results.slice(0, 10);
  }, [query, selectedFlavors]);

  const addFlavor = (raw) => {
    const flavor = raw.startsWith('"') ? raw.slice(1, -1) : raw;
    const capitalized = flavor.charAt(0).toUpperCase() + flavor.slice(1).toLowerCase();
    if (!selectedFlavors.includes(capitalized)) {
      onChange([...selectedFlavors, capitalized]);
    }
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeFlavor = (flavor) => {
    onChange(selectedFlavors.filter(f => f !== flavor));
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ width: '100%' }}>
      {selectedFlavors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {selectedFlavors.map(f => (
            <span key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: getFlavorStyle(f), color: 'white',
              padding: '4px 10px', borderRadius: '20px',
              fontSize: '12px', fontWeight: '700',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>
              {getFlavorEmoji(f)} {f}
              <button
                type="button"
                onClick={() => removeFlavor(f)}
                style={{
                  background: 'rgba(255,255,255,0.25)', border: 'none',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '10px', color: 'white',
                  lineHeight: 1, padding: 0, marginLeft: '2px',
                }}
              >✕</button>
            </span>
          ))}
        </div>
      )}

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          style={{
            width: '100%', padding: '9px 12px 9px 34px',
            border: '1px solid #D7CCC8', borderRadius: '6px',
            fontSize: '13px', color: '#2C1810', background: '#FAFAFA',
            outline: 'none', boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
          type="text"
          placeholder="Search flavors… e.g. citrus, honey"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length > 0) {
              e.preventDefault();
              addFlavor(filtered[0]);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          autoComplete="off"
        />
        <span style={{
          position: 'absolute', left: '10px', top: '50%',
          transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none',
        }}>🔍</span>

        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', border: '1px solid #D7CCC8',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 200, overflow: 'hidden',
          }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1, -1) : item;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addFlavor(item); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '9px 14px',
                    background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: i < filtered.length - 1 ? '1px solid #F5F0EC' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: getFlavorStyle(label),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>
                    {getFlavorEmoji(label)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', flex: 1 }}>
                    {isCustom ? `Add "${label}"` : label}
                  </span>
                  {!isCustom && (
                    <span style={{
                      fontSize: '10px', color: '#8D6E63', background: '#EFEBE9',
                      padding: '2px 7px', borderRadius: '10px', fontWeight: '600',
                    }}>
                      {label.toLowerCase() in FLAVOR_PALETTE ? '✓ known' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Brew Modal ───────────────────────────────────────────────────────────

// ─── Add Brew Modal ───────────────────────────────────────────────────────────

const BREW_METHODS = ['V60', 'Chemex', 'AeroPress', 'French Press', 'Espresso', 'Moka Pot', 'Cold Brew', 'Siphon', 'Other'];

const INITIAL_FEATURES = {
  date: true, beans: true, method: true, grinder: true, grindSetting: true,
  groundCoffeeWeight: true, waterTemp: true, waterIn: true, brewTime: true,
  daysPast: true, flavorTags: true, notes: true, extra: true
};

const EMPTY_FORM = {
  beans: '', method: '', grinder: '', waterTemp: '', grindSetting: '',
  groundCoffeeWeight: '', waterIn: '', notes: '', extra: '', brewTime: '', daysPast: '',
  flavorTags: [],
  date: new Date().toISOString().split('T')[0],
};

function AddBrewModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [activeFeatures, setActiveFeatures] = useState(() => {
    const saved = localStorage.getItem('coffee_feature_settings');
    return saved ? JSON.parse(saved) : INITIAL_FEATURES;
  });

  useEffect(() => {
    localStorage.setItem('coffee_feature_settings', JSON.stringify(activeFeatures));
  }, [activeFeatures]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleFeature = (field) => {
    setActiveFeatures(prev => ({ ...prev, [field]: !prev[field] }));
  };

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
          } else if (key === 'waterTemp' || key === 'waterIn' || key === 'daysPast' || key === 'groundCoffeeWeight') {
            acc[key] = val ? Number(val) : null;
          } else {
            acc[key] = val?.toString().trim() || null;
          }
        }
        return acc;
      }, {});

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
      <div style={{ ...widthStyle, position: 'relative', opacity: isActive ? 1 : 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={ms.label}>{label} {isActive && <span style={ms.required}>*</span>}</label>
          <button
            type="button"
            onClick={() => toggleFeature(field)}
            style={{...ms.deactivateIcon, color: isActive ? '#8D6E63' : '#BF360C'}}
          >
            {isActive ? '✕' : '+'}
          </button>
        </div>

        {type === 'select' ? (
          <select
            style={ms.input}
            value={form[field]}
            onChange={e => set(field, e.target.value)}
            disabled={!isActive}
            required={isActive}
          >
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            style={{...ms.input, ...ms.textarea}}
            placeholder={placeholder}
            value={form[field]}
            onChange={e => set(field, e.target.value)}
            disabled={!isActive}
            required={isActive}
            rows={2}
          />
        ) : (
          <input
            style={ms.input}
            type={type}
            placeholder={placeholder}
            value={form[field]}
            onChange={e => set(field, e.target.value)}
            disabled={!isActive}
            required={isActive}
          />
        )}
      </div>
    );
  };

  return (
    <div style={ms.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{...ms.modal, maxWidth: '650px'}}>
        <div style={ms.header}>
          <div style={ms.headerLeft}><span style={{ fontSize: '20px' }}>☕</span><span style={ms.title}>Add Brew</span></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={ms.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={ms.grid}>
            {renderField("Date", "date", "date", "", ms.fieldHalf)}
            {renderField("Beans", "beans", "text", "Origin/Roaster", ms.fieldHalf)}
            {renderField("Brew Method", "method", "select", "", ms.fieldThird, BREW_METHODS)}
            {renderField("Grinder", "grinder", "text", "Comandante...", ms.fieldThird)}
            {renderField("Setting", "grindSetting", "text", "20 clicks", ms.fieldThird)}
            {renderField("Coffee (g)", "groundCoffeeWeight", "number", "15", ms.fieldThird)}
            {renderField("Temp (°C)", "waterTemp", "number", "93", ms.fieldThird)}
            {renderField("Water (ml)", "waterIn", "number", "250", ms.fieldThird)}
            {renderField("Brew Time", "brewTime", "text", "2:30", ms.fieldThird)}
            {renderField("Days Post Roast", "daysPast", "number", "14", ms.fieldThird)}

            {/* Flavor Tags — custom picker */}
            <div style={{ width: '100%', opacity: activeFeatures.flavorTags ? 1 : 0.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={ms.label}>Flavor Tags {activeFeatures.flavorTags && <span style={ms.required}>*</span>}</label>
                <button
                  type="button"
                  onClick={() => toggleFeature('flavorTags')}
                  style={{ ...ms.deactivateIcon, color: activeFeatures.flavorTags ? '#8D6E63' : '#BF360C' }}
                >
                  {activeFeatures.flavorTags ? '✕' : '+'}
                </button>
              </div>
              {activeFeatures.flavorTags
                ? <FlavorPicker
                    selectedFlavors={form.flavorTags}
                    onChange={tags => set('flavorTags', tags)}
                  />
                : <div style={{ ...ms.input, color: '#BCAAA4', fontSize: '12px' }}>Flavor tags disabled</div>
              }
            </div>

            {renderField("Tasting Notes", "notes", "textarea", "Extra context, body, finish…", ms.fieldFull)}
            {renderField("Extra Notes", "extra", "textarea", "Water recipe, etc...", ms.fieldFull)}
          </div>

          <div style={ms.actions}>
            <button type="button" style={ms.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={ms.submitBtn} disabled={submitting}>
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
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 10, 4, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '64px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },
  modal: {
    background: '#FFFDF9',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '540px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    animation: 'slideDown 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid #EFEBE9',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '16px', fontWeight: '700', color: '#F5E6D3', letterSpacing: '0.2px' },
  closeBtn: {
    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px',
    color: '#D4A574', width: '28px', height: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '13px', fontWeight: '700',
  },
  errorBox: {
    background: '#FFF3E0', border: '1px solid #FFCC80', borderRadius: 0,
    padding: '10px 24px', fontSize: '13px', color: '#E65100', fontWeight: '500',
  },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '20px 24px' },
  fieldFull: { width: '100%' },
  fieldHalf: { width: 'calc(50% - 7px)' },
  fieldThird: { width: 'calc(33.33% - 10px)', marginBottom: '10px' },
  label: {
    display: 'block', fontSize: '11px', fontWeight: '700', color: '#8D6E63',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  },
  required: { color: '#BF360C' },
  input: {
    width: '100%', padding: '9px 12px', border: '1px solid #D7CCC8',
    borderRadius: '6px', fontSize: '13px', color: '#2C1810', background: '#FAFAFA',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    transition: 'border-color 0.15s ease',
  },
  textarea: { resize: 'vertical', minHeight: '72px', lineHeight: '1.5' },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
    padding: '16px 24px', borderTop: '1px solid #EFEBE9', background: '#FAF7F4',
  },
  cancelBtn: {
    padding: '9px 18px', background: 'transparent', border: '1px solid #D7CCC8',
    borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#8D6E63', cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 20px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
    color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(93,64,55,0.3)',
  },
  deactivateIcon: {
    background: 'none', border: 'none', color: '#D7CCC8', cursor: 'pointer',
    fontSize: '10px', padding: '2px 5px', borderRadius: '4px', transition: 'all 0.2s',
  },
};

// ─── Map utility components ──────────────────────────────────────────────────

function MapEventHandler({ onZoomChange, onMoveChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => {
      const center = map.getCenter();
      onMoveChange({ lat: center.lat.toFixed(4), lng: center.lng.toFixed(4) });
    }
  });
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="custom-zoom-controls">
      <div className="control-group">
        <button onClick={() => map.zoomIn()} className="zoom-button" title="Zoom in">+</button>
        <button onClick={() => map.zoomOut()} className="zoom-button" title="Zoom out">−</button>
        <button onClick={() => map.setView([15, -20], 3)} className="zoom-button" title="Reset view">⊡</button>
      </div>
    </div>
  );
}

function BoundaryFitter({ coordinates, resetView, zoomLevel = 7 }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, zoomLevel, { animate: true, duration: 0.5 });
    } else if (resetView) {
      map.setView([15, -20], 3, { animate: true, duration: 0.5 });
    }
  }, [coordinates, resetView, zoomLevel, map]);
  return null;
}

function PopupCloser({ shouldClose, onClosed }) {
  const map = useMap();
  useEffect(() => {
    if (shouldClose) { map.closePopup(); onClosed(); }
  }, [shouldClose, map, onClosed]);
  return null;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const countryIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#8b4513" stroke="white" stroke-width="3"/>
      <text x="20" y="27" font-size="20" text-anchor="middle" fill="white">☕</text>
    </svg>
  `),
  iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
});

const subRegionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10" fill="#d2691e" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14]
});

// ─── Loading / Error screens ─────────────────────────────────────────────────

const LoadingScreen = () => (
  <div style={{
    width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap: '16px'
  }}>
    <div style={{ fontSize: '48px' }}>☕</div>
    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '600' }}>
      Loading your coffee map...
    </div>
  </div>
);

const ErrorScreen = ({ message }) => (
  <div style={{
    width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap: '16px'
  }}>
    <div style={{ fontSize: '48px' }}>⚠️</div>
    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '600' }}>Failed to load regions</div>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{message}</div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

function BrazilMap() {
  const [allCoffeeRegions, setAllCoffeeRegions] = useState([]);
  const [brewRecords, setBrewRecords] = useState([]);
  const [brewsLoading, setBrewsLoading] = useState(true);
  const [coffeeRegions, setCoffeeRegions] = useState([]);
  const [brewStats, setBrewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentZoom, setCurrentZoom] = useState(3);
  const [currentCenter, setCurrentCenter] = useState({ lat: '15.0000', lng: '-20.0000' });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedSubRegion, setSelectedSubRegion] = useState(null);
  const [resetView, setResetView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('coffee-map');
  const [closePopup, setClosePopup] = useState(false);
  const [showBrewModal, setShowBrewModal] = useState(false);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'coffeeRegions'));
        const regions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllCoffeeRegions(regions);
      } catch (err) {
        console.error('Error fetching coffee regions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setBrewRecords([]);
        setBrewsLoading(false);
        return;
      }
      try {
        setBrewsLoading(true);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
        const brews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  useEffect(() => {
    if (allCoffeeRegions.length === 0) return;
    setCoffeeRegions(getTastedRegions(allCoffeeRegions, brewRecords));
    setBrewStats(getBrewStats(allCoffeeRegions, brewRecords));
  }, [allCoffeeRegions, brewRecords]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  const worldBounds = [[-60, -180], [75, 180]];

  const subRegionData = {};
  coffeeRegions.forEach(region => {
    (region.subRegions || []).forEach(subRegion => {
      subRegionData[subRegion.id] = { ...subRegion, parentRegion: region.id };
    });
  });

  const handleRegionClick = (region) => {
    setSelectedRegion(region);
    setSelectedSubRegion(null);
    setResetView(false);
  };

  const handleSubRegionClick = (subRegion) => {
    setSelectedSubRegion(subRegion);
    setResetView(false);
  };

  const handleBackToMap = () => {
    setClosePopup(true);
    if (selectedSubRegion) {
      setSelectedSubRegion(null);
    } else {
      setSelectedRegion(null);
      setResetView(true);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleBrewSubmitted = (newBrew) => {
    setBrewRecords(prev => {
      const updated = [...prev, newBrew];
      updated.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      return updated;
    });
  };

  const showSubRegions = currentZoom >= 6 || selectedRegion !== null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer
              center={[15, -20]} zoom={3} minZoom={2} maxZoom={18}
              maxBounds={worldBounds} zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
              />

              {!showSubRegions && coffeeRegions.map((region) => (
                <Marker key={region.id} position={region.coordinates} icon={countryIcon}
                  eventHandlers={{ click: () => handleRegionClick(region) }}>
                  <Popup>
                    <div className="region-popup">
                      <div className="region-name">{region.name}</div>
                      <div className="region-local">{region.nameLocal}</div>
                      <div className="region-brews">Total Brews: {region.brewCount}</div>
                      <div className="region-description">{region.description}</div>
                      <div className="region-hint">Click to zoom in and see sub-regions</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {showSubRegions && Object.entries(subRegionData).map(([subRegionId, subRegion]) => {
                if (selectedRegion && subRegion.parentRegion !== selectedRegion.id) return null;
                if (!subRegion.coordinates) return null;
                const parentRegion = coffeeRegions.find(r => r.id === subRegion.parentRegion);
                return (
                  <Marker key={`marker-${subRegionId}`} position={subRegion.coordinates} icon={subRegionIcon}
                    eventHandlers={{ click: () => handleSubRegionClick(subRegion) }}>
                    <Popup maxWidth={350}>
                      <BrewStatsPopup subRegion={subRegion} parentRegion={parentRegion} brewRecords={brewRecords} />
                    </Popup>
                  </Marker>
                );
              })}

              <MapEventHandler onZoomChange={setCurrentZoom} onMoveChange={setCurrentCenter} />
              <ZoomControls />
              <PopupCloser shouldClose={closePopup} onClosed={() => setClosePopup(false)} />
              <BoundaryFitter
                coordinates={selectedSubRegion?.coordinates || selectedRegion?.coordinates || null}
                resetView={resetView}
                zoomLevel={selectedSubRegion ? 12 : selectedRegion ? 7 : 3}
              />
            </MapContainer>
          </div>
        );
      case 'by-notes':
        return <div className="map-wrapper"><ByNotes /></div>;
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
        />
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">☕</div>
            <div className="logo-text">
              <h1>Coffee Journey</h1>
              <p>Taste Map</p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : (brewStats?.totalBrews ?? '0')}</div>
            <div className="stat-label">Total Brews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : (brewStats?.regionCount ?? '0')}</div>
            <div className="stat-label">Regions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {brewsLoading ? '…' : coffeeRegions.reduce((total, region) => total + (region.subRegions?.length || 0), 0)}
            </div>
            <div className="stat-label">Farms</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : Object.keys(brewStats?.regions ?? {}).length}</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>

        <div className="nav-tabs">
          <button className={`sidebar-tab ${activeTab === 'coffee-map' ? 'active' : ''}`} onClick={() => setActiveTab('coffee-map')}>
            <span className="tab-icon">🗺️</span>Coffee Map
          </button>
          <button className={`sidebar-tab ${activeTab === 'by-notes' ? 'active' : ''}`} onClick={() => setActiveTab('by-notes')}>
            <span className="tab-icon">📝</span>Tasting Notes
          </button>
          <button className={`sidebar-tab ${activeTab === 'raw-data' ? 'active' : ''}`} onClick={() => setActiveTab('raw-data')}>
            <span className="tab-icon">📊</span>Brew Data
          </button>
        </div>

        <div className="regions-list">
          <h3>Tasted Regions</h3>
          {coffeeRegions.map((region) => (
            <div key={region.id} className="region-item" onClick={() => handleRegionClick(region)}>
              <div className="region-header">
                <div>
                  <div className="region-name">{region.name}</div>
                  <div className="region-name-local">{region.nameLocal}</div>
                </div>
                <div className="region-badge">{region.brewCount} brews</div>
              </div>
              {region.subRegions?.length > 0 && (
                <div className="region-subregions">
                  {region.subRegions.map((subRegion) => (
                    <span key={subRegion.id} className="subregion-pill">{subRegion.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="sidebar-back-button" onClick={toggleSidebar} title="Close Menu">←</button>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <main className="main-content">
        <div className="top-bar">
          <div className="breadcrumb">
            <div className="breadcrumb-item breadcrumb-home">
              🏠 {selectedSubRegion ? 'World' : selectedRegion ? selectedRegion.name : 'World Map'}
            </div>
            {(selectedRegion || selectedSubRegion) && <span>›</span>}
            {selectedRegion && !selectedSubRegion && (
              <div className="breadcrumb-item breadcrumb-current">{selectedRegion.name}</div>
            )}
            {selectedSubRegion && (
              <>
                <div className="breadcrumb-item">{selectedRegion?.name}</div>
                <span>›</span>
                <div className="breadcrumb-item breadcrumb-current">{selectedSubRegion.name}</div>
              </>
            )}
          </div>
          <div className="top-bar-actions">
            {(selectedRegion || selectedSubRegion) && activeTab === 'coffee-map' && (
              <button className="btn btn-secondary" onClick={handleBackToMap}>← Back</button>
            )}
            <button className="btn btn-primary" onClick={() => setShowBrewModal(true)}>+ Add Brew</button>
            <button className="btn btn-secondary" onClick={toggleSidebar}>☰ Menu</button>
            <button className="btn btn-secondary" onClick={handleSignOut} title="Sign out">↪ Sign Out</button>
          </div>
        </div>

        {renderTabContent()}
      </main>
    </div>
  );
}

export default BrazilMap;