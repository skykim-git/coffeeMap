import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';

import ByNotes from './ByNotes';
import RawData from './RawData';
import SavedBeansTab from './brew/SavedBeansTab';

import { buildRegionTree, parseCoord } from './shared/utils';
import { levelIcon } from './map/mapIcons';
import { MapEventHandler, ZoomControls, BoundaryFitter, PopupCloser } from './map/MapControls';
import BrewStatsPopup from './map/BrewStatsPopup';
import AddBrewModal from './brew/AddBrewModal';
import { Sidebar, TopBar, LoadingScreen, ErrorScreen } from './shared/Sidebar';

const worldBounds = [[-60,-180],[75,180]];

export default function BrazilMap() {
  const [allRegionDocs, setAllRegionDocs] = useState([]);
  const [brewRecords, setBrewRecords]     = useState([]);
  const [brewsLoading, setBrewsLoading]   = useState(true);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const [currentZoom, setCurrentZoom]     = useState(3);
  const [currentCenter, setCurrentCenter] = useState({ lat:'15.0000', lng:'-20.0000' });
  const [selectedDoc, setSelectedDoc]     = useState(null);
  const [pinnedDoc, setPinnedDoc]         = useState(null);
  const [resetView, setResetView]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState('coffee-map');
  const [closePopup, setClosePopup]       = useState(false);
  const [showBrewModal, setShowBrewModal] = useState(false);

  // ── Bean filter — set by SavedBeansTab, consumed by RawData ───────────────
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
    if (!selectedDoc) {
      if (currentZoom >= 8) return ['town','subregion','region','country'];
      if (currentZoom >= 6) return ['subregion','region'];
      if (currentZoom >= 4) return ['region','country'];
      return ['country'];
    }
    const level = selectedDoc.level;
    if (level === 'country') return ['region','subregion'];
    if (level === 'region')  return ['subregion','town'];
    return ['town','subregion'];
  };

  const visibleDocs = mapDocs.filter(d => {
    if (!brewedDocIds.has(d.id)) return false;
    if (pinnedDoc && d.id === pinnedDoc.id) return true;
    if (!visibleLevels().includes(d.level)) return false;
    if (selectedDoc) {
      let cur = byId[d.id];
      while (cur) {
        if (cur.parentId === selectedDoc.id) return true;
        cur = cur.parentId ? byId[cur.parentId] : null;
      }
      return false;
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
      updated.sort((a,b) => (a.date??'').localeCompare(b.date??''));
      return updated;
    });
  };

  // ── Navigate from RawData → map marker ────────────────────────────────────
  const handleNavigateToRegion = (regionDoc) => {
    setActiveTab('coffee-map');
    setTimeout(() => {
      handleDocClick(regionDoc);
    }, 100);
  };

  // ── Navigate from SavedBeansTab → RawData with filter ─────────────────────
  const handleSelectBean = (bean) => {
    setBeanFilter(bean.name);
    setActiveTab('raw-data');
  };

  const handleClearBeanFilter = () => {
    setBeanFilter(null);
  };

  // Clear filter when leaving raw-data tab so it doesn't persist unexpectedly
  const handleSetActiveTab = (tab) => {
    if (tab !== 'raw-data') setBeanFilter(null);
    setActiveTab(tab);
  };

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer center={[15,-20]} zoom={3} minZoom={2} maxZoom={18} maxBounds={worldBounds} zoomControl={false} style={{ height:'100%', width:'100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />

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
                    <Tooltip direction="top" offset={[0,-12]} opacity={0.95} permanent={false}>
                      <div style={{ fontFamily:'-apple-system, sans-serif', fontSize:'12px', fontWeight:'700', color:'#2C1810' }}>
                        {doc.name}
                        {doc.nameLocal && <span style={{ fontWeight:'400', color:'#8D6E63' }}> · {doc.nameLocal}</span>}
                        <div style={{ fontSize:'10px', color:'#BCAAA4', textTransform:'capitalize', marginTop:'2px' }}>{doc.level}</div>
                      </div>
                    </Tooltip>
                    {isPinned && (
                      <Popup maxWidth={380} autoPan={false}>
                        <BrewStatsPopup regionDoc={doc} parentDoc={parentDoc} brewRecords={brewRecords} />
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
        return <div className="map-wrapper"><ByNotes allRegionDocs={allRegionDocs} /></div>;

      case 'raw-data':
        return (
          <div className="map-wrapper">
            <RawData
              allRegionDocs={allRegionDocs}
              onNavigateToRegion={handleNavigateToRegion}
              beanFilter={beanFilter}
              onClearBeanFilter={handleClearBeanFilter}
            />
          </div>
        );

      case 'saved-beans':
        return (
          <div className="map-wrapper">
            <SavedBeansTab onSelectBean={handleSelectBean} />
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
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          setActiveTab={handleSetActiveTab}
        />
        {renderTabContent()}
      </main>
    </div>
  );
}