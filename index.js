const express = require("express");
const session = require('express-session');
const fs = require("fs");
const path = require("path");



const app = express();




const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

const sessionMw = (session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))

app.use(sessionMw);


httpServer.listen(3000, _ => console.log("port 3000"));
app.use(express.static("public"));



io.engine.use(sessionMw);
io.on("connection", (socket) => {
    console.log("new connection...");


    socket.emit("message", { user: "System", msg: "Welcome to the chat" });


    socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
        socket.emit("message", { user: "System", msg: `You have joined ${room}` });
        socket.to(room).emit("message", { user: "System", msg: `${socket.request.session.user} has joined the room` });
    });


    socket.on("chatMessage", ({ room, msg }) => {
        const user = socket.request.session.user;
        const messageData = { user, msg, room, timestamp: new Date().toISOString() };


        io.to(room).emit("message", { user, msg });

        const filePath = path.join(__dirname, "chatHistory.json");
        fs.readFile(filePath, "utf8", (err, data) => {
            let chatHistory = [];
            if (!err && data) {
                chatHistory = JSON.parse(data);
            }
            chatHistory.push(messageData);
            fs.writeFile(filePath, JSON.stringify(chatHistory, null, 2), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        });

    });


    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});




app.get("/", (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + "/chat.html");
    } else {
        res.send("<h1>Please login first</h1>");
    }

});

app.get("/login/:user", (req, res) => {
    req.session.user = req.params.user;
    res.redirect("/");
});