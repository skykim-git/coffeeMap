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

// ─── Data helpers (accept brewRecords as param for live refresh) ─────────────

const getTastedRegions = (allCoffeeRegions, brewRecords) => {
  const tastedBeanNames = new Set(brewRecords.map(brew => brew.beans));
  return allCoffeeRegions
    .map(region => {
      const tastedSubRegions = (region.subRegions || []).filter(
        subRegion => tastedBeanNames.has(subRegion.beanName)
      );
      if (tastedSubRegions.length === 0) return null;
      const brewCount = tastedSubRegions.reduce((total, subRegion) => {
        return total + brewRecords.filter(brew => brew.beans === subRegion.beanName).length;
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

const extractFlavorNotes = (beanName, brewRecords) => {
  const brews = brewRecords.filter(brew => brew.beans === beanName);
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

const getBrewStatsForSubregion = (beanName, brewRecords) => {
  const brews = brewRecords.filter(brew => brew.beans === beanName);
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
  const stats = getBrewStatsForSubregion(subRegion.beanName, brewRecords);
  const flavorNotes = extractFlavorNotes(subRegion.beanName, brewRecords);

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

// ─── Add Brew Modal ───────────────────────────────────────────────────────────

const BREW_METHODS = ['V60', 'Chemex', 'AeroPress', 'French Press', 'Espresso', 'Moka Pot', 'Cold Brew', 'Siphon', 'Other'];

const EMPTY_FORM = {
  beans: '', method: '', waterTemp: '', grindSetting: '', waterIn: '', notes: '',
  date: new Date().toISOString().split('T')[0],
};

function AddBrewModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.beans.trim()) { setError('Bean name is required.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const brewRef = collection(db, 'users', user.uid, 'brews');
      await addDoc(brewRef, {
        beans:        form.beans.trim(),
        method:       form.method || null,
        waterTemp:    form.waterTemp ? Number(form.waterTemp) : null,
        grindSetting: form.grindSetting || null,
        waterIn:      form.waterIn ? Number(form.waterIn) : null,
        notes:        form.notes.trim() || null,
        date:         form.date || new Date().toISOString().split('T')[0],
        createdAt:    serverTimestamp(),
      });

      onSubmitted({
        beans:        form.beans.trim(),
        method:       form.method || null,
        waterTemp:    form.waterTemp ? Number(form.waterTemp) : null,
        grindSetting: form.grindSetting || null,
        waterIn:      form.waterIn ? Number(form.waterIn) : null,
        notes:        form.notes.trim() || null,
        date:         form.date,
      });
      onClose();
    } catch (err) {
      console.error('Error saving brew:', err);
      setError('Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={ms.backdrop} onClick={handleBackdrop}>
      <div style={ms.modal}>

        {/* Header */}
        <div style={ms.header}>
          <div style={ms.headerLeft}>
            <span style={{ fontSize: '20px' }}>☕</span>
            <span style={ms.title}>Add Brew</span>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={ms.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={ms.grid}>

            {/* Bean name */}
            <div style={ms.fieldFull}>
              <label style={ms.label}>Bean / Origin <span style={ms.required}>*</span></label>
              <input
                style={ms.input}
                type="text"
                placeholder="e.g. Yirgacheffe Natural"
                value={form.beans}
                onChange={e => set('beans', e.target.value)}
                required
              />
            </div>

            {/* Brew method */}
            <div style={ms.fieldHalf}>
              <label style={ms.label}>Brew Method</label>
              <select style={ms.input} value={form.method} onChange={e => set('method', e.target.value)}>
                <option value="">Select…</option>
                {BREW_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Date */}
            <div style={ms.fieldHalf}>
              <label style={ms.label}>Date</label>
              <input
                style={ms.input}
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>

            {/* Water temp */}
            <div style={ms.fieldThird}>
              <label style={ms.label}>Water Temp (°C)</label>
              <input
                style={ms.input}
                type="number"
                placeholder="93"
                min="50" max="100"
                value={form.waterTemp}
                onChange={e => set('waterTemp', e.target.value)}
              />
            </div>

            {/* Grind setting */}
            <div style={ms.fieldThird}>
              <label style={ms.label}>Grind Setting</label>
              <input
                style={ms.input}
                type="text"
                placeholder="e.g. 20 clicks"
                value={form.grindSetting}
                onChange={e => set('grindSetting', e.target.value)}
              />
            </div>

            {/* Water amount */}
            <div style={ms.fieldThird}>
              <label style={ms.label}>Water (ml)</label>
              <input
                style={ms.input}
                type="number"
                placeholder="250"
                min="0"
                value={form.waterIn}
                onChange={e => set('waterIn', e.target.value)}
              />
            </div>

            {/* Tasting notes */}
            <div style={ms.fieldFull}>
              <label style={ms.label}>Tasting Notes</label>
              <textarea
                style={{ ...ms.input, ...ms.textarea }}
                placeholder="Bright citrus, floral, honey finish…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={ms.actions}>
            <button type="button" style={ms.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={ms.submitBtn} disabled={submitting}>
              {submitting ? 'Saving…' : '+ Save Brew'}
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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#F5E6D3',
    letterSpacing: '0.2px',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: '6px',
    color: '#D4A574',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
  },
  errorBox: {
    background: '#FFF3E0',
    border: '1px solid #FFCC80',
    borderRadius: 0,
    padding: '10px 24px',
    fontSize: '13px',
    color: '#E65100',
    fontWeight: '500',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    padding: '20px 24px',
  },
  fieldFull: { width: '100%' },
  fieldHalf: { width: 'calc(50% - 7px)' },
  fieldThird: { width: 'calc(33.33% - 10px)' },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: '6px',
  },
  required: { color: '#BF360C' },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #D7CCC8',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#2C1810',
    background: '#FAFAFA',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    transition: 'border-color 0.15s ease',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '72px',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #EFEBE9',
    background: '#FAF7F4',
  },
  cancelBtn: {
    padding: '9px 18px',
    background: 'transparent',
    border: '1px solid #D7CCC8',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#8D6E63',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 20px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(93,64,55,0.3)',
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
  const [brewRecords, setBrewRecords] = useState([]);        // ← starts empty; populated from Firestore
  const [brewsLoading, setBrewsLoading] = useState(true);   // ← separate loading flag for brews
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

  // ── Fetch coffeeRegions from Firestore ──────────────────────────────────
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

  // ── Fetch brews from the authenticated user's Firestore sub-collection ──
  useEffect(() => {
    // Wait for Firebase Auth to resolve before querying
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
        // Sort by date ascending so dateRange.start / end are meaningful
        brews.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
        setBrewRecords(brews);
      } catch (err) {
        console.error('Error fetching brews:', err);
        // Non-fatal — map still works, just shows no brews
      } finally {
        setBrewsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Recompute derived state whenever allCoffeeRegions or brewRecords changes
  useEffect(() => {
    if (allCoffeeRegions.length === 0) return;
    setCoffeeRegions(getTastedRegions(allCoffeeRegions, brewRecords));
    setBrewStats(getBrewStats(allCoffeeRegions, brewRecords));
  }, [allCoffeeRegions, brewRecords]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  // ── Derived data ────────────────────────────────────────────────────────
  const worldBounds = [[-60, -180], [75, 180]];

  const subRegionData = {};
  coffeeRegions.forEach(region => {
    (region.subRegions || []).forEach(subRegion => {
      subRegionData[subRegion.id] = { ...subRegion, parentRegion: region.id };
    });
  });

  // ── Handlers ────────────────────────────────────────────────────────────
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

  // Called by modal after Firestore write succeeds — optimistically append to local state
  const handleBrewSubmitted = (newBrew) => {
    setBrewRecords(prev => {
      const updated = [...prev, newBrew];
      updated.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      return updated;
    });
  };

  const showSubRegions = currentZoom >= 6 || selectedRegion !== null;

  // ── Tab content ─────────────────────────────────────────────────────────
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

      {/* Add Brew Modal */}
      {showBrewModal && (
        <AddBrewModal
          onClose={() => setShowBrewModal(false)}
          onSubmitted={handleBrewSubmitted}
        />
      )}

      {/* slide-down animation */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Sidebar */}
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

      {/* Main Content */}
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