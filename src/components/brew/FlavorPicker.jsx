import React, { useState, useRef, useEffect } from 'react';
import { MASTER_FLAVORS, getFlavorStyle, getFlavorEmoji, ms } from '../shared/utils';

export default function FlavorPicker({ selectedFlavors, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = MASTER_FLAVORS.filter(f => f.toLowerCase().includes(q) && !selectedFlavors.includes(f));
    const exactMatch = MASTER_FLAVORS.find(f => f.toLowerCase() === q);
    if (!exactMatch && query.trim().length > 1 && !selectedFlavors.includes(query.trim())) {
      results.push(`"${query.trim()}"`);
    }
    return results.slice(0, 10);
  }, [query, selectedFlavors]);

  const addFlavor = (raw) => {
    const flavor = raw.startsWith('"') ? raw.slice(1,-1) : raw;
    const cap = flavor.charAt(0).toUpperCase() + flavor.slice(1).toLowerCase();
    if (!selectedFlavors.includes(cap)) onChange([...selectedFlavors, cap]);
    setQuery(''); setOpen(false); inputRef.current?.focus();
  };

  const removeFlavor = (f) => onChange(selectedFlavors.filter(x => x !== f));

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ width:'100%' }}>
      {selectedFlavors.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'8px' }}>
          {selectedFlavors.map(f => (
            <span key={f} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:getFlavorStyle(f), color:'white', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
              {getFlavorEmoji(f)} {f}
              <button type="button" onClick={() => removeFlavor(f)} style={{ background:'rgba(255,255,255,0.25)', border:'none', borderRadius:'50%', width:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'10px', color:'white', lineHeight:1, padding:0, marginLeft:'2px' }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div ref={dropdownRef} style={{ position:'relative' }}>
        <input
          ref={inputRef}
          style={{ ...ms.input, paddingLeft:'34px' }}
          type="text"
          placeholder="Search flavors…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); addFlavor(filtered[0]); }
            if (e.key === 'Escape') setOpen(false);
          }}
          autoComplete="off"
        />
        <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', pointerEvents:'none' }}>🔍</span>
        {open && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'white', border:'1px solid #D7CCC8', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>
            {filtered.map((item, i) => {
              const isCustom = item.startsWith('"');
              const label = isCustom ? item.slice(1,-1) : item;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addFlavor(item); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom: i < filtered.length-1 ? '1px solid #F5F0EC' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAF7F4'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}
                >
                  <span style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0, background:getFlavorStyle(label), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>{getFlavorEmoji(label)}</span>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:'#2C1810' }}>{isCustom ? `Add "${label}"` : label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}