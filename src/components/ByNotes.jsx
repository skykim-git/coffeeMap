import React, { useState, useMemo } from 'react';
import { brewRecords } from '../data/brewData';
import '../styles/ByNotes.css';

// Coffee regions data with sub-regions
const coffeeRegions = [
  {
    id: 'guatemala',
    name: 'Guatemala',
    subRegions: [
      {
        id: 'labella',
        name: 'La Bella',
        nameLocal: '라 벨라',
        type: 'farm',
        beanName: 'Guatemala La Bella Pacamara Natural'
      }
    ]
  },
  {
    id: 'ethiopia',
    name: 'Ethiopia',
    subRegions: [
      {
        id: 'bensa-odako',
        name: 'Bensa Odako',
        nameLocal: '벤사 오다코',
        type: 'micro-region',
        beanName: 'Ethiopia Sidama Bensa Odako G1 Natural'
      },
      {
        id: 'bensa-hamasho',
        name: 'Bensa Hamasho',
        nameLocal: '벤사 하마쇼',
        type: 'micro-region',
        beanName: 'Ethiopia Sidama Bensa Hamasho G1 Washed'
      }
    ]
  },
  {
    id: 'colombia',
    name: 'Colombia',
    subRegions: [
      {
        id: 'el-diviso',
        name: 'El Diviso',
        nameLocal: '엘 디비소',
        type: 'farm',
        beanName: 'Colombia El Diviso Chiroso Natural'
      },
      {
        id: 'finca-la-roma',
        name: 'Finca La Roma',
        nameLocal: '핀카 라 로마',
        type: 'farm',
        beanName: 'Colombia Finca La Roma Pink Champagne Co-fermentation'
      }
    ]
  },
  {
    id: 'costarica',
    name: 'Costa Rica',
    subRegions: [
      {
        id: 'labrador',
        name: 'Labrador',
        nameLocal: '라브라도르',
        type: 'farm',
        beanName: 'Costa Rica San Isidro Labrador Geisha Anaerobic Natural'
      }
    ]
  }
];

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

// Helper function to extract all flavor words from brew data
const extractAllFlavorWords = () => {
  const allWords = {};
  
  brewRecords.forEach(brew => {
    if (!brew.notes || brew.notes === '?' || brew.notes.trim() === '') return;
    
    const words = brew.notes
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      );
    
    words.forEach(word => {
      const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
      if (!allWords[capitalizedWord]) {
        allWords[capitalizedWord] = {
          word: capitalizedWord,
          count: 0,
          subRegions: new Set()
        };
      }
      allWords[capitalizedWord].count++;
      allWords[capitalizedWord].subRegions.add(brew.beans);
    });
  });
  
  // Convert sets to arrays and sort by frequency
  return Object.values(allWords)
    .map(item => ({
      ...item,
      subRegions: Array.from(item.subRegions)
    }))
    .sort((a, b) => b.count - a.count);
};

// Helper function to extract flavor notes for a specific bean
const extractFlavorNotes = (beanName) => {
  const brews = brewRecords.filter(brew => brew.beans === beanName);
  
  if (brews.length === 0) return [];
  
  const allNotes = brews
    .map(brew => brew.notes)
    .filter(note => note && note !== '?' && note.trim() !== '')
    .join(' ');
  
  if (!allNotes) return [];
  
  const words = allNotes
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );
  
  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

// Get all subregions flattened
const getAllSubRegions = () => {
  return coffeeRegions.flatMap(region => 
    region.subRegions.map(subRegion => ({
      ...subRegion,
      parentCountry: region.name
    }))
  );
};

function ByNotes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  
  // Get all unique flavor words
  const allFlavorWords = useMemo(() => extractAllFlavorWords(), []);
  
  // Get all subregions
  const allSubRegions = useMemo(() => getAllSubRegions(), []);
  
  // Get top 10 most common flavors for quick access
  const topFlavors = useMemo(() => allFlavorWords.slice(0, 10), [allFlavorWords]);
  
  // Filter flavors based on search
  const filteredFlavors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allFlavorWords.filter(item => 
      item.word.toLowerCase().includes(query)
    ).slice(0, 20); // Limit to 20 results
  }, [searchQuery, allFlavorWords]);
  
  // Get subregions for selected flavor
  const filteredSubRegions = useMemo(() => {
    if (!selectedFlavor) return [];
    
    return allSubRegions.filter(subRegion => {
      const flavorNotes = extractFlavorNotes(subRegion.beanName);
      return flavorNotes.some(note => 
        note.toLowerCase() === selectedFlavor.toLowerCase()
      );
    });
  }, [selectedFlavor, allSubRegions]);
  
  // Handle flavor tag click
  const handleFlavorClick = (flavor) => {
    setSelectedFlavor(flavor);
    setSearchQuery('');
  };
  
  // Handle clear filter
  const handleClearFilter = () => {
    setSelectedFlavor(null);
    setSearchQuery('');
  };
  
  return (
    <div className="by-notes-container">
      <div className="by-notes-content">
        {/* Header */}
        <div className="by-notes-header">
          <h2>📝 Browse by Flavor Notes</h2>
          <p>Explore coffee regions by their tasting notes and flavor profiles</p>
        </div>
        
        {/* Top flavor tags */}
        <div className="top-flavors-section">
          <div className="flavor-tags-grid">
            {topFlavors.map((item, index) => (
              <button
                key={index}
                className={`flavor-tag-button ${item.word.toLowerCase()} ${selectedFlavor === item.word ? 'active' : ''}`}
                onClick={() => handleFlavorClick(item.word)}
                title={`${item.count} mentions across ${item.subRegions.length} regions`}
              >
                {item.word}
                <span className="flavor-count">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Search section */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search for flavor notes (e.g., fruity, floral, nutty)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {(searchQuery || selectedFlavor) && (
              <button 
                className="clear-button"
                onClick={handleClearFilter}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Search results dropdown */}
          {searchQuery && filteredFlavors.length > 0 && (
            <div className="search-results-dropdown">
              {filteredFlavors.map((item, index) => (
                <button
                  key={index}
                  className="search-result-item"
                  onClick={() => handleFlavorClick(item.word)}
                >
                  <span className="result-word">{item.word}</span>
                  <span className="result-stats">
                    {item.count} mentions • {item.subRegions.length} regions
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {searchQuery && filteredFlavors.length === 0 && (
            <div className="search-results-dropdown">
              <div className="no-results">
                No flavor notes found for "{searchQuery}"
              </div>
            </div>
          )}
        </div>
        
        {/* Results section */}
        {selectedFlavor && (
          <div className="results-section">
            <div className="results-header">
              <h3>
                Regions with <span className={`flavor-highlight ${selectedFlavor.toLowerCase()}`}>{selectedFlavor}</span> notes
              </h3>
              <span className="results-count">
                {filteredSubRegions.length} {filteredSubRegions.length === 1 ? 'region' : 'regions'} found
              </span>
            </div>
            
            <div className="subregions-list">
              {filteredSubRegions.map((subRegion, index) => {
                const allNotes = extractFlavorNotes(subRegion.beanName);
                const brewCount = brewRecords.filter(b => b.beans === subRegion.beanName).length;
                
                return (
                  <div key={index} className="subregion-card">
                    <div className="subregion-card-header">
                      <div>
                        <h4>{subRegion.name}</h4>
                        <p className="subregion-local">{subRegion.nameLocal}</p>
                      </div>
                      <div className="subregion-meta">
                        <span className="meta-badge">{subRegion.parentCountry}</span>
                        <span className="meta-badge">{subRegion.type}</span>
                      </div>
                    </div>
                    
                    <div className="subregion-card-body">
                      <div className="brew-count">
                        ☕ {brewCount} {brewCount === 1 ? 'brew' : 'brews'}
                      </div>
                      
                      {allNotes.length > 0 && (
                        <div className="subregion-flavors">
                          <span className="flavors-label">Flavor notes:</span>
                          <div className="flavor-tags-inline">
                            {allNotes.map((note, noteIndex) => (
                              <span 
                                key={noteIndex} 
                                className={`flavor-tag-mini ${note.toLowerCase()} ${note.toLowerCase() === selectedFlavor.toLowerCase() ? 'highlighted' : ''}`}
                              >
                                {note}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredSubRegions.length === 0 && (
              <div className="no-results-message">
                <p>No regions found with "{selectedFlavor}" notes.</p>
                <p className="hint">Try selecting a different flavor tag above.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Empty state */}
        {!selectedFlavor && !searchQuery && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Discover Coffee by Flavor</h3>
            <p>Click on a flavor tag above or use the search to find regions with specific tasting notes.</p>
            <div className="empty-state-stats">
              <div className="stat-item">
                <span className="stat-number">{allFlavorWords.length}</span>
                <span className="stat-label">Unique Flavors</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{allSubRegions.length}</span>
                <span className="stat-label">Regions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{brewRecords.length}</span>
                <span className="stat-label">Brews</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ByNotes;