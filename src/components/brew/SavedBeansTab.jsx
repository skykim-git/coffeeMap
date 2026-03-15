import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const EditIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SearchIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────

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
    color: '#A1887F', display: 'flex', alignItems: 'center',
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

  // ── Card ──
  card: {
    background: '#fff', borderRadius: '14px',
    border: '1.5px solid #EDE0D4', padding: '0',
    cursor: 'pointer', overflow: 'hidden',
    transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
    display: 'flex', flexDirection: 'column',
    userSelect: 'none',
  },
  cardHover: {
    boxShadow: '0 4px 18px rgba(93,64,55,0.13)',
    borderColor: '#A1887F', transform: 'translateY(-2px)',
  },

  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '14px 16px 12px',
    borderBottom: '1px solid #F0EAE5',
  },
  cardHeaderLeft: { flex: 1, minWidth: 0, marginRight: '8px' },
  cardLabel: {
    fontSize: '14px', fontWeight: 700, color: '#3E2723', lineHeight: 1.3,
  },
  cardBeans: {
    fontSize: '11px', color: '#A1887F', fontWeight: 500, marginTop: '1px',
  },

  iconGroup: { display: 'flex', gap: '2px', flexShrink: 0 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#BCAAA4', padding: '4px', borderRadius: '5px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s, background 0.15s',
  },
  iconBtnDanger: {
    color: '#C62828', background: '#FFEBEE',
  },

  // ── Info grid ──
  infoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    padding: '10px 16px 14px', gap: '8px 12px',
  },
  infoCell: {},
  infoKey: {
    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#BCAAA4', marginBottom: '1px',
  },
  infoVal: {
    fontSize: '12px', color: '#6D4C41',
  },

  // ── Empty / loading ──
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function SavedBeansTab({ onSelectBean }) {
  const [beans, setBeans]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [hoveredId, setHoveredId]       = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const [editingBean, setEditingBean]   = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [editSaving, setEditSaving]     = useState(false);
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
      {/* ── Page header ── */}
      <div style={st.pageHeader}>
        <div>
          <div style={st.pageHeaderTitle}>Saved Beans</div>
          <div style={st.pageHeaderSub}>
            {loading ? 'Loading…' : `${beans.length} saved preset${beans.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={st.body}>
        {loading ? (
          <div style={st.loading}>Loading saved beans…</div>
        ) : (
          <>
            {/* Search */}
            <div style={st.searchWrap}>
              <span style={st.searchIconWrap}>
                <SearchIcon size={15} />
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

            {/* Cards */}
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
                  const isConfirm = confirmDeleteId === bean.id;

                  return (
                    <div
                      key={bean.id}
                      style={{ ...st.card, ...(isHovered ? st.cardHover : {}) }}
                      onClick={() => { setConfirmDeleteId(null); onSelectBean(bean); }}
                      onMouseEnter={() => setHoveredId(bean.id)}
                      onMouseLeave={() => { setHoveredId(null); setConfirmDeleteId(null); }}
                    >
                      {/* Header row */}
                      <div style={st.cardHeader}>
                        <div style={st.cardHeaderLeft}>
                          <div style={st.cardLabel}>{bean.label}</div>
                          {bean.beans && bean.beans !== bean.label && (
                            <div style={st.cardBeans}>{bean.beans}</div>
                          )}
                        </div>
                        <div style={st.iconGroup} onClick={e => e.stopPropagation()}>
                          <button
                            style={st.iconBtn}
                            onClick={(e) => openEdit(e, bean)}
                            title="Edit preset"
                          >
                            <EditIcon size={15} />
                          </button>
                          <button
                            style={{ ...st.iconBtn, ...(isConfirm ? st.iconBtnDanger : {}) }}
                            onClick={(e) => handleDelete(e, bean.id)}
                            title={isConfirm ? 'Click again to confirm' : 'Delete preset'}
                          >
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div style={st.infoGrid}>
                        {bean.regionPath && (
                          <div style={st.infoCell}>
                            <div style={st.infoKey}>Origin</div>
                            <div style={{ ...st.infoVal, color: '#185FA5' }}>{bean.regionPath}</div>
                          </div>
                        )}
                        {bean.processing && (
                          <div style={st.infoCell}>
                            <div style={st.infoKey}>Process</div>
                            <div style={st.infoVal}>{bean.processing}</div>
                          </div>
                        )}
                        {bean.variety && (
                          <div style={st.infoCell}>
                            <div style={st.infoKey}>Variety</div>
                            <div style={st.infoVal}>{bean.variety}</div>
                          </div>
                        )}
                        {bean.roastLevel && (
                          <div style={st.infoCell}>
                            <div style={st.infoKey}>Roast</div>
                            <div style={st.infoVal}>{bean.roastLevel}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingBean && (
        <div style={st.modalBackdrop} onClick={e => e.target === e.currentTarget && setEditingBean(null)}>
          <div style={st.modalBox}>
            <div style={st.modalHeader}>
              <span style={st.modalTitle}>Edit Bean Preset</span>
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