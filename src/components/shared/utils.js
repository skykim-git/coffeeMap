// ── Utilities ────────────────────────────────────────────────────────────────

export const buildRegionTree = (docs) => {
  const byId = {};
  docs.forEach(d => { byId[d.id] = { ...d, children: [] }; });
  const roots = [];
  docs.forEach(d => {
    if (!d.parentId) { roots.push(byId[d.id]); }
    else if (byId[d.parentId]) { byId[d.parentId].children.push(byId[d.id]); }
  });
  return { roots, byId };
};

export const parseCoord = (str) => {
  if (!str) return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  return null;
};

export const buildPath = (docId, byId) => {
  const parts = [];
  let cur = byId[docId];
  while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
  return parts.join(' › ');
};

// ── Brew stat helpers ─────────────────────────────────────────────────────────

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

export const extractFlavorNotes = (regionId, brewRecords) => {
  const brews = brewRecords.filter(b => b.regionRef === regionId);
  if (!brews.length) return [];
  const tagSet = {};
  brews.forEach(brew => {
    if (Array.isArray(brew.flavorTags)) { brew.flavorTags.forEach(t => { tagSet[t] = (tagSet[t] || 0) + 1; }); }
  });
  const allNotes = brews.map(b => b.notes).filter(n => n && n !== '?').join(' ');
  if (allNotes) {
    allNotes.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))
      .forEach(w => { const cap = w.charAt(0).toUpperCase() + w.slice(1); tagSet[cap] = (tagSet[cap] || 0) + 1; });
  }
  return Object.entries(tagSet).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
};

export const getBrewStatsForRegion = (regionId, brewRecords) => {
  const brews = brewRecords.filter(b => b.regionRef === regionId);
  if (!brews.length) return null;
  const toCounts = arr => arr.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const valid = arr => arr.filter(v => v !== '?' && v !== '' && v != null);
  return {
    temperature:  toCounts(valid(brews.map(b => b.waterTemp))),
    grindSetting: toCounts(valid(brews.map(b => b.grindSetting))),
    method:       toCounts(valid(brews.map(b => b.method))),
    waterAmount:  toCounts(valid(brews.map(b => b.waterIn))),
    totalBrews:   brews.length,
  };
};

// ── Flavor helpers ────────────────────────────────────────────────────────────

export const FLAVOR_PALETTE = {
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

export const FLAVOR_EMOJI_MAP = {
  citrus:'🍊',chocolate:'🍫',fruity:'🍇',berry:'🫐',raspberry:'🫐',banana:'🍌',
  apple:'🍏',grape:'🍇',mango:'🥭',pineapple:'🍍',tropical:'🌴',honey:'🍯',
  caramel:'🍮',nutty:'🥜',floral:'🌸',aroma:'🌺',acidic:'💧',intense:'🔥',green:'🌿',
};

export const MASTER_FLAVORS = [
  'Citrus','Chocolate','Fruity','Berry','Raspberry','Banana','Apple','Grape','Mango',
  'Pineapple','Tropical','Honey','Caramel','Nutty','Floral','Aroma','Acidic','Intense',
  'Green','Jasmine','Rose','Vanilla','Spicy','Earthy','Herbal','Winey','Butter','Toffee',
  'Peach','Apricot','Plum','Cherry','Blueberry','Strawberry','Lemon','Orange','Grapefruit',
  'Lime','Almond','Hazelnut','Walnut','Smoke','Cedar','Sweet','Bright','Clean','Juicy',
];

export const getFlavorStyle = (word) => FLAVOR_PALETTE[word?.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)';
export const getFlavorEmoji = (word) => FLAVOR_EMOJI_MAP[word?.toLowerCase()] || '☕';

// ── Form constants ────────────────────────────────────────────────────────────

export const BREW_METHODS       = ['V60','Chemex','AeroPress','French Press','Espresso','Moka Pot','Cold Brew','Siphon','Other'];
export const PROCESSING_METHODS = ['Natural','Washed','Honey','Anaerobic','Double Anaerobic','Wet-Hulled','Semi-Washed','Other'];
export const ROAST_LEVELS       = ['Very-Light','Light','Moderately-Light','Light-Medium','Medium','Medium-Dark','Dark','Very Dark'];

export const INITIAL_FEATURES = {
  date:true,beans:true,variety:true,processing:true,roastLevel:true,
  method:true,grinder:true,grindSetting:true,
  groundCoffeeWeight:true,waterTemp:true,waterIn:true,brewTime:true,
  daysPast:true,flavorTags:true,notes:true,brewingRecipe:true,extra:true,
};

export const EMPTY_FORM = {
  beans:'',variety:'',processing:'',roastLevel:'',
  method:'',grinder:'',waterTemp:'',grindSetting:'',
  groundCoffeeWeight:'',waterIn:'',notes:'',brewingRecipe:'',extra:'',
  brewTime:'',daysPast:'',flavorTags:[],
  date: new Date().toISOString().split('T')[0],
};

export const EMPTY_REGION_SEL = { countryId:'',regionId:'',subregionId:'',townId:'' };

// ── Modal styles — mobile-first ───────────────────────────────────────────────

export const ms = {
  // Full-screen sheet on mobile, centered modal on desktop
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(20,10,4,0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',          // sheet slides up from bottom on mobile
    justifyContent: 'center',
    overflowY: 'auto',
  },
  modal: {
    background: '#FFFDF9',
    borderRadius: '16px 16px 0 0',    // rounded top on mobile (sheet style)
    width: '100%',
    maxWidth: '650px',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    animation: 'slideUp 0.25s ease',
    // On desktop (≥769px), override to centered modal via inline media query below
    maxHeight: '92dvh',
    maxHeight: '92vh',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #EFEBE9',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '10px' },
  title:       { fontSize: '16px', fontWeight: '700', color: '#F5E6D3', letterSpacing: '0.2px' },
  closeBtn:    { background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px', color: '#D4A574', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  errorBox:    { background: '#FFF3E0', border: '1px solid #FFCC80', borderRadius: 0, padding: '10px 20px', fontSize: '13px', color: '#E65100', fontWeight: '500' },

  sectionDivider: {
    fontSize: '10px', fontWeight: '800', color: '#8D6E63',
    textTransform: 'uppercase', letterSpacing: '1.4px',
    borderLeft: '3px solid #D4A574', paddingLeft: '8px',
    marginTop: '6px', marginBottom: '2px',
  },

  // Grid: 1 column on mobile, 2–3 cols on desktop
  grid:      { display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '16px 20px' },
  fieldFull:  { width: '100%' },
  // On mobile, half/third fields go full-width
  fieldHalf:  { width: '100%' },
  fieldThird: { width: '100%', marginBottom: '2px' },

  label:    { display: 'block', fontSize: '11px', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' },
  required: { color: '#BF360C' },

  input: {
    width: '100%', padding: '11px 12px',
    border: '1px solid #D7CCC8', borderRadius: '8px',
    fontSize: '16px',  // 16px prevents iOS auto-zoom
    color: '#2C1810', background: '#FDF8F4',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    minHeight: '44px',
  },

  select: {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238D6E63' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    paddingRight: '36px', cursor: 'pointer',
  },

  textarea: { resize: 'vertical', minHeight: '80px', lineHeight: '1.5' },

  actions:    { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #EFEBE9', background: '#FAF7F4', position: 'sticky', bottom: 0 },
  cancelBtn:  { padding: '11px 18px', background: 'transparent', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#8D6E63', cursor: 'pointer', minHeight: '44px' },

  submitBtn: {
    padding: '11px 22px', flex: 1, maxWidth: '200px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(93,64,55,0.3)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    minHeight: '44px',
  },
  submitBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 18px rgba(93,64,55,0.4)',
  },

  toggleTrack: (active) => ({
    display: 'inline-flex', alignItems: 'center',
    width: '40px', height: '24px', borderRadius: '12px',
    background: active ? '#5D4037' : '#D7CCC8',
    border: 'none', cursor: 'pointer', padding: '3px',
    transition: 'background 0.2s ease', flexShrink: 0,
    boxShadow: active ? 'inset 0 1px 3px rgba(0,0,0,0.25)' : 'inset 0 1px 2px rgba(0,0,0,0.12)',
  }),
  toggleThumb: (active) => ({
    width: '18px', height: '18px', borderRadius: '50%',
    background: 'white',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    transition: 'transform 0.2s ease',
    transform: active ? 'translateX(16px)' : 'translateX(0)',
    flexShrink: 0,
  }),

  deactivateIcon: { background: 'none', border: 'none', color: '#D7CCC8', cursor: 'pointer', fontSize: '10px', padding: '2px 5px', borderRadius: '4px' },
};

// Desktop overrides injected via <style> tag in components that use AddBrewModal
export const desktopModalCSS = `
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (min-width: 769px) {
  /* Override sheet style with centered modal */
  .brew-modal-backdrop {
    align-items: center !important;
    padding: 40px 16px !important;
  }
  .brew-modal-panel {
    border-radius: 12px !important;
    animation-name: slideDown !important;
    margin-bottom: 40px;
  }
  /* Half/third fields on desktop */
  .field-half  { width: calc(50%  - 6px) !important; }
  .field-third { width: calc(33.33% - 8px) !important; }
}
`;