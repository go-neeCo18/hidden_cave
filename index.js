import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDALsg-_DkouT8cQ70vCyUrBzLhbAq1MOE",
            authDomain: "hidden-cave-f19d0.firebaseapp.com",
            projectId: "hidden-cave-f19d0",
            storageBucket: "hidden-cave-f19d0.firebasestorage.app",
            messagingSenderId: "600547736837",
            appId: "1:600547736837:web:1e8921a7dbc90ba3f90b6c"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // UI Selectors
        const modalOverlay = document.getElementById("auth-modal");
        const modalTitle = document.getElementById("modal-title");
        const toggleText = document.getElementById("form-toggle-text");
        const authForm = document.getElementById("auth-form");
        const submitBtn = document.getElementById("btn-submit-form");

        const toast = document.getElementById("game-toast");
        const toastHeader = document.getElementById("toast-header");
        const toastMessage = document.getElementById("toast-message");

        let currentMode = "login";

        function showGameToast(title, message, isError = false) {
            toastHeader.textContent = title;
            toastMessage.textContent = message;

            if (isError) {
                toast.classList.remove("toast-success");
                toast.classList.add("toast-error");
            } else {
                toast.classList.remove("toast-error");
                toast.classList.add("toast-success");
            }

            toast.classList.add("active");
            setTimeout(() => { toast.classList.remove("active"); }, 4500);
        }

        document.getElementById("btn-login").addEventListener("click", () => openModal("login"));
        document.getElementById("btn-register").addEventListener("click", () => openModal("register"));
        document.getElementById("modal-close").addEventListener("click", closeModal);

        toggleText.addEventListener("click", (e) => {
            if (e.target.tagName === 'SPAN') {
                switchMode(e.target.getAttribute('data-mode'));
            }
        });

        function openModal(mode) {
            modalOverlay.classList.add("active");
            switchMode(mode);
        }

        function closeModal() {
            modalOverlay.classList.remove("active");
            modalOverlay.classList.remove("mode-login", "mode-register");
            authForm.reset();
        }

        // Structural UI Theme Engine swaps color tokens instantly
        function switchMode(mode) {
            currentMode = mode;
            modalOverlay.classList.remove("mode-login", "mode-register");

            if (mode === "login") {
                modalOverlay.classList.add("mode-login");
                modalTitle.textContent = "ACCOUNT LOGIN";

                // Set Submit button styling context to Teal
                submitBtn.className = "btn-pixel btn-teal-glow";

                toggleText.innerHTML = `New to the deep? <span data-mode="register">Create a profile</span>`;
            } else {
                modalOverlay.classList.add("mode-register");
                modalTitle.textContent = "CREATE PROFILE";

                // Set Submit button styling context to Crimson
                submitBtn.className = "btn-pixel btn-crimson-glow";

                toggleText.innerHTML = `Already have an adventurer? <span data-mode="login">Sign in here</span>`;
            }
        }

        // Process Auth Submissions via Firebase
        authForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("input-user").value;
            const password = document.getElementById("input-pass").value;

            try {
                if (currentMode === "register") {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    showGameToast("Profile Carved", `Welcome adventurer! Profile saved for ${userCredential.user.email}.`, false);
                } else {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    showGameToast("Access Granted", "Welcome back to camp! Relocating down below...", false);
                }

                closeModal();
                setTimeout(() => { window.location.href = "main.html"; }, 1800);

            } catch (error) {
                console.error("Auth Engine Error:", error.code);
                let friendlyMessage = error.message;
                if (error.code === 'auth/invalid-credential') {
                    friendlyMessage = "Incorrect secret key or missing profile configuration.";
                } else if (error.code === 'auth/email-already-in-use') {
                    friendlyMessage = "An adventurer has already claimed this profile email address.";
                } else if (error.code === 'auth/weak-password') {
                    friendlyMessage = "Your secret cipher key must contain at least 6 characters.";
                }
                showGameToast("Gate Blocked", friendlyMessage, true);
            }
        });

        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeModal();
        });