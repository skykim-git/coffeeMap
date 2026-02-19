import React from 'react';
import { extractFlavorNotes, getBrewStatsForRegion } from '../shared/utils';

const FLAVOR_EMOJI_MAP = {
  citrus:'🍊',chocolate:'🍫',fruity:'🍇',berry:'🫐',raspberry:'🫐',banana:'🍌',
  apple:'🍏',grape:'🍇',mango:'🥭',pineapple:'🍍',tropical:'🌴',honey:'🍯',
  caramel:'🍮',nutty:'🥜',floral:'🌸',aroma:'🌺',acidic:'💧',
};

const getFlavorEmoji = (flavor) => FLAVOR_EMOJI_MAP[flavor?.toLowerCase()] || '☕';

function BarChart({ data }) {
  const entries = Object.entries(data).sort((a,b) => b[1]-a[1]);
  const max = Math.max(...entries.map(e => e[1]));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      {entries.map(([value, count]) => (
        <div key={value} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ minWidth:'80px', fontSize:'12px', fontWeight:'600', color:'#2C1810' }}>{value}</div>
          <div style={{ flex:1, height:'24px', backgroundColor:'#EFEBE9', borderRadius:'6px', overflow:'hidden' }}>
            <div style={{ width:`${(count/max)*100}%`, height:'100%', background:'linear-gradient(90deg, #5D4037 0%, #8D6E63 100%)', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'8px' }}>
              <span style={{ fontSize:'11px', fontWeight:'700', color:'white' }}>{count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BrewStatsPopup({ regionDoc, parentDoc, brewRecords }) {
  const stats = getBrewStatsForRegion(regionDoc.id, brewRecords);
  const flavorNotes = extractFlavorNotes(regionDoc.id, brewRecords);

  return (
    <div style={{ minWidth:'280px', maxWidth:'360px', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ marginBottom:'16px', marginTop:'20px' }}>
        <div style={{ fontSize:'20px', fontWeight:'700', color:'#2C1810', marginBottom:'4px' }}>{regionDoc.name}</div>
        <div style={{ fontSize:'13px', color:'#8D6E63' }}>
          {regionDoc.nameLocal}{parentDoc ? ` • ${parentDoc.name}` : ''}
        </div>
        <div style={{ fontSize:'11px', color:'#BCAAA4', marginTop:'2px', textTransform:'capitalize' }}>
          {regionDoc.level}
        </div>
      </div>

      {flavorNotes.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', margin:'16px 0' }}>
          {flavorNotes.map((note, i) => (
            <span key={i} style={{ background:'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', color:'#2C1810', padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px' }}>
              {getFlavorEmoji(note)} {note}
            </span>
          ))}
        </div>
      )}

      {stats && (
        <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'20px' }}>
          {stats.method && Object.keys(stats.method).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Brew Method</div>
              <BarChart data={stats.method} />
            </div>
          )}
          {stats.temperature && Object.keys(stats.temperature).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Temperature</div>
              <BarChart data={Object.fromEntries(Object.entries(stats.temperature).map(([k,v]) => [`${k}°C`, v]))} />
            </div>
          )}
          {stats.grindSetting && Object.keys(stats.grindSetting).length > 0 && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#8D6E63', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Grind Setting</div>
              <BarChart data={stats.grindSetting} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}