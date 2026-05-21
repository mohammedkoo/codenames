import { words } from "../data/words"

export function generateBoard() {
  const shuffled = [...words].sort(() => Math.random() - 0.5)

  return shuffled.slice(0, 9).map((word, index) => {
    let type = "neutral"

    if (index < 3) type = "red"
    else if (index < 6) type = "blue"
    else if (index === 8) type = "killer"

    return {
      text: word,
      type,
      revealed: false
    }
  })
}