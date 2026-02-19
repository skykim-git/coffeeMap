import L from 'leaflet';

export const countryIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#8b4513" stroke="white" stroke-width="3"/>
      <text x="20" y="27" font-size="20" text-anchor="middle" fill="white">☕</text>
    </svg>`),
  iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-20],
});

export const regionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#a0522d" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`),
  iconSize:[32,32], iconAnchor:[16,16], popupAnchor:[0,-16],
});

export const subRegionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#d2691e" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>`),
  iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-12],
});

export const townIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" fill="#cd853f" stroke="white" stroke-width="2"/>
      <circle cx="9" cy="9" r="2.5" fill="white"/>
    </svg>`),
  iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-9],
});

export const levelIcon = {
  country:   countryIcon,
  region:    regionIcon,
  subregion: subRegionIcon,
  town:      townIcon,
};