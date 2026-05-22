function Card({ card, onReveal, isSpymaster, disabled, playerRole }) {
  const isViewerSpymaster = playerRole && playerRole.role === "spymaster"
  const viewerTeam = playerRole && playerRole.team

  const baseColor = () => {
    if (card.type === "red") return "#dc2626"
    if (card.type === "blue") return "#2563eb"
    if (card.type === "killer") return "#000000"
    return "#a3a3a3"
  }

  // Common base style for buttons
  const makeBaseStyle = (bg) => ({
    background: bg,
    border: "none",
    borderRadius: "15px",
    padding: "30px",
    color: "white",
    fontSize: "28px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  })

  // 1) Revealed cards: same for everyone, but spymaster gets extra finish indicator for own-team
  if (card.revealed) {
    const bg = baseColor()
    const style = makeBaseStyle(bg)

    // If viewer is spymaster and this is their team's finished card, add visual indicator
    const showCheck = isViewerSpymaster && viewerTeam && card.type === viewerTeam

    if (showCheck) {
      // faded / finished look
      Object.assign(style, {
        opacity: 0.65,
        textDecoration: "line-through",
        border: "2px dashed rgba(255,255,255,0.12)"
      })
    }

    return (
      <button onClick={onReveal} disabled={disabled} style={style}>
        <span style={{ marginRight: showCheck ? "10px" : 0 }}>{card.text}</span>
        {showCheck && <span style={{ fontSize: "20px", opacity: 0.95 }}>&#10003;</span>}
      </button>
    )
  }

  // 2) Unrevealed cards
  // If viewer is spymaster: show full color for ALL card types
  if (isViewerSpymaster) {
    const bg = baseColor()
    const style = makeBaseStyle(bg)

    // If it's own-team unrevealed -> emphasize as active target
    if (viewerTeam && card.type === viewerTeam) {
      Object.assign(style, {
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
        transform: "translateY(-2px)",
        fontWeight: 700
      })
    }

    return (
      <button onClick={onReveal} disabled={disabled} style={style}>
        {card.text}
      </button>
    )
  }

  // 3) Normal player view: unrevealed are dark, revealed show color
  const normalBg = card.revealed ? baseColor() : "#374151"
  const defaultStyle = makeBaseStyle(normalBg)

  return (
    <button onClick={onReveal} disabled={disabled} style={defaultStyle}>
      {card.text}
    </button>
  )
}

export default Card