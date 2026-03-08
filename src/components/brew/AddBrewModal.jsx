import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

import {
  BREW_METHODS, PROCESSING_METHODS, ROAST_LEVELS,
  INITIAL_FEATURES, EMPTY_FORM,
  ms, desktopModalCSS,
} from '../shared/utils';
import RegionPicker from './RegionPicker';
import FlavorPicker from './FlavorPicker';
import SavedBeansPicker from './SavedBeansPicker';

// ── iOS-style toggle ──────────────────────────────────────────────────────────
const Toggle = ({ active, onToggle }) => (
  <button type="button" aria-pressed={active} onClick={onToggle} style={ms.toggleTrack(active)}>
    <span style={ms.toggleThumb(active)} />
  </button>
);

// ── Submit button ─────────────────────────────────────────────────────────────
const SubmitButton = ({ submitting }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={submitting}
      style={{ ...ms.submitBtn, ...(hovered && !submitting ? ms.submitBtnHover : {}), opacity: submitting ? 0.7 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {submitting ? 'Saving...' : '+ Save Brew'}
    </button>
  );
};

// ── Custom select ─────────────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, disabled, required, options, placeholder }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      style={{ ...ms.input, ...ms.select, ...(focused ? { borderColor: '#5D4037', boxShadow: '0 0 0 3px rgba(93,64,55,0.12)' } : {}) }}
      value={value} onChange={onChange} disabled={disabled} required={required}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
};

// ── Focus-aware inputs ────────────────────────────────────────────────────────
const FocusInput = ({ type, placeholder, value, onChange, disabled, required, style }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{ ...ms.input, ...(style || {}), ...(focused ? { borderColor: '#5D4037', boxShadow: '0 0 0 3px rgba(93,64,55,0.12)' } : {}) }}
      type={type} placeholder={placeholder} value={value} onChange={onChange}
      disabled={disabled} required={required}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      // Prevents iOS auto-zoom (font-size ≥16px is already in ms.input)
      autoComplete="off"
    />
  );
};

const FocusTextarea = ({ placeholder, value, onChange, disabled }) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{ ...ms.input, ...ms.textarea, ...(focused ? { borderColor: '#5D4037', boxShadow: '0 0 0 3px rgba(93,64,55,0.12)' } : {}) }}
      placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} rows={3}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function AddBrewModal({ onClose, onSubmitted, allRegionDocs, onRegionDocsUpdate }) {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [regionPath, setRegionPath] = useState([]);
  const [localDocs, setLocalDocs]   = useState(allRegionDocs);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [showBeanPicker, setShowBeanPicker] = useState(false);
  const [grinders, setGrinders]     = useState([]);
  const [grindersLoading, setGrindersLoading] = useState(true);

  useEffect(() => { setLocalDocs(allRegionDocs); }, [allRegionDocs]);

  useEffect(() => {
    (async () => {
      setGrindersLoading(true);
      try {
        const snap = await getDocs(collection(db, 'grinders'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setGrinders(list);
      } catch (err) { console.error('Failed to fetch grinders', err); }
      setGrindersLoading(false);
    })();
  }, []);

  const [activeFeatures, setActiveFeatures] = useState(() => {
    const saved = localStorage.getItem('coffee_feature_settings');
    return saved ? JSON.parse(saved) : INITIAL_FEATURES;
  });
  useEffect(() => { localStorage.setItem('coffee_feature_settings', JSON.stringify(activeFeatures)); }, [activeFeatures]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleFeature = (field) => setActiveFeatures(prev => ({ ...prev, [field]: !prev[field] }));
  const regionRef = regionPath.length > 0 ? regionPath[regionPath.length - 1] : null;
  const handleNewDoc = (newDoc) => { setLocalDocs(prev => [...prev, newDoc]); if (onRegionDocsUpdate) onRegionDocsUpdate(newDoc); };

  const buildDisplayPath = () => {
    const byId = {};
    localDocs.forEach(d => { byId[d.id] = d; });
    return regionPath.map(id => byId[id]?.name).filter(Boolean).join(' › ');
  };

  const handleApplyBean = (patch, savedRegionDisplay, savedRegionPathIds) => {
    setForm(prev => ({ ...prev, ...patch }));
    if (savedRegionPathIds?.length) setRegionPath(savedRegionPathIds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const brewRef = collection(db, 'users', user.uid, 'brews');
      const submissionData = Object.keys(EMPTY_FORM).reduce((acc, key) => {
        if (!activeFeatures[key]) { acc[key] = null; }
        else {
          const val = form[key];
          if (key === 'flavorTags') { acc[key] = Array.isArray(val) && val.length > 0 ? val : null; }
          else if (['waterTemp', 'waterIn', 'groundCoffeeWeight'].includes(key)) { acc[key] = val ? Number(val) : null; }
          else { acc[key] = val?.toString().trim() || null; }
        }
        return acc;
      }, {});
      submissionData.regionRef  = regionRef;
      submissionData.regionPath = buildDisplayPath() || null;
      await addDoc(brewRef, { ...submissionData, createdAt: serverTimestamp() });
      onSubmitted(submissionData);
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  const FieldHeader = ({ label, field, isActive }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <label style={ms.label}>{label}{isActive && <span style={ms.required}> *</span>}</label>
      <Toggle active={isActive} onToggle={() => toggleFeature(field)} />
    </div>
  );

  const renderField = (label, field, type, placeholder, extraClass = '', options = null) => {
    const isActive = activeFeatures[field];
    return (
      <div className={`brew-field ${extraClass}`} style={{ width: '100%', position: 'relative', opacity: isActive ? 1 : 0.45, transition: 'opacity 0.2s' }}>
        <FieldHeader label={label} field={field} isActive={isActive} />
        {type === 'select' ? (
          <CustomSelect value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive} options={options} />
        ) : type === 'textarea' ? (
          <FocusTextarea placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} />
        ) : (
          <FocusInput type={type} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive} />
        )}
      </div>
    );
  };

  const renderGrinderField = () => {
    const isActive = activeFeatures['grinder'];
    const grinderNames = grinders.map(g => g.name).filter(Boolean);
    return (
      <div className="brew-field field-third" style={{ width: '100%', position: 'relative', opacity: isActive ? 1 : 0.45, transition: 'opacity 0.2s' }}>
        <FieldHeader label="Grinder" field="grinder" isActive={isActive} />
        {grindersLoading ? (
          <select style={{ ...ms.input, ...ms.select }} disabled><option>Loading…</option></select>
        ) : grinderNames.length > 0 ? (
          <CustomSelect value={form['grinder']} onChange={e => set('grinder', e.target.value)} disabled={!isActive} required={isActive} options={grinderNames} placeholder="Select grinder…" />
        ) : (
          <FocusInput type="text" placeholder="Comandante…" value={form['grinder']} onChange={e => set('grinder', e.target.value)} disabled={!isActive} required={isActive} />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Inject desktop overrides */}
      <style>{desktopModalCSS}</style>

      <div className="brew-modal-backdrop" style={ms.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="brew-modal-panel" style={{ ...ms.modal, maxWidth: '650px' }}>

          {/* Header */}
          <div style={ms.header}>
            <div style={ms.headerLeft}><span style={ms.title}>Add Brew</span></div>
            <button style={ms.closeBtn} onClick={onClose}>✕</button>
          </div>

          {error && <div style={ms.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ overflowY: 'auto', maxHeight: 'calc(92dvh - 120px)'}}>
            <div style={ms.grid}>

              {/* ── DATE ── */}
              <div style={{ width: '100%' }}><div style={ms.sectionDivider}>Date</div></div>
              {renderField("Brew Date", "date", "date", "", "field-half")}

              {/* ── BEAN INFO ── */}
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={ms.sectionDivider}>Bean Info</div>
                  <button
                    type="button"
                    onClick={() => setShowBeanPicker(prev => !prev)}
                    style={{ background: showBeanPicker ? '#EFE9E4' : '#6D4C41', color: showBeanPicker ? '#6D4C41' : '#fff', border: 'none', borderRadius: '20px', padding: '5px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '6px', transition: 'all 0.15s', minHeight: '36px' }}
                  >
                    {showBeanPicker ? '✕ Close' : 'Open Presets'}
                  </button>
                </div>
              </div>

              {showBeanPicker && (
                <div style={{ width: '100%' }}>
                  <SavedBeansPicker form={form} regionPath={regionPath} regionDisplayPath={buildDisplayPath()} onApply={handleApplyBean} />
                </div>
              )}

              <div style={{ width: '100%' }}>
                <RegionPicker allRegionDocs={localDocs} value={regionPath} onChange={setRegionPath} onDocsUpdate={handleNewDoc} />
              </div>

              {renderField("Beans",         "beans",        "text",   "Roaster / Label",  "field-half")}
              {renderField("Variety",       "variety",      "text",   "Geisha, Bourbon…", "field-half")}
              {renderField("Processing",    "processing",   "select", "",                 "field-third", PROCESSING_METHODS)}
              {renderField("Roast Level",   "roastLevel",   "select", "",                 "field-third", ROAST_LEVELS)}
              {renderField("Roasting Date", "roastingDate", "date",   "",                 "field-third")}

              {/* ── BREW SETUP ── */}
              <div style={{ width: '100%' }}><div style={ms.sectionDivider}>Brew Setup</div></div>
              {renderField("Brew Method",    "method",             "select", "",     "field-third", BREW_METHODS)}
              {renderField("Coffee (g)",     "groundCoffeeWeight", "number", "15",   "field-third")}
              {renderField("Water (ml)",     "waterIn",            "number", "250",  "field-third")}
              {renderField("Temp (°C)",      "waterTemp",          "number", "93",   "field-third")}
              {renderField("Brew Time",      "brewTime",           "text",   "2:30", "field-third")}
              {renderGrinderField()}
              {renderField("Grind Setting",  "grindSetting",       "text",   "20 clicks", "field-third")}

              {/* ── TASTING ── */}
              <div style={{ width: '100%' }}><div style={ms.sectionDivider}>Tasting</div></div>
              <div style={{ width: '100%', opacity: activeFeatures.flavorTags ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={ms.label}>Flavor Tags{activeFeatures.flavorTags && <span style={ms.required}> *</span>}</label>
                  <Toggle active={activeFeatures.flavorTags} onToggle={() => toggleFeature('flavorTags')} />
                </div>
                {activeFeatures.flavorTags
                  ? <FlavorPicker selectedFlavors={form.flavorTags} onChange={tags => set('flavorTags', tags)} />
                  : <div style={{ ...ms.input, color: '#BCAAA4', fontSize: '13px' }}>Flavor tags disabled</div>
                }
              </div>
              {renderField("Tasting Notes", "notes", "textarea", "Body, finish, acidity…")}

              {/* ── RECIPE ── */}
              <div style={{ width: '100%' }}><div style={ms.sectionDivider}>Recipe & Notes</div></div>
              {renderField("Brewing Recipe", "brewingRecipe", "textarea", "Pour schedule: 0s bloom 45g…")}
              {renderField("Extra Notes",    "extra",         "textarea", "Water recipe, equipment notes…")}
            </div>

            <div style={ms.actions}>
              <button type="button" style={ms.cancelBtn} onClick={onClose}>Cancel</button>
              <SubmitButton submitting={submitting} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}