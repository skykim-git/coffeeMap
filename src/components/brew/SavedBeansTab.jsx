import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const st = {
  root: {
    height: '100%', display: 'flex', flexDirection: 'column',
    background: '#FAF7F4', fontFamily: 'sans-serif', overflow: 'hidden',
  },
  pageHeader: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
  },
  pageHeaderTitle: { fontSize: '16px', fontWeight: 700, color: '#F5E6D3' },
  pageHeaderSub:   { fontSize: '11px', color: 'rgba(245,230,211,0.5)' },
  body: { padding: '24px', overflowY: 'auto', flex: 1 },
  searchWrap: { position: 'relative', marginBottom: '10px' },
  searchIcon: {
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', padding: '10px 14px 10px 36px',
    borderRadius: '10px', border: '1.5px solid #D7CCC8',
    fontSize: '14px', color: '#3E2723', background: '#FAFAFA',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  resultCount: {
    display: 'flex', justifyContent: 'flex-end',
    fontSize: '13px', color: '#8D6E63', fontWeight: 500,
    marginBottom: '16px', marginTop: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '14px',
  },
  card: {
    background: '#fff', borderRadius: '14px',
    border: '1.5px solid #EDE0D4', padding: '16px 18px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
    display: 'flex', flexDirection: 'column', gap: '6px',
    position: 'relative', userSelect: 'none',
  },
  cardHover: {
    boxShadow: '0 4px 18px rgba(93,64,55,0.13)',
    borderColor: '#A1887F', transform: 'translateY(-2px)',
  },
  cardLabel: {
    fontSize: '15px', fontWeight: 700, color: '#3E2723',
    lineHeight: 1.3,
  },
  cardBeans: {
    fontSize: '12px', color: '#A1887F', fontWeight: 500,
  },
  cardOrigin: { fontSize: '12px', color: '#8D6E63', fontWeight: 500 },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' },
  tag: {
    fontSize: '11px', fontWeight: 600, padding: '3px 9px',
    borderRadius: '20px', background: '#EFE9E4', color: '#6D4C41',
  },
  arrow: {
    marginTop: 'auto', paddingTop: '10px',
    fontSize: '12px', color: '#BCAAA4', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  empty: {
    textAlign: 'center', color: '#BCAAA4',
    fontSize: '15px', marginTop: '60px', lineHeight: 1.8,
  },
  loading: {
    textAlign: 'center', color: '#BCAAA4',
    fontSize: '14px', marginTop: '60px',
  },
};

export default function SavedBeansTab({ onSelectBean }) {
  const [beans, setBeans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBeans([]); setLoading(false); return; }
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users', user.uid, 'savedBeans'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort newest first (same as SavedBeansPicker)
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBeans(list);
      } catch (err) {
        console.error('SavedBeansTab: failed to fetch savedBeans', err);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return beans;
    const q = search.toLowerCase();
    return beans.filter(b =>
      (b.label      || '').toLowerCase().includes(q) ||
      (b.beans      || '').toLowerCase().includes(q) ||
      (b.regionPath || '').toLowerCase().includes(q) ||
      (b.variety    || '').toLowerCase().includes(q) ||
      (b.processing || '').toLowerCase().includes(q)
    );
  }, [beans, search]);

  return (
    <div style={st.root}>
      <div style={st.pageHeader}>
        <span style={{ fontSize: '20px' }}>☕</span>
        <div>
          <div style={st.pageHeaderTitle}>Saved Beans</div>
          <div style={st.pageHeaderSub}>
            {loading ? 'Loading…' : `${beans.length} saved preset${beans.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      <div style={st.body}>
        {loading ? (
          <div style={st.loading}>Loading saved beans…</div>
        ) : (
          <>
            <div style={st.searchWrap}>
              <span style={st.searchIcon}>🔍</span>
              <input
                style={st.searchInput}
                placeholder="Search by name, origin, variety…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#A1887F')}
                onBlur={e => (e.target.style.borderColor = '#D7CCC8')}
              />
            </div>

            <div style={st.resultCount}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>

            {filtered.length === 0 ? (
              <div style={st.empty}>
                {beans.length === 0
                  ? <>No saved beans yet.<br />Open a brew and use <strong>"Save Current Bean"</strong> to create a preset.</>
                  : 'No beans match your search.'
                }
              </div>
            ) : (
              <div style={st.grid}>
                {filtered.map(bean => {
                  const isHovered = hoveredId === bean.id;
                  const metaItems = [bean.variety, bean.processing, bean.roastLevel, bean.roastingDate].filter(Boolean);
                  const grinderLine = [bean.grinder, bean.grindSetting].filter(Boolean).join(' @ ');

                  return (
                    <div
                      key={bean.id}
                      style={{ ...st.card, ...(isHovered ? st.cardHover : {}) }}
                      onClick={() => onSelectBean(bean)}
                      onMouseEnter={() => setHoveredId(bean.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Preset label — the name given in SavedBeansPicker */}
                      <div style={st.cardLabel}>{bean.label}</div>

                      {/* Roaster/bean name if different from label */}
                      {bean.beans && bean.beans !== bean.label && (
                        <div style={st.cardBeans}>{bean.beans}</div>
                      )}

                      {bean.regionPath && (
                        <div style={st.cardOrigin}>📍 {bean.regionPath}</div>
                      )}

                      {metaItems.length > 0 && (
                        <div style={st.cardMeta}>
                          {metaItems.map(m => (
                            <span key={m} style={st.tag}>{m}</span>
                          ))}
                        </div>
                      )}

                      {grinderLine && (
                        <div style={{ fontSize: '11px', color: '#A1887F', marginTop: '2px' }}>
                          🫙 {grinderLine}
                        </div>
                      )}

                      <div style={st.arrow}>View brews →</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}