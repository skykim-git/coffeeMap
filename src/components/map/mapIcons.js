import L from 'leaflet';
import pinImg      from '../../../public/pin.png';
import pinHoverImg from '../../../public/pin_hover.png';

// Inject hover CSS once
const style = document.createElement('style');
style.textContent = `
  .pin-marker img {
    transition: transform 0.15s ease, filter 0.15s ease;
    display: block;
  }
  .pin-marker:hover img.pin-default { display: none; }
  .pin-marker img.pin-hover         { display: none; }
  .pin-marker:hover img.pin-hover   { display: block; }
  .pin-marker:hover                 { cursor: pointer; }
`;
if (!document.head.querySelector('#pin-marker-styles')) {
  style.id = 'pin-marker-styles';
  document.head.appendChild(style);
}

// ── Factory: builds a DivIcon with both images stacked, hover handled by CSS ──
const makePinIcon = (size) => {
  const [w, h] = size;
  return new L.DivIcon({
    className: 'pin-marker',
    html: `
      <div style="width:${w}px; height:${h}px; position:relative;">
        <img class="pin-default" src="${pinImg}"      width="${w}" height="${h}" style="position:absolute;top:0;left:0;" />
        <img class="pin-hover"   src="${pinHoverImg}" width="${w}" height="${h}" style="position:absolute;top:0;left:0;" />
      </div>
    `,
    iconSize:    [w, h],
    iconAnchor:  [w / 2, h],        // tip of pin sits on coordinate
    popupAnchor: [0, -h],
  });
};

// ── Per-level sizes (country biggest → town smallest) ──────────────────────
export const countryIcon   = makePinIcon([28, 34]);
export const regionIcon    = makePinIcon([24, 29]);
export const subRegionIcon = makePinIcon([20, 24]);
export const townIcon      = makePinIcon([16, 19]);

export const levelIcon = {
  country:   countryIcon,
  region:    regionIcon,
  subregion: subRegionIcon,
  town:      townIcon,
};