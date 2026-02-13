import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { brewRecords as localBrewRecords } from '../data/brewData';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'date',         label: 'Date',          width: '100px' },
  { key: 'beans',        label: 'Bean / Origin',  width: '190px' },
  { key: 'method',       label: 'Method',         width: '110px' },
  { key: 'waterTemp',    label: 'Temp (°C)',       width: '90px'  },
  { key: 'grindSetting', label: 'Grind',           width: '110px' },
  { key: 'waterIn',      label: 'Water (ml)',      width: '95px'  },
  { key: 'notes',        label: 'Tasting Notes',   width: 'auto'  },
];

const METHOD_COLORS = {
  'V60':          { bg: '#E8F5E9', color: '#2E7D32' },
  'Chemex':       { bg: '#E3F2FD', color: '#1565C0' },
  'AeroPress':    { bg: '#F3E5F5', color: '#6A1B9A' },
  'French Press': { bg: '#FFF8E1', color: '#F57F17' },
  'Espresso':     { bg: '#FFEBEE', color: '#B71C1C' },
  'Moka Pot':     { bg: '#FBE9E7', color: '#BF360C' },
  'Cold Brew':    { bg: '#E0F7FA', color: '#006064' },
  'Siphon':       { bg: '#F9FBE7', color: '#558B2F' },
  'Other':        { bg: '#EFEBE9', color: '#4E342E' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val, fallback = '—') =>
  val === null || val === undefined || val === '' ? fallback : val;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    if (typeof dateStr === 'object' && dateStr.toDate) {
      return dateStr.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    }
    const d = new Date(String(dateStr).includes('T') ? dateStr : dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return String(dateStr); }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const MethodBadge = ({ method }) => {
  if (!method) return <span style={s.dash}>—</span>;
  const palette = METHOD_COLORS[method] || METHOD_COLORS['Other'];
  return (
    <span style={{ ...s.badge, background: palette.bg, color: palette.color }}>
      {method}
    </span>
  );
};

const SortIcon = ({ active, direction }) => (
  <span style={{ marginLeft: '4px', opacity: active ? 1 : 0.3, fontSize: '10px' }}>
    {active ? (direction === 'asc' ? '▲' : '▼') : '⬍'}
  </span>
);

const StatCard = ({ value, label, icon }) => (
  <div style={s.statCard}>
    <div style={s.statIcon}>{icon}</div>
    <div style={s.statValue}>{value}</div>
    <div style={s.statLabel}>{label}</div>
  </div>
);

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteModal = ({ brew, onConfirm, onCancel, deleting }) => (
  <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
    <div style={s.deleteModal}>
      <div style={s.deleteModalIcon}>🗑️</div>
      <div style={s.deleteModalTitle}>Delete this brew?</div>
      <div style={s.deleteModalSub}>
        <strong>{brew.beans}</strong>
        {brew.date ? ` · ${formatDate(brew.date)}` : ''}
        {brew.method ? ` · ${brew.method}` : ''}
      </div>
      <div style={s.deleteModalNote}>This action cannot be undone.</div>
      <div style={s.deleteModalActions}>
        <button style={s.cancelBtn} onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button style={s.deleteConfirmBtn} onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Brew'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

function RawData() {
  const [brews, setBrews]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [currentUid, setCurrentUid]     = useState(null);
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState('date');
  const [sortDir, setSortDir]           = useState('desc');
  const [methodFilter, setMethodFilter] = useState('All');
  const [brewToDelete, setBrewToDelete] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        setError(null);

        let firestoreDocs = [];
        if (user) {
          setCurrentUid(user.uid);
          const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
          firestoreDocs = snapshot.docs.map(d => ({
            id: d.id,
            _source: 'firestore',
            ...d.data(),
          }));
        }

        // Seed from local records; merge in Firestore-only docs on top
        const localKeys = new Set(localBrewRecords.map(b => `${b.beans}__${b.date}`));
        const firestoreOnly = firestoreDocs.filter(
          d => !localKeys.has(`${d.beans}__${d.date}`)
        );
        const merged = [
          ...localBrewRecords.map(b => ({ ...b, _source: 'local' })),
          ...firestoreOnly,
        ];

        merged.sort((a, b) => {
          const da = a.date || a.createdAt?.toDate?.()?.toISOString?.() || '';
          const db_ = b.date || b.createdAt?.toDate?.()?.toISOString?.() || '';
          return db_.localeCompare(da);
        });

        setBrews(merged);
      } catch (err) {
        console.error('Error fetching brews:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!brewToDelete || !currentUid) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'users', currentUid, 'brews', brewToDelete.id));
      setBrews(prev => prev.filter(b => b.id !== brewToDelete.id));
      setBrewToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteError('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (brews.length === 0) return null;
    const methods = brews.map(b => b.method).filter(Boolean);
    const methodFreq = methods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
    const topMethod = Object.entries(methodFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const beans = [...new Set(brews.map(b => b.beans).filter(Boolean))];
    const temps = brews.map(b => b.waterTemp).filter(v => v !== null && v !== undefined && v !== '?');
    const avgTemp = temps.length ? Math.round(temps.reduce((a, b) => a + Number(b), 0) / temps.length) : null;
    return { total: brews.length, uniqueBeans: beans.length, topMethod, avgTemp };
  }, [brews]);

  // ── Filters + sort ───────────────────────────────────────────────────────
  const allMethods = useMemo(() => {
    const set = new Set(brews.map(b => b.method).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [brews]);

  const filtered = useMemo(() => {
    let rows = [...brews];
    if (methodFilter !== 'All') rows = rows.filter(b => b.method === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(b =>
        [b.beans, b.method, b.notes, b.grindSetting].some(v =>
          v && String(v).toLowerCase().includes(q)
        )
      );
    }
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [brews, search, methodFilter, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Loading / error / empty states ───────────────────────────────────────
  if (loading) return (
    <div style={s.centerWrap}>
      <div style={s.spinnerRing} />
      <p style={s.loadingText}>Brewing your data…</p>
    </div>
  );

  if (error) return (
    <div style={s.centerWrap}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
      <p style={{ color: '#BF360C', fontWeight: '600', fontSize: '14px' }}>Failed to load brew data</p>
      <p style={{ color: '#8D6E63', fontSize: '12px', marginTop: '4px' }}>{error}</p>
    </div>
  );

  if (brews.length === 0) return (
    <div style={s.centerWrap}>
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>☕</div>
      <p style={{ color: '#2C1810', fontWeight: '600', fontSize: '15px' }}>No brews recorded yet</p>
      <p style={{ color: '#8D6E63', fontSize: '13px', marginTop: '4px' }}>Add your first brew using the "+ Add Brew" button.</p>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {brewToDelete && (
        <DeleteModal
          brew={brewToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setBrewToDelete(null); setDeleteError(null); }}
          deleting={deleting}
        />
      )}

      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <div>
            <div style={s.headerTitle}>Brew Data</div>
            <div style={s.headerSub}>{brews.length} records in your journal</div>
          </div>
        </div>
      </div>

      {deleteError && (
        <div style={s.errorToast}>
          ⚠️ {deleteError}
          <button style={s.errorToastClose} onClick={() => setDeleteError(null)}>✕</button>
        </div>
      )}

      {stats && (
        <div style={s.statsRow}>
          <StatCard value={stats.total}        label="Total Brews"      icon="☕" />
          <StatCard value={stats.uniqueBeans}  label="Unique Origins"   icon="🌍" />
          <StatCard value={stats.topMethod}    label="Favourite Method" icon="🏆" />
          <StatCard value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} label="Avg. Temp" icon="🌡️" />
        </div>
      )}

      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search beans, notes, grind…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div style={s.filterRow}>
          {allMethods.map(m => (
            <button
              key={m}
              style={{ ...s.filterPill, ...(methodFilter === m ? s.filterPillActive : {}) }}
              onClick={() => setMethodFilter(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={s.resultCount}>
        Showing <strong>{filtered.length}</strong> of <strong>{brews.length}</strong> brews
        {(search || methodFilter !== 'All') && (
          <button style={s.clearFilters} onClick={() => { setSearch(''); setMethodFilter('All'); }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{ ...s.th, width: col.width, minWidth: col.width !== 'auto' ? col.width : undefined }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
              <th style={{ ...s.th, width: '44px', cursor: 'default' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((brew, idx) => (
              <tr
                key={brew.id || `local-${idx}`}
                style={{ ...s.tr, ...(idx % 2 === 0 ? s.trEven : {}) }}
              >
                <td style={s.td}>
                  <span style={s.dateCell}>{formatDate(brew.date)}</span>
                </td>
                <td style={{ ...s.td, ...s.tdBeans }}>
                  {fmt(brew.beans)}
                </td>
                <td style={s.td}>
                  <MethodBadge method={brew.method} />
                </td>
                <td style={{ ...s.td, ...s.tdCenter }}>
                  {brew.waterTemp ? `${brew.waterTemp}°` : <span style={s.dash}>—</span>}
                </td>
                <td style={{ ...s.td, ...s.tdCenter }}>
                  {fmt(brew.grindSetting)}
                </td>
                <td style={{ ...s.td, ...s.tdCenter }}>
                  {brew.waterIn ? `${brew.waterIn}` : <span style={s.dash}>—</span>}
                </td>
                <td style={{ ...s.td, ...s.tdNotes }}>
                  {brew.notes
                    ? <span style={s.noteText}>{brew.notes}</span>
                    : <span style={s.dash}>—</span>
                  }
                </td>
                <td style={{ ...s.td, ...s.tdDelete }}>
                  {brew._source === 'firestore' ? (
                    <button
                      style={s.deleteBtn}
                      onClick={() => setBrewToDelete(brew)}
                      title="Delete this brew"
                    >
                      🗑
                    </button>
                  ) : (
                    <span style={s.localPin} title="Local seed data — edit in brewData.js">📌</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={s.emptyTable}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px' }}>No results found</div>
            <div style={{ color: '#8D6E63', fontSize: '12px', marginTop: '4px' }}>Try adjusting your search or filters</div>
          </div>
        )}
      </div>

      <div style={s.legend}>
        <span style={s.legendItem}><span>📌</span> Local seed data — edit in <code>brewData.js</code></span>
        <span style={s.legendItem}><span>🗑</span> Added via app — deletable</span>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#FAF7F4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px 14px',
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#F5E6D3',
    letterSpacing: '0.2px',
  },
  headerSub: {
    fontSize: '11px',
    color: 'rgba(245,230,211,0.55)',
    marginTop: '1px',
  },
  errorToast: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#FFEBEE',
    borderBottom: '1px solid #FFCDD2',
    padding: '10px 24px',
    fontSize: '13px',
    color: '#B71C1C',
    fontWeight: '500',
  },
  errorToastClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#B71C1C',
    fontSize: '12px',
    padding: '2px 6px',
    fontFamily: 'inherit',
  },
  statsRow: {
    display: 'flex',
    gap: '1px',
    background: '#D7CCC8',
    borderBottom: '1px solid #D7CCC8',
  },
  statCard: {
    flex: 1,
    background: '#FFFDF9',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statIcon:  { fontSize: '16px', marginBottom: '2px' },
  statValue: { fontSize: '20px', fontWeight: '800', color: '#2C1810', lineHeight: 1 },
  statLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
    textAlign: 'center',
  },
  toolbar: {
    padding: '12px 24px 8px',
    background: '#FFFDF9',
    borderBottom: '1px solid #EFEBE9',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    maxWidth: '360px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    fontSize: '13px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 32px',
    border: '1px solid #D7CCC8',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#2C1810',
    background: '#FAF7F4',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8D6E63',
    fontSize: '11px',
    padding: '2px 4px',
    fontFamily: 'inherit',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  filterPill: {
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid #D7CCC8',
    background: 'transparent',
    fontSize: '11px',
    fontWeight: '600',
    color: '#8D6E63',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  filterPillActive: {
    background: 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
    border: '1px solid transparent',
    color: '#F5E6D3',
  },
  resultCount: {
    padding: '7px 24px',
    fontSize: '11px',
    color: '#8D6E63',
    background: '#FAF7F4',
    borderBottom: '1px solid #EFEBE9',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  clearFilters: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#5D4037',
    fontSize: '11px',
    fontWeight: '600',
    padding: 0,
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    minWidth: '740px',
  },
  th: {
    padding: '10px 16px',
    background: '#EFEBE9',
    fontSize: '10px',
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    borderBottom: '2px solid #D7CCC8',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #F3EDEA',
  },
  trEven: {
    background: '#FFFDF9',
  },
  td: {
    padding: '10px 16px',
    fontSize: '13px',
    color: '#2C1810',
    verticalAlign: 'middle',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdBeans: {
    fontWeight: '600',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  tdCenter: {
    textAlign: 'center',
    color: '#4E342E',
  },
  tdNotes: {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  tdDelete: {
    textAlign: 'center',
    padding: '6px 8px',
    width: '44px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '4px 6px',
    borderRadius: '6px',
    opacity: 0.4,
    lineHeight: 1,
  },
  localPin: {
    fontSize: '13px',
    opacity: 0.35,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.2px',
  },
  dateCell: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#5D4037',
    fontVariantNumeric: 'tabular-nums',
  },
  noteText: {
    fontSize: '12px',
    color: '#4E342E',
    fontStyle: 'italic',
  },
  dash: {
    color: '#BCAAA4',
    fontSize: '13px',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    padding: '8px 24px',
    borderTop: '1px solid #EFEBE9',
    background: '#FAF7F4',
    fontSize: '11px',
    color: '#8D6E63',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 10, 4, 0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  deleteModal: {
    background: '#FFFDF9',
    borderRadius: '12px',
    padding: '32px 28px 24px',
    maxWidth: '380px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
  },
  deleteModalIcon:    { fontSize: '2.5rem', marginBottom: '12px' },
  deleteModalTitle:   { fontSize: '18px', fontWeight: '700', color: '#2C1810', marginBottom: '8px' },
  deleteModalSub:     { fontSize: '13px', color: '#5D4037', marginBottom: '6px', lineHeight: '1.5' },
  deleteModalNote:    { fontSize: '12px', color: '#BCAAA4', marginBottom: '24px' },
  deleteModalActions: { display: 'flex', gap: '10px', justifyContent: 'center' },
  cancelBtn: {
    padding: '9px 20px',
    background: 'transparent',
    border: '1px solid #D7CCC8',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#8D6E63',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteConfirmBtn: {
    padding: '9px 20px',
    background: 'linear-gradient(135deg, #C62828 0%, #8B0000 100%)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(198,40,40,0.3)',
    fontFamily: 'inherit',
  },
  centerWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAF7F4',
    padding: '2rem',
    height: '100%',
    textAlign: 'center',
  },
  loadingText: {
    color: '#8D6E63',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '12px',
    fontFamily: 'inherit',
  },
  emptyTable: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  spinnerRing: {
    width: '36px',
    height: '36px',
    border: '3px solid #EFEBE9',
    borderTop: '3px solid #5D4037',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default RawData;