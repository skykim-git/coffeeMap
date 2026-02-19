import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

import {
  buildRegionTree, buildPath,
  BREW_METHODS, PROCESSING_METHODS, ROAST_LEVELS,
  INITIAL_FEATURES, EMPTY_FORM,
  ms,
} from '../shared/utils';
import RegionPicker from './RegionPicker';
import FlavorPicker from './FlavorPicker';

export default function AddBrewModal({ onClose, onSubmitted, allRegionDocs, onRegionDocsUpdate }) {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [regionPath, setRegionPath] = useState([]);   // array of selected doc IDs, root → leaf
  const [localDocs, setLocalDocs]   = useState(allRegionDocs); // local copy so new additions are instant
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  // Keep localDocs in sync if parent refreshes allRegionDocs
  useEffect(() => { setLocalDocs(allRegionDocs); }, [allRegionDocs]);

  const [activeFeatures, setActiveFeatures] = useState(() => {
    const saved = localStorage.getItem('coffee_feature_settings');
    return saved ? JSON.parse(saved) : INITIAL_FEATURES;
  });

  useEffect(() => {
    localStorage.setItem('coffee_feature_settings', JSON.stringify(activeFeatures));
  }, [activeFeatures]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleFeature = (field) => setActiveFeatures(prev => ({ ...prev, [field]: !prev[field] }));

  // Deepest selected doc ID is the regionRef to store on the brew
  const regionRef = regionPath.length > 0 ? regionPath[regionPath.length - 1] : null;

  // Called by RegionPicker when user adds a brand-new region doc
  const handleNewDoc = (newDoc) => {
    setLocalDocs(prev => [...prev, newDoc]);
    if (onRegionDocsUpdate) onRegionDocsUpdate(newDoc);
  };

  // Build human-readable path string from selected IDs
  const buildDisplayPath = () => {
    const byId = {};
    localDocs.forEach(d => { byId[d.id] = d; });
    return regionPath.map(id => byId[id]?.name).filter(Boolean).join(' › ');
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
        if (!activeFeatures[key]) {
          acc[key] = null;
        } else {
          const val = form[key];
          if (key === 'flavorTags') {
            acc[key] = Array.isArray(val) && val.length > 0 ? val : null;
          } else if (['waterTemp','waterIn','daysPast','groundCoffeeWeight'].includes(key)) {
            acc[key] = val ? Number(val) : null;
          } else {
            acc[key] = val?.toString().trim() || null;
          }
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

  const renderField = (label, field, type, placeholder, widthStyle, options = null) => {
    const isActive = activeFeatures[field];
    return (
      <div style={{ ...widthStyle, position:'relative', opacity: isActive ? 1 : 0.4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
          <label style={ms.label}>{label} {isActive && <span style={ms.required}>*</span>}</label>
          <button type="button" onClick={() => toggleFeature(field)} style={{ ...ms.deactivateIcon, color: isActive ? '#8D6E63' : '#BF360C' }}>
            {isActive ? '✕' : '+'}
          </button>
        </div>
        {type === 'select' ? (
          <select style={ms.input} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive}>
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea style={{ ...ms.input, ...ms.textarea }} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} rows={2} />
        ) : (
          <input style={ms.input} type={type} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} disabled={!isActive} required={isActive} />
        )}
      </div>
    );
  };

  return (
    <div style={ms.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...ms.modal, maxWidth:'650px' }}>
        <div style={ms.header}>
          <div style={ms.headerLeft}><span style={{ fontSize:'20px' }}>☕</span><span style={ms.title}>Add Brew</span></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        {error && <div style={ms.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={ms.grid}>

            {/* ── Origin ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Origin</div></div>
            <div style={{ width:'100%' }}>
              <RegionPicker
                allRegionDocs={localDocs}
                value={regionPath}
                onChange={setRegionPath}
                onDocsUpdate={handleNewDoc}
              />
            </div>

            {/* ── Record ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Record</div></div>
            {renderField("Date",  "date",  "date", "", ms.fieldHalf)}
            {renderField("Beans", "beans", "text", "Roaster / Label", ms.fieldHalf)}

            {/* ── Bean Info ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Bean Info</div></div>
            {renderField("Variety",    "variety",    "text",   "Geisha, Bourbon…", ms.fieldThird)}
            {renderField("Processing", "processing", "select", "",                 ms.fieldThird, PROCESSING_METHODS)}
            {renderField("Roast Level","roastLevel", "select", "",                 ms.fieldThird, ROAST_LEVELS)}

            {/* ── Brew Setup ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Brew Setup</div></div>
            {renderField("Brew Method",     "method",             "select", "",            ms.fieldThird, BREW_METHODS)}
            {renderField("Grinder",         "grinder",            "text",   "Comandante…", ms.fieldThird)}
            {renderField("Setting",         "grindSetting",       "text",   "20 clicks",   ms.fieldThird)}
            {renderField("Coffee (g)",      "groundCoffeeWeight", "number", "15",          ms.fieldThird)}
            {renderField("Temp (°C)",       "waterTemp",          "number", "93",          ms.fieldThird)}
            {renderField("Water (ml)",      "waterIn",            "number", "250",         ms.fieldThird)}
            {renderField("Brew Time",       "brewTime",           "text",   "2:30",        ms.fieldThird)}
            {renderField("Days Post Roast", "daysPast",           "number", "14",          ms.fieldThird)}

            {/* ── Tasting ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Tasting</div></div>
            <div style={{ width:'100%', opacity: activeFeatures.flavorTags ? 1 : 0.4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <label style={ms.label}>Flavor Tags {activeFeatures.flavorTags && <span style={ms.required}>*</span>}</label>
                <button type="button" onClick={() => toggleFeature('flavorTags')} style={{ ...ms.deactivateIcon, color: activeFeatures.flavorTags ? '#8D6E63' : '#BF360C' }}>
                  {activeFeatures.flavorTags ? '✕' : '+'}
                </button>
              </div>
              {activeFeatures.flavorTags
                ? <FlavorPicker selectedFlavors={form.flavorTags} onChange={tags => set('flavorTags', tags)} />
                : <div style={{ ...ms.input, color:'#BCAAA4', fontSize:'12px' }}>Flavor tags disabled</div>
              }
            </div>
            {renderField("Tasting Notes", "notes", "textarea", "Body, finish, acidity…", ms.fieldFull)}

            {/* ── Recipe & Notes ── */}
            <div style={{ width:'100%' }}><div style={ms.sectionDivider}>Recipe & Notes</div></div>
            {renderField("Brewing Recipe", "brewingRecipe", "textarea", "Pour schedule: 0s bloom 45g, 45s +100g…", ms.fieldFull)}
            {renderField("Extra Notes",    "extra",         "textarea", "Water recipe, equipment notes…",           ms.fieldFull)}

          </div>
          <div style={ms.actions}>
            <button type="button" style={ms.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={ms.submitBtn} disabled={submitting}>
              {submitting ? 'Saving...' : '+ Save Brew'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}