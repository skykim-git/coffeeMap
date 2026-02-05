// Comprehensive Coffee Regions Database
// This contains famous coffee-producing regions worldwide
// Only regions that appear in brewRecords will be displayed on the map

export const allCoffeeRegions = [
  // GUATEMALA
  {
    id: 'guatemala-antigua',
    name: 'Antigua',
    nameLocal: '안티구아',
    country: 'Guatemala',
    countryCode: 'GTM',
    coordinates: [14.5611, -90.7344],
    description: 'Volcanic region producing rich, complex coffees with chocolate notes',
    altitude: '1500-1700m',
    subRegions: [
      {
        id: 'labella',
        name: 'La Bella',
        nameLocal: '라 벨라',
        coordinates: [14.5611, -90.7344], // Near Antigua
        type: 'farm',
        beanName: 'Guatemala La Bella Pacamara Natural'
      }
    ]
  },
  {
    id: 'guatemala-huehuetenango',
    name: 'Huehuetenango',
    nameLocal: '우에우에테낭고',
    country: 'Guatemala',
    countryCode: 'GTM',
    coordinates: [15.3197, -91.4714],
    description: 'High-altitude region known for bright acidity and wine-like characteristics',
    altitude: '1500-2000m',
    subRegions: []
  },
  {
    id: 'guatemala-atitlan',
    name: 'Atitlán',
    nameLocal: '아티틀란',
    country: 'Guatemala',
    countryCode: 'GTM',
    coordinates: [14.6906, -91.2025],
    description: 'Lakeside region with volcanic soil producing balanced, sweet coffees',
    altitude: '1500-1700m',
    subRegions: []
  },

  // ETHIOPIA
  {
    id: 'ethiopia-sidama',
    name: 'Sidama',
    nameLocal: '시다마',
    country: 'Ethiopia',
    countryCode: 'ETH',
    coordinates: [6.8500, 38.3000],
    description: 'Southern region known for bright, fruity coffees with floral notes',
    altitude: '1500-2200m',
    subRegions: [
      {
        id: 'bensa-odako',
        name: 'Bensa Odako',
        nameLocal: '벤사 오다코',
        coordinates: [6.4167, 38.4167], // Bensa area in Sidama
        type: 'micro-region',
        beanName: 'Ethiopia Sidama Bensa Odako G1 Natural'
      },
      {
        id: 'bensa-hamasho',
        name: 'Bensa Hamasho',
        nameLocal: '벤사 하마쇼',
        coordinates: [6.4167, 38.4167], // Bensa area in Sidama
        type: 'micro-region',
        beanName: 'Ethiopia Sidama Bensa Hamasho G1 Washed'
      }
    ]
  },
  {
    id: 'ethiopia-yirgacheffe',
    name: 'Yirgacheffe',
    nameLocal: '이르가체페',
    country: 'Ethiopia',
    countryCode: 'ETH',
    coordinates: [6.1625, 38.1983],
    description: 'Famous for delicate, tea-like coffees with jasmine and citrus notes',
    altitude: '1700-2200m',
    subRegions: []
  },
  {
    id: 'ethiopia-guji',
    name: 'Guji',
    nameLocal: '구지',
    country: 'Ethiopia',
    countryCode: 'ETH',
    coordinates: [5.8833, 38.8333],
    description: 'Produces complex, fruity coffees with berry and stone fruit flavors',
    altitude: '1800-2200m',
    subRegions: []
  },
  {
    id: 'ethiopia-harar',
    name: 'Harar',
    nameLocal: '하라르',
    country: 'Ethiopia',
    countryCode: 'ETH',
    coordinates: [9.3142, 42.1183],
    description: 'Eastern region known for wild, wine-like coffees with blueberry notes',
    altitude: '1500-2100m',
    subRegions: []
  },

  // COLOMBIA
  {
    id: 'colombia-huila',
    name: 'Huila',
    nameLocal: '우일라',
    country: 'Colombia',
    countryCode: 'COL',
    coordinates: [2.5350, -75.5277],
    description: 'Southern region producing sweet, fruity coffees with caramel notes',
    altitude: '1200-2100m',
    subRegions: [
      {
        id: 'el-diviso',
        name: 'El Diviso',
        nameLocal: '엘 디비소',
        coordinates: [2.5350, -75.5277], // Huila region
        type: 'farm',
        beanName: 'Colombia El Diviso Chiroso Natural'
      }
    ]
  },
  {
    id: 'colombia-narino',
    name: 'Nariño',
    nameLocal: '나리뇨',
    country: 'Colombia',
    countryCode: 'COL',
    coordinates: [1.2136, -77.2811],
    description: 'High-altitude region near Ecuador with complex, bright coffees',
    altitude: '1500-2300m',
    subRegions: [
      {
        id: 'finca-la-roma',
        name: 'Finca La Roma',
        nameLocal: '핀카 라 로마',
        coordinates: [1.2136, -77.2811], // Nariño region
        type: 'farm',
        beanName: 'Colombia Finca La Roma Pink Champagne Co-fermentation'
      }
    ]
  },
  {
    id: 'colombia-antioquia',
    name: 'Antioquia',
    nameLocal: '안티오키아',
    country: 'Colombia',
    countryCode: 'COL',
    coordinates: [6.2308, -75.5906],
    description: 'Large region producing balanced, medium-bodied coffees',
    altitude: '1300-2100m',
    subRegions: []
  },
  {
    id: 'colombia-tolima',
    name: 'Tolima',
    nameLocal: '톨리마',
    country: 'Colombia',
    countryCode: 'COL',
    coordinates: [3.4219, -75.2322],
    description: 'Central region known for sweet, balanced coffees with good acidity',
    altitude: '1200-1900m',
    subRegions: []
  },

  // COSTA RICA
  {
    id: 'costarica-tarrazu',
    name: 'Tarrazú',
    nameLocal: '타라수',
    country: 'Costa Rica',
    countryCode: 'CRI',
    coordinates: [9.6056, -84.0167],
    description: 'Premier region producing bright, clean coffees with citrus notes',
    altitude: '1200-1900m',
    subRegions: [
      {
        id: 'labrador',
        name: 'San Isidro Labrador',
        nameLocal: '산 이시드로 라브라도르',
        coordinates: [9.3667, -83.7000], // San Isidro de El General
        type: 'farm',
        beanName: 'Costa Rica San Isidro Labrador Geisha Anaerobic Natural'
      }
    ]
  },
  {
    id: 'costarica-west-valley',
    name: 'West Valley',
    nameLocal: '웨스트 밸리',
    country: 'Costa Rica',
    countryCode: 'CRI',
    coordinates: [9.9333, -84.3833],
    description: 'Produces honey-processed coffees with rich body and sweetness',
    altitude: '1000-1600m',
    subRegions: []
  },
  {
    id: 'costarica-central-valley',
    name: 'Central Valley',
    nameLocal: '센트럴 밸리',
    country: 'Costa Rica',
    countryCode: 'CRI',
    coordinates: [9.9281, -84.0907],
    description: 'Historic region around San José with balanced, classic Costa Rican profile',
    altitude: '1200-1600m',
    subRegions: []
  },

  // BRAZIL
  {
    id: 'brazil-minas-gerais',
    name: 'Minas Gerais',
    nameLocal: '미나스 제라이스',
    country: 'Brazil',
    countryCode: 'BRA',
    coordinates: [-19.9167, -43.9345],
    description: 'Largest coffee-producing region with nutty, chocolaty profiles',
    altitude: '800-1300m',
    subRegions: []
  },
  {
    id: 'brazil-cerrado',
    name: 'Cerrado',
    nameLocal: '세하도',
    country: 'Brazil',
    countryCode: 'BRA',
    coordinates: [-18.9186, -48.2772],
    description: 'High plateau region producing sweet, low-acid coffees',
    altitude: '800-1300m',
    subRegions: []
  },
  {
    id: 'brazil-sul-de-minas',
    name: 'Sul de Minas',
    nameLocal: '술 지 미나스',
    country: 'Brazil',
    countryCode: 'BRA',
    coordinates: [-21.7539, -45.4444],
    description: 'Southern Minas region known for sweet, smooth coffees',
    altitude: '700-1200m',
    subRegions: []
  },

  // KENYA
  {
    id: 'kenya-nyeri',
    name: 'Nyeri',
    nameLocal: '니에리',
    country: 'Kenya',
    countryCode: 'KEN',
    coordinates: [-0.4197, 36.9475],
    description: 'Central highlands producing intense, wine-like coffees with blackcurrant notes',
    altitude: '1500-2100m',
    subRegions: []
  },
  {
    id: 'kenya-kirinyaga',
    name: 'Kirinyaga',
    nameLocal: '키리냐가',
    country: 'Kenya',
    countryCode: 'KEN',
    coordinates: [-0.4833, 37.4333],
    description: 'Mount Kenya slopes producing complex, bright coffees',
    altitude: '1300-1900m',
    subRegions: []
  },
  {
    id: 'kenya-kiambu',
    name: 'Kiambu',
    nameLocal: '키암부',
    country: 'Kenya',
    countryCode: 'KEN',
    coordinates: [-1.1714, 36.8356],
    description: 'Near Nairobi, producing citrusy, bright coffees',
    altitude: '1500-2200m',
    subRegions: []
  },

  // PANAMA
  {
    id: 'panama-boquete',
    name: 'Boquete',
    nameLocal: '보케테',
    country: 'Panama',
    countryCode: 'PAN',
    coordinates: [8.7801, -82.4328],
    description: 'Famous for Geisha variety with jasmine and bergamot notes',
    altitude: '1000-1800m',
    subRegions: []
  },
  {
    id: 'panama-volcan',
    name: 'Volcán',
    nameLocal: '볼칸',
    country: 'Panama',
    countryCode: 'PAN',
    coordinates: [8.7833, -82.6333],
    description: 'Volcanic region producing clean, balanced coffees',
    altitude: '1200-2000m',
    subRegions: []
  },

  // RWANDA
  {
    id: 'rwanda-southern',
    name: 'Southern Province',
    nameLocal: '남부 지방',
    country: 'Rwanda',
    countryCode: 'RWA',
    coordinates: [-2.5964, 29.7390],
    description: 'Produces clean, bright coffees with red fruit and floral notes',
    altitude: '1700-2000m',
    subRegions: []
  },
  {
    id: 'rwanda-western',
    name: 'Western Province',
    nameLocal: '서부 지방',
    country: 'Rwanda',
    countryCode: 'RWA',
    coordinates: [-2.0589, 29.3356],
    description: 'Lake Kivu region with sweet, complex coffees',
    altitude: '1500-2100m',
    subRegions: []
  },

  // BURUNDI
  {
    id: 'burundi-kayanza',
    name: 'Kayanza',
    nameLocal: '카얀자',
    country: 'Burundi',
    countryCode: 'BDI',
    coordinates: [-2.9219, 29.6294],
    description: 'Northern region producing bright, fruity coffees',
    altitude: '1600-2000m',
    subRegions: []
  },

  // INDONESIA
  {
    id: 'indonesia-sumatra',
    name: 'Sumatra',
    nameLocal: '수마트라',
    country: 'Indonesia',
    countryCode: 'IDN',
    coordinates: [-0.9492, 100.3543],
    description: 'Wet-hulled coffees with earthy, herbal, full-bodied character',
    altitude: '1100-1500m',
    subRegions: []
  },
  {
    id: 'indonesia-java',
    name: 'Java',
    nameLocal: '자바',
    country: 'Indonesia',
    countryCode: 'IDN',
    coordinates: [-7.6145, 110.7122],
    description: 'Historic region producing clean, spicy coffees',
    altitude: '900-1800m',
    subRegions: []
  },
  {
    id: 'indonesia-sulawesi',
    name: 'Sulawesi',
    nameLocal: '술라웨시',
    country: 'Indonesia',
    countryCode: 'IDN',
    coordinates: [-1.4300, 121.4456],
    description: 'Toraja region known for rich, earthy coffees',
    altitude: '1100-1800m',
    subRegions: []
  },

  // YEMEN
  {
    id: 'yemen-sanani',
    name: 'Sana\'ani',
    nameLocal: '사나니',
    country: 'Yemen',
    countryCode: 'YEM',
    coordinates: [15.3694, 44.1910],
    description: 'Ancient coffee region with wild, complex, wine-like profiles',
    altitude: '1500-2400m',
    subRegions: []
  },

  // PERU
  {
    id: 'peru-cusco',
    name: 'Cusco',
    nameLocal: '쿠스코',
    country: 'Peru',
    countryCode: 'PER',
    coordinates: [-13.5319, -71.9675],
    description: 'High-altitude region producing clean, bright coffees',
    altitude: '1000-1900m',
    subRegions: []
  },
  {
    id: 'peru-cajamarca',
    name: 'Cajamarca',
    nameLocal: '카하마르카',
    country: 'Peru',
    countryCode: 'PER',
    coordinates: [-7.1561, -78.5167],
    description: 'Northern region known for balanced, sweet coffees',
    altitude: '1100-2200m',
    subRegions: []
  },

  // HONDURAS
  {
    id: 'honduras-copan',
    name: 'Copán',
    nameLocal: '코판',
    country: 'Honduras',
    countryCode: 'HND',
    coordinates: [14.8397, -88.7856],
    description: 'Western region producing chocolaty, balanced coffees',
    altitude: '1000-1500m',
    subRegions: []
  },

  // EL SALVADOR
  {
    id: 'elsalvador-apaneca',
    name: 'Apaneca-Ilamatepec',
    nameLocal: '아파네카',
    country: 'El Salvador',
    countryCode: 'SLV',
    coordinates: [13.8547, -89.7947],
    description: 'Volcanic region producing sweet, balanced coffees',
    altitude: '1200-2000m',
    subRegions: []
  },

  // NICARAGUA
  {
    id: 'nicaragua-jinotega',
    name: 'Jinotega',
    nameLocal: '히노테가',
    country: 'Nicaragua',
    countryCode: 'NIC',
    coordinates: [13.0833, -85.9833],
    description: 'Northern highlands producing bright, fruity coffees',
    altitude: '1000-1700m',
    subRegions: []
  },

  // MEXICO
  {
    id: 'mexico-chiapas',
    name: 'Chiapas',
    nameLocal: '치아파스',
    country: 'Mexico',
    countryCode: 'MEX',
    coordinates: [16.7569, -93.1292],
    description: 'Southern region producing light, delicate coffees with chocolate notes',
    altitude: '900-1700m',
    subRegions: []
  },
  {
    id: 'mexico-oaxaca',
    name: 'Oaxaca',
    nameLocal: '오아하카',
    country: 'Mexico',
    countryCode: 'MEX',
    coordinates: [17.0732, -96.7266],
    description: 'Produces nutty, chocolaty coffees with bright acidity',
    altitude: '900-1700m',
    subRegions: []
  },

  // PAPUA NEW GUINEA
  {
    id: 'png-eastern-highlands',
    name: 'Eastern Highlands',
    nameLocal: '이스턴 하이랜즈',
    country: 'Papua New Guinea',
    countryCode: 'PNG',
    coordinates: [-6.3167, 145.3833],
    description: 'Produces clean, bright coffees with fruity notes',
    altitude: '1400-1900m',
    subRegions: []
  },

  // VIETNAM
  {
    id: 'vietnam-dalat',
    name: 'Đà Lạt',
    nameLocal: '달랏',
    country: 'Vietnam',
    countryCode: 'VNM',
    coordinates: [11.9404, 108.4583],
    description: 'Central highlands producing Arabica with nutty, chocolaty notes',
    altitude: '1500-1650m',
    subRegions: []
  },

  // THAILAND
  {
    id: 'thailand-doi-chang',
    name: 'Doi Chang',
    nameLocal: '도이창',
    country: 'Thailand',
    countryCode: 'THA',
    coordinates: [20.0833, 99.6667],
    description: 'Northern region producing smooth, balanced coffees',
    altitude: '1000-1500m',
    subRegions: []
  },

  // INDIA
  {
    id: 'india-karnataka',
    name: 'Karnataka',
    nameLocal: '카르나타카',
    country: 'India',
    countryCode: 'IND',
    coordinates: [15.3173, 75.7139],
    description: 'Monsoon-processed coffees with low acidity and unique character',
    altitude: '1000-1600m',
    subRegions: []
  },

  // HAWAII (USA)
  {
    id: 'hawaii-kona',
    name: 'Kona',
    nameLocal: '코나',
    country: 'United States',
    countryCode: 'USA',
    coordinates: [19.6400, -155.9969],
    description: 'Famous island-grown coffee with smooth, balanced profile',
    altitude: '150-900m',
    subRegions: []
  }
];

// Brew Records - Your actual tasting history
export const brewRecords = [
  {
    date: '2026-01-20',
    beans: 'Guatemala La Bella Pacamara Natural',
    region: 'Guatemala',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.6.2',
    waterTemp: '?',
    waterIn: 220,
    brewTime: '?',
    daysPastRoasting: '',
    notes: '?',
    etc: 'Astringent → tighten grind size'
  },
  {
    date: '2026-01-21',
    beans: 'Ethiopia Sidama Bensa Odako G1 Natural',
    region: 'Ethiopia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.5.2',
    waterTemp: 92,
    waterIn: 220,
    brewTime: '?',
    daysPastRoasting: '',
    notes: '?',
    etc: 'Good aroma, slightly astringent'
  },
  {
    date: '2026-01-24',
    beans: 'Ethiopia Sidama Bensa Odako G1 Natural',
    region: 'Ethiopia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.8.0',
    waterTemp: 92,
    waterIn: 220,
    brewTime: '2:30',
    daysPastRoasting: '',
    notes: '?',
    etc: 'Under-extracted'
  },
  {
    date: '2026-01-25',
    beans: 'Guatemala La Bella Pacamara Natural',
    region: 'Guatemala',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.7.0',
    waterTemp: 96,
    waterIn: 220,
    brewTime: '2:10',
    daysPastRoasting: '',
    notes: 'Citrus, chocolate',
    etc: ''
  },
  {
    date: '2026-01-26',
    beans: 'Colombia El Diviso Chiroso Natural',
    region: 'Colombia',
    method: 'Marco SP9 Auto Brewing Machine',
    grinder: '?',
    grindSetting: '?',
    waterTemp: '?',
    waterIn: '?',
    brewTime: '?',
    daysPastRoasting: '',
    notes: 'Intense raspberry, banana',
    etc: 'Very slightly astringent?'
  },
  {
    date: '2026-01-26',
    beans: 'Costa Rica San Isidro Labrador Geisha Anaerobic Natural',
    region: 'Costa Rica',
    method: 'Marco SP9 Auto Brewing Machine',
    grinder: '?',
    grindSetting: '?',
    waterTemp: '?',
    waterIn: '?',
    brewTime: '?',
    daysPastRoasting: '',
    notes: 'Really hard to describe, acidic with nutty notes',
    etc: ''
  },
  {
    date: '2026-01-28',
    beans: 'Ethiopia Sidama Bensa Odako G1 Natural',
    region: 'Ethiopia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.6.2',
    waterTemp: 95,
    waterIn: 220,
    brewTime: '2:20',
    daysPastRoasting: '',
    notes: 'Aroma not prominent when brewing',
    etc: 'A bit strong... quite astringent, need to coarsen grind slightly'
  },
  {
    date: '2026-01-29',
    beans: 'Colombia Finca La Roma Pink Champagne Co-fermentation',
    region: 'Colombia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.7.1',
    waterTemp: 95,
    waterIn: 220,
    brewTime: '2:10',
    daysPastRoasting: '',
    notes: 'Clear green apple, grape and mango less noticeable',
    etc: 'Slightly more bitter compared to baseline'
  },
  {
    date: '2026-01-30',
    beans: 'Ethiopia Sidama Bensa Hamasho G1 Washed',
    region: 'Ethiopia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.7.2',
    waterTemp: 95,
    waterIn: 220,
    brewTime: '2:30',
    daysPastRoasting: '',
    notes: 'Honey texture confirmed',
    etc: 'Water drained slowly, timing was awkward for pouring, waited a bit on third pour (4666)'
  },
  {
    date: '2026-01-30',
    beans: 'Guatemala La Bella Pacamara Natural',
    region: 'Guatemala',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.8.0',
    waterTemp: 95,
    waterIn: 220,
    brewTime: '2:20',
    daysPastRoasting: '',
    notes: 'Some aroma but hard to identify',
    etc: 'Feels like it could be ground slightly coarser?'
  },
  {
    date: '2026-01-31',
    beans: 'Ethiopia Sidama Bensa Odako G1 Natural',
    region: 'Ethiopia',
    method: 'V60 4666',
    grinder: 'C3 ESP',
    grindSetting: '1.8.0',
    waterTemp: 95,
    waterIn: 220,
    brewTime: '?',
    daysPastRoasting: '',
    notes: 'Not sure if aroma is better, but first sip seemed more fruity. Coffee bed had good tropical fruit/pineapple aroma but not in the cup itself',
    etc: 'After swirling post-final pour: drained slowly, first aroma was very strong, color seemed darker too'
  },
  {
    date: '2026-02-02',
    beans: 'Guatemala La Bella Pacamara Natural',
    region: 'Guatemala',
    method: 'V60 5898',
    grinder: 'C3 ESP',
    grindSetting: '1.8.0',
    waterTemp: 92,
    waterIn: 300,
    brewTime: '2:20',
    daysPastRoasting: '',
    notes: '',
    etc: 'Very bitter... Not sure if it mixed with previous dark roast or just brewing method difference, but the initial bitterness was noticeably different according to others'
  }
];

// Helper function to get unique bean names from brew records
export const getUniqueBeanNames = () => {
  return [...new Set(brewRecords.map(brew => brew.beans))];
};

// Helper function to get regions that appear in brew records
export const getTastedRegions = () => {
  const tastedBeanNames = new Set(brewRecords.map(brew => brew.beans));
  
  // Filter regions to only include those with subregions that have been tasted
  return allCoffeeRegions
    .map(region => {
      // Filter subregions to only those that have been tasted
      const tastedSubRegions = region.subRegions.filter(
        subRegion => tastedBeanNames.has(subRegion.beanName)
      );
      
      if (tastedSubRegions.length === 0) {
        return null; // No tasted beans from this region
      }
      
      // Calculate total brew count for this region
      const brewCount = tastedSubRegions.reduce((total, subRegion) => {
        return total + brewRecords.filter(brew => brew.beans === subRegion.beanName).length;
      }, 0);
      
      return {
        ...region,
        subRegions: tastedSubRegions,
        brewCount
      };
    })
    .filter(region => region !== null); // Remove regions with no tasted beans
};

// Summary statistics
export const getBrewStats = () => {
  const tastedRegions = getTastedRegions();
  const regionBrewCounts = {};
  
  tastedRegions.forEach(region => {
    regionBrewCounts[region.country] = region.brewCount;
  });
  
  const mostUsedRegion = Object.entries(regionBrewCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  return {
    totalBrews: brewRecords.length,
    regionCount: tastedRegions.length,
    regions: regionBrewCounts,
    mostUsedRegion: mostUsedRegion ? mostUsedRegion[0] : null,
    dateRange: {
      start: brewRecords[0]?.date || null,
      end: brewRecords[brewRecords.length - 1]?.date || null
    }
  };
};