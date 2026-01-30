import React from 'react';

function ByNotes() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '2rem',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600', 
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          By Notes
        </h2>
        <p style={{ 
          fontSize: '1rem', 
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          This section will contain notes and annotations about Brazilian coffee regions and production.
        </p>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#9ca3af',
          marginTop: '1rem',
          fontStyle: 'italic'
        }}>
          Component under development
        </p>
      </div>
    </div>
  );
}

export default ByNotes;