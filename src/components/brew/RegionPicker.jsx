import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ms } from '../shared/utils';

// ─── RegionPicker ─────────────────────────────────────────────────────────────
//
// Fully level-agnostic cascading picker for the `newcoffeeregions` collection.
//
// The hierarchy is driven entirely by parentId — level names are irrelevant.
// Root docs (parentId == null) are the first column. For each selected doc,
// the next column shows its children. If a selected doc has no children, the
// chain stops there. This means Guatemala → El Progresso → La Bella works
// just as well as Ethiopia → Sidama → Bensa → Odako without any config.
//
// Props:
//   allRegionDocs  – flat array of docs from newcoffeeregions (passed in from parent)
//   value          – array of selected doc IDs, from root to leaf, e.g. ['C001','R003','F002']
//   onChange       – (newValueArray) => void
//   onDocsUpdate   – optional (newDocs) => void — called when a new doc is added,
//                    so parent can update allRegionDocs in state
//
// The selected path is value[0]=country, value[1]=region/whatever, etc.
// The "regionRef" to store on a brew is value[value.length - 1] (deepest selection).

export default function RegionPicker({ allRegionDocs, value = [], onChange, onDocsUpdate }) {
  // Build a quick children map: parentId -> [child docs]
  const childrenOf = React.useMemo(() => {
    const map = {};
    allRegionDocs.forEach(doc => {
      const pid = doc.parentId || '__root__';
      if (!map[pid]) map[pid] = [];
      map[pid].push(doc);
    });
    // Sort each group alphabetically by name
    Object.values(map).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [allRegionDocs]);

  const byId = React.useMemo(() => {
    const map = {};
    allRegionDocs.forEach(d => { map[d.id] = d; });
    return map;
  }, [allRegionDocs]);

  // Build the label for a level based on the doc's `level` field,
  // falling back to a generic "Location" label if not set.
  const levelLabel = (doc) => {
    if (!doc) return 'Location';
    if (doc.level) return doc.level.charAt(0).toUpperCase() + doc.level.slice(1);
    return 'Location';
  };

  // Columns to render:
  // Column 0: children of root (__root__)
  // Column 1: children of value[0]
  // Column N: children of value[N-1]
  // We show column N only if column N-1 has a selection AND that selection has children.
  const columns = React.useMemo(() => {
    const cols = [];

    // Column 0 is always roots
    const roots = childrenOf['__root__'] || [];
    if (roots.length === 0) return cols; // nothing loaded yet
    cols.push({ parentId: null, docs: roots, selectedId: value[0] || '' });

    // Walk down the selected path
    for (let i = 0; i < value.length; i++) {
      const selectedId = value[i];
      if (!selectedId) break;
      const children = childrenOf[selectedId] || [];
      // Always show the next column if there are children, OR if the user
      // hasn't selected anything yet at this depth (so they can choose or add)
      cols.push({
        parentId: selectedId,
        docs: children,
        selectedId: value[i + 1] || '',
        parentDoc: byId[selectedId],
      });
    }

    return cols;
  }, [childrenOf, byId, value]);

  // Handle selection at a given column index
  const handleSelect = (colIndex, docId) => {
    if (docId === '__add__') return; // handled separately
    // Truncate value to colIndex and append new selection
    const newValue = [...value.slice(0, colIndex), docId].filter(Boolean);
    onChange(newValue);
  };

  // Handle adding a new doc at a given column
  const handleAddNew = async (colIndex, parentId, name, nameLocal) => {
    // Infer the level name from the parent doc's level, or use a generic fallback
    const parentDoc = parentId ? byId[parentId] : null;
    const levelOrder = ['country', 'region', 'subregion', 'town'];
    let newLevel = 'location';
    if (parentDoc?.level) {
      const parentIdx = levelOrder.indexOf(parentDoc.level);
      newLevel = parentIdx >= 0 && parentIdx < levelOrder.length - 1
        ? levelOrder[parentIdx + 1]
        : 'location';
    } else if (!parentDoc) {
      newLevel = 'country';
    }

    const data = {
      name: name.trim(),
      nameLocal: nameLocal.trim() || null,
      level: newLevel,
      parentId: parentId || null,
      coordinate: null,
      createdAt: serverTimestamp(),
    };
    const ref    = await addDoc(collection(db, 'newcoffeeregions'), data);
    const newDoc = { id: ref.id, ...data, createdAt: null };

    // Notify parent so it can update its allRegionDocs state
    if (onDocsUpdate) onDocsUpdate(newDoc);

    // Auto-select the newly added doc
    const newValue = [...value.slice(0, colIndex), ref.id].filter(Boolean);
    onChange(newValue);
  };

  // Build breadcrumb display path
  const displayPath = value
    .filter(Boolean)
    .map(id => byId[id]?.name)
    .filter(Boolean)
    .join(' › ');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {columns.map((col, i) => (
          <RegionLevelDropdown
            key={col.parentId || '__root__'}
            label={col.parentDoc ? levelLabel(col.docs[0]) : 'Country'}
            docs={col.docs}
            selectedId={col.selectedId}
            parentName={col.parentDoc?.name}
            required={i === 0}
            onSelect={(docId) => handleSelect(i, docId)}
            onAddNew={(name, local) => handleAddNew(i, col.parentId, name, local)}
          />
        ))}
      </div>

      {displayPath && (
        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#FFF3E0', borderRadius: '6px', fontSize: '11px', color: '#8D6E63', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📍 {displayPath}
        </div>
      )}
    </div>
  );
}

// ─── Single level dropdown with inline "Add new" form ────────────────────────

function RegionLevelDropdown({ label, docs, selectedId, onSelect, onAddNew, parentName, required = false }) {
  const [adding, setAdding]     = useState(false);
  const [newName, setNewName]   = useState('');
  const [newLocal, setNewLocal] = useState('');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const handleSave = async () => {
    if (!newName.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try {
      await onAddNew(newName.trim(), newLocal.trim());
      setNewName(''); setNewLocal(''); setAdding(false);
    } catch (e) {
      setErr('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: '1 1 150px', minWidth: 0 }}>
      <label style={ms.label}>
        {label}{required && <span style={ms.required}> *</span>}
      </label>

      {!adding ? (
        <select
          style={{ ...ms.input, background: '#FAFAFA' }}
          value={selectedId || ''}
          onChange={e => {
            if (e.target.value === '__add__') setAdding(true);
            else onSelect(e.target.value);
          }}
          required={required}
        >
          <option value="">Select {label.toLowerCase()}…</option>
          {docs.map(d => (
            <option key={d.id} value={d.id}>
              {d.name}{d.nameLocal ? ` (${d.nameLocal})` : ''}
            </option>
          ))}
          <option value="__add__">＋ Add new {label.toLowerCase()}…</option>
        </select>
      ) : (
        <div style={{ border: '1px solid #D4A574', borderRadius: '8px', padding: '10px', background: '#FFFBF5' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            New {label}{parentName ? ` in ${parentName}` : ''}
          </div>
          {err && <div style={{ fontSize: '11px', color: '#BF360C', marginBottom: '6px' }}>{err}</div>}
          <input
            style={{ ...ms.input, marginBottom: '6px', fontSize: '12px', padding: '7px 10px' }}
            placeholder="Name (English)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
          />
          <input
            style={{ ...ms.input, marginBottom: '8px', fontSize: '12px', padding: '7px 10px' }}
            placeholder="Local name — optional (한국어 etc.)"
            value={newLocal}
            onChange={e => setNewLocal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button" onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#5D4037 0%,#2C1810 100%)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setNewLocal(''); setErr(''); }}
              style={{ padding: '7px 12px', background: 'none', border: '1px solid #D7CCC8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#8D6E63' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}