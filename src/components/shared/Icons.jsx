// src/components/shared/Icons.jsx
// Drop-in SVG icon components — consistent 1.75px stroke, no emoji

const Svg = ({ size = 20, children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    {...props}
  >
    {children}
  </svg>
);

// ── Navigation ────────────────────────────────────────────────────────────────

export const MapIcon = ({ size }) => (
  <Svg size={size}>
    <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </Svg>
);

export const BrewIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </Svg>
);

export const NotesIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </Svg>
);

export const TableIcon = ({ size }) => (
  <Svg size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="9" x2="9" y2="21" />
  </Svg>
);

export const BeansIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M12 2C8 2 5 5 5 9c0 5 4 11 7 13 3-2 7-8 7-13 0-4-3-7-7-7z" />
    <path d="M12 2 Q14 7 12 12 Q10 7 12 2z" />
  </Svg>
);

// ── UI Actions ────────────────────────────────────────────────────────────────

export const SearchIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

export const BackIcon = ({ size = 20 }) => (
  <Svg size={size}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </Svg>
);

export const ArrowUpDownIcon = ({ size = 14, active, direction }) => (
  <Svg size={size} style={{ opacity: active ? 1 : 0.35 }}>
    {active && direction === 'asc'  && <polyline points="18,15 12,9 6,15" />}
    {active && direction === 'desc' && <polyline points="6,9 12,15 18,9" />}
    {!active && (
      <>
        <polyline points="18,15 12,9 6,15" opacity="0.5" />
        <polyline points="6,9 12,15 18,9"  opacity="0.5" />
      </>
    )}
  </Svg>
);

export const StarIcon = ({ size = 16, filled = false }) => (
  <Svg size={size} fill={filled ? 'currentColor' : 'none'}>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </Svg>
);

export const PinIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);

export const FilterIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="9" y1="18" x2="15" y2="18" />
  </Svg>
);

export const GlobeIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18" />
    <path d="M12 3a15 15 0 0 0 0 18" />
  </Svg>
);

export const TrophyIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
    <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
    <path d="M6 5h12v6a6 6 0 0 1-12 0V5z" />
    <path d="M9 21h6" />
    <path d="M12 17v4" />
  </Svg>
);

export const ThermometerIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </Svg>
);

export const TagIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Svg>
);

export const XIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const MenuIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <line x1="3" y1="6"  x2="21" y2="6"  />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);

export const SignOutIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

export const HomeIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </Svg>
);

export const WarningIcon = ({ size = 48 }) => (
  <Svg size={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);

export const LeafIcon = ({ size = 24 }) => (
  <Svg size={size}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </Svg>
);