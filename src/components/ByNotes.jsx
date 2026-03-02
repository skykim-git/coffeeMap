import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/ByNotes.css';
import { buildRegionTree } from './shared/utils';

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

// ─── Flavor emoji ─────────────────────────────────────────────────────────────
const getFlavorEmoji = (flavor) => {
  const map = {
    // Fruits
    citrus: '🍊', lemon: '🍋', lime: '🍋', orange: '🍊',
    fruity: '🍇', berry: '🫐', raspberry: '🫐', blueberry: '🫐',
    strawberry: '🍓', cherry: '🍒', plum: '🍑', peach: '🍑',
    apricot: '🍑', banana: '🍌', apple: '🍏', grape: '🍇',
    mango: '🥭', pineapple: '🍍', tropical: '🌴', fig: '🌰',
    date: '🌰', raisin: '🍇', prune: '🍇',

    // Sweetness & Caramel
    honey: '🍯', caramel: '🍮', toffee: '🍮', butterscotch: '🍮',
    molasses: '🫙', brown_sugar: '🟤', vanilla: '🤍', maple: '🍁',
    marshmallow: '☁️', candy: '🍬', sweet: '🍬',

    // Chocolate & Roast
    chocolate: '🍫', dark_chocolate: '🍫', milk_chocolate: '🍫',
    cocoa: '🍫', cacao: '🍫', mocha: '☕', roasty: '🔥',
    smoky: '💨', charcoal: '⬛', toasty: '🍞', burnt: '🔥',
    tobacco: '🌿', leather: '🟫',

    // Nuts & Grains
    nutty: '🥜', almond: '🥜', hazelnut: '🥜', walnut: '🌰',
    pecan: '🌰', peanut: '🥜', cashew: '🥜', malt: '🌾',
    grain: '🌾', cereal: '🌾', oat: '🌾', bread: '🍞',
    biscuit: '🍪', cookie: '🍪',

    // Floral & Herbal
    floral: '🌸', jasmine: '🌸', rose: '🌹', lavender: '💜',
    hibiscus: '🌺', aroma: '🌺', fragrant: '🌺', elderflower: '🌼',
    chamomile: '🌼', herbs: '🌿', green: '🌿', grassy: '🌿',
    vegetal: '🥬', earthy: '🌍',

    // Spice & Complex
    spicy: '🌶️', cinnamon: '🫚', clove: '🫚', cardamom: '🫚',
    pepper: '🌶️', anise: '⭐', licorice: '⭐', ginger: '🫚',

    // Acidity & Body
    acidic: '💧', bright: '✨', clean: '💧', crisp: '🧊',
    intense: '🔥', bold: '💥', rich: '🏆', heavy: '⚖️',
    light: '🪶', smooth: '🌊', velvety: '🌊', creamy: '🥛',
    milky: '🥛', buttery: '🧈', silky: '🌊', winey: '🍷',

    // Coffee-Specific Aromas
    coffee: '☕', espresso: '☕', brew: '☕', roast: '🔥',
    woody: '🪵', cedar: '🪵', oak: '🪵', pine: '🌲',
    rubber: '⬛', musty: '🍂', fermented: '🫙', ferment: '🫙',
    wine: '🍷', whiskey: '🥃', rum: '🥃', spirit: '🥃',
  };
  return map[flavor.toLowerCase().replace(/\s+/g, '_')] || '☕';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns all brews linked to a regionDoc (directly via regionRef == doc.id)
const getBrewsForDoc = (docId, brewRecords) =>
  brewRecords.filter(b => b.regionRef === docId);

// Extracts flavor notes from brews for a specific regionDoc
const extractFlavorNotesForDoc = (docId, brewRecords) => {
  const brews = getBrewsForDoc(docId, brewRecords);
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

  return Object.entries(tagSet).sort((a,b) => b[1]-a[1]).slice(0,5).map(([w]) => w);
};

// Extracts all flavor words across all brews
const extractAllFlavorWords = (brewRecords) => {
  const allWords = {};
  brewRecords.forEach(brew => {
    const tagWords = Array.isArray(brew.flavorTags) ? brew.flavorTags : [];
    const noteWords = (brew.notes && brew.notes !== '?' && brew.notes.trim())
      ? brew.notes.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      : [];
    [...new Set([...tagWords, ...noteWords])].forEach(word => {
      if (!allWords[word]) allWords[word] = { word, count:0, regionRefs:new Set() };
      allWords[word].count++;
      if (brew.regionRef) allWords[word].regionRefs.add(brew.regionRef);
    });
  });
  return Object.values(allWords)
    .map(item => ({ ...item, regionRefs: Array.from(item.regionRefs) }))
    .sort((a,b) => b.count - a.count);
};

// ─── Main Component ───────────────────────────────────────────────────────────

function ByNotes({ allRegionDocs = [] }) {
  const [brewRecords, setBrewRecords] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlavor, setSelectedFlavor] = useState(null);

  // ── Fetch user's brews ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBrewRecords([]); setLoading(false); return; }
      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
        const brews = snapshot.docs.map(d => ({ id:d.id, ...d.data() }));
        brews.sort((a,b) => (a.date??'').localeCompare(b.date??''));
        setBrewRecords(brews);
      } catch (err) {
        console.error('ByNotes: failed to fetch brews', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Build region lookup ────────────────────────────────────────────────────
  const { byId } = useMemo(() => buildRegionTree(allRegionDocs), [allRegionDocs]);

  // All region docs that have at least one brew pointing to them
  const brewedRegionDocs = useMemo(() => {
    const refIds = new Set(brewRecords.map(b => b.regionRef).filter(Boolean));
    return allRegionDocs.filter(d => refIds.has(d.id));
  }, [allRegionDocs, brewRecords]);

  const allFlavorWords = useMemo(() => extractAllFlavorWords(brewRecords), [brewRecords]);
  const topFlavors     = useMemo(() => allFlavorWords.slice(0, 12), [allFlavorWords]);

  const filteredFlavors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allFlavorWords.filter(item => item.word.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);
  }, [searchQuery, allFlavorWords]);

  // Region docs that have the selected flavor in their extracted notes
  const matchingDocs = useMemo(() => {
    if (!selectedFlavor) return [];
    return brewedRegionDocs.filter(doc => {
      const notes = extractFlavorNotesForDoc(doc.id, brewRecords);
      return notes.some(n => n.toLowerCase() === selectedFlavor.toLowerCase());
    });
  }, [selectedFlavor, brewedRegionDocs, brewRecords]);

  // ── Helpers for display ────────────────────────────────────────────────────
  const getAncestorName = (doc) => {
    // Walk up to find country
    let cur = doc.parentId ? byId[doc.parentId] : null;
    const parts = [];
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
    return parts.join(' › ');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...s.container, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#8D6E63' }}>
          <div style={{ fontSize:'32px', marginBottom:'12px' }}>☕</div>
          <div style={{ fontSize:'14px', fontWeight:'600' }}>Loading your tasting notes…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.content}>

        {/* Search Bar */}
        <div style={s.searchContainer}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input
              type="text"
              style={s.input}
              placeholder="Search flavors (e.g. Berry, Chocolate…)"
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
                  onMouseEnter={e => e.currentTarget.style.background='#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background='white'}
                  onClick={() => { setSelectedFlavor(item.word); setSearchQuery(''); }}
                >
                  <span>{getFlavorEmoji(item.word)} {item.word}</span>
                  <span style={s.countBadge}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
          {searchQuery && filteredFlavors.length === 0 && (
            <div style={s.dropdown}>
              <div style={{ padding:'14px 20px', color:'#BCAAA4', fontSize:'13px' }}>No flavors found for "{searchQuery}"</div>
            </div>
          )}
        </div>

        {/* Popular Tags */}
        {topFlavors.length > 0 && (
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Popular Discoveries</h3>
            <div style={s.tagGrid}>
              {topFlavors.map((item, i) => (
                <button key={i} onClick={() => setSelectedFlavor(item.word)}
                  style={{ ...s.tag, ...(selectedFlavor === item.word ? s.activeTag : {}) }}>
                  {getFlavorEmoji(item.word)} {item.word}
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
              <span style={s.resultsCount}>{matchingDocs.length} match{matchingDocs.length !== 1 ? 'es' : ''} found</span>
            </div>

            {matchingDocs.length > 0 ? (
              <div style={s.cardGrid}>
                {matchingDocs.map((doc, i) => {
                  const notes    = extractFlavorNotesForDoc(doc.id, brewRecords);
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
                          <div style={{ ...s.typeBadge, marginTop:'4px', background:'#E8F5E9', color:'#2E7D32' }}>
                            ☕ {brewCount}
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
                              {getFlavorEmoji(n)} {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px', color:'#BCAAA4' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>🤔</div>
                <p>No regions found with "{selectedFlavor}" notes in your brews yet.</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div style={s.emptyState}>
            {brewRecords.length === 0 ? (
              <>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>☕</div>
                <p style={s.emptyHint}>No brews logged yet. Add your first brew to see flavor notes!</p>
              </>
            ) : (
              <>
                <div style={s.statGrid}>
                  <div style={s.statBox}>
                    <div style={s.statNum}>{allFlavorWords.length}</div>
                    <div style={s.statLab}>Flavors Found</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={s.statNum}>{brewRecords.length}</div>
                    <div style={s.statLab}>Total Brews</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={s.statNum}>{brewedRegionDocs.length}</div>
                    <div style={s.statLab}>Regions</div>
                  </div>
                </div>
                <p style={s.emptyHint}>Select a flavor above to explore your brews.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container:      { padding:'40px 20px', minHeight:'100vh', overflowY:'auto', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  content:        { maxWidth:'900px', margin:'0 auto' },
  searchContainer:{ position:'relative', marginBottom:'40px' },
  searchBox:      { display:'flex', alignItems:'center', background:'rgba(255,255,255,0.9)', backdropFilter:'blur(10px)', border:'1px solid rgba(0,0,0,0.07)', borderRadius:'16px', padding:'12px 20px', boxShadow:'0 10px 30px rgba(0,0,0,0.05)' },
  searchIcon:     { fontSize:'18px', flexShrink:0 },
  input:          { flex:1, border:'none', background:'transparent', fontSize:'17px', outline:'none', marginLeft:'10px', color:'#2C1810' },
  clearBtn:       { background:'#EFEBE9', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', fontSize:'11px', color:'#8D6E63', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' },
  dropdown:       { position:'absolute', top:'calc(100% + 8px)', left:0, right:0, background:'white', borderRadius:'16px', boxShadow:'0 20px 40px rgba(0,0,0,0.1)', zIndex:100, overflow:'hidden', border:'1px solid #EFEBE9' },
  dropdownItem:   { padding:'12px 20px', display:'flex', justifyContent:'space-between', cursor:'pointer', borderBottom:'1px solid #f5f5f5', fontSize:'14px', color:'#2C1810', background:'white', transition:'background 0.15s' },
  countBadge:     { background:'#EFEBE9', color:'#8D6E63', padding:'2px 8px', borderRadius:'10px', fontSize:'12px', fontWeight:'700' },
  section:        { marginBottom:'50px' },
  sectionTitle:   { fontSize:'12px', textTransform:'uppercase', letterSpacing:'1.2px', color:'#8D6E63', fontWeight:'700', marginBottom:'20px' },
  tagGrid:        { display:'flex', flexWrap:'wrap', gap:'10px' },
  tag:            { padding:'10px 18px', borderRadius:'30px', border:'1px solid #EFEBE9', background:'white', cursor:'pointer', fontSize:'14px', fontWeight:'500', color:'#5D4037', boxShadow:'0 2px 5px rgba(0,0,0,0.03)', transition:'all 0.2s' },
  activeTag:      { background:'#5D4037', color:'white', borderColor:'#5D4037', transform:'translateY(-2px)', boxShadow:'0 5px 15px rgba(93,64,55,0.3)' },
  resultsArea:    { animation:'fadeIn 0.4s ease' },
  resultsHeader:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' },
  resultsTitle:   { fontSize:'26px', fontWeight:'800', margin:0, color:'#2C1810' },
  accentText:     { color:'#8D6E63' },
  resultsCount:   { fontSize:'13px', color:'#8D6E63', background:'#EFEBE9', padding:'4px 12px', borderRadius:'20px', fontWeight:'600' },
  cardGrid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px', marginTop:'28px' },
  card:           { background:'white', borderRadius:'20px', padding:'22px', border:'1px solid #F5F5F5', boxShadow:'0 4px 20px rgba(0,0,0,0.04)', transition:'transform 0.2s, box-shadow 0.2s' },
  cardHeader:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' },
  cardCountry:    { fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px', color:'#A1887F', fontWeight:'700' },
  cardName:       { fontSize:'17px', fontWeight:'700', color:'#2C1810', margin:'4px 0 2px' },
  cardLocal:      { fontSize:'12px', color:'#BCAAA4' },
  typeBadge:      { fontSize:'10px', padding:'3px 8px', background:'#F5F5F5', borderRadius:'6px', color:'#8D6E63', fontWeight:'600', textAlign:'center', textTransform:'capitalize' },
  cardFooter:     { marginTop:'4px' },
  inlineNotes:    { display:'flex', flexWrap:'wrap', gap:'6px' },
  miniNote:       { fontSize:'12px', padding:'4px 10px', background:'#FAFAFA', borderRadius:'8px', color:'#5D4037' },
  highlightNote:  { background:'#FFF3E0', color:'#E65100', fontWeight:'700' },
  emptyState:     { textAlign:'center', padding:'60px 0' },
  statGrid:       { display:'flex', justifyContent:'center', gap:'50px', marginBottom:'30px' },
  statBox:        { textAlign:'center' },
  statNum:        { fontSize:'48px', fontWeight:'800', color:'#D4A574', lineHeight:1 },
  statLab:        { fontSize:'11px', color:'#A1887F', textTransform:'uppercase', marginTop:'8px', letterSpacing:'0.5px' },
  emptyHint:      { color:'#8D6E63', fontStyle:'italic', fontSize:'14px' },
};

export default ByNotes;