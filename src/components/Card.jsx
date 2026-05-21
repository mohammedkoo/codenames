function Card({ card, onReveal, isSpymaster, disabled }) {
const getColor = () => {
  if (card.revealed || isSpymaster) {
    if (card.type === "red") return "#dc2626"
    if (card.type === "blue") return "#2563eb"
    if (card.type === "killer") return "#000000"

    return "#a3a3a3"
  }

  return "#374151"
}


  return (
    <button
      onClick={onReveal}
      disabled={disabled}
      style={{
        background: getColor(),
        border: "none",
        borderRadius: "15px",
        padding: "30px",
        color: "white",
        fontSize: "28px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "0.3s"
      }}
    >
      {card.text}
    </button>
  )
}

export default Card