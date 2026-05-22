import React from 'react'

export default function PlayerCard({ name, isYou, role, team }) {
  const teamColor = team === 'red' ? '#b91c1c' : team === 'blue' ? '#1e40af' : '#6b7280'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
      marginBottom: 10,
      boxShadow: '0 6px 18px rgba(2,6,23,0.6)',
      border: '1px solid rgba(255,255,255,0.03)'
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: teamColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: 16,
        boxShadow: `0 4px 14px ${team === 'red' ? 'rgba(220,38,38,0.14)' : team === 'blue' ? 'rgba(37,99,235,0.12)' : 'rgba(0,0,0,0.15)'}`
      }}>{name ? name.charAt(0).toUpperCase() : '?'}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Anonymous'}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{isYou ? 'YOU' : ''}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {role && (
          <div style={{ padding: '6px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.03)', color: '#f3f4f6', fontSize: 12, fontWeight: 800, border: '1px solid rgba(255,255,255,0.03)' }}>
            {role.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}
