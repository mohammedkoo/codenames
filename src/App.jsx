import { useEffect, useState } from "react"
import { generateBoard } from "./game/generateBoard"
import Card from "./components/Card"
import { socket } from "./socket"

function App() {
  const [board, setBoard] = useState(generateBoard())
  const [isSpymaster, setIsSpymaster] = useState(false)
  const [currentTurn, setCurrentTurn] = useState("red")
  const [roomCode, setRoomCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [players, setPlayers] = useState([])

useEffect(() => {
  socket.on("connect", () => {
    console.log("Connected:", socket.id)
  })

  socket.on("room-created", (code) => {
    setRoomCode(code)
  })

  socket.on("player-joined", (playersList) => {
    setPlayers(playersList)
  })

  socket.on("room-not-found", () => {
    alert("Room not found")
  })

  return () => {
    socket.off("connect")
    socket.off("room-created")
    socket.off("player-joined")
    socket.off("room-not-found")
  }
}, [])

  const createRoom = () => {
    socket.emit("create-room")
  }

  const joinRoom = () => {
    socket.emit("join-room", joinCode)
  }

  const redRemaining = board.filter(
    (card) => card.type === "red" && !card.revealed
  ).length

  const blueRemaining = board.filter(
    (card) => card.type === "blue" && !card.revealed
  ).length

  let winner = null

  if (redRemaining === 0) winner = "RED"
  if (blueRemaining === 0) winner = "BLUE"

  const revealCard = (index) => {
    const updatedBoard = [...board]

    if (updatedBoard[index].revealed) return

    updatedBoard[index].revealed = true

    const clickedType = updatedBoard[index].type

    if (clickedType !== currentTurn) {
      setCurrentTurn(currentTurn === "red" ? "blue" : "red")
    }

    setBoard(updatedBoard)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: "40px",
        direction: "rtl"
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "40px"
        }}
      >
        Codenames Arabic
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "30px"
        }}
      >
        <button
          onClick={() => setIsSpymaster(false)}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer"
          }}
        >
          Player
        </button>

        <button
          onClick={() => setIsSpymaster(true)}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer"
          }}
        >
          Spymaster
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: "20px"
        }}
      >
        <button
          onClick={createRoom}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer"
          }}
        >
          Create Room
        </button>

        {roomCode && (
          <h3 style={{ marginTop: "15px" }}>
            Room: {roomCode}
          </h3>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: "30px"
        }}
      >
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter room code"
          style={{
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            marginRight: "10px"
          }}
        />

        <button
          onClick={joinRoom}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer"
          }}
        >
          Join Room
        </button>

        <h3 style={{ marginTop: "15px" }}>
          Players: {players.length}
        </h3>
      </div>

      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: currentTurn === "red" ? "#dc2626" : "#2563eb"
        }}
      >
        Turn: {currentTurn.toUpperCase()}
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "40px",
          marginBottom: "30px",
          fontSize: "24px",
          fontWeight: "bold"
        }}
      >
        <span style={{ color: "#dc2626" }}>
          RED: {redRemaining}
        </span>

        <span style={{ color: "#2563eb" }}>
          BLUE: {blueRemaining}
        </span>
      </div>

      {winner && (
        <h1
          style={{
            textAlign: "center",
            color: winner === "RED" ? "#dc2626" : "#2563eb",
            marginBottom: "30px"
          }}
        >
          {winner} TEAM WINS!
        </h1>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px"
        }}
      >
        {board.map((card, index) => (
          <Card
            key={index}
            card={card}
            onReveal={() => revealCard(index)}
            isSpymaster={isSpymaster}
          />
        ))}
      </div>
    </div>
  )
}

export default App