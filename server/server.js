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

  socket.on("create-room", () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    rooms[roomCode] = {
      players: [socket.id]
    }

    socket.join(roomCode)

    socket.emit("room-created", roomCode)

    console.log("Room created:", roomCode)
  })

  socket.on("join-room", (roomCode) => {
    const room = rooms[roomCode]

    if (!room) {
      socket.emit("room-not-found")
      return
    }

    room.players.push(socket.id)

    socket.join(roomCode)

    io.to(roomCode).emit("player-joined", room.players)

    console.log("Player joined:", roomCode)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

server.listen(3000, () => {
  console.log("Server running on port 3000")
})