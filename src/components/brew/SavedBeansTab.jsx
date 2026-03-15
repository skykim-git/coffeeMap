import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconCup = ({ color = '#F5E6D3', size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="4"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
);

const IconSearch = ({ color = '#8D6E63', size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" width={size} height={size}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconEdit = ({ color = '#8D6E63', size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = ({ color = '#BCAAA4', size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconPin = ({ color = '#7C55C4', size = 12 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconGrinder = ({ color = '#A1887F', size = 12 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M9 3h6l3 7H6L9 3z"/>
    <path d="M6 10l-2 8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-2-8"/>
    <path d="M12 10v9"/>
  </svg>
);

const IconWarning = ({ color = '#C62828', size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────

const EDIT_FIELDS = [
  ['label',        'Preset Name'],
  ['beans',        'Bean / Roaster'],
  ['variety',      'Variety'],
  ['processing',   'Processing'],
  ['roastLevel',   'Roast Level'],
  ['roastingDate', 'Roasting Date'],
  ['grinder',      'Grinder'],
  ['grindSetting', 'Grind Setting'],
];

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  searchIconWrap: {
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
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
    transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
    display: 'flex', flexDirection: 'column', gap: '6px',
    position: 'relative', userSelect: 'none',
  },
  cardHover: {
    boxShadow: '0 4px 18px rgba(93,64,55,0.13)',
    borderColor: '#A1887F', transform: 'translateY(-2px)',
  },
  cardLabel: {
    fontSize: '15px', fontWeight: 700, color: '#3E2723',
    lineHeight: 1.3, paddingRight: '60px',
  },
  cardBeans: {
    fontSize: '12px', color: '#A1887F', fontWeight: 500,
  },
  cardOrigin: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '12px', color: '#7C55C4', fontWeight: 500,
  },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' },
  tag: {
    fontSize: '11px', fontWeight: 600, padding: '3px 9px',
    borderRadius: '20px', background: '#EFE9E4', color: '#6D4C41',
  },
  cardGrinder: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', color: '#A1887F', marginTop: '2px',
  },
  cardIconBtns: {
    position: 'absolute', top: '12px', right: '12px',
    display: 'flex', gap: '4px',
  },
  cardIconBtn: (variant) => ({
    width: '26px', height: '26px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    background: variant === 'danger' ? '#FFEBEE' : '#F0EAE5',
    color:      variant === 'danger' ? '#C62828' : '#8D6E63',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  }),
  empty: {
    textAlign: 'center', color: '#BCAAA4',
    fontSize: '15px', marginTop: '60px', lineHeight: 1.8,
  },
  loading: {
    textAlign: 'center', color: '#BCAAA4',
    fontSize: '14px', marginTop: '60px',
  },

  // ── Edit modal ──
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(20,10,4,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '16px',
  },
  modalBox: {
    background: '#FFFDF9', borderRadius: '12px', width: '100%',
    maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    flexShrink: 0,
  },
  modalHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  modalTitle: { fontSize: '14px', fontWeight: 700, color: '#F5E6D3' },
  modalCloseBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', cursor: 'pointer', color: '#F5E6D3',
    fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalBody: {
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
    overflowY: 'auto', flex: 1,
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
    padding: '14px 20px', borderTop: '1px solid #EFEBE9', background: '#FAF7F4',
    flexShrink: 0,
  },
  fieldLabel: {
    fontSize: '11px', fontWeight: 700, color: '#8D6E63',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: '4px', display: 'block',
  },
  fieldInput: {
    width: '100%', padding: '8px 10px', border: '1px solid #D7CCC8',
    borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box',
    background: '#fff', outline: 'none',
  },
  cancelBtn: {
    padding: '8px 16px', background: 'transparent', border: 'none',
    color: '#8D6E63', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
  },
  saveBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #5D4037, #2C1810)',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontWeight: 700, cursor: 'pointer', fontSize: '13px',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SavedBeansTab({ onSelectBean }) {
  const [beans, setBeans]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [hoveredId, setHoveredId]           = useState(null);
  const [searchFocused, setSearchFocused]   = useState(false);
  const [editingBean, setEditingBean]       = useState(null);
  const [editForm, setEditForm]             = useState({});
  const [editSaving, setEditSaving]         = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBeans([]); setLoading(false); return; }
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users', user.uid, 'savedBeans'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  const openEdit = (e, bean) => {
    e.stopPropagation();
    setEditForm({
      label:        bean.label        ?? '',
      beans:        bean.beans        ?? '',
      variety:      bean.variety      ?? '',
      processing:   bean.processing   ?? '',
      roastLevel:   bean.roastLevel   ?? '',
      roastingDate: bean.roastingDate ?? '',
      grinder:      bean.grinder      ?? '',
      grindSetting: bean.grindSetting ?? '',
    });
    setEditingBean(bean);
  };

  const handleEditSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingBean) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'savedBeans', editingBean.id), editForm);
      setBeans(prev => prev.map(b => b.id === editingBean.id ? { ...b, ...editForm } : b));
      setEditingBean(null);
    } catch (err) {
      console.error('Failed to update bean', err);
    }
    setEditSaving(false);
  };

  const handleDelete = async (e, beanId) => {
    e.stopPropagation();
    if (confirmDeleteId !== beanId) {
      setConfirmDeleteId(beanId);
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedBeans', beanId));
      setBeans(prev => prev.filter(b => b.id !== beanId));
    } catch (err) {
      console.error('Failed to delete bean', err);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div style={st.root}>
      {/* Header */}
      <div style={st.pageHeader}>
        <IconCup color="#F5E6D3" size={20} />
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
            {/* Search */}
            <div style={st.searchWrap}>
              <span style={st.searchIconWrap}>
                <IconSearch color="#8D6E63" size={16} />
              </span>
              <input
                style={{
                  ...st.searchInput,
                  border: searchFocused ? '1.5px solid #A1887F' : '1.5px solid #D7CCC8',
                }}
                placeholder="Search by name, origin, variety…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
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
                  const isHovered   = hoveredId === bean.id;
                  const isConfirm   = confirmDeleteId === bean.id;
                  const metaItems   = [bean.variety, bean.processing, bean.roastLevel].filter(Boolean);
                  const grinderLine = [bean.grinder, bean.grindSetting].filter(Boolean).join(' @ ');

                  return (
                    <div
                      key={bean.id}
                      style={{ ...st.card, ...(isHovered ? st.cardHover : {}) }}
                      onClick={() => { setConfirmDeleteId(null); onSelectBean(bean); }}
                      onMouseEnter={() => setHoveredId(bean.id)}
                      onMouseLeave={() => { setHoveredId(null); setConfirmDeleteId(null); }}
                    >
                      {/* Top-right icon buttons */}
                      <div style={st.cardIconBtns} onClick={e => e.stopPropagation()}>
                        <button
                          style={st.cardIconBtn('default')}
                          onClick={(e) => openEdit(e, bean)}
                          title="Edit preset"
                        >
                          <IconEdit color="#8D6E63" size={13} />
                        </button>
                        <button
                          style={st.cardIconBtn(isConfirm ? 'danger' : 'default')}
                          onClick={(e) => handleDelete(e, bean.id)}
                          title={isConfirm ? 'Confirm delete' : 'Delete preset'}
                        >
                          {isConfirm
                            ? <IconWarning color="#C62828" size={13} />
                            : <IconTrash color="#8D6E63" size={13} />
                          }
                        </button>
                      </div>

                      <div style={st.cardLabel}>{bean.label}</div>

                      {bean.beans && bean.beans !== bean.label && (
                        <div style={st.cardBeans}>{bean.beans}</div>
                      )}

                      {bean.regionPath && (
                        <div style={st.cardOrigin}>
                          <IconPin color="#7C55C4" size={12} />
                          {bean.regionPath}
                        </div>
                      )}

                      {metaItems.length > 0 && (
                        <div style={st.cardMeta}>
                          {metaItems.map(m => (
                            <span key={m} style={st.tag}>{m}</span>
                          ))}
                        </div>
                      )}

                      {grinderLine && (
                        <div style={st.cardGrinder}>
                          <IconGrinder color="#A1887F" size={12} />
                          {grinderLine}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingBean && (
        <div style={st.modalBackdrop} onClick={e => e.target === e.currentTarget && setEditingBean(null)}>
          <div style={st.modalBox}>
            <div style={st.modalHeader}>
              <div style={st.modalHeaderLeft}>
                <IconEdit color="#F5E6D3" size={15} />
                <span style={st.modalTitle}>Edit Bean Preset</span>
              </div>
              <button style={st.modalCloseBtn} onClick={() => setEditingBean(null)}>✕</button>
            </div>
            <div style={st.modalBody}>
              {EDIT_FIELDS.map(([field, label]) => (
                <div key={field}>
                  <label style={st.fieldLabel}>{label}</label>
                  <input
                    style={st.fieldInput}
                    value={editForm[field] ?? ''}
                    onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = '#A1887F')}
                    onBlur={e => (e.target.style.borderColor = '#D7CCC8')}
                  />
                </div>
              ))}
            </div>
            <div style={st.modalFooter}>
              <button style={st.cancelBtn} onClick={() => setEditingBean(null)}>Cancel</button>
              <button style={st.saveBtn} onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}