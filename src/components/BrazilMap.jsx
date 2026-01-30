import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/BrazilMap.css';
import ByNotes from './ByNotes';
import RawData from './RawData';

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
        onClick={() => map.setView([-14.235, -51.9253], 5)}
        className="zoom-button"
        title="Reset view"
      >
        ⊡
      </button>
    </div>
  );
}

// Component to handle zooming to city bounds
function CityBoundsFitter({ cityBoundary, resetView }) {
  const map = useMap();

  useEffect(() => {
    if (cityBoundary) {
      const geoJsonLayer = L.geoJSON(cityBoundary);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [0, 0], maxZoom: 15 });
      }
    } else if (resetView) {
      // Reset to Brazil view
      map.setView([-14.235, -51.9253], 5);
    }
  }, [cityBoundary, resetView, map]);

  return null;
}

// Major Brazilian cities
const brazilianCities = [
  { name: 'São Paulo', coordinates: [-23.5505, -46.6333], population: '12.3M' },
  { name: 'Rio de Janeiro', coordinates: [-22.9068, -43.1729], population: '6.7M' },
  { name: 'Brasília', coordinates: [-15.8267, -47.9218], population: '3.1M' },
  { name: 'Salvador', coordinates: [-12.9714, -38.5014], population: '2.9M' },
  { name: 'Fortaleza', coordinates: [-3.7172, -38.5433], population: '2.7M' },
  { name: 'Belo Horizonte', coordinates: [-19.9167, -43.9345], population: '2.5M' },
  { name: 'Manaus', coordinates: [-3.1190, -60.0217], population: '2.2M' },
  { name: 'Curitiba', coordinates: [-25.4284, -49.2733], population: '1.9M' },
  { name: 'Recife', coordinates: [-8.0476, -34.8770], population: '1.7M' },
  { name: 'Porto Alegre', coordinates: [-30.0346, -51.2177], population: '1.5M' }
];

// Custom icon for cities
const cityIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#2563eb" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

function BrazilMap() {
  const [currentZoom, setCurrentZoom] = useState(5);
  const [currentCenter, setCurrentCenter] = useState({ lat: '-14.2350', lng: '-51.9253' });
  const [brazilBoundary, setBrazilBoundary] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityBoundaries, setCityBoundaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [resetView, setResetView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('coffee-map');

  // Brazil bounds
  const brazilBounds = [
    [5.27438888, -73.98283055],
    [-33.75116944, -34.79314722]
  ];

  // Fetch Brazil boundary on mount
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(response => response.json())
      .then(data => {
        const brazil = data.features.find(feature => 
          feature.properties.ADMIN === 'Brazil' || feature.properties.ISO_A3 === 'BRA'
        );
        if (brazil) {
          setBrazilBoundary(brazil);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading Brazil boundary:', error);
        setLoading(false);
      });
  }, []);

  // Fetch all city boundaries on mount
  useEffect(() => {
    const fetchCityBoundaries = async () => {
      const boundaries = {};
      
      for (const city of brazilianCities) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city.name)}&country=Brazil&format=json&polygon_geojson=1&limit=1`
          );
          const data = await response.json();
          
          if (data.length > 0 && data[0].geojson) {
            boundaries[city.name] = {
              type: 'Feature',
              geometry: data[0].geojson,
              properties: { name: city.name }
            };
          }
          
          // Add delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error loading boundary for ${city.name}:`, error);
        }
      }
      
      setCityBoundaries(boundaries);
    };

    fetchCityBoundaries();
  }, []);

  // Handle city marker click - zoom to city boundary
  const handleCityClick = (city) => {
    setSelectedCity(city);
    setResetView(false);
  };

  // Handle back button - return to Brazil view
  const handleBackToMap = () => {
    setSelectedCity(null);
    setResetView(true);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Style for Brazil boundary
  const brazilStyle = {
    fillColor: 'transparent',
    fillOpacity: 0,
    color: '#1e40af',
    weight: 3,
    opacity: 0.8
  };

  // Style for city boundaries (not selected)
  const cityStyle = {
    fillColor: '#3b82f6',
    fillOpacity: 0.05,
    color: '#60a5fa',
    weight: 1.5,
    opacity: 0.6
  };

  // Style for selected city boundary
  const selectedCityStyle = {
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    color: '#2563eb',
    weight: 3,
    opacity: 1
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'coffee-map':
        return (
          <div className="map-wrapper">
            <MapContainer
              center={[-14.235, -51.9253]}
              zoom={5}
              minZoom={4}
              maxZoom={18}
              maxBounds={brazilBounds}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
              />
              
              {/* Brazil boundary */}
              {brazilBoundary && (
                <GeoJSON 
                  data={brazilBoundary} 
                  style={brazilStyle}
                />
              )}
              
              {/* All city boundaries */}
              {Object.entries(cityBoundaries).map(([cityName, boundary]) => (
                <GeoJSON 
                  key={cityName}
                  data={boundary} 
                  style={selectedCity?.name === cityName ? selectedCityStyle : cityStyle}
                />
              ))}
              
              {/* City markers */}
              {brazilianCities.map((city, idx) => (
                <Marker
                  key={idx}
                  position={city.coordinates}
                  icon={cityIcon}
                  eventHandlers={{
                    click: () => handleCityClick(city)
                  }}
                />
              ))}
              
              <MapEventHandler 
                onZoomChange={setCurrentZoom}
                onMoveChange={setCurrentCenter}
              />
              
              <ZoomControls />
              
              {/* Zoom to selected city boundary or reset view */}
              <CityBoundsFitter 
                cityBoundary={selectedCity && cityBoundaries[selectedCity.name] ? cityBoundaries[selectedCity.name] : null}
                resetView={resetView}
              />
            </MapContainer>

            {/* Info Panel */}
            <div className="info-panel">
              <div className="info-header">
                <span className="info-icon">📍</span>
                <h3>Map Info</h3>
              </div>
              <div className="info-content">
                <p><strong>Zoom Level:</strong> {currentZoom}</p>
                <p><strong>Center:</strong> {currentCenter.lat}, {currentCenter.lng}</p>
                {loading && (
                  <p className="loading-text">Loading boundaries...</p>
                )}
                <p className="info-help">
                  All city boundaries are visible. Click on city markers to zoom in. Blue line shows Brazil's border.
                </p>
              </div>
            </div>
          </div>
        );
      case 'by-notes':
        return <ByNotes />;
      case 'raw-data':
        return <RawData />;
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

          {selectedCity && activeTab === 'coffee-map' && (
            <button className="back-button" onClick={handleBackToMap} title="Back to Brazil Map">
              ← Back
            </button>
          )}
          
          <div className="header-left">
            <div className="header-icon">📍</div>
            <div>
              <h1>Brazil Map</h1>
              <p>
                {activeTab === 'coffee-map' && selectedCity 
                  ? 'Click back arrow to return to full map' 
                  : activeTab === 'coffee-map'
                  ? 'Click on cities to zoom into their boundaries'
                  : activeTab === 'by-notes'
                  ? 'View notes and annotations'
                  : 'View raw data'}
              </p>
            </div>
          </div>

          {selectedCity && activeTab === 'coffee-map' && (
            <div className="city-info-header">
              <div className="city-info-content">
                <h2>{selectedCity.name}</h2>
                <p>Population: {selectedCity.population}</p>
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