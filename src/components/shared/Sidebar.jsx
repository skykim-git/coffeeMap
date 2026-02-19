import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

export function LoadingScreen() {
  return (
    <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap:'16px' }}>
      <div style={{ fontSize:'48px' }}>☕</div>
      <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'16px', fontWeight:'600' }}>Loading your coffee map...</div>
    </div>
  );
}

export function ErrorScreen({ message }) {
  return (
    <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap:'16px' }}>
      <div style={{ fontSize:'48px' }}>⚠️</div>
      <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'16px', fontWeight:'600' }}>Failed to load regions</div>
      <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px' }}>{message}</div>
    </div>
  );
}

export function Sidebar({ open, onClose, totalBrews, brewedRegions, brewedCountries, totalOnMap, activeTab, setActiveTab, tastedRegionsList, onRegionClick, brewsLoading }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">☕</div>
            <div className="logo-text"><h1>Coffee Journey</h1><p>Taste Map</p></div>
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

        <div className="nav-tabs">
          <button className={`sidebar-tab ${activeTab === 'coffee-map' ? 'active' : ''}`} onClick={() => setActiveTab('coffee-map')}><span className="tab-icon">🗺️</span>Coffee Map</button>
          <button className={`sidebar-tab ${activeTab === 'by-notes'   ? 'active' : ''}`} onClick={() => setActiveTab('by-notes')}><span className="tab-icon">📝</span>Tasting Notes</button>
          <button className={`sidebar-tab ${activeTab === 'raw-data'   ? 'active' : ''}`} onClick={() => setActiveTab('raw-data')}><span className="tab-icon">📊</span>Brew Data</button>
        </div>

        <div className="regions-list">
          <h3>Tasted Regions</h3>
          {tastedRegionsList.map(country => (
            <div key={country.id} className="region-item" onClick={() => onRegionClick(country)}>
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
        </div>

        <button className="sidebar-back-button" onClick={onClose} title="Close Menu">←</button>
      </aside>

      {open && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}

export function TopBar({ selectedDoc, byId, activeTab, onBack, onAddBrew, onToggleSidebar }) {
  return (
    <div className="top-bar">
      <div className="breadcrumb">
        <div className="breadcrumb-item breadcrumb-home">
          🏠 {selectedDoc ? 'World' : 'World Map'}
        </div>
        {selectedDoc && (
          <>
            <span>›</span>
            {(() => {
              const chain = [];
              let cur = selectedDoc;
              while (cur) { chain.unshift(cur); cur = cur.parentId ? byId[cur.parentId] : null; }
              return chain.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 && <span>›</span>}
                  <div className={`breadcrumb-item ${i === chain.length - 1 ? 'breadcrumb-current' : ''}`}>{d.name}</div>
                </React.Fragment>
              ));
            })()}
          </>
        )}
      </div>
      <div className="top-bar-actions">
        {selectedDoc && activeTab === 'coffee-map' && (
          <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        )}
        <button className="btn btn-primary"   onClick={onAddBrew}>+ Add Brew</button>
        <button className="btn btn-secondary" onClick={onToggleSidebar}>☰ Menu</button>
        <button className="btn btn-secondary" onClick={() => signOut(auth)} title="Sign out">↪ Sign Out</button>
      </div>
    </div>
  );
}