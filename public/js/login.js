const registerForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

registerForm.addEventListener("submit", async(event) => {
    event.preventDefault();

    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    errorMessage.style.display = "none";

    try {
        const response = await fetch("/api/v1/login", {
            method: "POST",
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: email,
                password: password
            })
        })

        if (response.ok) {
            const data = await response.json();
            document.cookie = `sessionID=${data.sessionID}; path=/;`
            window.location.href = "/";
        } else {
            const data = await response.json();
            errorMessage.textContent = data.error;
            errorMessage.style.display = "block";
        }
    } catch(error) {
        console.error("Fout tijdens inloggen: ", error);
        errorMessage.textContent = "Couldn't reach the server.";
        errorMessage.style.display = "block";
    }
})