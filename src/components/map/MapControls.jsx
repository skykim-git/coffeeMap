import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export function MapEventHandler({ onZoomChange, onMoveChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => { const c = map.getCenter(); onMoveChange({ lat: c.lat.toFixed(4), lng: c.lng.toFixed(4) }); },
  });
  return null;
}

export function ZoomControls() {
  const map = useMap();
  return (
    <div className="custom-zoom-controls">
      <div className="control-group">
        <button onClick={() => map.zoomIn()}  className="zoom-button" title="Zoom in">+</button>
        <button onClick={() => map.zoomOut()} className="zoom-button" title="Zoom out">−</button>
        <button onClick={() => map.setView([15,-20],3)} className="zoom-button" title="Reset view">⊡</button>
      </div>
    </div>
  );
}

export function BoundaryFitter({ coordinates, resetView, zoomLevel = 7, fitBounds = null }) {
  const map = useMap();
  useEffect(() => {
    if (fitBounds && fitBounds.length >= 2) {
      map.flyToBounds(fitBounds, { padding: [60, 60], animate: true, duration: 0.6, maxZoom: 10 });
    } else if (coordinates) {
      map.setView(coordinates, zoomLevel, { animate: true, duration: 0.5 });
    } else if (resetView) {
      map.setView([15, -20], 3, { animate: true, duration: 0.5 });
    }
  }, [coordinates, resetView, zoomLevel, fitBounds, map]);
  return null;
}

export function PopupCloser({ shouldClose, onClosed }) {
  const map = useMap();
  useEffect(() => { if (shouldClose) { map.closePopup(); onClosed(); } }, [shouldClose, map, onClosed]);
  return null;
}