import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

const s = {
  panel: {
    background: '#FFF8F5',
    border: '1px solid #D7CCC8',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '4px',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  tab: (active) => ({
    padding: '6px 14px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    background: active ? '#6D4C41' : '#EFE9E4',
    color: active ? '#fff' : '#6D4C41',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  card: (selected) => ({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${selected ? '#6D4C41' : '#D7CCC8'}`,
    background: selected ? '#F3EBE7' : '#fff',
    cursor: 'pointer',
    marginBottom: '6px',
    transition: 'all 0.15s',
    gap: '8px',
  }),
  cardName: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#3E2723',
    marginBottom: '2px',
  },
  cardMeta: {
    fontSize: '11px',
    color: '#8D6E63',
    marginTop: '1px',
  },
  locationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    background: '#EDE7F6',
    color: '#512DA8',
    borderRadius: '10px',
    padding: '2px 8px',
    marginTop: '4px',
    fontWeight: 500,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#BCAAA4',
    fontSize: '15px',
    padding: '0 4px',
    flexShrink: 0,
    lineHeight: 1,
  },
  empty: {
    textAlign: 'center',
    color: '#BCAAA4',
    fontSize: '13px',
    padding: '18px 0',
    lineHeight: 1.6,
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#5D4037',
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '7px',
    border: '1px solid #D7CCC8',
    fontSize: '13px',
    marginBottom: '8px',
    boxSizing: 'border-box',
    background: '#fff',
  },
  saveBtn: (enabled) => ({
    width: '100%',
    padding: '9px',
    background: enabled ? '#5D4037' : '#D7CCC8',
    color: enabled ? '#fff' : '#BCAAA4',
    border: 'none',
    borderRadius: '8px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '13px',
    fontWeight: 600,
  }),
  snapshotRow: {
    fontSize: '11px',
    color: '#8D6E63',
    background: '#F5F0ED',
    borderRadius: '6px',
    padding: '7px 10px',
    marginBottom: '10px',
    lineHeight: 1.6,
  },
  hint: {
    fontSize: '11px',
    color: '#8D6E63',
    margin: '0 0 10px',
    lineHeight: 1.5,
  },
};

const BEAN_FIELDS = ['beans', 'variety', 'processing', 'roastLevel', 'roastingDate', 'grinder', 'grindSetting'];

// onApply(formPatch, regionDisplayPath | null, regionPathIds | null)
export default function SavedBeansPicker({ form, regionPath, regionDisplayPath, onApply }) {
  const [tab, setTab]                 = useState('select');
  const [savedBeans, setSavedBeans]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState(null);
  const [saveName, setSaveName]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'savedBeans'));
        const beans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        beans.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSavedBeans(beans);
      } catch (err) {
        console.error('Failed to fetch saved beans', err);
      }
      setLoading(false);
    })();
  }, []);

  const handleApply = (bean) => {
    setSelectedId(bean.id);
    const patch = {};
    BEAN_FIELDS.forEach(f => { patch[f] = bean[f] ?? ''; });
    onApply(patch, bean.regionPath ?? null, bean.regionPathIds ?? null);
  };

  const handleDelete = async (e, beanId) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'savedBeans', beanId));
    setSavedBeans(prev => prev.filter(b => b.id !== beanId));
    if (selectedId === beanId) setSelectedId(null);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      const data = { label: form.beans?.trim() || 'Unnamed Bean', createdAt: serverTimestamp() };
      BEAN_FIELDS.forEach(f => { data[f] = form[f] ?? null; });
      if (regionDisplayPath) data.regionPath    = regionDisplayPath;
      if (regionPath?.length) data.regionPathIds = regionPath;
      const ref = await addDoc(collection(db, 'users', user.uid, 'savedBeans'), data);
      setSavedBeans(prev => [{ id: ref.id, ...data }, ...prev]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save bean', err);
    }
    setSaving(false);
  };

  const metaLine    = (b) => [b.variety, b.processing, b.roastLevel].filter(Boolean).join(' · ') || null;
  const grinderLine = (b) => [b.grinder, b.grindSetting].filter(Boolean).join(' @ ') || null;
  const currentSnapshot = BEAN_FIELDS.map(f => form[f]).filter(Boolean).join(', ');

  return (
    <div style={s.panel}>
      <div style={s.tabRow}>
        <button type="button" style={s.tab(tab === 'select')} onClick={() => setTab('select')}>
          ☕ Select Saved Bean
        </button>
        <button type="button" style={s.tab(tab === 'save')} onClick={() => setTab('save')}>
          + Save Current Bean
        </button>
      </div>

      {tab === 'select' && (
        loading ? (
          <div style={s.empty}>Loading saved beans…</div>
        ) : savedBeans.length === 0 ? (
          <div style={s.empty}>
            No saved beans yet.<br />
            <span style={{ fontSize: '11px' }}>Fill in the bean fields, then switch to "Save Current Bean".</span>
          </div>
        ) : savedBeans.map(bean => (
          <div key={bean.id} style={s.card(selectedId === bean.id)} onClick={() => handleApply(bean)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.cardName}>{bean.label}</div>
              {bean.beans && bean.beans !== bean.label && <div style={s.cardMeta}>{bean.beans}</div>}
              {metaLine(bean)    && <div style={s.cardMeta}>{metaLine(bean)}</div>}
              {grinderLine(bean) && <div style={s.cardMeta}>🫙 {grinderLine(bean)}</div>}
              {bean.regionPath   && <div style={s.locationBadge}>📍 {bean.regionPath}</div>}
            </div>
            <button type="button" style={s.deleteBtn} onClick={(e) => handleDelete(e, bean.id)} title="Delete preset">🗑</button>
          </div>
        ))
      )}

      {tab === 'save' && (
        <div>
          {currentSnapshot ? (
            <div style={s.snapshotRow}>
              <strong>Will save:</strong> {currentSnapshot}
              {regionDisplayPath && <><br />📍 {regionDisplayPath}</>}
            </div>
          ) : (
            <p style={s.hint}>Fill in the bean fields below first, then come back to save as a preset.</p>
          )}
          <button
            type="button"
            style={s.saveBtn(!saveName.trim() && !saving)}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : saveSuccess ? '✓ Saved!' : '+ Save Bean Preset'}
          </button>
        </div>
      )}
    </div>
  );
}