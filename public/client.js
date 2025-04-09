const chatForm = document.getElementById("chatForm");
const chatMessages = document.querySelector("#chatMessages");
const chatBox = document.querySelector("#messageContainer");

const socket = io();


socket.on("message", ({ user, msg }) => {
    console.log(user, msg);
    outputMessage(user, msg)
});

chatForm.addEventListener("submit", e => {
    e.preventDefault();

    const msgInput = e.target.elements.msg;
    const msg = msgInput.value;
    
    socket.emit("chatMessage", msg);
    msgInput.value = "";

})

function outputMessage (user, message) {
    const div = document.createElement("div")
    div.classList.add("message")
    div.innerHTML = `<p class="meta">${user} <span>${new Date().toLocaleTimeString()}</span></p>
        <p class="text">${message}</p>`
        document.getElementById("chatMessages").appendChild(div);
    
        
}