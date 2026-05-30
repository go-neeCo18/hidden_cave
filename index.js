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

// ─── UI Selectors ───
const modalOverlay  = document.getElementById("auth-modal");
const modalTitle    = document.getElementById("modal-title");
const toggleText    = document.getElementById("form-toggle-text");
const authForm      = document.getElementById("auth-form");
const submitBtn     = document.getElementById("btn-submit-form");
const toast         = document.getElementById("game-toast");
const toastHeader   = document.getElementById("toast-header");
const toastMessage  = document.getElementById("toast-message");
const strengthBar   = document.getElementById("strength-bar");
const passInput     = document.getElementById("input-pass");

let currentMode = "login";

// ─── Pixel Particle System ───
(function initParticles() {
    const canvas = document.getElementById("pixel-canvas");
    const ctx = canvas.getContext("2d");
    let W, H, particles = [];

    const COLORS = ["#69ce6d","#4ab445","#bd5c3c","#c14e2b","#ffffff","#aabbcc"];
    const PIXEL  = 3;
    const COUNT  = 28;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function spawn() {
        return {
            x: Math.random() * W,
            y: H + PIXEL * 2,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -(0.3 + Math.random() * 0.9),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: 0,
            life: 0,
            maxLife: 160 + Math.random() * 200,
            blink: Math.random() > 0.7
        };
    }

    function tick() {
        ctx.clearRect(0, 0, W, H);
        while (particles.length < COUNT) particles.push(spawn());

        particles.forEach((p, i) => {
            p.life++;
            p.x += p.vx;
            p.y += p.vy;

            const progress = p.life / p.maxLife;
            p.alpha = progress < 0.1
                ? progress / 0.1
                : progress > 0.8
                ? (1 - progress) / 0.2
                : 1;

            if (p.blink && Math.floor(p.life / 8) % 2 === 0) {
                // skip draw for blink effect
            } else {
                ctx.globalAlpha = p.alpha * 0.55;
                ctx.fillStyle   = p.color;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), PIXEL, PIXEL);
            }

            if (p.life >= p.maxLife || p.y < -PIXEL) {
                particles[i] = spawn();
            }
        });

        ctx.globalAlpha = 1;
        requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    resize();
    tick();
})();

// ─── Password Strength Meter ───
passInput.addEventListener("input", () => {
    if (currentMode !== "register") return;
    const val = passInput.value;
    let score = 0;
    if (val.length >= 6)  score += 25;
    if (val.length >= 10) score += 20;
    if (/[A-Z]/.test(val)) score += 20;
    if (/[0-9]/.test(val)) score += 20;
    if (/[^A-Za-z0-9]/.test(val)) score += 15;

    strengthBar.style.width = score + "%";
    if (score < 35)      strengthBar.style.background = "#823c24";
    else if (score < 65) strengthBar.style.background = "#c9a227";
    else                 strengthBar.style.background = "#4ab445";
});

// ─── Toast ───
let toastTimer = null;
function showGameToast(title, message, isError = false) {
    toastHeader.textContent = title;
    toastMessage.textContent = message;

    toast.classList.remove("toast-success", "toast-error", "active");

    // Force reflow so progress bar animation restarts cleanly
    void toast.offsetWidth;

    toast.classList.add(isError ? "toast-error" : "toast-success");

    // Small delay so animation re-triggers
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("active"));
    });

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("active"), 4500);
}

// ─── Modal Open / Close ───
document.getElementById("btn-login").addEventListener("click", () => openModal("login"));
document.getElementById("btn-register").addEventListener("click", () => openModal("register"));
document.getElementById("modal-close").addEventListener("click", closeModal);

toggleText.addEventListener("click", (e) => {
    if (e.target.tagName === "SPAN") switchMode(e.target.getAttribute("data-mode"));
});

modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});

function openModal(mode) {
    modalOverlay.classList.add("active");
    switchMode(mode);
}

function closeModal() {
    modalOverlay.classList.remove("active", "mode-login", "mode-register");
    authForm.reset();
    submitBtn.classList.remove("loading");
    strengthBar.style.width = "0%";
}

// ─── Mode Switcher ───
function switchMode(mode) {
    currentMode = mode;
    modalOverlay.classList.remove("mode-login", "mode-register");

    if (mode === "login") {
        modalOverlay.classList.add("mode-login");
        modalTitle.textContent         = "ACCOUNT LOGIN";
        submitBtn.className            = "btn-pixel btn-teal-glow";
        submitBtn.textContent          = "▶ ENTER THE CAVE";
        toggleText.innerHTML           = `New to the deep? <span data-mode="register">Create a profile</span>`;
    } else {
        modalOverlay.classList.add("mode-register");
        modalTitle.textContent         = "CREATE PROFILE";
        submitBtn.className            = "btn-pixel btn-crimson-glow";
        submitBtn.textContent          = "▶ FORGE MY LEGEND";
        toggleText.innerHTML           = `Already an adventurer? <span data-mode="login">Sign in here</span>`;
    }
}

// ─── Form Submit ───
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email    = document.getElementById("input-user").value;
    const password = passInput.value;

    submitBtn.classList.add("loading");

    try {
        if (currentMode === "register") {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            showGameToast("Profile Carved", `Welcome adventurer! Profile saved for ${cred.user.email}.`, false);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showGameToast("Access Granted", "Welcome back to camp! Relocating down below...", false);
        }

        closeModal();
        setTimeout(() => { window.location.href = "main.html"; }, 1800);

    } catch (error) {
        console.error("Auth Engine Error:", error.code);
        let msg = error.message;
        if (error.code === "auth/invalid-credential")
            msg = "Incorrect secret key or missing profile configuration.";
        else if (error.code === "auth/email-already-in-use")
            msg = "An adventurer has already claimed this profile email address.";
        else if (error.code === "auth/weak-password")
            msg = "Your secret cipher key must contain at least 6 characters.";
        showGameToast("Gate Blocked", msg, true);
        submitBtn.classList.remove("loading");
    }
});