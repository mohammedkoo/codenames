
export default function PlayerCard({ name, isYou, role, team }) {
  const isRed  = team === 'red'
  const isBlue = team === 'blue'

  // Avatar gradient + glow
  let avatarBg = 'bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 border border-slate-700/60'
  let avatarRing = ''
  if (isRed) {
    avatarBg   = 'bg-gradient-to-br from-red-950 via-[#1C050C] to-slate-950 border border-red-500/30'
    avatarRing = 'shadow-[0_0_12px_rgba(255,0,85,0.25)]'
  } else if (isBlue) {
    avatarBg   = 'bg-gradient-to-br from-blue-950 via-[#051424] to-slate-950 border border-cyan-500/30'
    avatarRing = 'shadow-[0_0_12px_rgba(0,240,255,0.25)]'
  }

  // Card border/bg
  let cardStyle = 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80 hover:bg-slate-900/40 shadow-inner'
  if (isRed) {
    cardStyle = isYou
      ? 'border-red-500/50 bg-gradient-to-l from-red-950/25 via-red-950/15 to-transparent shadow-[0_0_18px_rgba(255,0,85,0.12)] ring-1 ring-red-500/15'
      : 'border-red-500/20 bg-red-950/10 hover:border-red-500/40 hover:bg-red-950/20 transition-all duration-300'
  } else if (isBlue) {
    cardStyle = isYou
      ? 'border-cyan-400/50 bg-gradient-to-l from-blue-950/25 via-blue-950/15 to-transparent shadow-[0_0_18px_rgba(0,240,255,0.12)] ring-1 ring-cyan-400/15'
      : 'border-cyan-500/20 bg-blue-950/10 hover:border-cyan-500/40 hover:bg-blue-950/20 transition-all duration-300'
  } else {
    if (isYou) {
      cardStyle = 'border-slate-500/45 bg-slate-900/50 shadow-[0_0_14px_rgba(255,255,255,0.04)] ring-1 ring-slate-500/10'
    }
  }

  // Role badge
  let roleBadge = null
  if (role) {
    const isSpymaster = role === 'spymaster'
    const isUnassigned = role === 'unassigned'
    
    // Sleek scientific code representation:
    const code = isSpymaster ? 'INTEL' : (isUnassigned ? 'UNASSG' : 'FIELD_OP')
    const label = isSpymaster ? 'قائد استخبارات' : (isUnassigned ? 'غير معين' : 'عميل ميداني')
    
    const badgeStyle  = isSpymaster
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      : (isUnassigned ? 'bg-slate-800/40 text-slate-400 border-slate-700/50' : 'bg-cyan-500/5 text-cyan-300 border-cyan-500/20')
      
    roleBadge = (
      <span className={`px-2 py-0.5 rounded border text-[9px] font-black font-cairo tracking-wide flex items-center gap-1 w-fit uppercase ${badgeStyle}`}>
        <span className="opacity-60 text-[8px] font-mono tracking-tight">{code}:</span>
        <span>{label}</span>
      </span>
    )
  }

  return (
    <div className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${cardStyle} hover:-translate-y-0.5 hover:shadow-lg group overflow-hidden`}>
      {/* Inner reflection sweep */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-2xl pointer-events-none"></span>
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"></span>

      {/* Cybernetic HUD Corner brackets */}
      <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 ${isRed ? 'border-red-500/30 group-hover:border-red-500/70' : isBlue ? 'border-cyan-500/30 group-hover:border-cyan-500/70' : 'border-slate-800 group-hover:border-slate-500'} rounded-tr-md transition-all duration-300`}></span>
      <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 ${isRed ? 'border-red-500/30 group-hover:border-red-500/70' : isBlue ? 'border-cyan-500/30 group-hover:border-cyan-500/70' : 'border-slate-800 group-hover:border-slate-500'} rounded-bl-md transition-all duration-300`}></span>

      {/* Online ping beacon */}
      <span className="absolute top-2.5 left-2.5 flex h-2 w-2 z-10">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
      </span>

      {/* Avatar with digital scanning visual overlay */}
      <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base font-orbitron select-none ${avatarBg} ${avatarRing} overflow-hidden transition-all duration-300 group-hover:scale-105`}>
        {/* Inner glow reflection */}
        <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10"></span>
        
        {/* Scanner matrix scanline overlays */}
        <span className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 pointer-events-none"></span>
        
        {/* Dynamic scanner laser bar */}
        <span className={`absolute inset-x-0 h-0.5 bg-gradient-to-r ${isRed ? 'from-transparent via-red-400 to-transparent' : isBlue ? 'from-transparent via-cyan-400 to-transparent' : 'from-transparent via-slate-400 to-transparent'} animate-[scan_2s_ease-in-out_infinite] pointer-events-none`}></span>
        
        {/* Initial letter */}
        <span className="relative z-10 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
          {name ? name.charAt(0).toUpperCase() : '?'}
        </span>
      </div>

      {/* Dossier Text Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-sm text-slate-100 truncate font-cairo leading-none tracking-wide group-hover:text-white transition-colors">
            {name || 'عميل مجهول'}
          </span>
          {isYou && (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-black font-cairo leading-none uppercase tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-[pulse_2s_infinite]">
              أنت
            </span>
          )}
        </div>
        
        {roleBadge && (
          <div className="mt-1.5">{roleBadge}</div>
        )}
      </div>
    </div>
  )
}
