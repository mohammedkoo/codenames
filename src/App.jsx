import { useEffect, useState } from "react"
import Card from "./components/Card"
import PlayerCard from "./components/PlayerCard"
import { socket } from "./socket"

function App() {
  const [board, setBoard] = useState([])
  const [screen, setScreen] = useState("home") // home | lobby | game
  const [boardOwner, setBoardOwner] = useState(null)

  const [currentTurn, setCurrentTurn] = useState("red")
  const [spymasters, setSpymasters] = useState({ red: null, blue: null })
  const [currentSpymaster, setCurrentSpymaster] = useState(null)
  const [playerRole, setPlayerRole] = useState(null)
  const [currentClue, setCurrentClue] = useState({ word: null, number: null })
  const [clueWord, setClueWord] = useState("")
  const [clueNumber, setClueNumber] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [players, setPlayers] = useState([])
  const [names, setNames] = useState({})
  const [host, setHost] = useState(null)
  const [roomState, setRoomState] = useState("lobby")
  const [playerNameInput, setPlayerNameInput] = useState("")
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

    socket.on("spymasters-updated", (s) => {
      console.log("[CLIENT] spymasters-updated:", s)
      setSpymasters(s)
      // Update this client's role if it's the spymaster
      if (s.red === socket.id) {
        setPlayerRole({ role: "spymaster", team: "red" })
      } else if (s.blue === socket.id) {
        setPlayerRole({ role: "spymaster", team: "blue" })
      } else {
        // if previously spymaster but removed, clear role
        setPlayerRole((prev) => (prev && prev.role === "spymaster" ? null : prev))
      }
    })

    socket.on("lobby-updated", (l) => {
      console.log("[CLIENT] lobby-updated:", l)
      if (!l) return
      setPlayers(l.players || [])
      setNames(l.names || {})
      setTeams(l.teams || { red: [], blue: [] })
      setSpymasters(l.spymasters || { red: null, blue: null })
      setHost(l.host || null)
      setRoomState(l.roomState || "lobby")
      if (l.roomCode) setRoomCode(l.roomCode)
    })

    socket.on("name-set", (name) => {
      console.log("[CLIENT] name-set:", name)
    })

    socket.on("game-started", (data) => {
      console.log("[CLIENT] game-started:", data)
      // switch to game screen and sync board/state
      setBoard(data.board || [])
      setCurrentTurn(data.currentTurn || "red")
      setTeams(data.teams || teams)
      setSpymasters(data.spymasters || spymasters)
      setNames(data.names || names)
      setScreen("game")
    })

    socket.on("start-game-failed", (reason) => {
      console.warn("[CLIENT] start-game-failed:", reason)
      alert(`Start game failed: ${reason}`)
    })

    socket.on("current-spymaster-updated", (id) => {
      setCurrentSpymaster(id)
    })

    socket.on("clue-updated", (clue) => {
      setCurrentClue(clue)
    })

    socket.on("player-role", (roleObj) => {
      console.log("[CLIENT] player-role received:", roleObj)
      setPlayerRole(roleObj)
      if (roleObj && roleObj.team) setMyTeam(roleObj.team)
    })

    socket.on("become-spymaster-failed", (reason) => {
      console.warn("[CLIENT] become-spymaster-failed:", reason)
      alert(`Become spymaster failed: ${reason}`)
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
      socket.off("spymasters-updated")
      socket.off("current-spymaster-updated")
      socket.off("clue-updated")
      socket.off("player-role")
      socket.off("lobby-updated")
      socket.off("name-set")
      socket.off("game-started")
      socket.off("start-game-failed")
    }
  }, [])

  const actionBtnStyle = (bg) => ({
    background: bg,
    color: 'white',
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer'
  })


  const createRoom = () => {
    socket.emit("create-room")
    setScreen("lobby")
  }

  const joinRoom = () => {
    socket.emit("join-room", joinCode)
    setRoomCode(joinCode)
    setScreen("lobby")
  }

  const saveName = () => {
    if (!roomCode) return alert('Join or create a room first')
    if (!playerNameInput || playerNameInput.trim() === '') return alert('Enter a name')
    socket.emit('set-name', { roomCode, name: playerNameInput.trim() })
    setPlayerNameInput('')
  }

  const leaveTeam = () => {
    if (!roomCode) return
    socket.emit('leave-team', { roomCode })
  }

  const startGame = () => {
    if (!roomCode) return
    socket.emit('start-game', { roomCode })
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

    // If player is spymaster, cannot reveal
    if (playerRole && playerRole.role === "spymaster") {
      console.warn("[CLIENT] revealCard blocked: spymaster cannot reveal")
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

  const becomeSpymaster = (team) => {
    if (!roomCode) return
    socket.emit("become-spymaster", { roomCode, team })
  }

  const sendClue = () => {
    if (!roomCode) return
    socket.emit("send-clue", { roomCode, word: clueWord, number: parseInt(clueNumber, 10) })
    setClueWord("")
    setClueNumber("")
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
      {/* HOME SCREEN */}
      {screen === 'home' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 520, textAlign: 'center' }}>
            <button onClick={createRoom} style={{ padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 12 }}>Create Room</button>

            <div style={{ marginTop: 8 }}>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter room code" style={{ padding: '10px', borderRadius: '10px', border: 'none', marginRight: '10px', width: 220 }} />
              <button onClick={joinRoom} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Join Room</button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY SCREEN */}
      {screen === 'lobby' && (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3>Room: {roomCode}</h3>
              <div>Players: {players.length}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={playerNameInput} onChange={(e) => setPlayerNameInput(e.target.value)} placeholder="Your name" style={{ padding: 8, borderRadius: 8 }} />
              <button onClick={saveName} style={{ padding: '8px 12px', borderRadius: 8 }}>Save Name</button>
              <button onClick={() => {
                if (!roomCode) return alert('Room code not available yet')
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(roomCode).then(() => alert('Room code copied'))
                } else {
                  // fallback
                  window.prompt('Copy room code:', roomCode)
                }
              }} style={{ padding: '8px 12px', borderRadius: 8 }}>Copy Room Code</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* BLUE COLUMN */}
            <div style={{ flex: 1 }}>
              <div style={{ background: '#0b1220', padding: 16, borderRadius: 12 }}>
                <h3 style={{ margin: 0, color: '#93c5fd' }}>BLUE TEAM</h3>
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, color: '#9ca3af', fontSize: 13 }}>Spymaster</div>
                    <div>
                      {spymasters.blue ? (
                        <PlayerCard name={names[spymasters.blue] || spymasters.blue} role={'spymaster'} team={'blue'} isYou={spymasters.blue === socket.id} />
                      ) : (
                        <div style={{ padding: 12, color: '#6b7280' }}>No spymaster</div>
                      )}
                    </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, color: '#9ca3af', fontSize: 13 }}>Operatives</div>
                  <div>
                    {(teams.blue || []).filter(id => id !== spymasters.blue).map(id => (
                      <PlayerCard key={id} name={names[id] || id} role={'operative'} team={'blue'} isYou={id === socket.id} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RED COLUMN */}
            <div style={{ flex: 1 }}>
              <div style={{ background: '#1a0b0b', padding: 16, borderRadius: 12 }}>
                <h3 style={{ margin: 0, color: '#fecaca' }}>RED TEAM</h3>
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, color: '#9ca3af', fontSize: 13 }}>Spymaster</div>
                  <div>
                    {spymasters.red ? (
                      <PlayerCard name={names[spymasters.red] || spymasters.red} role={'spymaster'} team={'red'} isYou={spymasters.red === socket.id} />
                    ) : (
                      <div style={{ padding: 12, color: '#6b7280' }}>No spymaster</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, color: '#9ca3af', fontSize: 13 }}>Operatives</div>
                  <div>
                    {(teams.red || []).filter(id => id !== spymasters.red).map(id => (
                      <PlayerCard key={id} name={names[id] || id} role={'operative'} team={'red'} isYou={id === socket.id} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, boxShadow: '0 8px 28px rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                <button onClick={() => joinTeam('red')} style={actionBtnStyle('#dc2626')}>Join Red</button>
                <button onClick={() => joinTeam('blue')} style={actionBtnStyle('#2563eb')}>Join Blue</button>
                {!myTeam && (
                  <>
                    <button onClick={() => becomeSpymaster('red')} style={actionBtnStyle('#b91c1c')}>Red Spymaster</button>
                    <button onClick={() => becomeSpymaster('blue')} style={actionBtnStyle('#2563eb')}>Blue Spymaster</button>
                  </>
                )}
                {myTeam === 'red' && (
                  <button onClick={() => becomeSpymaster('red')} style={actionBtnStyle('#b91c1c')}>Become Red Spymaster</button>
                )}
                {myTeam === 'blue' && (
                  <button onClick={() => becomeSpymaster('blue')} style={actionBtnStyle('#2563eb')}>Become Blue Spymaster</button>
                )}
                <button onClick={leaveTeam} style={actionBtnStyle('#475569')}>Leave Team</button>
                {host === socket.id && (
                  <button onClick={startGame} style={{ padding: '10px 16px', borderRadius: 10, background: '#10b981', color: 'white', border: 'none' }}>Start Game</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* removed duplicate action buttons - single set exists in lobby */}

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

      {playerRole && (
        <h4 style={{ textAlign: "center", marginTop: "6px", marginBottom: "14px", color: playerRole.role === "spymaster" ? "#fbbf24" : "#9ca3af" }}>
          Your Role: {playerRole.role ? playerRole.role.toUpperCase() : "PLAYER"} {playerRole.team ? ` - ${playerRole.team.toUpperCase()}` : ""}
        </h4>
      )}

      {screen === 'game' && (
        <>
          <h2
            style={{
              textAlign: "center",
              marginBottom: "20px",
              color: currentTurn === "red" ? "#dc2626" : "#2563eb"
            }}
          >
            Turn: {currentTurn.toUpperCase()}
          </h2>

          <div style={{ textAlign: "center", marginBottom: "20px", fontSize: "20px" }}>
            <strong>Current Clue:</strong>{" "}
            {currentClue && currentClue.word ? `${currentClue.word} - ${currentClue.number ?? ''}` : "None"}
          </div>

          {/* Clue input for current spymaster only */}
          {roomCode && playerRole && playerRole.role === "spymaster" && myTeam === currentTurn && currentSpymaster === socket.id && (
            <div style={{ textAlign: "center", marginBottom: "20px", display: "flex", justifyContent: "center", gap: "8px" }}>
              <input value={clueWord} onChange={(e) => setClueWord(e.target.value)} placeholder="clue word" style={{ padding: "8px", borderRadius: "8px" }} />
              <input value={clueNumber} onChange={(e) => setClueNumber(e.target.value)} placeholder="number" style={{ padding: "8px", borderRadius: "8px", width: "80px" }} />
              <button onClick={sendClue} style={{ padding: "8px 12px", borderRadius: "8px" }}>Send Clue</button>
            </div>
          )}

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
              const isPlayerSpymaster = playerRole && playerRole.role === "spymaster"
              const isCardDisabled = isCardRevealed || !!winner || !myTeam || myTeam !== currentTurn || isPlayerSpymaster;

              return (
                <Card
                  key={index}
                  card={card}
                  onReveal={() => revealCard(index)}
                  isSpymaster={isPlayerSpymaster}
                  playerRole={playerRole}
                  disabled={isCardDisabled}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default App