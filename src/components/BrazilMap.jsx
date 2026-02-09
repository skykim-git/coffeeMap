import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

// Import components
import ByNotes from './ByNotes';

// Import brew data
import { brewRecords, getTastedRegions, getBrewStats } from '../data/brewData';

// Get only the regions that have been tasted (dynamically from brew records)
const coffeeRegions = getTastedRegions();
const brewStats = getBrewStats();

// Words to exclude from flavor notes
const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'not', 'no', 'yes', 'if', 'than',
  'so', 'very', 'just', 'too', 'quite', 'more', 'less', 'some', 'any',
  'all', 'each', 'every', 'both', 'few', 'many', 'much', 'seem', 'seemed',
  'seems', 'hard', 'sure', 'confirmed', 'really', 'slightly', 'bit', 'good',
  'better', 'brewing', 'brewed', 'coffee', 'cup', 'itself', 'first', 'noticeable',
  'compared', 'clear', 'strong', 'prominent', 'identify', 'texture', 'sip'
]);

// Helper function to extract flavor notes from brew data
const extractFlavorNotes = (beanName) => {
  const brews = brewRecords.filter(brew => brew.beans === beanName);
  
  if (brews.length === 0) return [];
  
  // Combine all notes
  const allNotes = brews
    .map(brew => brew.notes)
    .filter(note => note && note !== '?' && note.trim() !== '')
    .join(' ');
  
  if (!allNotes) return [];
  
  // Extract words and count frequency
  const words = allNotes
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && // At least 3 characters
      !stopWords.has(word) &&
      !/^\d+$/.test(word) // Not a number
    );
  
  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Sort by frequency and take top 3
  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return topWords;
};

// Helper function to get brew statistics for a subregion
const getBrewStatsForSubregion = (beanName) => {
  const brews = brewRecords.filter(brew => brew.beans === beanName);
  
  if (brews.length === 0) return null;
  
  // Temperature distribution
  const temps = brews
    .map(b => b.waterTemp)
    .filter(t => t !== '?' && t !== '' && t !== null && t !== undefined);
  
  const tempCounts = temps.reduce((acc, temp) => {
    acc[temp] = (acc[temp] || 0) + 1;
    return acc;
  }, {});
  
  // Grind setting distribution
  const grinds = brews
    .map(b => b.grindSetting)
    .filter(g => g !== '?' && g !== '' && g !== null && g !== undefined);
  
  const grindCounts = grinds.reduce((acc, grind) => {
    acc[grind] = (acc[grind] || 0) + 1;
    return acc;
  }, {});
  
  // Method distribution
  const methods = brews
    .map(b => b.method)
    .filter(m => m !== '?' && m !== '' && m !== null && m !== undefined);
  
  const methodCounts = methods.reduce((acc, method) => {
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  
  // Water amount distribution
  const waterAmounts = brews
    .map(b => b.waterIn)
    .filter(w => w !== '?' && w !== '' && w !== null && w !== undefined);
  
  const waterCounts = waterAmounts.reduce((acc, water) => {
    acc[water] = (acc[water] || 0) + 1;
    return acc;
  }, {});
  
  return {
    temperature: tempCounts,
    grindSetting: grindCounts,
    method: methodCounts,
    waterAmount: waterCounts,
    totalBrews: brews.length
  };
};

// Component to render a mini histogram
const MiniHistogram = ({ data, label, unit = '' }) => {
  if (!data || Object.keys(data).length === 0) return null;
  
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...entries.map(([_, count]) => count));
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '600', 
        marginBottom: '6px',
        color: '#654321',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map(([value, count]) => {
          const percentage = (count / maxCount) * 100;
          return (
            <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                minWidth: '45px', 
                fontSize: '12px', 
                fontWeight: '500',
                color: '#333'
              }}>
                {value}{unit}
              </div>
              <div style={{ 
                flex: 1, 
                height: '20px', 
                backgroundColor: '#f5f5f5',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: '#8b4513',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '6px'
                }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced popup component with brew stats and flavor notes
const BrewStatsPopup = ({ subRegion, parentRegion }) => {
  const stats = getBrewStatsForSubregion(subRegion.beanName);
  const flavorNotes = extractFlavorNotes(subRegion.beanName);
  
  // Map flavor notes to emojis
  const getFlavorEmoji = (flavor) => {
    const emojiMap = {
      'citrus': '🍊',
      'chocolate': '🍫',
      'fruity': '🍇',
      'berry': '🫐',
      'raspberry': '🫐',
      'banana': '🍌',
      'apple': '🍏',
      'grape': '🍇',
      'mango': '🥭',
      'pineapple': '🍍',
      'tropical': '🌴',
      'honey': '🍯',
      'caramel': '🍮',
      'nutty': '🥜',
      'floral': '🌸',
      'aroma': '🌺',
      'acidic': '💧'
    };
    return emojiMap[flavor.toLowerCase()] || '☕';
  };
  
  return (
    <div style={{ minWidth: '280px', maxWidth: '360px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ marginBottom: '16px', marginTop: '20px' }}>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          color: '#2C1810',
          marginBottom: '4px'
        }}>
          {subRegion.name}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#8D6E63'
        }}>
          {subRegion.nameLocal} • {parentRegion?.name}
        </div>
      </div>

      {flavorNotes.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          margin: '16px 0' 
        }}>
          {flavorNotes.map((note, index) => (
            <span 
              key={index} 
              style={{
                background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
                color: '#2C1810',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{getFlavorEmoji(note)}</span>
              {note}
            </span>
          ))}
        </div>
      )}
      
      {stats && (
        <div style={{ marginTop: '20px' }}>
          {/* Brew Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Method */}
            {stats.method && Object.keys(stats.method).length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700',
                  color: '#8D6E63',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Brew Method
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.method).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.method));
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          minWidth: '80px', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: '#2C1810'
                        }}>
                          {value}
                        </div>
                        <div style={{ 
                          flex: 1, 
                          height: '24px', 
                          backgroundColor: '#EFEBE9',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                            transition: 'width 0.5s ease'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              {count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Temperature */}
            {stats.temperature && Object.keys(stats.temperature).length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700',
                  color: '#8D6E63',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Temperature
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.temperature).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.temperature));
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          minWidth: '80px', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: '#2C1810'
                        }}>
                          {value}°C
                        </div>
                        <div style={{ 
                          flex: 1, 
                          height: '24px', 
                          backgroundColor: '#EFEBE9',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                            transition: 'width 0.5s ease'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              {count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grind Setting */}
            {stats.grindSetting && Object.keys(stats.grindSetting).length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700',
                  color: '#8D6E63',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Grind Setting
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.grindSetting).sort((a, b) => b[1] - a[1]).map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(stats.grindSetting));
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          minWidth: '80px', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: '#2C1810'
                        }}>
                          {value}
                        </div>
                        <div style={{ 
                          flex: 1, 
                          height: '24px', 
                          backgroundColor: '#EFEBE9',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                            transition: 'width 0.5s ease'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              {count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom component to track map events
function MapEventHandler({ onZoomChange, onMoveChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
    moveend: () => {
      const center = map.getCenter();
      onMoveChange({ lat: center.lat.toFixed(4), lng: center.lng.toFixed(4) });
    }
  });
  return null;
}

// Custom zoom controls component
function ZoomControls() {
  const map = useMap();

  return (
    <div className="custom-zoom-controls">
      <div className="control-group">
        <button
          onClick={() => map.zoomIn()}
          className="zoom-button"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => map.zoomOut()}
          className="zoom-button"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => map.setView([15, -20], 3)}
          className="zoom-button"
          title="Reset view"
        >
          ⊡
        </button>
      </div>
    </div>
  );
}

// Component to handle zooming to coordinates
function BoundaryFitter({ coordinates, resetView, zoomLevel = 7 }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      // Zoom to specific coordinates
      console.log('Zooming to coordinates:', coordinates, 'with zoom level:', zoomLevel);
      map.setView(coordinates, zoomLevel, { animate: true, duration: 0.5 });
    } else if (resetView) {
      console.log('Resetting view to world map');
      map.setView([15, -20], 3, { animate: true, duration: 0.5 });
    }
  }, [coordinates, resetView, zoomLevel, map]);

  return null;
}

// Component to close all popups when triggered
function PopupCloser({ shouldClose, onClosed }) {
  const map = useMap();
  
  useEffect(() => {
    if (shouldClose) {
      map.closePopup();
      onClosed();
    }
  }, [shouldClose, map, onClosed]);
  
  return null;
}

// Custom icon for country-level coffee regions (larger)
const countryIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#8b4513" stroke="white" stroke-width="3"/>
      <text x="20" y="27" font-size="20" text-anchor="middle" fill="white">☕</text>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Custom icon for sub-regions (smaller)
const subRegionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10" fill="#d2691e" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

function BrazilMap() {
  const [currentZoom, setCurrentZoom] = useState(3);
  const [currentCenter, setCurrentCenter] = useState({ lat: '15.0000', lng: '-20.0000' });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedSubRegion, setSelectedSubRegion] = useState(null);
  const [resetView, setResetView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('coffee-map');
  const [closePopup, setClosePopup] = useState(false);

  const worldBounds = [
    [-60, -180],
    [75, 180]
  ];

  // Prepare sub-region data from the database
  const subRegionData = {};
  coffeeRegions.forEach(region => {
    if (region.subRegions && region.subRegions.length > 0) {
      region.subRegions.forEach(subRegion => {
        subRegionData[subRegion.id] = {
          ...subRegion,
          parentRegion: region.id
        };
      });
    }
  });

  // Handle region marker click - zoom to region and show sub-regions
  const handleRegionClick = (region) => {
    console.log('Region clicked:', region);
    setSelectedRegion(region);
    setSelectedSubRegion(null);
    setResetView(false);
  };

  // Handle sub-region marker click - zoom to sub-region
  const handleSubRegionClick = (subRegion) => {
    setSelectedSubRegion(subRegion);
    setResetView(false);
  };

  // Handle back button - return to world view and close popup
  const handleBackToMap = () => {
    // Close any open popups
    setClosePopup(true);
    
    if (selectedSubRegion) {
      // Go back to country view
      setSelectedSubRegion(null);
    } else {
      // Go back to world view
      setSelectedRegion(null);
      setResetView(true);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Style for country boundaries (not selected)
  const countryStyle = {
    fillColor: '#8b4513',
    fillOpacity: 0.08,
    color: '#d2691e',
    weight: 1.5,
    opacity: 0.6
  };

  // Style for selected country boundary
  const selectedCountryStyle = {
    fillColor: '#8b4513',
    fillOpacity: 0.25,
    color: '#8b4513',
    weight: 3,
    opacity: 1
  };

  // Style for sub-region boundaries
  const subRegionStyle = {
    fillColor: '#d2691e',
    fillOpacity: 0.15,
    color: '#8b4513',
    weight: 2,
    opacity: 0.8
  };

  // Style for selected sub-region boundary
  const selectedSubRegionStyle = {
    fillColor: '#d2691e',
    fillOpacity: 0.35,
    color: '#654321',
    weight: 3,
    opacity: 1
  };

  // Determine whether to show country markers or sub-region markers
  const showSubRegions = currentZoom >= 6 || selectedRegion !== null;

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer
              center={[15, -20]}
              zoom={3}
              minZoom={2}
              maxZoom={18}
              maxBounds={worldBounds}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
              />
              
              {/* Show country-level markers when zoomed out */}
              {!showSubRegions && coffeeRegions.map((region) => (
                <Marker
                  key={region.id}
                  position={region.coordinates}
                  icon={countryIcon}
                  eventHandlers={{
                    click: () => handleRegionClick(region)
                  }}
                >
                  <Popup>
                    <div className="region-popup">
                      <div className="region-name">{region.name}</div>
                      <div className="region-local">{region.nameLocal}</div>
                      <div className="region-brews">Total Brews: {region.brewCount}</div>
                      <div className="region-description">{region.description}</div>
                      <div className="region-hint">Click to zoom in and see sub-regions</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Show sub-region markers when zoomed in or region selected */}
              {showSubRegions && Object.entries(subRegionData).map(([subRegionId, subRegion]) => {
                // Only show sub-regions for the selected region, or all if no region is selected
                if (selectedRegion && subRegion.parentRegion !== selectedRegion.id) return null;
                if (!subRegion.coordinates) return null;
                
                const parentRegion = coffeeRegions.find(r => r.id === subRegion.parentRegion);
                
                return (
                  <Marker
                    key={`marker-${subRegionId}`}
                    position={subRegion.coordinates}
                    icon={subRegionIcon}
                    eventHandlers={{
                      click: () => handleSubRegionClick(subRegion)
                    }}
                  >
                    <Popup maxWidth={350}>
                      <BrewStatsPopup subRegion={subRegion} parentRegion={parentRegion} />
                    </Popup>
                  </Marker>
                );
              })}
              
              <MapEventHandler 
                onZoomChange={setCurrentZoom}
                onMoveChange={setCurrentCenter}
              />
              
              <ZoomControls />
              
              {/* Component to close popups when back button is clicked */}
              <PopupCloser 
                shouldClose={closePopup} 
                onClosed={() => setClosePopup(false)}
              />
              
              {/* Zoom to selected coordinates */}
              <BoundaryFitter 
                coordinates={
                  selectedSubRegion?.coordinates || 
                  selectedRegion?.coordinates || 
                  null
                }
                resetView={resetView}
                zoomLevel={selectedSubRegion ? 12 : selectedRegion ? 7 : 3}
              />
            </MapContainer>
          </div>
        );
      case 'by-notes':
        return (
          <div className="map-wrapper">
            <ByNotes />
          </div>
        );
      case 'raw-data':
        return (
          <div className="map-wrapper">
            <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>
              <h2>Raw Data</h2>
              <p>This tab will show your raw brewing data in table format.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="brazil-map-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">☕</div>
            <div className="logo-text">
              <h1>Coffee Journey</h1>
              <p>Taste Map</p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{brewStats.totalBrews}</div>
            <div className="stat-label">Total Brews</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{brewStats.regionCount}</div>
            <div className="stat-label">Regions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {coffeeRegions.reduce((total, region) => total + region.subRegions.length, 0)}
            </div>
            <div className="stat-label">Farms</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{Object.keys(brewStats.regions).length}</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>

        <div className="nav-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'coffee-map' ? 'active' : ''}`}
            onClick={() => setActiveTab('coffee-map')}
          >
            <span className="tab-icon">🗺️</span>
            Coffee Map
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'by-notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('by-notes')}
          >
            <span className="tab-icon">📝</span>
            Tasting Notes
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'raw-data' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw-data')}
          >
            <span className="tab-icon">📊</span>
            Brew Data
          </button>
        </div>

        <div className="regions-list">
          <h3>Tasted Regions</h3>
          
          {coffeeRegions.map((region) => (
            <div 
              key={region.id} 
              className="region-item"
              onClick={() => handleRegionClick(region)}
            >
              <div className="region-header">
                <div>
                  <div className="region-name">{region.name}</div>
                  <div className="region-name-local">{region.nameLocal}</div>
                </div>
                <div className="region-badge">{region.brewCount} brews</div>
              </div>
              {region.subRegions && region.subRegions.length > 0 && (
                <div className="region-subregions">
                  {region.subRegions.map((subRegion) => (
                    <span key={subRegion.id} className="subregion-pill">
                      {subRegion.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="sidebar-back-button" onClick={toggleSidebar} title="Close Menu">
          ←
        </button>
      </aside>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="breadcrumb">
            <div className="breadcrumb-item breadcrumb-home">
              🏠 {selectedSubRegion ? 'World' : selectedRegion ? selectedRegion.name : 'World Map'}
            </div>
            {(selectedRegion || selectedSubRegion) && <span>›</span>}
            {selectedRegion && !selectedSubRegion && (
              <div className="breadcrumb-item breadcrumb-current">
                {selectedRegion.name}
              </div>
            )}
            {selectedSubRegion && (
              <>
                <div className="breadcrumb-item">
                  {selectedRegion?.name}
                </div>
                <span>›</span>
                <div className="breadcrumb-item breadcrumb-current">
                  {selectedSubRegion.name}
                </div>
              </>
            )}
          </div>
          <div className="top-bar-actions">
            {(selectedRegion || selectedSubRegion) && activeTab === 'coffee-map' && (
              <button className="btn btn-secondary" onClick={handleBackToMap}>
                ← Back
              </button>
            )}
            <button className="btn btn-secondary" onClick={toggleSidebar}>
              ☰ Menu
            </button>
          </div>
        </div>

        {renderTabContent()}
      </main>
    </div>
  );
}

export default BrazilMap;