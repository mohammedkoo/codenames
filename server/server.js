const { generateBoard } = require("./shared/generateBoard")
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

const rooms = {}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // ─────────────────────────────────────────
    // CREATE ROOM
    // ─────────────────────────────────────────

    socket.on("create-room", () => {
        const roomCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()

        rooms[roomCode] = {
            players: [socket.id],
            board: generateBoard(),
            currentTurn: "red",
            gameOver: false,
            winner: null,
            teams: {
                red: [],
                blue: []
            },
            // Spymaster and clue system
            spymasters: {
                red: null,
                blue: null
            },
            // current spymaster (socket id) for the team whose turn it is
            currentSpymaster: null,
            // current clue info
            currentClue: {
                word: null,
                number: null
            },
            // lobby metadata
            names: {
                [socket.id]: null
            },
            host: socket.id,
            roomState: "lobby",
            // card selection state: { [cardIndex]: { playerId, playerName } }
            selections: {},
            pack: "standard"
        }

        socket.join(roomCode)

        socket.emit("room-created", roomCode)
        socket.emit("board-updated", rooms[roomCode].board)
        socket.emit("turn-updated", rooms[roomCode].currentTurn)
        socket.emit("teams-updated", rooms[roomCode].teams)
        socket.emit("player-team", null)
        socket.emit("spymasters-updated", rooms[roomCode].spymasters)
        socket.emit("current-spymaster-updated", rooms[roomCode].currentSpymaster)
        socket.emit("clue-updated", rooms[roomCode].currentClue)
        socket.emit("lobby-updated", {
            roomCode,
            players: rooms[roomCode].players,
            names: rooms[roomCode].names,
            teams: rooms[roomCode].teams,
            spymasters: rooms[roomCode].spymasters,
            host: rooms[roomCode].host,
            roomState: rooms[roomCode].roomState,
            pack: rooms[roomCode].pack
        })

        console.log("Room created:", roomCode)
    })

    // ─────────────────────────────────────────
    // JOIN ROOM
    // ─────────────────────────────────────────

    socket.on("join-room", (roomCode) => {
        console.log(`[SERVER] Received join-room event: socket.id=${socket.id}, roomCode=${roomCode}`)
        const room = rooms[roomCode]

        if (!room) {
            console.warn(`[SERVER] join-room failed: roomCode=${roomCode} not found`)
            socket.emit("room-not-found")
            return
        }

        // Enforce 6-player room limit
        if (room.players.length >= 6 && !room.players.includes(socket.id)) {
            console.warn(`[SERVER] join-room failed: roomCode=${roomCode} is full`)
            socket.emit("room-full")
            return
        }

        // Avoid adding duplicate player socket IDs
        if (!room.players.includes(socket.id)) {
            room.players.push(socket.id)
        }

        socket.join(roomCode)

        // Send confirmation back to the player who joined
        socket.emit("room-joined", roomCode)

        io.to(roomCode).emit(
            "player-joined",
            room.players
        )

        socket.emit(
            "board-updated",
            room.board
        )

        socket.emit(
            "turn-updated",
            room.currentTurn
        )

        // Send current teams to the newly joined player
        socket.emit("teams-updated", room.teams)

        // Send current player-team status
        const isRed = room.teams.red.includes(socket.id)
        const isBlue = room.teams.blue.includes(socket.id)
        const playerTeam = isRed ? "red" : (isBlue ? "blue" : null)
        socket.emit("player-team", playerTeam)
        // Inform everyone about spymasters and current clue (sync)
        io.to(roomCode).emit("spymasters-updated", room.spymasters)
        // current spymaster is whichever spymaster belongs to the currentTurn
        room.currentSpymaster = room.spymasters[room.currentTurn] || null
        io.to(roomCode).emit("current-spymaster-updated", room.currentSpymaster)
        io.to(roomCode).emit("clue-updated", room.currentClue)

        // Emit lobby update to everyone in room
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })

        console.log(`[SERVER] Player joined: socket.id=${socket.id}, roomCode=${roomCode}, playerTeam=${playerTeam}`)

        if (room.gameOver && room.winner) {
            socket.emit("game-over", room.winner)
        }
    })

    // ─────────────────────────────────────────
    // JOIN TEAM
    // ─────────────────────────────────────────

    socket.on("join-team", ({ roomCode, team }) => {
        console.log(`[SERVER] Received join-team event: socket.id=${socket.id}, roomCode=${roomCode}, requestedTeam=${team}`)
        const room = rooms[roomCode]

        if (!room) {
            console.warn(`[SERVER] join-team failed: roomCode=${roomCode} not found for socket.id=${socket.id}`)
            return
        }

        // Remove from both teams first to prevent duplication
        room.teams.red = room.teams.red.filter(id => id !== socket.id)
        room.teams.blue = room.teams.blue.filter(id => id !== socket.id)

        if (team === "red" || team === "blue") {
            room.teams[team].push(socket.id)
        }

        console.log(`[SERVER] Emitting teams-updated for roomCode=${roomCode}:`, room.teams)
        io.to(roomCode).emit(
            "teams-updated",
            room.teams
        )

        // Send player-team to the player themselves
        const playerTeam = team === "red" || team === "blue" ? team : null
        socket.emit("player-team", playerTeam)

        // If the player who joined/changed team was previously a spymaster for the other team, clear that role
        for (const t of ["red", "blue"]) {
            if (room.spymasters[t] && !room.teams[t].includes(room.spymasters[t])) {
                room.spymasters[t] = null
            }
        }

        // Update current spymaster based on currentTurn
        room.currentSpymaster = room.spymasters[room.currentTurn] || null

        io.to(roomCode).emit("spymasters-updated", room.spymasters)
        io.to(roomCode).emit("current-spymaster-updated", room.currentSpymaster)
        io.to(roomCode).emit("clue-updated", room.currentClue)
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })
    })

    // ─────────────────────────────────────────
    // BECOME SPYMASTER
    // ─────────────────────────────────────────

    socket.on("become-spymaster", ({ roomCode, team }) => {
        console.log(`[SERVER] Received become-spymaster request: socket.id=${socket.id}, roomCode=${roomCode}, team=${team}`)
        const room = rooms[roomCode]

        if (!room) {
            console.warn(`[SERVER] become-spymaster failed: room ${roomCode} not found`)
            socket.emit("become-spymaster-failed", "room-not-found")
            return
        }

        if (team !== "red" && team !== "blue") {
            socket.emit("become-spymaster-failed", "invalid-team")
            return
        }

        // If player is not on the requested team, auto-join them
        if (!room.teams[team].includes(socket.id)) {
            // Remove from other team first
            room.teams.red = room.teams.red.filter(id => id !== socket.id)
            room.teams.blue = room.teams.blue.filter(id => id !== socket.id)
            room.teams[team].push(socket.id)
            console.log(`[SERVER] Auto-joined socket ${socket.id} to team ${team} while becoming spymaster`)
            io.to(roomCode).emit("teams-updated", room.teams)
            socket.emit("player-team", team)
        }

        // Prevent more than one spymaster per team
        const existing = room.spymasters[team]
        if (existing && existing !== socket.id) {
            console.warn(`[SERVER] become-spymaster failed: team ${team} already has spymaster ${existing}`)
            socket.emit("become-spymaster-failed", "already-has-spymaster")
            return
        }

        // Assign spymaster for that team
        room.spymasters[team] = socket.id

        // Update current spymaster (for the team whose turn it is)
        room.currentSpymaster = room.spymasters[room.currentTurn] || null

        // Emit updates to everyone so state is synced server-side
        io.to(roomCode).emit("spymasters-updated", room.spymasters)
        io.to(roomCode).emit("current-spymaster-updated", room.currentSpymaster)
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })

        console.log(`[SERVER] become-spymaster success: socket ${socket.id} is now ${team} spymaster`) 

        // Inform the player of their role and team (explicit)
        socket.emit("player-role", { role: "spymaster", team })
        socket.emit("player-team", team)
    })

    // ─────────────────────────────────────────
    // SET NAME
    // ─────────────────────────────────────────

    socket.on("set-name", ({ roomCode, name }) => {
        const room = rooms[roomCode]
        if (!room) return
        room.names[socket.id] = name
        console.log(`[SERVER] set-name: socket=${socket.id}, name=${name}, room=${roomCode}`)
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })
        socket.emit("name-set", name)
    })

    // ─────────────────────────────────────────
    // LEAVE TEAM
    // ─────────────────────────────────────────

    socket.on("leave-team", ({ roomCode }) => {
        const room = rooms[roomCode]
        if (!room) return

        room.teams.red = room.teams.red.filter(id => id !== socket.id)
        room.teams.blue = room.teams.blue.filter(id => id !== socket.id)

        // Clear spymaster role if they were
        for (const t of ["red", "blue"]) {
            if (room.spymasters[t] === socket.id) room.spymasters[t] = null
        }

        io.to(roomCode).emit("teams-updated", room.teams)
        io.to(roomCode).emit("spymasters-updated", room.spymasters)
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })
        socket.emit("player-team", null)
    })

    // ─────────────────────────────────────────
    // START GAME
    // ─────────────────────────────────────────

    socket.on("start-game", ({ roomCode }) => {
        const room = rooms[roomCode]
        if (!room) return

        // only host can start
        if (room.host !== socket.id) {
            socket.emit("start-game-failed", "not-host")
            return
        }

        // must have spymasters and at least one player per team
        if (!room.spymasters.red || !room.spymasters.blue) {
            socket.emit("start-game-failed", "missing-spymasters")
            return
        }

        if (room.teams.red.length === 0 || room.teams.blue.length === 0) {
            socket.emit("start-game-failed", "teams-incomplete")
            return
        }

        room.roomState = "playing"
        // Clear any pending selections when game starts
        room.selections = {}

        // Broadcast start-game + current board and state
        io.to(roomCode).emit("game-started", {
            board: room.board,
            currentTurn: room.currentTurn,
            teams: room.teams,
            spymasters: room.spymasters,
            names: room.names
        })

        // also emit existing events for clients that listen separately
        io.to(roomCode).emit("board-updated", room.board)
        io.to(roomCode).emit("turn-updated", room.currentTurn)
        io.to(roomCode).emit("teams-updated", room.teams)
        io.to(roomCode).emit("spymasters-updated", room.spymasters)
        io.to(roomCode).emit("lobby-updated", {
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })
    })

    // ─────────────────────────────────────────
    // SEND CLUE
    // ─────────────────────────────────────────

    socket.on("send-clue", ({ roomCode, word, number }) => {
        console.log(`[SERVER] Received send-clue: socket.id=${socket.id}, roomCode=${roomCode}, word=${word}, number=${number}`)
        const room = rooms[roomCode]
        if (!room) return
        if (room.gameOver) return

        // Only the spymaster for the team whose turn it is can send the clue
        const currentTeam = room.currentTurn
        const spymasterId = room.spymasters[currentTeam]
        if (!spymasterId || spymasterId !== socket.id) {
            socket.emit("send-clue-failed", "not-authorized")
            return
        }

        // Validate inputs minimally
        const clueWord = typeof word === "string" ? word.trim() : null
        const clueNumber = Number.isInteger(number) ? number : parseInt(number, 10)

        room.currentClue = {
            word: clueWord || null,
            number: Number.isNaN(clueNumber) ? null : clueNumber
        }

        io.to(roomCode).emit("clue-updated", room.currentClue)
    })

    // ─────────────────────────────────────────
    // REVEAL CARD
    // ─────────────────────────────────────────

    socket.on("reveal-card", ({ roomCode, index }) => {
        console.log(`[SERVER] Received reveal-card event: socket.id=${socket.id}, roomCode=${roomCode}, index=${index}`)

        const room = rooms[roomCode]

        if (!room) {
            console.warn(`[SERVER] reveal-card failed: roomCode=${roomCode} not found`)
            return
        }

        if (room.gameOver) {
            console.warn(`[SERVER] reveal-card blocked: game is over in roomCode=${roomCode}`)
            return
        }

        // Spymasters cannot reveal cards
        if (room.spymasters.red === socket.id || room.spymasters.blue === socket.id) {
            console.warn(`[SERVER] reveal-card blocked: socket.id=${socket.id} is a spymaster and cannot reveal cards`)
            return
        }

        // --- SERVER AUTHORITY CHECK ---
        const isRed = room.teams.red.includes(socket.id)
        const isBlue = room.teams.blue.includes(socket.id)
        const playerTeam = isRed ? "red" : (isBlue ? "blue" : null)

        console.log(`[SERVER] reveal-card authority check: socket.id=${socket.id}, playerTeam=${playerTeam}, currentTurn=${room.currentTurn}`)

        if (!playerTeam) {
            console.warn(`[SERVER] reveal-card blocked: player ${socket.id} is not in any team (team=null)`)
            return
        }

        if (room.currentTurn !== playerTeam) {
            console.warn(`[SERVER] reveal-card blocked: player team (${playerTeam}) is not current turn (${room.currentTurn})`)
            return
        }
        // ------------------------------

        const card = room.board[index]

        if (!card) return

        if (card.revealed) return

        card.revealed = true

        // ─────────────────────────────────────
        // ASSASSIN CARD
        // ─────────────────────────────────────

        if (card.type === "killer") {
            const winner =
                room.currentTurn === "red"
                    ? "BLUE"
                    : "RED"

            room.gameOver = true
            room.winner = winner

            io.to(roomCode).emit(
                "board-updated",
                room.board
            )

            io.to(roomCode).emit(
                "game-over",
                winner
            )

            console.log(
                "[SERVER] Assassin hit. Winner:",
                winner
            )

            return
        }

        // ─────────────────────────────────────
        // WIN CONDITIONS
        // ─────────────────────────────────────

        const redRemaining =
            room.board.filter(
                (card) =>
                    card.type === "red" &&
                    !card.revealed
            ).length

        const blueRemaining =
            room.board.filter(
                (card) =>
                    card.type === "blue" &&
                    !card.revealed
            ).length

        if (redRemaining === 0) {
            room.gameOver = true
            room.winner = "RED"

            io.to(roomCode).emit(
                "board-updated",
                room.board
            )

            io.to(roomCode).emit(
                "game-over",
                "RED"
            )

            console.log(
                "[SERVER] RED TEAM WINS"
            )

            return
        }

        if (blueRemaining === 0) {
            room.gameOver = true
            room.winner = "BLUE"

            io.to(roomCode).emit(
                "board-updated",
                room.board
            )

            io.to(roomCode).emit(
                "game-over",
                "BLUE"
            )

            console.log(
                "[SERVER] BLUE TEAM WINS"
            )

            return
        }

        // ─────────────────────────────────────
        // TURN SWITCH
        // ─────────────────────────────────────

        if (
            card.type !== room.currentTurn
        ) {
            room.currentTurn =
                room.currentTurn === "red"
                    ? "blue"
                    : "red"

            io.to(roomCode).emit(
                "turn-updated",
                room.currentTurn
            )

            console.log(
                "[SERVER] Turn switched to:",
                room.currentTurn
            )
            // update current spymaster for new turn
            room.currentSpymaster = room.spymasters[room.currentTurn] || null
            io.to(roomCode).emit("current-spymaster-updated", room.currentSpymaster)

            // Clear all selections on turn switch
            room.selections = {}
            io.to(roomCode).emit("selections-cleared")
        }

        // Clear selection for the revealed card
        if (room.selections[index]) {
            delete room.selections[index]
            io.to(roomCode).emit("card-deselected", { index })
        }

        // ─────────────────────────────────────
        // SEND UPDATED BOARD
        // ─────────────────────────────────────

        io.to(roomCode).emit(
            "board-updated",
            room.board
        )

        console.log(
            "[SERVER] board-updated emitted"
        )
    })

    // ─────────────────────────────────────────
    // SELECT CARD (First click - shows marker to all players)
    // ─────────────────────────────────────────

    socket.on("select-card", ({ roomCode, index }) => {
        const room = rooms[roomCode]
        if (!room) return
        if (room.gameOver) return

        const card = room.board[index]
        if (!card || card.revealed) return

        // Only active-turn team operatives can select
        const isRed = room.teams.red.includes(socket.id)
        const isBlue = room.teams.blue.includes(socket.id)
        const playerTeam = isRed ? "red" : (isBlue ? "blue" : null)
        if (!playerTeam || playerTeam !== room.currentTurn) return
        if (room.spymasters.red === socket.id || room.spymasters.blue === socket.id) return

        const playerName = room.names[socket.id] || "عميل"

        // Remove any previous selection by this player
        for (const idx in room.selections) {
            if (room.selections[idx].playerId === socket.id) {
                delete room.selections[idx]
                io.to(roomCode).emit("card-deselected", { index: parseInt(idx) })
            }
        }

        // Register new selection
        room.selections[index] = { playerId: socket.id, playerName }
        io.to(roomCode).emit("card-selected", { index, playerId: socket.id, playerName })
        console.log(`[SERVER] card-selected: socket=${socket.id} name=${playerName} index=${index}`)
    })

    // ─────────────────────────────────────────
    // DESELECT CARD
    // ─────────────────────────────────────────

    socket.on("deselect-card", ({ roomCode, index }) => {
        const room = rooms[roomCode]
        if (!room) return
        if (!room.selections[index]) return
        if (room.selections[index].playerId !== socket.id) return

        delete room.selections[index]
        io.to(roomCode).emit("card-deselected", { index })
        console.log(`[SERVER] card-deselected: socket=${socket.id} index=${index}`)
    })

    // ─────────────────────────────────────────
    // SET WORD PACK
    // ─────────────────────────────────────────

    socket.on("set-word-pack", ({ roomCode, pack }) => {
        const room = rooms[roomCode]
        if (!room) return
        if (room.host !== socket.id) return

        room.pack = pack
        room.board = generateBoard(pack)
        room.selections = {}

        io.to(roomCode).emit("board-updated", room.board)
        io.to(roomCode).emit("selections-cleared")
        io.to(roomCode).emit("lobby-updated", {
            roomCode,
            players: room.players,
            names: room.names,
            teams: room.teams,
            spymasters: room.spymasters,
            host: room.host,
            roomState: room.roomState,
            pack: room.pack
        })
        console.log(`[SERVER] Word pack changed to ${pack} for room ${roomCode}`)
    })

    // ─────────────────────────────────────────
    // RANDOMIZE TEAMS
    // ─────────────────────────────────────────

    socket.on("randomize-teams", ({ roomCode }) => {
        const room = rooms[roomCode]
        if (!room) return
        if (room.host !== socket.id) return

        // 1. Inform all players that shuffling has started so they can run their local spinning animations
        io.to(roomCode).emit("randomizing-started")

        // 2. Perform actual logic and broadcast final state after 2 seconds
        setTimeout(() => {
            // Re-verify room still exists
            const activeRoom = rooms[roomCode]
            if (!activeRoom) return

            // Shuffle player list
            const shuffledPlayers = [...activeRoom.players].sort(() => Math.random() - 0.5)

            // Clear teams and spymasters
            activeRoom.teams.red = []
            activeRoom.teams.blue = []
            activeRoom.spymasters.red = null
            activeRoom.spymasters.blue = null

            // Distribute evenly
            shuffledPlayers.forEach((playerId, index) => {
                if (index % 2 === 0) {
                    activeRoom.teams.red.push(playerId)
                } else {
                    activeRoom.teams.blue.push(playerId)
                }
            })

            // Assign spymasters (first member of each team)
            if (activeRoom.teams.red.length > 0) {
                activeRoom.spymasters.red = activeRoom.teams.red[0]
            }
            if (activeRoom.teams.blue.length > 0) {
                activeRoom.spymasters.blue = activeRoom.teams.blue[0]
            }

            // Update current spymaster (for the team whose turn it is)
            activeRoom.currentSpymaster = activeRoom.spymasters[activeRoom.currentTurn] || null

            // Broadcast team status updates
            io.to(roomCode).emit("teams-updated", activeRoom.teams)
            io.to(roomCode).emit("spymasters-updated", activeRoom.spymasters)
            io.to(roomCode).emit("current-spymaster-updated", activeRoom.currentSpymaster)

            // Explicitly update individual players' roles and teams
            activeRoom.players.forEach((playerId) => {
                const clientSocket = io.sockets.sockets.get(playerId)
                if (clientSocket) {
                    const team = activeRoom.teams.red.includes(playerId) ? "red" : (activeRoom.teams.blue.includes(playerId) ? "blue" : null)
                    const isSpymaster = activeRoom.spymasters.red === playerId || activeRoom.spymasters.blue === playerId
                    const role = isSpymaster ? "spymaster" : "operative"
                    clientSocket.emit("player-team", team)
                    clientSocket.emit("player-role", { role, team })
                }
            })

            // Broadcast lobby updated
            io.to(roomCode).emit("lobby-updated", {
                roomCode,
                players: activeRoom.players,
                names: activeRoom.names,
                teams: activeRoom.teams,
                spymasters: activeRoom.spymasters,
                host: activeRoom.host,
                roomState: activeRoom.roomState,
                pack: activeRoom.pack
            })

            console.log(`[SERVER] Delay-shuffled and randomized teams for room ${roomCode}`)
        }, 2000)
    })

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on("disconnect", () => {
        console.log(
            "User disconnected:",
            socket.id
        )

        for (const roomCode in rooms) {
            const room = rooms[roomCode]
            if (room.players.includes(socket.id)) {
                room.players = room.players.filter(id => id !== socket.id)
                room.teams.red = room.teams.red.filter(id => id !== socket.id)
                room.teams.blue = room.teams.blue.filter(id => id !== socket.id)

                // Remove name entry
                if (room.names && room.names[socket.id]) {
                    delete room.names[socket.id]
                }

                // If they were a spymaster, clear that role
                for (const t of ["red", "blue"]) {
                    if (room.spymasters[t] === socket.id) {
                        room.spymasters[t] = null
                    }
                }

                // Update current spymaster for the active turn
                room.currentSpymaster = room.spymasters[room.currentTurn] || null

                // If host disconnected, assign a new host (first player) or null
                if (room.host === socket.id) {
                    room.host = room.players.length > 0 ? room.players[0] : null
                    console.log(`[SERVER] New host for ${roomCode}: ${room.host}`)
                }

                io.to(roomCode).emit("player-joined", room.players)
                io.to(roomCode).emit("teams-updated", room.teams)
                io.to(roomCode).emit("spymasters-updated", room.spymasters)
                io.to(roomCode).emit("current-spymaster-updated", room.currentSpymaster)
                io.to(roomCode).emit("lobby-updated", {
                    roomCode,
                    players: room.players,
                    names: room.names,
                    teams: room.teams,
                    spymasters: room.spymasters,
                    host: room.host,
                    roomState: room.roomState,
                    pack: room.pack
                })

                console.log(`[SERVER] Cleaned up player ${socket.id} from room ${roomCode}`)
            }
        }
    })
})

server.listen(3000, () => {
    console.log(
        "Server running on port 3000"
    )
})