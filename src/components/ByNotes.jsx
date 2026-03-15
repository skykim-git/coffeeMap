import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/ByNotes.css';
import { buildRegionTree } from './shared/utils';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IcSearch = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IcNotes = ({ size = 40 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IcCoffee = ({ size = 40 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
);

const IcQuestion = ({ size = 32 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IcCoffeeSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
  </svg>
);

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
  'first','noticeable','compared','clear','strong','prominent','identify','texture','sip',
]);

// ─── Flavor palette ───────────────────────────────────────────────────────────
const FLAVOR_PALETTE = {
  citrus:'linear-gradient(135deg,#FFD700 0%,#FFA500 100%)',
  chocolate:'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
  fruity:'linear-gradient(135deg,#e74c3c 0%,#c0392b 100%)',
  berry:'linear-gradient(135deg,#8e44ad 0%,#6c3483 100%)',
  raspberry:'linear-gradient(135deg,#e91e63 0%,#ad1457 100%)',
  banana:'linear-gradient(135deg,#f1c40f 0%,#f39c12 100%)',
  green:'linear-gradient(135deg,#2ecc71 0%,#27ae60 100%)',
  apple:'linear-gradient(135deg,#2ecc71 0%,#27ae60 100%)',
  grape:'linear-gradient(135deg,#9b59b6 0%,#8e44ad 100%)',
  mango:'linear-gradient(135deg,#f39c12 0%,#e67e22 100%)',
  honey:'linear-gradient(135deg,#f39c12 0%,#e67e22 100%)',
  caramel:'linear-gradient(135deg,#D4A574 0%,#b8860b 100%)',
  nutty:'linear-gradient(135deg,#95a5a6 0%,#7f8c8d 100%)',
  floral:'linear-gradient(135deg,#fd79a8 0%,#e84393 100%)',
  aroma:'linear-gradient(135deg,#9b59b6 0%,#8e44ad 100%)',
  acidic:'linear-gradient(135deg,#3498db 0%,#2980b9 100%)',
  intense:'linear-gradient(135deg,#e74c3c 0%,#c0392b 100%)',
  tropical:'linear-gradient(135deg,#e67e22 0%,#d35400 100%)',
  pineapple:'linear-gradient(135deg,#f1c40f 0%,#f39c12 100%)',
};

const getFlavorStyle = (word) =>
  FLAVOR_PALETTE[word?.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildByIdMap = (docs) => {
  const map = {};
  docs.forEach(d => { map[d.id] = d; });
  return map;
};

const getBrewsForDoc = (docId, brews) =>
  brews.filter(b => b.regionRef === docId);

const extractFlavorNotesForDoc = (docId, brews) => {
  const words = new Set();
  brews.filter(b => b.regionRef === docId).forEach(brew => {
    if (Array.isArray(brew.flavorTags)) brew.flavorTags.forEach(t => words.add(t));
    if (brew.notes && brew.notes !== '?' && brew.notes.trim()) {
      brew.notes.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))
        .forEach(w => words.add(w.charAt(0).toUpperCase() + w.slice(1)));
    }
  });
  return Array.from(words);
};

const extractAllFlavorWords = (brews) => {
  const allWords = {};
  brews.forEach(brew => {
    const tagWords = Array.isArray(brew.flavorTags) ? brew.flavorTags : [];
    const noteWords = (brew.notes && brew.notes !== '?' && brew.notes.trim())
      ? brew.notes.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      : [];
    [...new Set([...tagWords, ...noteWords])].forEach(word => {
      if (!allWords[word]) allWords[word] = { word, count: 0, regionRefs: new Set() };
      allWords[word].count++;
      if (brew.regionRef) allWords[word].regionRefs.add(brew.regionRef);
    });
  });
  return Object.values(allWords)
    .map(item => ({ ...item, regionRefs: Array.from(item.regionRefs) }))
    .sort((a, b) => b.count - a.count);
};

// ─── Main Component ───────────────────────────────────────────────────────────

function ByNotes({ allRegionDocs = [] }) {
  const [brewRecords, setBrewRecords]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedFlavor, setSelectedFlavor] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBrewRecords([]); setLoading(false); return; }
      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
        const brews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        brews.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
        setBrewRecords(brews);
      } catch (err) {
        console.error('ByNotes: failed to fetch brews', err);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const byId = useMemo(() => buildByIdMap(allRegionDocs), [allRegionDocs]);

  const getAncestorName = (doc) => {
    if (!doc.parentId) return null;
    const parent = byId[doc.parentId];
    if (!parent) return null;
    if (!parent.parentId) return parent.name;
    const grandparent = byId[parent.parentId];
    return grandparent ? grandparent.name : parent.name;
  };

  const allFlavorWords = useMemo(() => extractAllFlavorWords(brewRecords), [brewRecords]);
  const topFlavors     = useMemo(() => allFlavorWords.slice(0, 16), [allFlavorWords]);

  const filteredFlavors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allFlavorWords.filter(item => item.word.toLowerCase().includes(q));
  }, [searchQuery, allFlavorWords]);

  const brewedRegionDocs = useMemo(() =>
    allRegionDocs.filter(d => getBrewsForDoc(d.id, brewRecords).length > 0),
    [allRegionDocs, brewRecords]
  );

  const matchingDocs = useMemo(() => {
    if (!selectedFlavor) return [];
    return brewedRegionDocs.filter(doc => {
      const notes = extractFlavorNotesForDoc(doc.id, brewRecords);
      return notes.some(n => n.toLowerCase() === selectedFlavor.toLowerCase());
    });
  }, [selectedFlavor, brewedRegionDocs, brewRecords]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #EFEBE9', borderTopColor: '#5D4037', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.content}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#5D4037', opacity: 0.75, marginBottom: '0.75rem' }}>
            <IcNotes size={40} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2C1810', margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>Tasting Notes</h2>
          <p style={{ fontSize: '0.95rem', color: '#8D6E63', margin: 0 }}>Explore your flavor discoveries across regions</p>
        </div>

        {/* Search */}
        <div style={s.searchContainer}>
          <div style={s.searchBox}>
            <span style={{ display: 'flex', alignItems: 'center', color: '#8D6E63', flexShrink: 0 }}>
              <IcSearch size={18} />
            </span>
            <input
              style={s.input}
              placeholder="Search flavors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {(searchQuery || selectedFlavor) && (
              <button style={s.clearBtn} onClick={() => { setSelectedFlavor(null); setSearchQuery(''); }}>✕</button>
            )}
          </div>

          {searchQuery && filteredFlavors.length > 0 && (
            <div style={s.dropdown}>
              {filteredFlavors.map((item, i) => (
                <div key={i} style={s.dropdownItem}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  onClick={() => { setSelectedFlavor(item.word); setSearchQuery(''); }}
                >
                  <span>{item.word}</span>
                  <span style={s.countBadge}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
          {searchQuery && filteredFlavors.length === 0 && (
            <div style={s.dropdown}>
              <div style={{ padding: '14px 20px', color: '#BCAAA4', fontSize: '13px' }}>No flavors found for "{searchQuery}"</div>
            </div>
          )}
        </div>

        {/* Active Filter Pill */}
        {selectedFlavor && (
          <div style={s.filterPills}>
            <div style={s.filterPill}>
              <span>{selectedFlavor}</span>
              <span style={s.filterPillClose} onClick={() => setSelectedFlavor(null)}>✕</span>
            </div>
          </div>
        )}

        {/* Popular Tags */}
        {topFlavors.length > 0 && !selectedFlavor && (
          <div style={s.section}>
            <h3 style={{ ...s.sectionTitle, textAlign: 'center' }}>Popular Discoveries</h3>
            <div style={s.tagGrid}>
              {topFlavors.map((item, i) => (
                <button key={i} onClick={() => setSelectedFlavor(item.word)}
                  style={{ ...s.tag, position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.background = '#F5F0EC';
                    const line = e.currentTarget.querySelector('[data-color-line]');
                    if (line) line.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0)';
                    e.currentTarget.style.background = '#FEFCFA';
                    const line = e.currentTarget.querySelector('[data-color-line]');
                    if (line) line.style.opacity = '0.6';
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#2C1810' }}>{item.word}</span>
                  <span style={{ fontSize: '0.75rem', color: '#8D6E63', marginLeft: '0.5rem' }}>({item.count})</span>
                  <div data-color-line style={{ 
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: getFlavorStyle(item.word),
                    opacity: 0.6,
                    transition: 'opacity 0.3s ease'
                  }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {selectedFlavor ? (
          <div style={s.resultsArea}>
            <div style={s.resultsHeader}>
              <h2 style={s.resultsTitle}>
                Regions with <span style={s.accentText}>{selectedFlavor}</span>
              </h2>
              <span style={s.resultsCount}>{matchingDocs.length} match{matchingDocs.length !== 1 ? 'es' : ''}</span>
            </div>

            {matchingDocs.length > 0 ? (
              <div style={s.cardGrid}>
                {matchingDocs.map((doc, i) => {
                  const notes     = extractFlavorNotesForDoc(doc.id, brewRecords);
                  const brewCount = getBrewsForDoc(doc.id, brewRecords).length;
                  const ancestorPath = getAncestorName(doc);
                  return (
                    <div key={i} style={s.card}>
                      <div style={s.cardHeader}>
                        <div>
                          {ancestorPath && <div style={s.cardCountry}>{ancestorPath}</div>}
                          <div style={s.cardName}>{doc.name}</div>
                          {doc.nameLocal && <div style={s.cardLocal}>{doc.nameLocal}</div>}
                        </div>
                        <div>
                          <div style={s.typeBadge}>{doc.level}</div>
                          <div style={{ ...s.typeBadge, marginTop: '4px', background: '#E8F5E9', color: '#2E7D32', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <IcCoffeeSmall /> {brewCount}
                          </div>
                        </div>
                      </div>
                      <div style={s.cardFooter}>
                        <div style={s.inlineNotes}>
                          {notes.map((n, j) => (
                            <span key={j} style={{
                              ...s.miniNote,
                              ...(n.toLowerCase() === selectedFlavor.toLowerCase() ? s.highlightNote : {})
                            }}>
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#BCAAA4' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.5 }}>
                  <IcQuestion size={32} />
                </div>
                <p>No regions found with "{selectedFlavor}" notes in your brews yet.</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div style={s.emptyState}>
            {brewRecords.length === 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', opacity: 0.35, color: '#5D4037' }}>
                  <IcCoffee size={48} />
                </div>
                <p style={s.emptyHint}>No brews logged yet. Add your first brew to see flavor notes!</p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container:       { padding: '40px 20px', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  content:         { maxWidth: '900px', margin: '0 auto' },
  searchContainer: { position: 'relative', marginBottom: '2rem' },
  searchBox:       { 
    display: 'flex', 
    alignItems: 'center', 
    background: 'white', 
    border: '2px solid rgba(93, 64, 55, 0.1)', 
    borderRadius: '14px', 
    padding: '0.75rem 1.5rem', 
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', 
    gap: '10px',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  input:           { 
    flex: 1, 
    border: 'none', 
    background: 'transparent', 
    fontSize: '1rem', 
    outline: 'none', 
    color: '#2C1810',
    '::placeholder': { color: '#8D6E63', opacity: 0.6 }
  },
  clearBtn:        { 
    background: '#EFEBE9', 
    border: 'none', 
    borderRadius: '50%', 
    width: '24px', 
    height: '24px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '12px', 
    color: '#8D6E63', 
    flexShrink: 0,
    transition: 'all 0.2s ease'
  },
  dropdown:        { 
    position: 'absolute', 
    top: 'calc(100% + 8px)', 
    left: 0, 
    right: 0, 
    background: 'white', 
    borderRadius: '12px', 
    boxShadow: '0 20px 60px rgba(0,0,0,0.12)', 
    zIndex: 100, 
    overflow: 'hidden', 
    border: '1px solid rgba(0,0,0,0.06)' 
  },
  dropdownItem:    { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '12px 20px', 
    cursor: 'pointer', 
    fontSize: '15px', 
    color: '#2C1810', 
    borderBottom: '1px solid #F5F0EC', 
    transition: 'background 0.15s' 
  },
  countBadge:      { 
    background: '#F5F0EC', 
    borderRadius: '20px', 
    padding: '2px 10px', 
    fontSize: '12px', 
    color: '#8D6E63', 
    fontWeight: '600' 
  },
  filterPills:     { display: 'flex', flexWrap: 'wrap', gap: '0.6rem', margin: '1.5rem 0' },
  filterPill:      { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.6rem', 
    padding: '0.6rem 1.2rem', 
    background: '#FEFCFA', 
    border: '2px solid #5D4037', 
    borderRadius: '8px', 
    fontSize: '0.9rem', 
    fontWeight: '700', 
    color: '#2C1810',
    transition: 'all 0.2s ease'
  },
  filterPillClose: { 
    width: '16px', 
    height: '16px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'rgba(0, 0, 0, 0.1)', 
    borderRadius: '50%', 
    cursor: 'pointer', 
    fontSize: '0.7rem', 
    fontWeight: '700' 
  },
  section:         { marginBottom: '2rem' },
  sectionTitle:    { fontSize: '0.85rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' },
  tagGrid:         { display: 'flex', flexWrap: 'wrap', gap: '0.75rem' },
  tag:             { 
    padding: '0.6rem 1.2rem', 
    border: '1px solid #D9CCBF', 
    borderRadius: '8px', 
    fontSize: '0.9rem', 
    fontWeight: '500', 
    color: '#5D4037', 
    background: '#FEFCFA',
    cursor: 'pointer', 
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0)'
  },
  resultsArea:     { marginTop: '2rem' },
  resultsHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  resultsTitle:    { fontSize: '1.25rem', fontWeight: '700', color: '#2C1810', margin: 0 },
  accentText:      { color: '#5D4037' },
  resultsCount:    { fontSize: '0.9rem', color: '#8D6E63', background: 'rgba(212, 165, 116, 0.15)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: '600', border: '1px solid rgba(212, 165, 116, 0.3)' },
  cardGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' },
  card:            { 
    background: 'white', 
    borderRadius: '16px', 
    padding: '1.5rem', 
    border: '1px solid rgba(93, 64, 55, 0.08)', 
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', 
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' },
  cardCountry:     { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#A1887F', fontWeight: '700', background: 'rgba(212, 165, 116, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px' },
  cardName:        { fontSize: '1.1rem', fontWeight: '700', color: '#2C1810', margin: '0.25rem 0 0.125rem' },
  cardLocal:       { fontSize: '0.85rem', color: '#BCAAA4' },
  typeBadge:       { fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#F5F5F5', borderRadius: '6px', color: '#8D6E63', fontWeight: '600', textAlign: 'center', textTransform: 'capitalize' },
  cardFooter:      { marginTop: '0.25rem' },
  inlineNotes:     { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  miniNote:        { fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'rgba(212, 165, 116, 0.15)', borderRadius: '8px', color: '#5D4037', fontWeight: '600', border: '1px solid rgba(212, 165, 116, 0.3)' },
  highlightNote:   { background: '#FFF3E0', color: '#E65100', fontWeight: '700', border: '1px solid #FFCC80' },
  emptyState:      { textAlign: 'center', padding: '3rem 2rem', animation: 'fadeIn 0.6s ease' },
  emptyHint:       { color: '#8D6E63', fontStyle: 'italic', fontSize: '1rem', margin: 0 },
};

export default ByNotes;