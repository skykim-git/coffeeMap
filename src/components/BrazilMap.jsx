import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

import { collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';

import ByNotes from './ByNotes';
import RawData from './RawData';
import SavedBeansTab from './brew/SavedBeansTab';

import { buildRegionTree, parseCoord } from './shared/utils';
import { levelIcon } from './map/mapIcons';
import { MapEventHandler, ZoomControls, BoundaryFitter, PopupCloser } from './map/MapControls';
import { extractFlavorNotes, FLAVOR_PALETTE } from './shared/utils';
import AddBrewModal from './brew/AddBrewModal';
import { Sidebar, TopBar, BottomTabBar, LoadingScreen, ErrorScreen } from './shared/Sidebar';

const worldBounds = [[-60, -180], [75, 180]];

export default function BrazilMap() {
  const [allRegionDocs, setAllRegionDocs] = useState([]);
  const [brewRecords, setBrewRecords]     = useState([]);
  const [brewsLoading, setBrewsLoading]   = useState(true);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const [currentZoom, setCurrentZoom]     = useState(3);
  const [currentCenter, setCurrentCenter] = useState({ lat: '15.0000', lng: '-20.0000' });
  const [selectedDoc, setSelectedDoc]     = useState(null);
  const [pinnedDoc, setPinnedDoc]         = useState(null);
  const [resetView, setResetView]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState('coffee-map');
  const [closePopup, setClosePopup]       = useState(false);
  const [showBrewModal, setShowBrewModal] = useState(false);

  const [beanFilter, setBeanFilter] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'newcoffeeregions'));
        setAllRegionDocs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setBrewRecords([]); setBrewsLoading(false); return; }
      try {
        setBrewsLoading(true);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'brews'));
        const brews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        brews.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
        setBrewRecords(brews);
      } catch (err) {
        console.error('Error fetching brews:', err);
      } finally {
        setBrewsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── On mobile, auto-zoom to most recent brew's country on initial load ────
  useEffect(() => {
    if (brewsLoading || brewRecords.length === 0 || allRegionDocs.length === 0) return;
    if (window.innerWidth > 1024) return;

    const mostRecent = [...brewRecords].sort((a, b) =>
      (b.date ?? '').localeCompare(a.date ?? '')
    )[0];
    if (!mostRecent?.regionRef) return;

    let cur = byId[mostRecent.regionRef];
    while (cur && cur.level !== 'country') {
      cur = cur.parentId ? byId[cur.parentId] : null;
    }
    if (cur) {
      setSelectedDoc(cur);
      setPinnedDoc(null);
    }
  }, [brewsLoading, brewRecords, allRegionDocs]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const { byId } = useMemo(() => buildRegionTree(allRegionDocs), [allRegionDocs]);

  const brewedDocIds = useMemo(() => {
    const ids = new Set();
    brewRecords.forEach(b => {
      if (!b.regionRef) return;
      let cur = byId[b.regionRef];
      while (cur) { ids.add(cur.id); cur = cur.parentId ? byId[cur.parentId] : null; }
    });
    return ids;
  }, [brewRecords, byId]);

  const mapDocs = useMemo(() => allRegionDocs.filter(d => parseCoord(d.coordinate)), [allRegionDocs]);

  const totalBrews      = brewRecords.length;
  const brewedCountries = useMemo(() => allRegionDocs.filter(d => d.level === 'country' && brewedDocIds.has(d.id)).length, [allRegionDocs, brewedDocIds]);
  const brewedRegions   = useMemo(() => allRegionDocs.filter(d => d.level !== 'country' && brewedDocIds.has(d.id)).length, [allRegionDocs, brewedDocIds]);

  const selectedFitBounds = useMemo(() => {
    if (!selectedDoc) return null;
    const coords = [];
    const gather = (docId) => {
      const doc = byId[docId];
      if (!doc) return;
      const c = parseCoord(doc.coordinate);
      if (c) coords.push(c);
      allRegionDocs.filter(d => d.parentId === docId).forEach(child => gather(child.id));
    };
    gather(selectedDoc.id);
    return coords.length >= 2 ? coords : null;
  }, [selectedDoc, byId, allRegionDocs]);

  const tastedRegionsList = useMemo(() =>
    allRegionDocs
      .filter(d => d.level === 'country' && brewedDocIds.has(d.id))
      .map(country => ({
        ...country,
        brewCount: brewRecords.filter(b => {
          let cur = byId[b.regionRef];
          while (cur) { if (cur.id === country.id) return true; cur = cur.parentId ? byId[cur.parentId] : null; }
          return false;
        }).length,
        children: allRegionDocs.filter(d => d.parentId === country.id && brewedDocIds.has(d.id)),
      })),
    [allRegionDocs, brewedDocIds, brewRecords, byId]
  );

  // ── Visibility logic ───────────────────────────────────────────────────────

  const visibleLevels = () => {
    if (!selectedDoc) return ['country'];
    const level = selectedDoc.level;
    if (level === 'country') return ['region', 'subregion'];
    if (level === 'region')  return ['subregion', 'town'];
    return ['town', 'subregion'];
  };

  const visibleDocs = mapDocs.filter(d => {
    if (!brewedDocIds.has(d.id)) return false;

    // A leaf is a brewed doc with no brewed children — always keep it visible
    // so its popup remains accessible after being clicked.
    const isLeaf = !allRegionDocs.some(child => child.parentId === d.id && brewedDocIds.has(child.id));
    if (isLeaf && pinnedDoc && d.id === pinnedDoc.id) return true;

    if (!visibleLevels().includes(d.level)) return false;
    if (selectedDoc) {
      return d.parentId === selectedDoc.id;
    }
    return true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDocClick = (doc) => {
    setPinnedDoc(doc);
    setResetView(false);
    setTimeout(() => setSelectedDoc(doc), 300);
  };

  const handleBackToMap = () => {
    setClosePopup(true);
    setPinnedDoc(null);
    if (selectedDoc?.parentId) {
      setSelectedDoc(byId[selectedDoc.parentId] || null);
    } else {
      setSelectedDoc(null);
      setResetView(true);
    }
  };

  const handleBrewSubmitted = (newBrew) => {
    setBrewRecords(prev => {
      const updated = [...prev, newBrew];
      updated.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      return updated;
    });
  };

  const handleNavigateToRegion = (regionDoc) => {
    setActiveTab('coffee-map');
    setTimeout(() => handleDocClick(regionDoc), 100);
  };

  const handleSelectBean = (bean) => {
    setBeanFilter(bean.name);
    setActiveTab('raw-data');
  };

  const handleClearBeanFilter = () => setBeanFilter(null);

  const handleSetActiveTab = (tab) => {
    if (tab !== 'raw-data') setBeanFilter(null);
    setActiveTab(tab);

    if (tab === 'coffee-map' && window.innerWidth <= 1024 && brewRecords.length > 0) {
      const mostRecent = [...brewRecords].sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '')
      )[0];
      if (!mostRecent?.regionRef) return;

      let cur = byId[mostRecent.regionRef];
      while (cur && cur.level !== 'country') {
        cur = cur.parentId ? byId[cur.parentId] : null;
      }
      if (cur) {
        setTimeout(() => {
          setSelectedDoc(cur);
          setPinnedDoc(null);
        }, 150);
      }
    }
  };

  // ── Tab content ────────────────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer
              center={[15, -20]} zoom={3} minZoom={2} maxZoom={18}
              maxBounds={worldBounds} zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
              />

              {visibleDocs.map(doc => {
                const coord = parseCoord(doc.coordinate);
                if (!coord) return null;
                const parentDoc = doc.parentId ? byId[doc.parentId] : null;
                const icon = levelIcon[doc.level] || levelIcon.subregion;
                const isPinned = pinnedDoc && doc.id === pinnedDoc.id;
                const hasBrewedChildren = allRegionDocs.some(d => d.parentId === doc.id && brewedDocIds.has(d.id));
                const isLeaf = !hasBrewedChildren;
                return (
                  <Marker
                    key={doc.id}
                    position={coord}
                    icon={icon}
                    ref={isPinned && isLeaf ? (marker) => { if (marker) marker.openPopup(); } : null}
                    eventHandlers={{ click: () => handleDocClick(doc) }}
                  >
                    <Tooltip direction="top" offset={[0, -12]} opacity={0.95} permanent={false}>
                      <div style={{ fontFamily: '-apple-system, sans-serif', fontSize: '12px', fontWeight: '700', color: '#2C1810' }}>
                        {doc.name}
                        {doc.nameLocal && <span style={{ fontWeight: '400', color: '#8D6E63' }}> · {doc.nameLocal}</span>}
                        <div style={{ fontSize: '10px', color: '#BCAAA4', textTransform: 'capitalize', marginTop: '2px' }}>{doc.level}</div>
                      </div>
                    </Tooltip>
                    {isPinned && (
                      <Popup maxWidth={320} autoPan={false}>
                        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '4px 2px 6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#2C1810', marginBottom: '2px' }}>{doc.name}</div>
                          {doc.nameLocal && (
                            <div style={{ fontSize: '12px', color: '#A1887F', marginBottom: '10px' }}>{doc.nameLocal}</div>
                          )}
                          {(() => {
                            const flavors = extractFlavorNotes(doc.id, brewRecords);
                            if (!flavors.length) return null;
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {flavors.map((note, i) => (
                                  <span key={i} style={{
                                    background: FLAVOR_PALETTE[note.toLowerCase()] || 'linear-gradient(135deg, #5D4037 0%, #2C1810 100%)',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  }}>
                                    {note}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              })}

              <MapEventHandler onZoomChange={setCurrentZoom} onMoveChange={setCurrentCenter} />
              <ZoomControls />
              <PopupCloser shouldClose={closePopup} onClosed={() => setClosePopup(false)} />
              <BoundaryFitter
                coordinates={selectedFitBounds ? null : (selectedDoc ? parseCoord(selectedDoc.coordinate) : null)}
                resetView={resetView}
                fitBounds={selectedFitBounds}
                zoomLevel={
                  selectedDoc?.level === 'town'      ? 13 :
                  selectedDoc?.level === 'subregion' ? 11 :
                  selectedDoc?.level === 'region'    ? 8  : 3
                }
              />
            </MapContainer>
          </div>
        );

      case 'by-notes':
        return <div className="map-wrapper scrollable"><ByNotes allRegionDocs={allRegionDocs} /></div>;

      case 'raw-data':
        return (
          <div className="map-wrapper">
            <RawData
              allRegionDocs={allRegionDocs}
              onNavigateToRegion={handleNavigateToRegion}
              beanFilter={beanFilter}
              onClearBeanFilter={handleClearBeanFilter}
              externalBrews={brewRecords}
            />
          </div>
        );

      case 'saved-beans':
        return (
          <div className="map-wrapper">
            <SavedBeansTab onSelectBean={handleSelectBean} />
          </div>
        );

      case 'user-profile':
        return (
          <div className="map-wrapper" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '12px',
            color: '#A1887F', fontSize: '15px', fontWeight: 500,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#D7CCC8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={48} height={48}>
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            Profile page coming soon.
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  return (
    <div className="brazil-map-container">
      {showBrewModal && (
        <AddBrewModal
          onClose={() => setShowBrewModal(false)}
          onSubmitted={handleBrewSubmitted}
          allRegionDocs={allRegionDocs}
        />
      )}

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        totalBrews={totalBrews}
        brewedRegions={brewedRegions}
        brewedCountries={brewedCountries}
        totalOnMap={allRegionDocs.length}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        tastedRegionsList={tastedRegionsList}
        onRegionClick={handleDocClick}
        brewsLoading={brewsLoading}
      />

      <main className="main-content">
        <TopBar
          selectedDoc={selectedDoc}
          byId={byId}
          activeTab={activeTab}
          onBack={handleBackToMap}
          onAddBrew={() => setShowBrewModal(true)}
          onUserClick={() => handleSetActiveTab('user-profile')}
        />

        {renderTabContent()}

        {/* Bottom tab bar — visible only on mobile via CSS */}
        <BottomTabBar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
      </main>
    </div>
  );
}