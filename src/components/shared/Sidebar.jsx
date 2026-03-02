import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

// ─── Loading / Error screens ──────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 48px; height: 48px;
          border-radius: 50%;
          border: 2.5px solid #e5e5e5;
          border-top-color: #1a1a1a;
          animation: spin 0.75s linear infinite;
        }
      `}</style>
      <div className="spinner" />
    </div>
  );
}

export function ErrorScreen({ message }) {
  return (
    <div style={{
      width: '100%', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #6F4E37 0%, #432818 100%)',
      gap: '16px', padding: '24px',
    }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '600', textAlign: 'center' }}>
        Failed to load regions
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center' }}>{message}</div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({
  open, onClose,
  totalBrews, brewedRegions, brewedCountries, totalOnMap,
  activeTab, setActiveTab,
  tastedRegionsList, onRegionClick, brewsLoading,
}) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-back-button" onClick={onClose} title="Close Menu">←</button>
          <div className="logo">
            <div className="logo-icon">🌿</div>
            <div className="logo-text">
              <h1>Coffee Journey</h1>
              <p>Taste Map</p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : totalBrews}</div>
            <div className="stat-label">Total Brews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : brewedRegions}</div>
            <div className="stat-label">Regions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewsLoading ? '…' : brewedCountries}</div>
            <div className="stat-label">Countries</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalOnMap}</div>
            <div className="stat-label">On Map</div>
          </div>
        </div>

        {/* Nav tabs visible only inside sidebar drawer (desktop; hidden on mobile via bottom bar) */}
        <div className="nav-tabs sidebar-nav-only">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); onClose(); }}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="regions-list">
          <h3>Tasted Regions</h3>
          {tastedRegionsList.map(country => (
            <div key={country.id} className="region-item" onClick={() => { onRegionClick(country); onClose(); }}>
              <div className="region-header">
                <div>
                  <div className="region-name">{country.name}</div>
                  <div className="region-name-local">{country.nameLocal}</div>
                </div>
                <div className="region-badge">{country.brewCount} brews</div>
              </div>
              {country.children.length > 0 && (
                <div className="region-subregions">
                  {country.children.map(c => (
                    <span key={c.id} className="subregion-pill">{c.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tastedRegionsList.length === 0 && !brewsLoading && (
            <p style={{ fontSize: '13px', color: '#8D6E63', fontStyle: 'italic', textAlign: 'center', marginTop: '24px' }}>
              No regions tasted yet. Add a brew to get started!
            </p>
          )}
        </div>
      </aside>

      {open && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: 'coffee-map',  icon: '🗺️', label: 'Coffee Map'    },
  { id: 'by-notes',   icon: '📝', label: 'Tasting Notes' },
  { id: 'raw-data',   icon: '📊', label: 'Brew Data'     },
  { id: 'saved-beans',icon: '☕', label: 'Saved Beans'   },
];

// ─── Bottom Tab Bar (mobile) ──────────────────────────────────────────────────

export function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      {NAV_TABS.map(tab => (
        <button
          key={tab.id}
          className={`bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="bottom-tab-icon">{tab.icon}</span>
          <span className="bottom-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

export function TopBar({ selectedDoc, byId, activeTab, onBack, onAddBrew, onToggleSidebar }) {
  return (
    <div className="top-bar">
      {/* Breadcrumb — truncated on mobile */}
      <div className="breadcrumb">
        <div className="breadcrumb-item breadcrumb-home">
          🏠 <span>{selectedDoc ? 'World' : 'World Map'}</span>
        </div>
        {selectedDoc && (
          <>
            <span>›</span>
            {(() => {
              const chain = [];
              let cur = selectedDoc;
              while (cur) {
                chain.unshift(cur);
                cur = cur.parentId ? byId[cur.parentId] : null;
              }
              return chain.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 && <span>›</span>}
                  <div className={`breadcrumb-item ${i === chain.length - 1 ? 'breadcrumb-current' : ''}`}>
                    {d.name}
                  </div>
                </React.Fragment>
              ));
            })()}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="top-bar-actions">
        {selectedDoc && activeTab === 'coffee-map' && (
          <button className="btn btn-secondary btn-icon-only" onClick={onBack} title="Back">
            <span>←</span>
            <span className="btn-label"> Back</span>
          </button>
        )}
        <button className="btn btn-primary btn-add-brew" onClick={onAddBrew} title="Add Brew">
          + <span className="btn-label">Add Brew</span>
        </button>
        <button className="btn btn-secondary btn-icon-only" onClick={onToggleSidebar} title="Menu / Stats">
          <span>☰</span>
        </button>
        <button className="btn btn-secondary btn-icon-only" onClick={() => signOut(auth)} title="Sign out">
          <span>↪</span>
        </button>
      </div>
    </div>
  );
}