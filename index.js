const express = require("express");
const session = require('express-session');
const fs = require("fs");
const bcrypt = require("bcryptjs");
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
app.use(express.urlencoded({ extended: true }));


httpServer.listen(3000, _ => console.log("port 3000"));
app.use(express.static("public"));

const usersFilePath = path.join(__dirname, "users.json");

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
    
        if (!user) {
            return socket.emit("message", { user: "System", msg: "You must log in to send messages." });
        }
    
        const username = user.username; // Extract the username
        const userId = user.id; // Extract the user ID
    
        let msgId = Date.now();
        const messageData = {
            user: username,
            userId: userId, // Add the user ID to the message data
            msg,
            msgId,
            room,
            timestamp: new Date().toISOString(),
        };
    
        io.to(room).emit("message", { user: username, msg, messageData });
    
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
        res.send("<h1>Please login first</h1> <a href='/login'>login</a>");
    }

});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).send("Username and password are required.");
        }

        const users = JSON.parse(fs.readFileSync(usersFilePath, "utf8"));
        const user = users.find((u) => u.username === username);

        if (!user) {
            return res.status(400).send("Invalid username or password.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send("Invalid username or password.");
        }

        req.session.user = user;
        res.redirect("/");
    } catch (error) {
        res.status(500).send("An error occurred: " + error.message);
    }
});

app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).send("All fields are required.");
        }

        const users = JSON.parse(fs.readFileSync(usersFilePath, "utf8"));
        const userExists = users.find((u) => u.email === email || u.username === username);

        if (userExists) {
            return res.status(400).send("User with this email or username already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = {
            id: "id_" + Date.now(),
            username,
            email,
            password: hashedPassword,
        };

        users.push(newUser);
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        res.redirect("/login");
    } catch (error) {
        res.status(500).send("An error occurred: " + error.message);
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("An error occurred while logging out.");
        }
        res.redirect("/login");
    });
});