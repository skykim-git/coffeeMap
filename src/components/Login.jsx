import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Preview map pins ─────────────────────────────────────────────────────────

const PREVIEW_PINS = [
  { id: 1,  pos: [-14.2, -51.9], label: 'São Paulo, Brazil' },
  { id: 2,  pos: [9.1,   40.4],  label: 'Yirgacheffe, Ethiopia' },
  { id: 3,  pos: [0.02,  37.9],  label: 'Kirinyaga, Kenya' },
  { id: 4,  pos: [15.5,  39.4],  label: 'Harrar, Eritrea' },
  { id: 5,  pos: [-6.3,  35.7],  label: 'Mbeya, Tanzania' },
  { id: 6,  pos: [3.8,   11.5],  label: 'Cameroon Highlands' },
  { id: 7,  pos: [-1.9,  29.9],  label: 'Rwanda' },
  { id: 8,  pos: [10.0, 104.0],  label: 'Mekong Delta' },
  { id: 9,  pos: [14.1, -87.2],  label: 'Honduras' },
  { id: 10, pos: [4.7,  -75.0],  label: 'Colombia' },
];

const pinIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:12px;height:12px;
    background:rgba(212,165,116,0.9);
    border:2px solid rgba(255,255,255,0.8);
    border-radius:50%;
    box-shadow:0 0 8px rgba(212,165,116,0.7);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// ─── Firestore profile writer ─────────────────────────────────────────────────

async function createUserProfile(firebaseUser) {
  const profileRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(profileRef, {
    uid:         firebaseUser.uid,
    displayName: firebaseUser.displayName || 'Coffee Explorer',
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL || null,
    createdAt:   serverTimestamp(),
    totalBrews:  0,
    regions:     [],
    provider:    'google.com',
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Login() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Always verify against Firestore directly.
      // This correctly handles:
      //   - Genuine new users
      //   - Users who exist in Auth but whose Firestore doc was never created
      //   - Any prior write failures
      const profileRef  = doc(db, 'users', result.user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await createUserProfile(result.user);
      }

      // onAuthStateChanged in parent handles redirect — nothing else needed here
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>

      {/* Live map background */}
      <div style={{ ...s.mapBg, opacity: mapReady ? 1 : 0 }}>
        <MapContainer
          center={[10, 20]} zoom={2} minZoom={2} maxZoom={2}
          zoomControl={false} scrollWheelZoom={false}
          dragging={false} doubleClickZoom={false}
          keyboard={false} attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {PREVIEW_PINS.map(pin => (
            <Marker key={pin.id} position={pin.pos} icon={pinIcon}>
              <Popup>{pin.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Overlays */}
      <div style={s.overlay} />
      <div style={s.vignetteLeft} />
      <div style={s.vignetteRight} />

      {/* Floating labels */}
      <FloatingLabel style={{ top: '18%', left: '12%' }}  delay="0s">Ethiopia ☕</FloatingLabel>
      <FloatingLabel style={{ top: '42%', left: '6%' }}   delay="0.4s">Colombia ☕</FloatingLabel>
      <FloatingLabel style={{ top: '65%', left: '18%' }}  delay="0.8s">Brazil ☕</FloatingLabel>
      <FloatingLabel style={{ top: '25%', right: '10%' }} delay="0.6s">Kenya ☕</FloatingLabel>
      <FloatingLabel style={{ top: '55%', right: '8%' }}  delay="1s">Vietnam ☕</FloatingLabel>

      {/* Card */}
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoIconBox}>☕</div>
          <div>
            <div style={s.logoTitle}>Coffee Journey</div>
            <div style={s.logoSub}>Taste Map</div>
          </div>
        </div>

        {/* Heading */}
        <div style={s.headingBlock}>
          <h1 style={s.heading}>Welcome back</h1>
          <p style={s.subheading}>
            Sign in to explore your personal coffee map and brewing history.
          </p>
        </div>

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Google sign-in button */}
        <GoogleButton loading={loading} onClick={handleGoogleSignIn} />

        <p style={s.footerNote}>Your brewing data is private and only visible to you.</p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FloatingLabel({ children, style, delay }) {
  return (
    <div style={{
      position: 'absolute',
      pointerEvents: 'none',
      userSelect: 'none',
      color: 'rgba(212,165,116,0.55)',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      fontFamily: '"Georgia", "Times New Roman", serif',
      animation: 'floatLabel 4s ease-in-out infinite',
      animationDelay: delay,
      zIndex: 2,
      ...style,
    }}>
      {children}
      <style>{`
        @keyframes floatLabel {
          0%,100% { transform: translateY(0px);  opacity: 0.55; }
          50%      { transform: translateY(-6px); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

function GoogleButton({ loading, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        ...s.googleBtn,
        ...(hovered && !loading ? s.googleBtnHover : {}),
        ...(loading ? s.btnDisabled : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <><Spinner /> Connecting…</>
      ) : (
        <><GoogleSVG /> Continue with Google</>
      )}
    </button>
  );
}

function GoogleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.7 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 3l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 6 1.1 8.2 3l5.7-5.7C34.5 5.1 29.5 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z"/>
      <path fill="#4CAF50" d="M24 45c5.3 0 10.2-1.9 13.9-5.1l-6.4-5.4C29.5 36.4 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8H6.1v5.6C9.5 40.5 16.3 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.4-4.4 5.9l6.4 5.4C41.1 36.2 44 30.5 44 24c0-1.3-.2-2.7-.4-4z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '16px', height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '6vw',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Georgia", "Times New Roman", serif',
    boxSizing: 'border-box',
  },
  mapBg: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    transition: 'opacity 1.2s ease',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(20,12,6,0.72) 0%, rgba(44,24,16,0.60) 100%)',
    zIndex: 1,
  },
  vignetteRight: {
    position: 'absolute',
    top: 0, right: 0,
    width: '55%', height: '100%',
    background: 'linear-gradient(to left, rgba(20,10,4,0.88) 0%, transparent 100%)',
    zIndex: 1,
  },
  vignetteLeft: {
    position: 'absolute',
    top: 0, left: 0,
    width: '35%', height: '100%',
    background: 'linear-gradient(to right, rgba(20,10,4,0.5) 0%, transparent 100%)',
    zIndex: 1,
  },
  card: {
    position: 'relative',
    zIndex: 10,
    background: 'rgba(14, 8, 4, 0.82)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(212,165,116,0.18)',
    borderRadius: '4px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,165,116,0.1)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  logoIconBox: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #8B4513 0%, #3E1C08 100%)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    boxShadow: '0 4px 12px rgba(139,69,19,0.4)',
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#D4A574',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
  },
  logoSub: {
    fontSize: '11px',
    color: 'rgba(212,165,116,0.55)',
    fontWeight: '400',
    marginTop: '2px',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  headingBlock: {
    marginBottom: '28px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F5E6D3',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
  },
  subheading: {
    fontSize: '13px',
    color: 'rgba(212,165,116,0.6)',
    margin: 0,
    lineHeight: 1.6,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  errorBox: {
    background: 'rgba(220, 80, 40, 0.12)',
    border: '1px solid rgba(220, 80, 40, 0.3)',
    borderRadius: '4px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#F08060',
    marginBottom: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  googleBtn: {
    width: '100%',
    padding: '13px',
    background: 'rgba(255,255,255,0.06)',
    color: '#F5E6D3',
    border: '1px solid rgba(212,165,116,0.2)',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontFamily: '"Georgia", serif',
    transition: 'all 0.2s ease',
  },
  googleBtnHover: {
    background: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(212,165,116,0.4)',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(212,165,116,0.3)',
    margin: '16px 0 0 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    letterSpacing: '0.3px',
  },
};