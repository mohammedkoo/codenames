  import { useEffect, useState } from "react"
  import Card from "./components/Card"
  import PlayerCard from "./components/PlayerCard"
  import { socket } from "./socket"
  import { gameAudio } from "./audio"

  function App() {
    const [board, setBoard] = useState([])
    const [screen, setScreen] = useState("home") // home | lobby | game

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

    const [winner, setWinner] = useState(null)
    const [teams, setTeams] = useState({
      red: [],
      blue: []
    })
    const [myTeam, setMyTeam] = useState(null)

    // Name configuration states
    const [agentName, setAgentName] = useState(() => localStorage.getItem("codenames_agent_name") || "")
    const [nameInput, setNameInput] = useState("")
    const [showNameModal, setShowNameModal] = useState(false)
    const [pendingAction, setPendingAction] = useState(null) // null | "create" | "join"

    // Selections state: { [cardIndex]: { playerId, playerName } }
    const [selections, setSelections] = useState({})

    // Active word pack state
    const [activePack, setActivePack] = useState("standard")

    // Randomization visual simulation states
    const [isRandomizing, setIsRandomizing] = useState(false)
    const [visualTeams, setVisualTeams] = useState(null)
    const [visualSpymasters, setVisualSpymasters] = useState(null)
    const [randomVisualName, setRandomVisualName] = useState("DEC_OP_SYS")

    useEffect(() => {
      socket.on("connect", () => {
        console.log("Connected:", socket.id)
      })

      socket.on("board-updated", (newBoard) => {
        console.log("[CLIENT] board-updated received:", newBoard)
        
        // Compare with current board to play reveal / buzzer sound effects
        setBoard((prevBoard) => {
          if (prevBoard && prevBoard.length > 0 && newBoard && newBoard.length === prevBoard.length) {
            let revealedIndex = -1;
            for (let i = 0; i < newBoard.length; i++) {
              if (newBoard[i].revealed && !prevBoard[i].revealed) {
                revealedIndex = i;
                break;
              }
            }
            if (revealedIndex !== -1) {
              const card = newBoard[revealedIndex];
              if (card.type === "killer") {
                gameAudio.playAssassin();
              } else if (card.type === "neutral") {
                gameAudio.playWrong();
              } else {
                // Red or Blue card. If it matches currentTurn, it is a success reveal, otherwise wrong
                if (card.type === currentTurn) {
                  gameAudio.playReveal();
                } else {
                  gameAudio.playWrong();
                }
              }
            }
          }
          return [...newBoard];
        });
      })

      socket.on("turn-updated", (turn) => {
        console.log("[CLIENT] turn-updated:", turn)
        setCurrentTurn(turn)
        gameAudio.playSwitch();
      })

      socket.on("spymasters-updated", (s) => {
        console.log("[CLIENT] spymasters-updated:", s)
        setSpymasters(s)
        if (s.red === socket.id) {
          setPlayerRole({ role: "spymaster", team: "red" })
        } else if (s.blue === socket.id) {
          setPlayerRole({ role: "spymaster", team: "blue" })
        } else {
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

        if (l.roomCode) setRoomCode(l.roomCode)
        if (l.pack) setActivePack(l.pack)
      })

      socket.on("room-full", () => {
        console.warn("[CLIENT] Room is full")
        gameAudio.playWrong();
        alert("عذراً، هذه الغرفة ممتلئة باللاعبين (الحد الأقصى 6 لاعبين)!")
        setScreen("home")
      })

      socket.on("name-set", (name) => {
        console.log("[CLIENT] name-set:", name)
      })

      socket.on("game-started", (data) => {
        console.log("[CLIENT] game-started:", data)
        setBoard(data.board || [])
        setCurrentTurn(data.currentTurn || "red")
        setTeams(data.teams || teams)
        setSpymasters(data.spymasters || spymasters)
        setNames(data.names || names)
        setSelections({}) // Clear any previous selection visual overlays when game starts
        setScreen("game")
        gameAudio.playStart();
      })

      socket.on("start-game-failed", (reason) => {
        console.warn("[CLIENT] start-game-failed:", reason)
        gameAudio.playWrong();
        alert(`فشل بدء اللعبة: ${reason === "missing-spymasters" ? "يجب تعيين قادة استخبارات لكلا الفريقين" : reason === "teams-incomplete" ? "يجب وجود لاعب واحد على الأقل في كل فريق" : reason}`)
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
        gameAudio.playWrong();
        alert(`فشل تعيين القائد: ${reason === "already-has-spymaster" ? "هذا الفريق لديه قائد بالفعل" : reason}`)
      })

      socket.on("game-over", (winnerTeam) => {
        console.log("[CLIENT] game-over! Winner:", winnerTeam)
        setWinner(winnerTeam)
        gameAudio.playSuccess();
      })

      socket.on("room-created", (code) => {
        console.log("[CLIENT] Received room-created event. Code:", code)
        setRoomCode(code)
        // Auto emit the saved name from localStorage/state
        const savedName = localStorage.getItem("codenames_agent_name");
        if (savedName) {
          socket.emit("set-name", { roomCode: code, name: savedName });
        }
        gameAudio.playJoin();
      })

      socket.on("room-joined", (code) => {
        console.log("[CLIENT] Received room-joined event. Code:", code)
        setRoomCode(code)
        // Auto emit the saved name from localStorage/state
        const savedName = localStorage.getItem("codenames_agent_name");
        if (savedName) {
          socket.emit("set-name", { roomCode: code, name: savedName });
        }
        gameAudio.playJoin();
      })

      socket.on("player-joined", (playersList) => {
        console.log("[CLIENT] Received player-joined event. Players:", playersList)
        setPlayers(playersList)
      })

      socket.on("room-not-found", () => {
        console.warn("[CLIENT] Received room-not-found event")
        gameAudio.playWrong();
        alert("غرفة اللعبة غير موجودة!")
      })

      socket.on("teams-updated", (newTeams) => {
        console.log("[CLIENT] Received teams-updated event. Teams:", newTeams)
        setTeams(newTeams)
      })

      socket.on("player-team", (team) => {
        console.log("[CLIENT] Received player-team event. MyTeam:", team)
        setMyTeam(team)
      })

      // Realtime Card Selection Events
      socket.on("card-selected", ({ index, playerId, playerName }) => {
        setSelections((prev) => ({
          ...prev,
          [index]: { playerId, playerName }
        }))
      })

      socket.on("card-deselected", ({ index }) => {
        setSelections((prev) => {
          const next = { ...prev }
          delete next[index]
          return next
        })
      })

      socket.on("selections-cleared", () => {
        setSelections({})
      })

      socket.on("randomizing-started", () => {
        setIsRandomizing(true)
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
        socket.off("card-selected")
        socket.off("card-deselected")
        socket.off("selections-cleared")
        socket.off("room-full")
        socket.off("randomizing-started")
      }
    }, [currentTurn, teams, spymasters, names])

    // local visual shuffle simulation for team randomize roulette
    useEffect(() => {
      if (!isRandomizing) return

      // Play synthesized roulette ticking audio
      gameAudio.playRandomize()

      const interval = setInterval(() => {
        const shuffled = [...players].sort(() => Math.random() - 0.5)
        const tempTeams = { red: [], blue: [] }
        const tempSpymasters = { red: null, blue: null }

        shuffled.forEach((playerId, index) => {
          if (index % 2 === 0) {
            tempTeams.red.push(playerId)
          } else {
            tempTeams.blue.push(playerId)
          }
        })

        if (tempTeams.red.length > 0) tempSpymasters.red = tempTeams.red[0]
        if (tempTeams.blue.length > 0) tempSpymasters.blue = tempTeams.blue[0]

        setVisualTeams(tempTeams)
        setVisualSpymasters(tempSpymasters)

        if (players.length > 0) {
          const randId = players[Math.floor(Math.random() * players.length)]
          setRandomVisualName(names[randId] || "DEC_OP_" + Math.floor(Math.random() * 900))
        }
      }, 85)

      const timeout = setTimeout(() => {
        setIsRandomizing(false)
        clearInterval(interval)
        setVisualTeams(null)
        setVisualSpymasters(null)
      }, 2000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }, [isRandomizing, players, names])

    const createRoom = () => {
      setPendingAction("create")
      setNameInput(localStorage.getItem("codenames_agent_name") || "")
      setShowNameModal(true)
    }

    const joinRoom = () => {
      if (!joinCode || joinCode.trim() === "") return alert("من فضلك أدخل رمز الغرفة للاتصال")
      setPendingAction("join")
      setNameInput(localStorage.getItem("codenames_agent_name") || "")
      setShowNameModal(true)
    }

    const leaveTeam = () => {
      if (!roomCode) return
      socket.emit("leave-team", { roomCode })
    }

    const startGame = () => {
      if (!roomCode) return
      socket.emit("start-game", { roomCode })
    }

    const redRemaining = board.filter(
      (card) => card.type === "red" && !card.revealed
    ).length

    const blueRemaining = board.filter(
      (card) => card.type === "blue" && !card.revealed
    ).length

    // Two-step click handlers
    const handleCardFirstClick = (index) => {
      if (winner || board[index]?.revealed || !roomCode) return

      if (!myTeam) {
        alert("يجب عليك اختيار فريق أولاً (الانضمام للفريق الأحمر أو الأزرق) لبدء اللعب كعميل ميداني!")
        return
      }

      if (myTeam !== currentTurn) {
        alert("يرجى الانتظار! ليس دور فريقك حالياً في فك التشفير.")
        return
      }

      if (playerRole && playerRole.role === "spymaster") {
        return
      }

      // Select the card on the server
      socket.emit("select-card", { roomCode, index })
    }

    const handleCardConfirmClick = (index) => {
      if (winner || board[index]?.revealed || !roomCode) return

      if (!myTeam || myTeam !== currentTurn) return
      if (playerRole && playerRole.role === "spymaster") return

      // Reveal the card on the server
      socket.emit("reveal-card", { roomCode, index })
    }

    const joinTeam = (team) => {
      if (!roomCode) return
      socket.emit("join-team", { roomCode, team })
    }

    const becomeSpymaster = (team) => {
      if (!roomCode) return
      socket.emit("become-spymaster", { roomCode, team })
    }

    const sendClue = () => {
      if (!roomCode) return
      if (!clueWord || clueWord.trim() === "") return alert("الرجاء إدخال الكلمة المفتاحية للشفرة")
      if (!clueNumber || isNaN(clueNumber)) return alert("الرجاء إدخال عدد البطاقات المستهدفة")
      socket.emit("send-clue", { roomCode, word: clueWord.trim(), number: parseInt(clueNumber, 10) })
      setClueWord("")
      setClueNumber("")
    }

    const copyRoomCode = () => {
      if (!roomCode) return
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomCode).then(() => {
          alert("تم نسخ رمز الغرفة بنجاح!")
        })
      } else {
        window.prompt("نسخ رمز الغرفة:", roomCode)
      }
    }

    const handleModalSubmit = (e) => {
      e.preventDefault()
      if (!nameInput || nameInput.trim() === "") return alert("يرجى إدخال اسم حركي صالح")
      const name = nameInput.trim()
      localStorage.setItem("codenames_agent_name", name)
      setAgentName(name)
      setShowNameModal(false)
      gameAudio.playJoin()

      if (pendingAction === "create") {
        socket.emit("create-room")
        setScreen("lobby")
      } else if (pendingAction === "join") {
        const code = joinCode.trim().toUpperCase()
        socket.emit("join-room", code)
        setRoomCode(code)
        setScreen("lobby")
      }
      setPendingAction(null)
    }

    // Dynamic grid template columns
    const gridColsClass = board.length === 27 ? "grid-cols-3 md:grid-cols-9" : (board.length === 25 ? "grid-cols-5" : "grid-cols-3")

    // Sidebar Red Team Component
    const RedTeamPanel = (() => {
      // Override team data during randomization wheel animation
      const activeSpymaster = isRandomizing && visualSpymasters ? visualSpymasters.red : spymasters.red;
      const activeOperatives = isRandomizing && visualTeams ? visualTeams.red : (teams.red || []);
      
      return (
        <div className={`order-2 lg:order-none lg:sticky lg:top-6 glass-panel-red rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden flex flex-col gap-5 ${
          currentTurn === "red" ? "pulse-red border-red-500/40 shadow-[0_0_20px_rgba(255,0,85,0.15)]" : "border-red-500/10 opacity-70"
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-red-500/20 pb-2.5">
            <span className="text-lg font-black tracking-wide text-red-400 glow-text-red">الفريق الأحمر</span>
            {screen === "game" && (
              <span className="text-xs font-bold text-red-500 font-orbitron bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                {redRemaining} شفرة متبقية
              </span>
            )}
          </div>

          {/* Spymaster Red */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 block font-cairo">قائد الاستخبارات</span>
            {activeSpymaster ? (
              <PlayerCard name={names[activeSpymaster] || activeSpymaster} role="spymaster" team="red" isYou={activeSpymaster === socket.id} />
            ) : (
              <div className="text-slate-500 py-3 text-center border border-dashed border-red-500/20 rounded-xl bg-red-950/5 text-xs font-bold font-cairo">
                بانتظار انضمام قائد الاستخبارات
              </div>
            )}
          </div>

          {/* Operatives Red */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 block font-cairo">العملاء الميدانيون</span>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
              {activeOperatives.filter(id => id !== activeSpymaster).length > 0 ? (
                activeOperatives.filter(id => id !== activeSpymaster).map(id => (
                  <PlayerCard key={id} name={names[id] || id} role="operative" team="red" isYou={id === socket.id} />
                ))
              ) : (
                <div className="text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-xs font-medium font-cairo">
                  لا يوجد عملاء ميدانيون حالياً
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons inside Red Panel (only in Lobby screen) */}
          {screen === "lobby" && (
            <div className="flex flex-col gap-2 mt-2 border-t border-red-500/10 pt-4">
              {myTeam === "red" ? (
                <>
                  {spymasters.red !== socket.id && (
                    <button
                      onClick={() => becomeSpymaster("red")}
                      onMouseEnter={() => gameAudio.playHover()}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-550 hover:to-amber-750 border border-amber-500/35 text-white text-xs font-bold transition-all shadow-[0_4px_10px_rgba(245,158,11,0.15)] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>ترقية إلى قائد استخبارات</span>
                      </span>
                    </button>
                  )}
                  <button
                    onClick={leaveTeam}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-red-500/20 text-red-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>مغادرة الفريق الأحمر</span>
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => joinTeam("red")}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-650 to-red-850 hover:from-red-600 hover:to-red-800 border border-red-500/40 text-white text-xs font-bold transition-all shadow-[0_4px_12px_rgba(255,0,85,0.15)] cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>الانضمام كعميل ميداني</span>
                    </span>
                  </button>
                  {!spymasters.red && (
                    <button
                      onClick={() => becomeSpymaster("red")}
                      onMouseEnter={() => gameAudio.playHover()}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>تولي قيادة الاستخبارات</span>
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {currentTurn === "red" && screen === "game" && (
            <div className="absolute bottom-2 left-2 text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse font-cairo">
              دور فك التشفير نشط
            </div>
          )}
        </div>
      );
    })();

    // Sidebar Blue Team Component
    const BlueTeamPanel = (() => {
      // Override team data during randomization wheel animation
      const activeSpymaster = isRandomizing && visualSpymasters ? visualSpymasters.blue : spymasters.blue;
      const activeOperatives = isRandomizing && visualTeams ? visualTeams.blue : (teams.blue || []);

      return (
        <div className={`order-3 lg:order-none lg:sticky lg:top-6 glass-panel-blue rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden flex flex-col gap-5 ${
          currentTurn === "blue" ? "pulse-blue border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]" : "border-cyan-500/10 opacity-80"
        }`}>
          <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/5 blur-2xl pointer-events-none"></div>

          <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2.5">
            <span className="text-lg font-black tracking-wide text-cyan-400 glow-text-blue">الفريق الأزرق</span>
            {screen === "game" && (
              <span className="text-xs font-bold text-cyan-400 font-orbitron bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {blueRemaining} شفرة متبقية
              </span>
            )}
          </div>

          {/* Spymaster Blue */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 block font-cairo">قائد الاستخبارات</span>
            {activeSpymaster ? (
              <PlayerCard name={names[activeSpymaster] || activeSpymaster} role="spymaster" team="blue" isYou={activeSpymaster === socket.id} />
            ) : (
              <div className="text-slate-500 py-3 text-center border border-dashed border-cyan-500/20 rounded-xl bg-blue-950/5 text-xs font-bold font-cairo">
                بانتظار انضمام قائد الاستخبارات
              </div>
            )}
          </div>

          {/* Operatives Blue */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 block font-cairo">العملاء الميدانيون</span>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
              {activeOperatives.filter(id => id !== activeSpymaster).length > 0 ? (
                activeOperatives.filter(id => id !== activeSpymaster).map(id => (
                  <PlayerCard key={id} name={names[id] || id} role="operative" team="blue" isYou={id === socket.id} />
                ))
              ) : (
                <div className="text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-xs font-medium font-cairo">
                  لا يوجد عملاء ميدانيون حالياً
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons inside Blue Panel (only in Lobby screen) */}
          {screen === "lobby" && (
            <div className="flex flex-col gap-2 mt-2 border-t border-cyan-500/10 pt-4">
              {myTeam === "blue" ? (
                <>
                  {spymasters.blue !== socket.id && (
                    <button
                      onClick={() => becomeSpymaster("blue")}
                      onMouseEnter={() => gameAudio.playHover()}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-550 hover:to-amber-750 border border-amber-500/35 text-white text-xs font-bold transition-all shadow-[0_4px_10px_rgba(245,158,11,0.15)] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>ترقية إلى قائد استخبارات</span>
                      </span>
                    </button>
                  )}
                  <button
                    onClick={leaveTeam}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>مغادرة الفريق الأزرق</span>
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => joinTeam("blue")}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-800 hover:from-cyan-550 hover:to-cyan-750 border border-cyan-500/40 text-white text-xs font-bold transition-all shadow-[0_4px_12px_rgba(0,240,255,0.15)] cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-cyan-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>الانضمام كعميل ميداني</span>
                    </span>
                  </button>
                  {!spymasters.blue && (
                    <button
                      onClick={() => becomeSpymaster("blue")}
                      onMouseEnter={() => gameAudio.playHover()}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>تولي قيادة الاستخبارات</span>
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {currentTurn === "blue" && screen === "game" && (
            <div className="absolute bottom-2 left-2 text-[9px] font-black text-cyan-400 uppercase tracking-widest animate-pulse font-cairo">
              دور فك التشفير نشط
            </div>
          )}
        </div>
      );
    })();

    return (
      <div className="min-h-screen bg-[#030712] text-slate-200 font-cairo flex flex-col justify-between relative overflow-hidden select-none" dir="rtl">
        {/* Ambient scanlines */}
        <div className="scanline"></div>

        {/* ====================================================
            AGENT NAME MODAL OVERLAY (Only triggered on Create/Join)
            ==================================================== */}
        {showNameModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-cyan-500/30 text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.15)] panel-depth">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
              
              {/* Corner accents */}
              <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-md"></span>
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-md"></span>

              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] pulse-blue">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-2 font-cairo">التحقق من الهوية الأمنية</h2>
              <p className="text-sm text-slate-400 mb-6 font-cairo">
                {pendingAction === "create"
                  ? "الرجاء إدخال الاسم الرمزي للعميل لتأسيس غرفة الاتصال المشفرة"
                  : "الرجاء إدخال الاسم الرمزي للعميل للانضمام إلى الغرفة التكتيكية"
                }
              </p>

              <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="الاسم الحركي للعميل..."
                  className="w-full text-center py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 focus:outline-none text-white text-base tracking-wide transition-all font-cairo"
                  required
                  maxLength={15}
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    onMouseEnter={() => gameAudio.playHover()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-slate-950 font-black tracking-wider transition-all shadow-[0_4px_15px_rgba(6,182,212,0.2)] cursor-pointer font-cairo"
                  >
                    تأكيد وتأمين الاتصال
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNameModal(false)
                      setPendingAction(null)
                    }}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-all font-bold cursor-pointer font-cairo"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Cinematic Header */}
        <header className="relative z-10 w-full pt-8 pb-4 px-4 text-center flex flex-col items-center">
          <div className="relative inline-block mb-1.5 group">
            <h1 className="text-4xl md:text-6xl font-black font-orbitron tracking-widest bg-gradient-to-r from-cyan-400 via-white to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              CODENAMES
            </h1>
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mt-1 group-hover:scale-x-110 transition-transform duration-700"></div>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 font-bold tracking-widest uppercase flex items-center gap-2">
            <span>نظام الاتصالات التكتيكي للعملاء</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>CYBER SPY CONTROL</span>
          </p>
        </header>

        {/* Main Body Layout */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 relative z-10 flex flex-col justify-center">
          
          {/* ====================================================
              1) HOME SCREEN (Now loaded immediately without blockage)
              ==================================================== */}
          {screen === "home" && (
            <div className="w-full max-w-xl mx-auto animate-fade-in flex flex-col gap-6 py-6">
              
              {/* Selection Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card A: Create Mission */}
                <button
                  onClick={createRoom}
                  onMouseEnter={() => gameAudio.playHover()}
                  className="glass-panel group p-8 rounded-3xl border border-slate-800 hover:border-cyan-500/40 text-center transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300 mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">إنشاء غرفة تشفير</h3>
                  <p className="text-xs text-slate-400">تأسيس قناة استخبارات جديدة وتولي منصب المضيف</p>
                </button>

                {/* Card B: Join Mission */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white text-center mb-3">الانضمام للغرفة</h3>
                    
                    {/* Join Input */}
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="أدخل رمز الغرفة..."
                      className="w-full text-center py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 focus:outline-none text-white text-lg tracking-wider font-orbitron transition-all"
                    />
                  </div>

                  <button
                    onClick={joinRoom}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-red-650 to-red-800 hover:from-red-600 hover:to-red-755 text-white font-bold tracking-wide transition-all shadow-[0_4px_15px_rgba(255,0,85,0.15)] hover:shadow-[0_0_20px_rgba(255,0,85,0.35)] cursor-pointer"
                  >
                    اتصال وتأمين القناة
                  </button>
                </div>

              </div>

              {/* Quick Profile config on Home screen */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">العميل الحالي:</span>
                  <span className="text-sm font-black text-cyan-400 font-orbitron">
                    {agentName || "لم يتم تحديد الهوية"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newName = window.prompt("تعديل اسم العميل الرمزي:", agentName || "");
                    if (newName && newName.trim() !== "") {
                      const trimmed = newName.trim();
                      localStorage.setItem("codenames_agent_name", trimmed);
                      setAgentName(trimmed);
                    }
                  }}
                  onMouseEnter={() => gameAudio.playHover()}
                  className="py-1 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/20 text-xs text-cyan-400 cursor-pointer"
                >
                  تعديل الهوية
                </button>
              </div>

            </div>
          )}

          {/* ====================================================
              2) LOBBY SCREEN (Side panels layout)
              ==================================================== */}
          {screen === "lobby" && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              
              {/* LOBBY TOP HUD */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-orbitron">ROOM CODE</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-orbitron text-cyan-400 tracking-wider glow-text-blue">{roomCode}</span>
                      <button
                        onClick={copyRoomCode}
                        onMouseEnter={() => gameAudio.playHover()}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="نسخ الرمز"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-800 hidden md:block"></div>
                  <div className="flex flex-col items-start hidden md:flex">
                    <span className="text-[10px] uppercase font-bold text-slate-400">العملاء بالغرفة</span>
                    <span className="text-xl font-bold font-orbitron text-white">{players.length} عميل</span>
                  </div>
                </div>

                {/* CURRENT PLAYER PROFILE CONFIG */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">العميل الحالي:</span>
                  <span className="text-sm font-black text-cyan-400 font-orbitron bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-900">{agentName}</span>
                  <button
                    onClick={() => {
                      const newName = window.prompt("تعديل اسم العميل الرمزي:", agentName);
                      if (newName && newName.trim() !== "") {
                        const trimmed = newName.trim();
                        localStorage.setItem("codenames_agent_name", trimmed);
                        setAgentName(trimmed);
                        if (roomCode) {
                          socket.emit("set-name", { roomCode, name: trimmed });
                        }
                      }
                    }}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 hover:text-white transition-all cursor-pointer font-bold"
                  >
                    تغيير
                  </button>
                </div>
              </div>

              {/* THREE-COLUMN GRID (Lobby panels flanking center console) */}
              <div className="w-full grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 items-start">
                
                {/* 1) RED TEAM Panel (Displays right in RTL) */}
                <div className="animate-fade-in-up animate-delay-100">
                  {RedTeamPanel}
                </div>

                {/* 2) CENTRAL CONTROL TERMINAL */}
                <div className="order-1 lg:order-none flex flex-col gap-6 animate-fade-in-up animate-delay-200">
                  
                  {/* section A: Room Connection Info */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden panel-depth">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 blur-xl pointer-events-none"></div>
                    <h3 className="text-sm font-bold text-slate-400 mb-4 font-cairo border-b border-slate-800 pb-2">بيانات غرفة الاتصال // ROOM INFO</h3>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">رمز الغرفة:</span>
                        <span className="text-2xl font-black font-orbitron text-cyan-400 tracking-wider glow-text-blue">{roomCode}</span>
                        <button
                          onClick={copyRoomCode}
                          onMouseEnter={() => gameAudio.playHover()}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:text-white hover:border-cyan-400/50 transition-all cursor-pointer shadow-md"
                          title="نسخ الرمز"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">المضيف الحالي</span>
                          <span className="text-xs font-black text-white font-cairo bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 mt-1 inline-block">
                            {names[host] || "تحميل..."}
                          </span>
                        </div>
                        <div className="text-right border-r border-slate-850 pr-4">
                          <span className="text-xs text-slate-400 block">العملاء المتصلون</span>
                          <span className="text-xs font-black text-cyan-400 font-orbitron bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 mt-1 inline-block">
                            {players.length} / 6
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* section B: Unassigned Agents */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden panel-depth text-right">
                    <h3 className="text-sm font-bold text-slate-400 mb-3 font-cairo border-b border-slate-800 pb-2">العملاء المنضمون (غير المعينين) // UNASSIGNED AGENTS</h3>
                    <div className="flex flex-wrap gap-2 pt-1 max-h-[150px] overflow-y-auto">
                      {(() => {
                        const activeRedTeam = isRandomizing && visualTeams ? visualTeams.red : teams.red;
                        const activeBlueTeam = isRandomizing && visualTeams ? visualTeams.blue : teams.blue;
                        const unassignedAgents = players.filter(id => !activeRedTeam.includes(id) && !activeBlueTeam.includes(id));
                        
                        return unassignedAgents.length > 0 ? (
                          unassignedAgents.map(id => (
                            <PlayerCard
                              key={id}
                              name={names[id] || id}
                              role="unassigned"
                              team="neutral"
                              isYou={id === socket.id}
                            />
                          ))
                        ) : (
                          <div className="w-full text-slate-500 py-3 text-center border border-dashed border-slate-800/40 rounded-xl bg-slate-950/20 text-xs font-medium font-cairo">
                            لا يوجد عملاء غير معينين حالياً. جميع العملاء في فرق العمل.
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* section C: Word Pack */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden panel-depth">
                    <h3 className="text-sm font-bold text-slate-400 mb-3 font-cairo border-b border-slate-800 pb-2">حزمة الكلمات // WORD PACK</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          if (host !== socket.id) return;
                          socket.emit("set-word-pack", { roomCode, pack: "standard" });
                        }}
                        onMouseEnter={() => gameAudio.playHover()}
                        className={`p-3 rounded-2xl text-center text-xs font-black transition-all ${
                          host === socket.id ? "cursor-pointer" : "opacity-80"
                        } ${
                          activePack === "standard"
                            ? "bg-cyan-950/40 border-2 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5c-.321 2.624-1.807 5.16-3.87 7.195m0 0A17.933 17.933 0 017 9.871M9 13a17.93 17.93 0 00A17.93 17.93 0 014.249 9.872" />
                          </svg>
                          <span>العربية القياسية</span>
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (host !== socket.id) return;
                          socket.emit("set-word-pack", { roomCode, pack: "tech" });
                        }}
                        onMouseEnter={() => gameAudio.playHover()}
                        className={`p-3 rounded-2xl text-center text-xs font-black transition-all ${
                          host === socket.id ? "cursor-pointer" : "opacity-80"
                        } ${
                          activePack === "tech"
                            ? "bg-cyan-950/40 border-2 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>إلكترونيات وهكر</span>
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (host !== socket.id) return;
                          socket.emit("set-word-pack", { roomCode, pack: "spy" });
                        }}
                        onMouseEnter={() => gameAudio.playHover()}
                        className={`p-3 rounded-2xl text-center text-xs font-black transition-all ${
                          host === socket.id ? "cursor-pointer" : "opacity-80"
                        } ${
                          activePack === "spy"
                            ? "bg-cyan-950/40 border-2 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800 sm:col-span-1"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>رعب وجاسوسية</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* section D: Tactical Briefing */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden panel-depth text-right">
                    <h3 className="text-sm font-bold text-slate-400 mb-3 font-cairo border-b border-slate-800 pb-2">التوجيهات التكتيكية للمهمة // TACTICAL BRIEFING</h3>
                    <ul className="text-xs text-slate-400 list-disc list-inside flex flex-col gap-2 font-cairo leading-relaxed pr-2">
                      <li>يتطلب لبدء المهمة وجود عميل ميداني واحد وقائد استخبارات في كل من الفريقين.</li>
                      <li>يقوم القادة بتقديم كلمة واحدة تلميحية مع عدد البطاقات المطابقة للشفرة.</li>
                      <li>تجنب فك شفرة القاتل (البطاقة السوداء) لتفادي الفشل المباشر للمهمة.</li>
                    </ul>
                  </div>

                  {/* section E: Start Game Panel */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden panel-depth text-center">
                    {host === socket.id ? (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs text-amber-400 font-bold block font-cairo">أنت مضيف الغرفة، بانتظار تفويضك لبدء المهمة</span>
                        
                        <button
                          onClick={() => {
                            socket.emit("randomize-teams", { roomCode });
                          }}
                          onMouseEnter={() => gameAudio.playHover()}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-cyan-400 text-xs font-bold transition-all cursor-pointer mb-1 shadow-md hover:shadow-lg font-cairo"
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
                            </svg>
                            <span>توزيع اللاعبين عشوائياً</span>
                          </span>
                        </button>

                        <button
                          onClick={startGame}
                          onMouseEnter={() => gameAudio.playHover()}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-650 border border-emerald-500/40 text-white font-black tracking-wider transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer pulse-blue font-cairo text-center"
                        >
                          تفويض بدء المهمة الأمنية (ابدأ اللعبة)
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <span className="relative flex h-3 w-3 mb-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                        <span className="text-xs text-slate-400 font-bold font-cairo">
                          بانتظار تفويض بدء اللعبة من المضيف...
                        </span>
                      </div>
                    )}
                  </div>

                </div>

                {/* 3) BLUE TEAM Panel (Displays left in RTL) */}
                <div className="animate-fade-in-up animate-delay-300">
                  {BlueTeamPanel}
                </div>

              </div>

              {/* Hologram Spinner Wheel Overlay for Roulette randomizer */}
              {isRandomizing && (
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                  <div className="glass-panel w-full max-w-sm p-8 rounded-3xl border border-cyan-500/30 text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.15)] pulse-blue">
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-md"></span>
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-md"></span>
                    
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-red-500 border-l-transparent animate-spin flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <div className="w-10 h-10 rounded-full border-4 border-t-transparent border-r-amber-400 border-b-transparent border-l-emerald-400 animate-[spin_1s_linear_infinite_reverse]"></div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-white mb-2 font-cairo tracking-wide">جاري توزيع العملاء عشوائياً</h3>
                    <p className="text-xs text-slate-400 mb-4 font-cairo uppercase font-orbitron tracking-widest animate-pulse">
                      RE-INDEXING TEAM DOSSIERS // DECRYPTING ROLES
                    </p>
                    
                    <div className="bg-slate-950/90 border border-slate-900 rounded-xl py-3 px-4 font-mono text-cyan-400 text-sm overflow-hidden h-8 flex justify-center items-center">
                      <span className="animate-pulse">
                        {randomVisualName}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ====================================================
              3) GAME SCREEN (Side panels layout flanking board)
              ==================================================== */}
          {screen === "game" && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              
              {/* GAME STATE HUD TOP PANEL */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* CURRENT TURN NOTIFICATION */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase font-bold text-slate-400">شفرة الدور الحالي</span>
                    <div className="flex items-center gap-3.5">
                      {currentTurn === "red" ? (
                        <span className="text-2xl font-black font-cairo text-red-500 glow-text-red tracking-wide animate-pulse flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-red-500 animate-ping"></span>
                          مهمة الفريق الأحمر
                        </span>
                      ) : (
                        <span className="text-2xl font-black font-cairo text-cyan-400 glow-text-blue tracking-wide animate-pulse flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping"></span>
                          مهمة الفريق الأزرق
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CURRENT ACTIVE CLUE OVERVIEW (Visor) */}
                <div className="flex-1 max-w-md bg-slate-950/40 border border-slate-900 px-6 py-2.5 rounded-2xl text-center">
                  <span className="text-[9px] tracking-widest text-slate-400 font-bold block mb-1 uppercase">الإشارة التوجيهية الحالية // CLUE SIGNAL</span>
                  {currentClue && currentClue.word ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-black text-white px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                        {currentClue.word}
                      </span>
                      <span className="text-lg font-black font-orbitron text-cyan-400 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-md glow-text-blue">
                        {currentClue.number}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs tracking-wide animate-pulse font-cairo">
                      بانتظار بث الشفرة التوجيهية من قائد الاستخبارات...
                    </span>
                  )}
                </div>

                {/* CURRENT PLAYER ROLE & EDIT IDENTITY */}
                <div className="flex items-center gap-3">
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">العميل الحالي</span>
                    <span className="text-xs font-black text-cyan-400 font-orbitron">{agentName}</span>
                  </div>
                  <button
                    onClick={() => {
                      const newName = window.prompt("تعديل اسم العميل الرمزي:", agentName);
                      if (newName && newName.trim() !== "") {
                        const trimmed = newName.trim();
                        localStorage.setItem("codenames_agent_name", trimmed);
                        setAgentName(trimmed);
                        if (roomCode) {
                          socket.emit("set-name", { roomCode, name: trimmed });
                        }
                      }
                    }}
                    onMouseEnter={() => gameAudio.playHover()}
                    className="p-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white transition-all font-bold cursor-pointer"
                  >
                    تعديل
                  </button>
                </div>

              </div>

              {/* CLUE ENTRY TERMINAL FOR ACTIVE SPYMASTER ONLY */}
              {roomCode && playerRole && playerRole.role === "spymaster" && myTeam === currentTurn && currentSpymaster === socket.id && (
                <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/5 flex flex-col sm:flex-row items-center justify-center gap-4 animate-pulse">
                  <span className="text-sm font-bold text-amber-400 font-cairo text-center sm:text-right">
                    قائد الاستخبارات: بث إشارة توجيهية لفريقك
                  </span>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      value={clueWord}
                      onChange={(e) => setClueWord(e.target.value)}
                      placeholder="الرمز المشفر (كلمة)..."
                      className="flex-1 sm:w-48 py-2 px-4 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-amber-500 text-white text-center font-cairo"
                    />
                    <input
                      type="number"
                      value={clueNumber}
                      onChange={(e) => setClueNumber(e.target.value)}
                      placeholder="العدد..."
                      className="w-20 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-amber-500 text-white font-orbitron text-center"
                      min="1"
                      max="9"
                    />
                    <button
                      onClick={sendClue}
                      onMouseEnter={() => gameAudio.playHover()}
                      className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-550 hover:to-amber-650 text-slate-950 text-sm font-extrabold tracking-wide transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer font-cairo"
                    >
                      بث الشفرة
                    </button>
                  </div>
                </div>
              )}

              {/* WINNER SCREEN OVERLAY */}
              {winner && (
                <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-slate-950/90 text-center relative overflow-hidden shadow-2xl animate-pulse">
                  <h2 className="text-4xl md:text-5xl font-black font-cairo mb-3 uppercase tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                    انتهاء المهمة الأمنية بنجاح
                  </h2>
                  <p className="text-lg md:text-xl font-bold text-white">
                    فوز الفريق الكاسح:{" "}
                    <span className={`font-black uppercase tracking-wider font-orbitron ${winner === "RED" ? "text-red-500 glow-text-red" : "text-cyan-400 glow-text-blue"}`}>
                      {winner === "RED" ? "الأحمر" : "الأزرق"}
                    </span>
                  </p>
                  <div className="mt-6 flex justify-center">
                    <div className="h-1 w-32 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                  </div>
                </div>
              )}

              {/* THREE-COLUMN GRID GAME BOARD */}
              <div className="w-full grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-4 items-start">
                
                {/* 1) RED TEAM Panel (Displays right in RTL) */}
                {RedTeamPanel}

                {/* 2) MAIN 5x5 BOARD GRID (In Center) */}
                <div className="order-1 lg:order-none flex flex-col gap-4 w-full max-w-5xl mx-auto min-w-0 px-2 sm:px-4">
                  <div className="p-3 sm:p-4 md:p-5 rounded-3xl bg-slate-950/60 border border-slate-900 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                    <div className={`grid ${gridColsClass} gap-2 sm:gap-2.5 md:gap-3`}>
                      {board.map((card, index) => {
                        const isCardRevealed = card.revealed
                        const isPlayerSpymaster = playerRole && playerRole.role === "spymaster"
                        const isCardDisabled = isCardRevealed || !!winner || !myTeam || myTeam !== currentTurn || isPlayerSpymaster

                        return (
                          <Card
                            key={index}
                            card={card}
                            onFirstClick={() => handleCardFirstClick(index)}
                            onConfirmClick={() => handleCardConfirmClick(index)}
                            isSpymaster={isPlayerSpymaster}
                            playerRole={playerRole}
                            disabled={isCardDisabled}
                            selection={selections[index]}
                            currentTurn={currentTurn}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 3) BLUE TEAM Panel (Displays left in RTL) */}
                {BlueTeamPanel}

              </div>

            </div>
          )}

        </main>

        {/* Global Cinematic Footer */}
        <footer className="w-full text-center py-5 border-t border-slate-900 bg-slate-950/20 text-slate-500 text-[10px] font-bold tracking-widest uppercase relative z-10 font-cairo">
          قناة الاتصالات مشفرة بروتوكولياً 256-Bit • CODENAMES INTEL CONTROL © {new Date().getFullYear()}
        </footer>

      </div>
    )
  }

  export default App