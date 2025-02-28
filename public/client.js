const chatForm = document.getElementById("chatForm");

const socket = io();


socket.on("message", message => {
    console.log(message)
});

chatForm.addEventListener("submit", e => {
    e.preventDefault();

    const msg = e.target.elements.msg.value;

    console.log(msg);
})