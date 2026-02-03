// Coffee Regions Data extracted from Brew Data
// Contains regions that appear in the coffee brewing records

export const coffeeRegions = [
  {
    id: 'guatemala',
    name: 'Guatemala',
    nameLocal: '과테말라',
    coordinates: [15.7835, -90.2308], // Guatemala City
    country: 'Guatemala',
    countryCode: 'GTM',
    brewCount: 4,
    description: 'Central American coffee region known for volcanic soil'
  },
  {
    id: 'ethiopia',
    name: 'Ethiopia',
    nameLocal: '예티오피아',
    coordinates: [9.145, 40.4897], // Addis Ababa
    country: 'Ethiopia',
    countryCode: 'ETH',
    brewCount: 6,
    description: 'Birthplace of coffee with diverse flavor profiles'
  },
  {
    id: 'colombia',
    name: 'Colombia',
    nameLocal: '콜롬비아',
    coordinates: [4.7110, -74.0721], // Bogotá
    country: 'Colombia',
    countryCode: 'COL',
    brewCount: 2,
    description: 'South American coffee powerhouse with balanced flavors'
  },
  {
    id: 'costarica',
    name: 'Costa Rica',
    nameLocal: '코스타리카',
    coordinates: [9.7489, -83.7534], // San José
    country: 'Costa Rica',
    countryCode: 'CRI',
    brewCount: 1,
    description: 'Known for high-quality Arabica beans'
  }
];

// Detailed brew records from the original data
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

// Summary statistics
export const brewStats = {
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