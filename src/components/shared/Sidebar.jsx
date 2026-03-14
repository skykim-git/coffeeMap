import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconMap = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

const IconCoffee = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="4"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
);

const IconNotes = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IconData = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
);

const IconLeaf = ({ size = 22, color = 'white' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M17 8C8 10 5.9 16.17 3.82 19.34a2 2 0 0 0 2.93 2.6C9 20 12 18 17 8Z"/>
    <path d="M3.82 19.34C8 14 12.5 11 17 8"/>
  </svg>
);

const IconGlobe = ({ size = 14, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="9"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <path d="M12 3a15 15 0 0 1 0 18"/>
    <path d="M12 3a15 15 0 0 0 0 18"/>
  </svg>
);

const IconBack = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
);

const IconMenu = ({ size = 16, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" width={size} height={size}>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="6" y1="12" x2="18" y2="12"/>
    <line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

const IconSignOut = ({ size = 16, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconWarning = ({ size = 48, color = 'white' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ─── Loading / Error Screens ──────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 48px;
          height: 48px;
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
    <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #6F4E37 0%, #432818 100%)', gap:'16px' }}>
      <IconWarning size={48} color="rgba(255,255,255,0.85)" />
      <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'16px', fontWeight:'600' }}>Failed to load regions</div>
      <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px' }}>{message}</div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ open, onClose, totalBrews, brewedRegions, brewedCountries, totalOnMap, activeTab, setActiveTab, tastedRegionsList, onRegionClick, brewsLoading }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <IconLeaf size={22} color="white" />
            </div>
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
          <button className={`sidebar-tab ${activeTab === 'coffee-map'  ? 'active' : ''}`} onClick={() => setActiveTab('coffee-map')}>
            <span className="tab-icon"><IconMap size={18} /></span>Coffee Map
          </button>
          <button className={`sidebar-tab ${activeTab === 'by-notes'   ? 'active' : ''}`} onClick={() => setActiveTab('by-notes')}>
            <span className="tab-icon"><IconNotes size={18} /></span>Tasting Notes
          </button>
          <button className={`sidebar-tab ${activeTab === 'raw-data'   ? 'active' : ''}`} onClick={() => setActiveTab('raw-data')}>
            <span className="tab-icon"><IconData size={18} /></span>Brew Data
          </button>
          <button className={`sidebar-tab ${activeTab === 'saved-beans'? 'active' : ''}`} onClick={() => setActiveTab('saved-beans')}>
            <span className="tab-icon"><IconCoffee size={18} /></span>Saved Beans
          </button>
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

        <button className="sidebar-back-button" onClick={onClose} title="Close Menu">
          <IconBack size={18} />
        </button>
      </aside>

      {open && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ selectedDoc, byId, activeTab, onBack, onAddBrew, onToggleSidebar }) {
  return (
    <div className="top-bar">
      <div className="breadcrumb">
        <div className="breadcrumb-item breadcrumb-home" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <IconGlobe size={13} color="#8D6E63" />
          <span className="breadcrumb-text">{selectedDoc ? 'World' : 'World Map'}</span>
        </div>
        {selectedDoc && (
          <>
            <span className="breadcrumb-text">›</span>
            {(() => {
              const chain = [];
              let cur = selectedDoc;
              while (cur) { chain.unshift(cur); cur = cur.parentId ? byId[cur.parentId] : null; }
              return chain.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 && <span className="breadcrumb-text">›</span>}
                  <div className={`breadcrumb-item breadcrumb-text ${i === chain.length - 1 ? 'breadcrumb-current' : ''}`}>{d.name}</div>
                </React.Fragment>
              ));
            })()}
          </>
        )}
      </div>
      <div className="top-bar-actions">
        {selectedDoc && activeTab === 'coffee-map' && (
          <button className="btn btn-secondary btn-icon" onClick={onBack} title="Back">
            <IconBack size={16} />
            <span className="btn-label">Back</span>
          </button>
        )}
        <button className="btn btn-primary btn-icon" onClick={onAddBrew} title="Add Brew">
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          <span className="btn-label">Add Brew</span>
        </button>
        <button className="btn btn-secondary btn-icon" onClick={onToggleSidebar} title="Menu">
          <IconMenu size={16} />
          <span className="btn-label">Menu</span>
        </button>
        <button className="btn btn-secondary btn-icon" onClick={() => signOut(auth)} title="Sign out">
          <IconSignOut size={16} />
          <span className="btn-label">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// ─── BottomTabBar (mobile) ────────────────────────────────────────────────────

export function BottomTabBar({ activeTab, setActiveTab, onAddBrew }) {
  const tabs = [
    { key: 'coffee-map',  label: 'Map',   icon: <IconMap size={20} /> },
    { key: 'by-notes',    label: 'Notes', icon: <IconNotes size={20} /> },
    { key: 'raw-data',    label: 'Data',  icon: <IconData size={20} /> },
    { key: 'saved-beans', label: 'Beans', icon: <IconCoffee size={20} /> },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(93,64,55,0.1)',
      display: 'flex', alignItems: 'stretch',
      height: '60px', zIndex: 3000,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '3px', border: 'none', background: 'none',
            cursor: 'pointer', padding: '6px 0',
            color: activeTab === tab.key ? '#5D4037' : '#A1887F',
            transition: 'color 0.15s',
          }}
        >
          {tab.icon}
          <span style={{ fontSize: '10px', fontWeight: activeTab === tab.key ? '700' : '500', letterSpacing: '0.2px' }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}