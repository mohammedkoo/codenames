import { useEffect, useState } from "react"
import Card from "./components/Card"
import { socket } from "./socket"

function App() {
  const [board, setBoard] = useState([])
  const [isSpymaster, setIsSpymaster] = useState(false)
  const [currentTurn, setCurrentTurn] = useState("red")
  const [roomCode, setRoomCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [players, setPlayers] = useState([])
  const [winner, setWinner] = useState(null)
  const [teams, setTeams] = useState({
    red: [],
    blue: []
  })
  const [myTeam, setMyTeam] = useState(null)

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id)
    })

    socket.on("board-updated", (newBoard) => {
      console.log("[CLIENT] board-updated received:", newBoard)
      setBoard([...newBoard])
    })

    socket.on("turn-updated", (turn) => {
      console.log("[CLIENT] turn-updated:", turn)
      setCurrentTurn(turn)
    })

    socket.on("game-over", (winnerTeam) => {
      console.log("[CLIENT] game-over! Winner:", winnerTeam)
      setWinner(winnerTeam)
    })

    socket.on("room-created", (code) => {
      console.log("[CLIENT] Received room-created event. Code:", code)
      setRoomCode(code)
    })

    socket.on("room-joined", (code) => {
      console.log("[CLIENT] Received room-joined event. Code:", code)
      setRoomCode(code)
    })

    socket.on("player-joined", (playersList) => {
      console.log("[CLIENT] Received player-joined event. Players:", playersList)
      setPlayers(playersList)
    })

    socket.on("room-not-found", () => {
      console.warn("[CLIENT] Received room-not-found event")
      alert("Room not found")
    })

    socket.on("teams-updated", (newTeams) => {
      console.log("[CLIENT] Received teams-updated event. Teams:", newTeams)
      setTeams(newTeams)
    })

    socket.on("player-team", (team) => {
      console.log("[CLIENT] Received player-team event. MyTeam:", team)
      setMyTeam(team)
    })

    return () => {
      socket.off("connect")
      socket.off("board-updated")
      socket.off("turn-updated")
      socket.off("game-over")
      socket.off("room-created")
      socket.off("room-joined")
      socket.off("player-joined")
      socket.off("room-not-found")
      socket.off("teams-updated")
      socket.off("player-team")
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

  const revealCard = (index) => {
    if (winner) return

    if (board[index]?.revealed) return

    if (!roomCode) {
      console.warn("[CLIENT] revealCard blocked: roomCode is empty")
      return
    }

    if (!myTeam) {
      alert("يجب عليك اختيار فريق أولاً (Join Red أو Join Blue) للعب!")
      return
    }

    if (myTeam !== currentTurn) {
      console.warn("[CLIENT] revealCard blocked: not your team's turn")
      return
    }

    console.log("[CLIENT] emit reveal-card:", { roomCode, index })

    socket.emit("reveal-card", { roomCode, index })
  }

  const joinTeam = (team) => {
    if (!roomCode) {
      console.warn("[CLIENT] Cannot join team: roomCode is empty")
      return
    }
    console.log("[CLIENT] Emitting join-team event:", { roomCode, team })
    socket.emit("join-team", {
      roomCode,
      team
    })
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

      {roomCode && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "30px"
          }}
        >
          <button
            onClick={() => joinTeam("red")}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            Join Red ({teams.red?.length || 0})
          </button>

          <button
            onClick={() => joinTeam("blue")}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            Join Blue ({teams.blue?.length || 0})
          </button>
        </div>
      )}

      {roomCode && (
        <h3
          style={{
            textAlign: "center",
            marginBottom: "10px",
            color: myTeam === "red" ? "#dc2626" : myTeam === "blue" ? "#2563eb" : "#9ca3af"
          }}
        >
          Your Team: {myTeam ? myTeam.toUpperCase() : "NONE"}
        </h3>
      )}

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
        {board.map((card, index) => {
          const isCardRevealed = card.revealed;
          const isCardDisabled = isCardRevealed || !!winner || !myTeam || myTeam !== currentTurn;

          return (
            <Card
              key={index}
              card={card}
              onReveal={() => revealCard(index)}
              isSpymaster={isSpymaster}
              disabled={isCardDisabled}
            />
          );
        })}
      </div>
    </div>
  )
}

export default App