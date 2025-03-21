const chatForm = document.getElementById("chatForm");
const chatMessages = document.querySelector("chatMessages");

const socket = io();


socket.on("message", message => {
    console.log(message)
    outputMessage(message)

    chatFormmessage.scrollTop = chatFormmessage.scrollHeight
});

chatForm.addEventListener("submit", e => {
    e.preventDefault();

    const msg = e.target.elements.msg.value;

    socket.emit("chatMessage", msg);
})

function outputMessage (message) {
    const div = document.createElement("div")
    div.classList.add("message")
    div.innerHTML = `<p class="meta">User <span>${new Date().toLocaleTimeString()}</span></p>
        <p class="text">${message}</p>`
        document.getElementById("chatMessages").appendChild(div);
        msg.value = "";
}