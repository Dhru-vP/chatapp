const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const Message = require("./models/Message");
const uploadRoute = require("./routes/upload");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = "https://chatapp-ten-virid.vercel.app";

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/upload", uploadRoute);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", async ({ room, username }) => {
    socket.join(room);
    users[socket.id] = { username, room };

    const roomUsers = Object.values(users)
      .filter(u => u.room === room)
      .map(u => u.username);

    io.to(room).emit("online_users", roomUsers);

    const messages = await Message.find({ room }).sort({ createdAt: 1 });
    socket.emit("load_messages", messages);
  });

  socket.on("send_message", async (data) => {
    console.log("Message received:", data); // ✅ debug

    const newMessage = new Message(data);
    await newMessage.save();

    io.to(data.room).emit("receive_message", data);
  });

  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("typing", username);
  });

  socket.on("stop_typing", ({ room }) => {
    socket.to(room).emit("stop_typing");
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];

    if (user) {
      const room = user.room;
      delete users[socket.id];

      const roomUsers = Object.values(users)
        .filter(u => u.room === room)
        .map(u => u.username);

      io.to(room).emit("online_users", roomUsers);
    }

    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});