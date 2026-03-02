import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const COFFEE_ORIGINS = [
  { id: 1, pos: [-14.2, -51.9], name: 'Brazil' },
  { id: 2, pos: [9.1,   40.4],  name: 'Ethiopia' },
  { id: 3, pos: [0.02,  37.9],  name: 'Kenya' },
  { id: 4, pos: [10.0, -84.0],  name: 'Costa Rica' },
  { id: 5, pos: [4.7,  -75.0],  name: 'Colombia' },
  { id: 6, pos: [14.1, -87.2],  name: 'Guatemala' },
];

const pinIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div class="marker-container"><div class="marker-core"></div><div class="marker-pulse"></div></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

export default function LandingPage() {
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google Sign-In:", error);
      alert("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={{ ...styles.mapBackground, opacity: mapReady ? 0.4 : 0 }}>
        <MapContainer
          center={[20, 10]} zoom={2} zoomControl={false}
          scrollWheelZoom={false} dragging={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%', background: '#fff' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {COFFEE_ORIGINS.map(origin => <Marker key={origin.id} position={origin.pos} icon={pinIcon} />)}
        </MapContainer>
      </div>

      <div style={styles.contentWrapper}>
        <main style={styles.heroContent}>
          <div style={styles.badge}>Discover your palate</div>

          <h1 style={styles.heading}>
            Map Your <br />
            <span style={styles.headingAccent}>Coffee Journey</span>
          </h1>

          <p style={styles.description}>
            An interactive atlas for your daily brew. Track flavor notes,
            origin data, and brewing metrics in one beautiful interface.
          </p>

          <button
            style={{ ...styles.googleButton, opacity: loading ? 0.7 : 1 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              style={styles.googleIcon}
            />
            <span>{loading ? "Connecting..." : "Continue with Google"}</span>
          </button>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statNum}>50+</span>
              <span style={styles.statDesc}>Regions</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>100%</span>
              <span style={styles.statDesc}>Private</span>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        .marker-core { width:8px; height:8px; background:#8B4513; border-radius:50%; position:absolute; top:6px; left:6px; z-index:2; }
        .marker-pulse { width:20px; height:20px; background:rgba(139,69,19,0.2); border-radius:50%; animation:pulse 2s infinite; }
        @keyframes pulse { 0% { transform:scale(0.5); opacity:1; } 100% { transform:scale(2.5); opacity:0; } }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    minHeight: '100dvh',
    backgroundColor: '#fcfaf8',
    color: '#2C1810',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBackground: {
    position: 'absolute', inset: 0, zIndex: 0,
    transition: 'opacity 2s ease',
  },
  contentWrapper: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: '800px',
    padding: '24px 16px',
    textAlign: 'center',
  },
  heroContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    padding: 'clamp(28px, 6vw, 60px) clamp(20px, 5vw, 40px)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
  },
  badge: {
    fontSize: '12px', fontWeight: '600', color: '#8B4513',
    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px',
  },
  heading: {
    fontSize: 'clamp(36px, 8vw, 64px)',
    fontWeight: '800', lineHeight: 1.1,
    margin: '0 0 16px 0', letterSpacing: '-1px',
  },
  headingAccent: { color: '#D4A574' },
  description: {
    fontSize: 'clamp(14px, 3vw, 18px)',
    lineHeight: 1.6, color: '#5D4037',
    maxWidth: '460px', marginBottom: '28px',
  },
  googleButton: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 24px',
    backgroundColor: '#ffffff', color: '#3c4043',
    border: '1px solid #dadce0', borderRadius: '12px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minHeight: '52px',
    width: '100%', maxWidth: '280px',
    justifyContent: 'center',
  },
  googleIcon: { width: '20px', height: '20px', flexShrink: 0 },
  statsRow: { display: 'flex', gap: '32px', marginTop: '32px' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNum: { fontSize: '20px', fontWeight: '800', color: '#8B4513' },
  statDesc: { fontSize: '11px', color: '#A1887F', textTransform: 'uppercase', letterSpacing: '1px' },
};