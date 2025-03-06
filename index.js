const express = require("express");
const session = require('express-session')


const app = express();




const { createServer } = require("http")
const { Server } = require("socket.io")
const httpServer = createServer(app)
const io = new Server(httpServer)

app.set('trust proxy', 1)
const sessionMw = (session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))


httpServer.listen(3000, _=>console.log("port 3000"));
app.use(express.static("public"));



io.engine.use(sessionMw);
io.on("connection", (socket) => {
    console.log("new connection...");

    socket.emit("message", "welcome to the chat");

    io.emit("message", "a user has joined the chat")

    socket.on("disconnect", () => {
        io.emit("message", "A user has left the chat")
    })
    
});




app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/chat.html")
})