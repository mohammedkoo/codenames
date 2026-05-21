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
            }
        }

        socket.join(roomCode)

        socket.emit("room-created", roomCode)
        socket.emit("board-updated", rooms[roomCode].board)
        socket.emit("turn-updated", rooms[roomCode].currentTurn)
        socket.emit("teams-updated", rooms[roomCode].teams)
        socket.emit("player-team", null)

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
        socket.emit("player-team", team === "red" || team === "blue" ? team : null)
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

                io.to(roomCode).emit("player-joined", room.players)
                io.to(roomCode).emit("teams-updated", room.teams)

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