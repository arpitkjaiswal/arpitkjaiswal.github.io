const taglineText = "B.Tech IT Undergraduate | Systems & AI Agent Enthusiast";
const typeWriterElement = document.getElementById("typewriter");
let i = 0;
const typingSpeed = 60; // Adjust speed in milliseconds

function typeWriter() {
    if (i < taglineText.length) {
        typeWriterElement.innerHTML += taglineText.charAt(i);
        i++;
        setTimeout(typeWriter, typingSpeed);
    }
}

// Initialize typing effect on window load
window.onload = () => {
    setTimeout(typeWriter, 500); // 500ms delay before typing starts
};
