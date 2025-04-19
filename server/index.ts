import { Server, type Socket } from "socket.io"
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { ENV } from "../lib/env"

interface Message {
  id: string
  content: string
  user: string
  timestamp: string
}

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server, {
    cors: {
      origin: ENV.APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket: Socket) => {
    console.log("Client connected")

    socket.on("join-room", (room: string) => {
      socket.join(room)
      console.log(`Client joined room: ${room}`)
    })

    socket.on("message", ({ room, message }: { room: string; message: Message }) => {
      io.to(room).emit("message", message)
      console.log(`Message sent to room ${room}:`, message)
    })

    socket.on("disconnect", () => {
      console.log("Client disconnected")
    })
  })

  const PORT = Number.parseInt(ENV.PORT, 10)
  server.listen(PORT, () => {
    console.log(`> Socket.io server ready on http://localhost:${PORT}`)
  })
})
