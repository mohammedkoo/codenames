import { io } from "socket.io-client"

const SOCKET_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://codenames-a0g5.onrender.com"

export const socket = io(SOCKET_URL)