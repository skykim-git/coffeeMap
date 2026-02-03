import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';

// Coffee regions data with sub-regions and search terms
const coffeeRegions = [
  {
    id: 'guatemala',
    name: 'Guatemala',
    nameLocal: '과테말라',
    city: 'La Bella',
    cityLocal: '라 벨라',
    coordinates: [15.7835, -90.2308],
    country: 'Guatemala',
    countryCode: 'GTM',
    brewCount: 4,
    description: 'Central American coffee region known for volcanic soil',
    subRegions: [
      {
        id: 'labella',
        name: 'La Bella',
        nameLocal: '라 벨라',
        searchTerms: {
          city: 'La Bella',
          country: 'Guatemala'
        },
        coordinates: null,
        boundary: null,
        brewCount: 4,
        type: 'farm'
      }
    ]
  },
  {
    id: 'ethiopia',
    name: 'Ethiopia',
    nameLocal: '예티오피아',
    city: 'Sidama',
    cityLocal: '시다마',
    coordinates: [6.8500, 38.3000],
    country: 'Ethiopia',
    countryCode: 'ETH',
    brewCount: 6,
    description: 'Birthplace of coffee with diverse flavor profiles',
    subRegions: [
      {
        id: 'bensa-odako',
        name: 'Bensa Odako',
        nameLocal: '벤사 오다코',
        searchTerms: {
          city: 'Bensa',
          state: 'Sidama',
          country: 'Ethiopia'
        },
        coordinates: null,
        boundary: null,
        brewCount: 4,
        type: 'micro-region'
      },
      {
        id: 'bensa-hamasho',
        name: 'Bensa Hamasho',
        nameLocal: '벤사 하마쇼',
        searchTerms: {
          city: 'Bensa',
          state: 'Sidama',
          country: 'Ethiopia'
        },
        coordinates: null,
        boundary: null,
        brewCount: 2,
        type: 'micro-region'
      }
    ]
  },
  {
    id: 'colombia',
    name: 'Colombia',
    nameLocal: '콜롬비아',
    city: 'Multiple Farms',
    cityLocal: '여러 농장',
    coordinates: [4.7110, -74.0721],
    country: 'Colombia',
    countryCode: 'COL',
    brewCount: 2,
    description: 'South American coffee powerhouse with balanced flavors',
    subRegions: [
      {
        id: 'el-diviso',
        name: 'El Diviso',
        nameLocal: '엘 디비소',
        searchTerms: {
          city: 'El Diviso',
          country: 'Colombia'
        },
        coordinates: null,
        boundary: null,
        brewCount: 1,
        type: 'farm'
      },
      {
        id: 'finca-la-roma',
        name: 'Finca La Roma',
        nameLocal: '핀카 라 로마',
        searchTerms: {
          city: 'La Roma',
          country: 'Colombia'
        },
        coordinates: null,
        boundary: null,
        brewCount: 1,
        type: 'farm'
      }
    ]
  },
  {
    id: 'costarica',
    name: 'Costa Rica',
    nameLocal: '코스타리카',
    city: 'San Isidro',
    cityLocal: '산 이시드로',
    coordinates: [9.3333, -83.7000],
    country: 'Costa Rica',
    countryCode: 'CRI',
    brewCount: 1,
    description: 'Known for high-quality Arabica beans',
    subRegions: [
      {
        id: 'labrador',
        name: 'Labrador',
        nameLocal: '라브라도르',
        searchTerms: {
          city: 'San Isidro',
          country: 'Costa Rica'
        },
        coordinates: null,
        boundary: null,
        brewCount: 1,
        type: 'farm'
      }
    ]
  }
];

const brewStats = {
  totalBrews: 12,
  regionCount: 4,
  regions: {
    'Guatemala': 4,
    'Ethiopia': 6,
    'Colombia': 2,
    'Costa Rica': 1
  },
  mostUsedRegion: 'Ethiopia',
  dateRange: {
    start: '2026-01-20',
    end: '2026-02-02'
  }
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
  );
}

// Component to handle zooming to boundaries
function BoundaryFitter({ boundary, coordinates, resetView, zoomLevel = 7 }) {
  const map = useMap();

  useEffect(() => {
    if (boundary) {
      const geoJsonLayer = L.geoJSON(boundary);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: zoomLevel });
      }
    } else if (coordinates) {
      // Zoom to specific coordinates
      map.setView(coordinates, zoomLevel);
    } else if (resetView) {
      map.setView([15, -20], 3);
    }
  }, [boundary, coordinates, resetView, zoomLevel, map]);

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
  const [countryBoundaries, setCountryBoundaries] = useState({});
  const [subRegionData, setSubRegionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSubRegions, setLoadingSubRegions] = useState(false);
  const [resetView, setResetView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('coffee-map');

  const worldBounds = [
    [-60, -180],
    [75, 180]
  ];

  // Fetch country boundaries on mount
  useEffect(() => {
    const fetchCountryBoundaries = async () => {
      const boundaries = {};
      
      console.log('🌍 Starting to fetch country boundaries...');
      console.log('📊 Total regions to fetch:', coffeeRegions.length);
      
      for (const region of coffeeRegions) {
        try {
          console.log(`🔍 Fetching boundary for ${region.name} (${region.country})...`);
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(region.country)}&format=json&polygon_geojson=1&limit=1`
          );
          const data = await response.json();
          
          if (data.length > 0 && data[0].geojson) {
            boundaries[region.id] = {
              type: 'Feature',
              geometry: data[0].geojson,
              properties: { name: region.country }
            };
            console.log(`✅ Boundary found for ${region.name}`);
          } else {
            console.warn(`❌ No boundary data returned for ${region.name}`);
            console.log('Response data:', data);
          }
          
          // Add delay to respect API rate limits (1 request per second)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error loading boundary for ${region.name}:`, error);
        }
      }
      
      console.log('✅ Finished fetching country boundaries. Total loaded:', Object.keys(boundaries).length);
      setCountryBoundaries(boundaries);
      setLoading(false);
      
      // Start fetching sub-regions after countries are loaded
      fetchSubRegions();
    };

    fetchCountryBoundaries();
  }, []);

  // Fetch sub-region coordinates and boundaries
  const fetchSubRegions = async () => {
    setLoadingSubRegions(true);
    const subRegions = {};
    
    console.log('🏙️ Starting to fetch sub-region data...');
    
    for (const region of coffeeRegions) {
      if (!region.subRegions) continue;
      
      for (const subRegion of region.subRegions) {
        try {
          console.log(`🔍 Fetching ${subRegion.name} (${region.name})...`);
          
          // Build search query
          const params = new URLSearchParams({
            format: 'json',
            polygon_geojson: 1,
            limit: 1
          });
          
          if (subRegion.searchTerms.city) {
            params.append('city', subRegion.searchTerms.city);
          }
          if (subRegion.searchTerms.state) {
            params.append('state', subRegion.searchTerms.state);
          }
          if (subRegion.searchTerms.country) {
            params.append('country', subRegion.searchTerms.country);
          }
          
          const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
          console.log(`   Query: ${url}`);
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.length > 0) {
            const result = data[0];
            const coordinates = [parseFloat(result.lat), parseFloat(result.lon)];
            
            subRegions[subRegion.id] = {
              ...subRegion,
              coordinates: coordinates,
              boundary: result.geojson ? {
                type: 'Feature',
                geometry: result.geojson,
                properties: { name: subRegion.name }
              } : null,
              parentRegion: region.id
            };
            
            console.log(`✅ Found ${subRegion.name} at [${coordinates[0]}, ${coordinates[1]}]`);
            if (result.geojson) {
              console.log(`   📐 Boundary also available`);
            }
          } else {
            // Fallback: use parent region coordinates
            console.warn(`⚠️ No data found for ${subRegion.name}, using parent region coordinates`);
            subRegions[subRegion.id] = {
              ...subRegion,
              coordinates: region.coordinates,
              boundary: null,
              parentRegion: region.id
            };
          }
          
          // Add delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error fetching ${subRegion.name}:`, error);
          // Fallback to parent coordinates
          subRegions[subRegion.id] = {
            ...subRegion,
            coordinates: region.coordinates,
            boundary: null,
            parentRegion: region.id
          };
        }
      }
    }
    
    console.log('✅ Finished fetching sub-regions. Total loaded:', Object.keys(subRegions).length);
    setSubRegionData(subRegions);
    setLoadingSubRegions(false);
  };

  // Handle region marker click - zoom to country boundary
  const handleRegionClick = (region) => {
    setSelectedRegion(region);
    setSelectedSubRegion(null);
    setResetView(false);
  };

  // Handle sub-region marker click - zoom to sub-region
  const handleSubRegionClick = (subRegion) => {
    setSelectedSubRegion(subRegion);
    setResetView(false);
  };

  // Handle back button - return to world view
  const handleBackToMap = () => {
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
              
              {/* Country boundaries for coffee regions */}
              {Object.entries(countryBoundaries).map(([regionId, boundary]) => (
                <GeoJSON 
                  key={regionId}
                  data={boundary} 
                  style={selectedRegion?.id === regionId ? selectedCountryStyle : countryStyle}
                />
              ))}
              
              {/* Sub-region boundaries */}
              {showSubRegions && Object.entries(subRegionData).map(([subRegionId, subRegion]) => {
                // Only show sub-regions for the selected region, or all if no region is selected
                if (selectedRegion && subRegion.parentRegion !== selectedRegion.id) return null;
                if (!subRegion.boundary) return null;
                
                return (
                  <GeoJSON
                    key={`boundary-${subRegionId}`}
                    data={subRegion.boundary}
                    style={selectedSubRegion?.id === subRegionId ? selectedSubRegionStyle : subRegionStyle}
                  />
                );
              })}
              
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
                
                return (
                  <Marker
                    key={`marker-${subRegionId}`}
                    position={subRegion.coordinates}
                    icon={subRegionIcon}
                    eventHandlers={{
                      click: () => handleSubRegionClick(subRegion)
                    }}
                  >
                    <Popup>
                      <div className="region-popup">
                        <div className="region-name">{subRegion.name}</div>
                        <div className="region-local">{subRegion.nameLocal}</div>
                        <div className="region-brews">Brews: {subRegion.brewCount}</div>
                        <div className="region-description">
                          Type: {subRegion.type}
                          <br />
                          Region: {coffeeRegions.find(r => r.id === subRegion.parentRegion)?.name}
                        </div>
                        <div className="region-hint">Click marker to zoom in</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              <MapEventHandler 
                onZoomChange={setCurrentZoom}
                onMoveChange={setCurrentCenter}
              />
              
              <ZoomControls />
              
              {/* Zoom to selected boundary or coordinates */}
              <BoundaryFitter 
                boundary={
                  selectedSubRegion?.boundary || 
                  (selectedRegion && countryBoundaries[selectedRegion.id]) || 
                  null
                }
                coordinates={selectedSubRegion && !selectedSubRegion.boundary ? selectedSubRegion.coordinates : null}
                resetView={resetView}
                zoomLevel={selectedSubRegion ? 12 : 7}
              />
            </MapContainer>
          </div>
        );
      case 'by-notes':
        return (
          <div className="map-wrapper">
            <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>
              <h2>By Notes</h2>
              <p>This tab will show your brewing notes organized by categories.</p>
            </div>
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
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-back-button" onClick={toggleSidebar} title="Close Menu">
          ←
        </button>
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'coffee-map' ? 'active' : ''}`}
            onClick={() => setActiveTab('coffee-map')}
          >
            ☕ Coffee Map
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'by-notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('by-notes')}
          >
            📝 By Notes
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'raw-data' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw-data')}
          >
            📊 Raw Data
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Header */}
      <div className="map-header">
        <div className="header-content">
          <button className="menu-button" onClick={toggleSidebar} title="Open Menu">
            ☰
          </button>

          {(selectedRegion || selectedSubRegion) && activeTab === 'coffee-map' && (
            <button className="back-button" onClick={handleBackToMap} title="Back">
              ← Back
            </button>
          )}
          
          <div className="header-left">
            <div className="header-icon">☕</div>
            <div>
              <h1>Coffee Regions Map</h1>
              <p>
                {activeTab === 'coffee-map' && selectedSubRegion
                  ? `Viewing ${selectedSubRegion.name}` 
                  : activeTab === 'coffee-map' && selectedRegion 
                  ? `Viewing ${selectedRegion.name} sub-regions` 
                  : activeTab === 'coffee-map'
                  ? 'Click on countries to see farms and micro-regions'
                  : activeTab === 'by-notes'
                  ? 'View notes and annotations'
                  : 'View raw data'}
              </p>
            </div>
          </div>

          {selectedRegion && !selectedSubRegion && activeTab === 'coffee-map' && (
            <div className="city-info-header">
              <div className="city-info-content">
                <h2>{selectedRegion.name}</h2>
                <p>Brews: {selectedRegion.brewCount} | {selectedRegion.subRegions?.length || 0} sub-regions</p>
              </div>
            </div>
          )}

          {selectedSubRegion && activeTab === 'coffee-map' && (
            <div className="city-info-header">
              <div className="city-info-content">
                <h2>{selectedSubRegion.name}</h2>
                <p>Type: {selectedSubRegion.type} | Brews: {selectedSubRegion.brewCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {renderTabContent()}
    </div>
  );
}

export default BrazilMap;