const chatForm = document.getElementById("chatForm");
const chatMessages = document.querySelector("#chatMessages");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const deleteBtn = document.querySelector(".deleteBtn");

const socket = io();

let currentRoom = "";


socket.on("message", ({ user, msg }) => {
    outputMessage(user, msg)
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

function outputMessage(user, message) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.dataset.msgId = message.msgId;

    div.innerHTML = `<p class="meta">${user} <span>${new Date().toLocaleTimeString()}</span></p>
        <p class="text">${message}</p> <button class="deleteBtn">Delete</button>`;

    document.getElementById("chatMessages").appendChild(div);
}
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("deleteBtn")) {
        const messageDiv = e.target.closest(".message");
        const msgId = messageDiv.dataset.msgId;

        socket.emit("deleteMessage", { msgId });

       
        messageDiv.remove();
    }
});

socket.on("deleteMessage", (msgId) => {
    const messageDiv = document.querySelector(`.message[data-msg-id="${msgId}"]`);
    if (messageDiv) {
        messageDiv.remove();
    }
});