const express = require("express");
const session = require('express-session');


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

    io.emit("message", { user: "System", msg: "A user has joined the chat" });
    
        socket.on("disconnect", () => {
            io.emit("message", "A user has left the chat");
        })

    socket.on("chatMessage", (msg) => {

        if (socket.request.session.user) {

            let user = socket.request.session.user;

            io.emit("message", { user, msg });
        }
    })
    console.log(socket.request.session);
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
    res.redirect("/?logged_in");
});