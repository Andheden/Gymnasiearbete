# Dokumentation Gymnasiearbete Axel Ortheden 2025

## Index.js

``` javascript
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
```

I början av koden importeras flera moduler som används för att bygga upp servern och funktionerna i applikationen. Express används för att skapa själva webbservern och hantera olika rutter och HTTP-anrop. express-session används för att hantera användarsessioner, till exempel för att komma ihåg om en användare är inloggad. fs (file system) används för att läsa och skriva filer, vilket i detta fall används för att spara och hämta data i JSON-format istället för att använda en databas. bcryptjs är till för att hasha lösenord, så att de inte sparas i klartext och därmed ökar säkerheten. path används för att hantera filvägar på ett säkert sätt oavsett vilket operativsystem servern körs på.

Efter det skapas själva Express-applikationen genom att anropa express(), vilket gör att man kan börja definiera olika routes och middleware. Sedan kopplas Socket.io in, vilket gör det möjligt att skapa realtidsfunktioner, som till exempel en live-chatt mellan användare. Det görs genom att först skapa en vanlig HTTP-server från Express-appen, och sedan koppla Socket.io till den med new Server(httpServer).

Därefter skapas en konfiguration för sessioner där man definierar ett hemligt lösenord (en "secret") som används för att signera sessions-ID:n. Man bestämmer också att sessionen inte ska sparas om ingen data har ändrats (resave: false), och att nya användare får en session även om den är tom (saveUninitialized: true). cookie.secure sätts till false, vilket gör att det fungerar även utan HTTPS – praktiskt för lokal utveckling. Denna session-konfiguration sparas i en variabel sessionMw, som sedan kan användas som middleware i appen för att möjliggöra funktioner som inloggning, användarhantering och liknande.


``` javascript
app.use(sessionMw);
app.use(express.urlencoded({ extended: true }));


httpServer.listen(3000, _ => console.log("port 3000"));
app.use(express.static("public"));

const usersFilePath = path.join(__dirname, "users.json");

io.engine.use(sessionMw);
```


Applikationen använder app.use(sessionMw) för att aktivera sessionshantering, vilket gör att användarens inloggning kan sparas under tiden de surfar runt på sidan. Med express.urlencoded tillåts servern läsa av data som skickas från formulär på webbsidan.

Servern startas sedan på port 3000 och express.static("public") gör så att alla filer i mappen public (t.ex. HTML, CSS och JavaScript) blir tillgängliga för användaren i webbläsaren.

En JSON-fil vid namn users.json används för att spara användardata, och path.join ser till att vägen till filen fungerar på alla operativsystem.

Slutligen kopplas sessionshanteringen även in i Socket.io genom io.engine.use(sessionMw), vilket gör att användare kan kännas igen även i realtidsfunktioner som chatt.



### Socket.io på server sidan

``` javascript
io.on("connection", (socket) => {
    console.log("new connection...");


    socket.emit("message", { user: "System", msg: "Welcome to the chat" });


    socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
        socket.emit("message", { user: "System", msg: `You have joined ${room}` });
    
        
        const username = socket.request.session.user ? socket.request.session.user.username : "Unknown User";
        socket.to(room).emit("message", { user: "System", msg: `${username} has joined the room` });
    });


    socket.on("chatMessage", ({ room, msg }) => {
        const user = socket.request.session.user;
    
        if (!user) {
            return socket.emit("message", { user: "System", msg: "You must log in to send messages." });
        }
    
        const username = user.username;
        const userId = socket.id; 
    
        let msgId = Date.now(); 
        const messageData = {
            user: username,
            userId: userId,
            msg,
            msgId,
            room,
        };
    
        
        io.to(room).emit("message", messageData);
    
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





    socket.on("deleteMessage", ({ msgId }) => {
        if (!msgId) {
            console.error("Received undefined msgId from client.");
            return;
        }
    
        const user = socket.request.session.user;
        if (!user) {
            console.error("User is not logged in.");
            return;
        }
    
        const filePath = path.join(__dirname, "chatHistory.json");
    
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("Error reading chat history:", err);
                return;
            }
    
            let chatHistory = [];
            if (data) {
                chatHistory = JSON.parse(data);
            }
    
          
            const messageIndex = chatHistory.findIndex((message) => message.userId === socket.id);
            if (messageIndex === -1) {
                console.log(msgId, socket.id);
                console.error("Message not found or user is not authorized to delete it.");
                return;
            }
    
            chatHistory.splice(messageIndex, 1);
    
          
            fs.writeFile(filePath, JSON.stringify(chatHistory, null, 2), (err) => {
                if (err) {
                    console.error("Error writing chat history:", err);
                    return;
                }
    
                console.log(`Message with ID ${msgId} deleted by user ${user.username}.`);
    
                
                io.emit("deleteMessage", msgId);
            });
        });
    });


});
```

När en användare skickar ett meddelande till chatten, lyssnar servern efter händelsen chatMessage. Denna funktion tar emot både själva meddelandet och det rum användaren befinner sig i. Först kontrolleras det att användaren faktiskt är inloggad via sessionen – om inte, får de ett felmeddelande från systemet. Om allt är okej, skapas ett meddelandeobjekt som innehåller användarnamn, socket-id (som identifierar användaren unikt), meddelandets innehåll, ett unikt meddelande-ID baserat på tidpunkten och vilket rum det gäller.

Detta meddelande skickas sedan ut till alla i rummet med io.to(room).emit(...), vilket gör att alla andra användare direkt ser det. Samtidigt läses filen chatHistory.json in från projektmappen, där tidigare meddelanden sparas. Det nya meddelandet läggs till i historiken och hela listan skrivs om till filen. På så sätt sparas chatten även när servern startas om.

Servern lyssnar också på om en användare kopplas bort via disconnect, vilket bara loggar ett meddelande i terminalen.

En annan funktion är deleteMessage, som tillåter användaren att ta bort ett meddelande. Denna händelse tar emot ett msgId – alltså meddelandets unika ID. Det kontrolleras att användaren är inloggad och att ett msgId faktiskt skickats. Därefter läses chatthistoriken in och det letas efter ett meddelande som har samma userId (socket.id) som den som försöker ta bort det. Det betyder att användare bara kan ta bort sina egna meddelanden. Om meddelandet hittas tas det bort från listan och filen skrivs om. Slutligen meddelas alla andra användare att just det meddelandet ska tas bort från deras skärmar, genom att io.emit("deleteMessage", msgId) körs.

Sammanfattningsvis gör denna kod att användare kan chatta i realtid, spara sin historik och även ta bort egna meddelanden – allt via Socket.io och lokal JSON-filhantering.



### Routes
``` javascript
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
```

Koden ovan hanterar alla viktiga delar kring inloggning, registrering och åtkomst till själva chatten. När någon besöker startsidan ("/") kollar servern först om användaren är inloggad. Om så är fallet skickas filen chat.html till webbläsaren – annars visas ett meddelande som uppmanar användaren att logga in med en länk till inloggningssidan.

Vid besök på /signup och /login laddas motsvarande HTML-sidor från mappen public. Dessa sidor innehåller formulär där användaren kan skapa konto eller logga in.

När någon skickar in sina inloggningsuppgifter via POST /login, hämtas användarnamn och lösenord från formuläret. Därefter läses users.json-filen, där alla registrerade användare finns sparade. Servern letar efter rätt användare baserat på användarnamnet. Om det stämmer, kontrolleras lösenordet genom att jämföra det krypterade lösenordet med det inskickade via bcrypt. Om allt är rätt, sparas användaren i sessionen så att hen förblir inloggad och skickas vidare till chattsidan. Annars får användaren ett felmeddelande.

När en ny användare registrerar sig via POST /signup, tas användarnamn, e-post och lösenord emot. Servern kontrollerar att inga fält är tomma och att ingen med samma användarnamn eller e-post redan finns. Därefter krypteras lösenordet med bcrypt, och den nya användaren sparas i JSON-filen.

Den här delen av koden ser alltså till att endast inloggade användare kommer åt chatten och att användardata hanteras säkert via kryptering och sessionshantering.

## client.js
### Socket.io klient Javascript

``` javascript
const chatForm = document.getElementById("chatForm");
const chatMessages = document.querySelector("#chatMessages");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const deleteBtn = document.querySelector(".deleteBtn");

const socket = io();

let currentRoom = "";


socket.on("message", (messageData) => {
    outputMessage(messageData); 
});

joinRoomBtn.addEventListener("click", () => {
    const room = roomInput.value.trim();
    if (room) {
        currentRoom = room; 
        socket.emit("joinRoom", room); 
        console.log(`You have joined the room: ${room}`);
    }
});



chatForm.addEventListener("submit", e => {
    e.preventDefault();

    const msgInput = e.target.elements.msg;
    const msg = msgInput.value;
    

    if (currentRoom) {
        socket.emit("chatMessage", { room: currentRoom, msg });
    } else {
        alert("JOIN A ROOM!!!!");
    }

    msgInput.value = "";

})

function outputMessage(message) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.dataset.msgId = message.msgId;

   
    const isOwnMessage = message.userId === socket.id;

    div.innerHTML = `<p class="meta">${message.user} <span>${new Date().toLocaleTimeString()}</span></p>
        <p class="text">${message.msg}</p>
        ${isOwnMessage ? '<button class="deleteBtn">Delete</button>' : ''}`;

    document.getElementById("chatMessages").appendChild(div);
}




document.addEventListener("click", (e) => {
    if (e.target.classList.contains("deleteBtn")) {
        const messageDiv = e.target.closest(".message");
        const msgId = messageDiv.dataset.msgId;

        if (!msgId) {
            console.error("Message ID is undefined.");
            return;
        }

      
        socket.emit("deleteMessage", { msgId });
    }
});

socket.on("deleteMessage", (msgId) => {
   
    const messageDiv = document.querySelector(`.message[data-msg-id="${msgId}"]`);
    if (messageDiv) {
        messageDiv.remove();
    }
});
```

Den här koden körs i webbläsaren och ansvarar för att hantera chatten från användarens sida. Först kopplar klienten upp sig mot servern med hjälp av socket.io. Det finns några viktiga element som plockas från HTML: själva chattformuläret, rutan där meddelanden visas, knappen för att gå med i ett rum och inputfältet där man skriver in rumsnamnet.

När användaren klickar på "Join room" knappen, tar koden rumsnamnet som användaren har skrivit in och skickar det till servern via socket.emit("joinRoom", room). Detta gör att användaren går med i det specifika rummet på serversidan, vilket möjliggör att bara de i samma rum ser varandras meddelanden.

När någon skickar ett meddelande via chattformuläret, skickas det till servern tillsammans med information om vilket rum det gäller. Efter att meddelandet är skickat rensas inputfältet. Meddelanden som tas emot från servern visas automatiskt på skärmen genom funktionen outputMessage().

I den funktionen byggs varje meddelande upp som en HTML-div med användarnamn, tid och själva texten. Om det är användarens eget meddelande, visas också en "Delete" knapp.

När någon klickar på Delete försöker klienten hämta meddelandets ID (som satts via dataset.msgId) och skickar en begäran till servern att radera det. Om raderingen lyckas, tar klienten automatiskt bort det meddelandet från sidan.

Kort sagt: den här koden gör att användaren kan gå med i olika rum, skicka meddelanden, ta emot meddelanden i realtid och radera sina egna meddelanden – allt med hjälp av socket.io.