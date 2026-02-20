import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

export function LoadingScreen() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #6F4E37 0%, #432818 100%)',
      gap: '24px',
    }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
        .loading-icon {
          font-size: 40px;
          animation: breathe 1.8s ease-in-out infinite;
        }
        .loading-bar-track {
          width: 120px;
          height: 2px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .loading-bar-fill {
          width: 50%;
          height: 100%;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 999px;
          animation: slide 1.4s ease-in-out infinite;
        }
      `}</style>

      <div className="loading-icon">☕</div>

      <div style={{
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Loading your map
      </div>

      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
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
          <button className={`sidebar-tab ${activeTab === 'coffee-map'   ? 'active' : ''}`} onClick={() => setActiveTab('coffee-map')}><span className="tab-icon">🗺️</span>Coffee Map</button>
          <button className={`sidebar-tab ${activeTab === 'by-notes'     ? 'active' : ''}`} onClick={() => setActiveTab('by-notes')}><span className="tab-icon">📝</span>Tasting Notes</button>
          <button className={`sidebar-tab ${activeTab === 'raw-data'     ? 'active' : ''}`} onClick={() => setActiveTab('raw-data')}><span className="tab-icon">📊</span>Brew Data</button>
          <button className={`sidebar-tab ${activeTab === 'saved-beans'  ? 'active' : ''}`} onClick={() => setActiveTab('saved-beans')}><span className="tab-icon">☕</span>Saved Beans</button>
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