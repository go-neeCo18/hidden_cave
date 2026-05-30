const directions = {
    up: "up", down: "down", left: "left", right: "right",
};

const keys = {
    38: directions.up,   37: directions.left,
    39: directions.right,40: directions.down,
    87: directions.up,   65: directions.left,
    68: directions.right,83: directions.down,
};

var character = document.querySelector(".character");
var map       = document.querySelector(".map");
var ocean     = document.querySelector(".ocean");
var slimeCountEl = document.getElementById("slime-count");
var healthBarEl  = document.getElementById("health-bar");

var x = 40;
var y = 45;

var held_directions = [];
var isSprinting = false;

var baseSpeed   = 0.5;
var sprintSpeed = 1; 

var charSize = 8;

// ─────────────────────────────────────────────
// PLAYER HEALTH SYSTEM & INVINCIBILITY
// ─────────────────────────────────────────────
var maxHealth = 3;
var currentHealth = 3;
var isInvincible = false;
var invincibilityDuration = 1000; // 1 second flash
var playerStatus = "alive";

// ─────────────────────────────────────────────
// WALL COLLIDERS
// ─────────────────────────────────────────────
const colliders = [
    { x: 202, y: 25,  w: 405, h: 30 },
    { x: 7,  y: 157, w: 15,  h: 315 },
    { x: 397, y: 157, w: 15,  h: 315 },
    { x: 202, y: 311, w: 405, h: 4, label: "bottom_wall"},
    { x: 258, y: 300, w: 53, h: 15, label: "bottom_wall_accent"},
    { x: 69,  y: 172, w: 25,  h: 195, label: "middle_wall_1"},
    { x: 94,  y: 215, w: 25,  h: 110, label: "middle_wall_2"},
    { x: 143,  y: 245, w: 8,  h: 134, label: "middle_wall_3"},
    { x: 113,  y: 125, w: 65,  h: 40, label: "middle_wall_4"},
    { x: 88,  y: 75, w: 35,  h: 90, label: "middle_wall_5"},
    { x: 128,  y: 77, w: 38,  h: 25, label: "middle_wall_6"},
    { x: 195,  y: 77, w: 62,  h: 25, label: "middle_wall_7"},
    { x: 195,  y: 128, w: 62,  h: 20, label: "middle_wall_8"},
    { x: 201,  y: 105, w: 50,  h: 25, label: "middle_wall_9"},
    { x: 182,  y: 188, w: 64,  h: 20, label: "middle_wall_10"},
    { x: 202,  y: 180, w: 20,  h: 20, label: "middle_wall_11"},
    { x: 270,  y: 155, w: 24,  h: 55, label: "middleright_wall_1"},
    { x: 270,  y: 93, w: 24,  h: 40, label: "middleright_wall_2"},
    { x: 312,  y: 115, w: 80,  h: 98, label: "middleright_wall_3"},
    { x: 355,  y: 115, w: 10,  h: 70, label: "middleright_wall_4"},
    { x: 350,  y: 245, w: 80,  h: 50, label: "middlebottomright_wall_1"},
    { x: 325,  y: 252.5, w: 80,  h: 35, label: "middlebottomright_wall_2"},
];

function overlaps(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(
        x1 + w1 / 2 < x2 - w2 / 2 ||
        x1 - w1 / 2 > x2 + w2 / 2 ||
        y1 + h1 / 2 < y2 - h2 / 2 ||
        y1 - h1 / 2 > y2 + h2 / 2
    );
}

// ─────────────────────────────────────────────
// SLIME ENGINE (SIZES, DETECTION RANGE, MULTI-SPRITE)
// ─────────────────────────────────────────────
const SLIME_IDLE_SPRITE = "/assets/sprites/Slime3_Idle_with_shadow.png";
const SLIME_RUN_SPRITE  = "/assets/sprites/Slime3_Run_with_shadow.png";
const SLIME_FW          = 64;    
const SLIME_FH          = 64;    
const SLIME_IDLE_FRAMES = 6;     // Idle image columns
const SLIME_RUN_FRAMES  = 8;     // Run image columns
const SLIME_ROW         = { down: 0, left: 1, right: 2, up: 3 };

const SLIME_VISION_RADIUS = 30;  // Detection field range in Game Units

// ─────────────────────────────────────────────
// SCATTERED SLIME SPAWNS (22 COUNT)
// ─────────────────────────────────────────────
const SLIME_SPAWNS = [

    // Middle Open Rooms & Main Hallways
    { x: 175, y: 150 },
    { x: 200, y: 205 },
    { x: 220, y: 135 },
    { x: 180, y: 250 },
    { x: 245, y: 220 },

    // Center-North & Isolated Pockets
    { x: 240, y: 65  },
    { x: 295, y: 70  },
    { x: 310, y: 95  },

    // Right and Mid-Right Corridors
    { x: 318, y: 140 },
    { x: 275, y: 255 },
    { x: 300, y: 220 },
    { x: 345, y: 185 },

    // Bottom-Left Corners
    { x: 40,  y: 200 },
    { x: 35,  y: 270 },
    { x: 95,  y: 280 },

    // Bottom-Right Approach (Guarding the Gate Zone)
    { x: 380, y: 230 },
    { x: 340, y: 285 },
    { x: 385, y: 280 }
];

const slimes = [];

function createSlime(sx, sy) {
    // Generate randomized size categories
    const sizeRoll = Math.random();
    let config = { scale: 3.2, speed: 0.12, hbox: 7, label: "medium" };
    
    if (sizeRoll < 0.35) {
        config = { scale: 2.1, speed: 0.12, hbox: 4, label: "small" };
    } else if (sizeRoll > 0.8) {
        config = { scale: 3.8, speed: 0.12, hbox: 12, label: "large" };
    }

    const el = document.createElement("div");
    el.className = `slime pixel-art ${config.label}`;
    
    // Default setup using the Idle Spritesheet
    const dw = SLIME_FW * config.scale;
    const dh = SLIME_FH * config.scale;
    el.style.cssText = `
        position:absolute;
        width:${dw}px;
        height:${dh}px;
        background-image:url('${SLIME_IDLE_SPRITE}');
        background-repeat:no-repeat;
        background-size:${SLIME_FW * SLIME_IDLE_FRAMES * config.scale}px ${SLIME_FH * 4 * config.scale}px;
        image-rendering:pixelated;
        pointer-events:none;
        margin-left:${-dw/2}px;
        margin-top:${-dh/2}px;
    `;
    
    map.appendChild(el);
    slimes.push({ 
        el, x: sx, y: sy, facing: "down", frame: 0, 
        lastAnim: performance.now(), alive: true,
        scale: config.scale, speed: config.speed, hbox: config.hbox,
        isAggroed: false, currentMode: "idle"
    });
    updateSlimeCount();
}

function updateSlimeCount() {
    const activeSlimes = slimes.filter(s => s.alive).length;
    if (slimeCountEl) slimeCountEl.textContent = activeSlimes;
}

SLIME_SPAWNS.forEach(s => createSlime(s.x, s.y));

function updateSlimes(px, py, pixelSize) {
    const now = performance.now();
    for (const s of slimes) {
        if (!s.alive) continue;

        const dx = px - s.x;
        const dy = py - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // --- AGGRO RANGE VISION TRIGGER ---
        if (!s.isAggroed && dist <= SLIME_VISION_RADIUS && playerStatus === "alive") {
            s.isAggroed = true;
        }

        let mode = "idle";
        let framesCount = SLIME_IDLE_FRAMES;
        let animSpeed = 140; // Leisurely bounce when idling

        if (s.isAggroed && dist > 1 && playerStatus === "alive") {
            mode = "run";
            framesCount = SLIME_RUN_FRAMES;
            animSpeed = 95; // Snappy movement updates when moving

            const nx = dx/dist, ny = dy/dist;
            const nx2 = s.x + nx * s.speed;
            const ny2 = s.y + ny * s.speed;

            let blocked = false;
            for (const obj of colliders) {
                if (overlaps(nx2, ny2, s.hbox / 2, s.hbox / 2, obj.x, obj.y, obj.w, obj.h)) {
                    blocked = true; break;
                }
            }
            if (!blocked) { s.x = nx2; s.y = ny2; }

            if (Math.abs(dx) > Math.abs(dy)) s.facing = dx > 0 ? "right" : "left";
            else                              s.facing = dy > 0 ? "down"  : "up";
        }

        // Handle swapping background asset sizes on mode transition
        if (s.currentMode !== mode) {
            s.currentMode = mode;
            s.frame = 0;
            const targetImg = mode === "run" ? SLIME_RUN_SPRITE : SLIME_IDLE_SPRITE;
            const currentFrames = mode === "run" ? SLIME_RUN_FRAMES : SLIME_IDLE_FRAMES;
            s.el.style.backgroundImage = `url('${targetImg}')`;
            s.el.style.backgroundSize = `${SLIME_FW * currentFrames * s.scale}px ${SLIME_FH * 4 * s.scale}px`;
        }

        // --- PLAYER HARM IMPACT CHECK ---
        if (playerStatus === "alive" && !isInvincible) {
            if (overlaps(px, py, charSize, charSize, s.x, s.y, s.hbox, s.hbox)) {
                takeDamage();
            }
        }

        // Structural loop framing sequence
        if (now - s.lastAnim > animSpeed) {
            s.frame = (s.frame + 1) % framesCount;
            s.lastAnim = now;
        }

        const row  = SLIME_ROW[s.facing] ?? 0;
        const bgX  = -(s.frame * SLIME_FW * s.scale);
        const bgY  = -(row * SLIME_FH * s.scale);
        
        s.el.style.backgroundPosition = `${bgX}px ${bgY}px`;
        s.el.style.left   = `${s.x * pixelSize}px`;
        s.el.style.top    = `${s.y * pixelSize}px`;
        s.el.style.zIndex = Math.round(s.y + s.hbox);
    }
}

// ─────────────────────────────────────────────
// DAMAGE ENGINE & INTERFACES
// ─────────────────────────────────────────────
function takeDamage() {
    if (currentHealth <= 0 || playerStatus === "dead") return;

    currentHealth--;
    renderHearts();

    if (currentHealth <= 0) {
        playerStatus = "dead";
        character.setAttribute("status", "dead");
        character.setAttribute("walking", "false"); // Halt active walk cycles
        held_directions = []; // Clear current controls cache
        
        // Let the 0.7s death animation run fully before fading in the UI menu
        setTimeout(() => {
            const goScreen = document.getElementById("game-over-screen");
            if (goScreen) {
                goScreen.classList.remove("go-hidden");
                initGameOverMenu(); // Activate UI menu key tracking listeners
            }
        }, 800);
    } else {
        isInvincible = true;
        character.setAttribute("status", "hurt");

        setTimeout(() => {
            isInvincible = false;
            if (playerStatus === "alive") {
                character.setAttribute("status", "alive");
            }
        }, invincibilityDuration);
    }
}

function renderHearts() {
    if (!healthBarEl) return;
    healthBarEl.innerHTML = "";
    for (let i = 0; i < maxHealth; i++) {
        const heart = document.createElement("div");
        heart.className = i < currentHealth ? "heart full" : "heart empty";
        healthBarEl.appendChild(heart);
    }
}

// ─────────────────────────────────────────────
// STAGE DOOR CONTROLS
// ─────────────────────────────────────────────
const EXIT_GU = { x: 365, y: 290, r: 16 };
let nearExit  = false;

const exitPrompt = document.createElement("div");
exitPrompt.id = "cave_exit_prompt";
exitPrompt.className = "hidden";
exitPrompt.innerHTML = 'Press <kbd>E</kbd> to exit cave';
document.body.appendChild(exitPrompt);

document.addEventListener("keydown", (e) => {
    if ((e.key === "e" || e.key === "E") && nearExit && playerStatus === "alive") {
        window.location.href = "main.html";
    }
});

function checkExit(px, py) {
    const dx  = px - EXIT_GU.x;
    const dy  = py - EXIT_GU.y;
    const was = nearExit;
    nearExit  = Math.sqrt(dx*dx + dy*dy) < EXIT_GU.r;
    if (nearExit !== was) exitPrompt.classList.toggle("hidden", !nearExit);
}

// ─────────────────────────────────────────────
// PRINCIPAL POSITIONING UPDATE TICK
// ─────────────────────────────────────────────
const placeCharacter = () => {
    const pixelSize = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
    );
    const held_direction = held_directions[0];

    if (held_direction && playerStatus === "alive") {
        let newX = x;
        let newY = y;
        const spd = isSprinting ? sprintSpeed : baseSpeed;

        if (held_direction === directions.right) newX += spd;
        if (held_direction === directions.left)  newX -= spd;
        if (held_direction === directions.down)  newY += spd;
        if (held_direction === directions.up)    newY -= spd;

        let blocked = false;
        for (const obj of colliders) {
            if (overlaps(newX, newY, charSize, charSize, obj.x, obj.y, obj.w, obj.h)) {
                blocked = true; break;
            }
        }
        if (!blocked) { x = newX; y = newY; }
        character.setAttribute("facing", held_direction);
    }

    character.setAttribute("walking",   held_direction ? "true" : "false");
    character.setAttribute("sprinting", isSprinting && held_direction ? "true" : "false");

    character.style.left = `${x * pixelSize}px`;
    character.style.top  = `${y * pixelSize}px`;

    const camera_left = window.innerWidth / 2 - x * pixelSize;
    const camera_top  = window.innerHeight / 2 - y * pixelSize;
    const tx = `translate3d(${camera_left}px, ${camera_top}px, 0)`;
    map.style.transform = tx;
    if (ocean) ocean.style.transform = tx;

    const lightX = x * pixelSize + camera_left;
    const lightY = y * pixelSize + camera_top;
    
    const darknessOverlay = document.getElementById("cave-darkness");
    if (darknessOverlay) {
        darknessOverlay.style.setProperty('--px', `${lightX}px`);
        darknessOverlay.style.setProperty('--py', `${lightY}px`);
    }

    character.style.zIndex = Math.round(y);
    document.querySelectorAll(".asset").forEach(asset => {
        const ay = parseFloat(asset.dataset.y) || 0;
        const ah = parseFloat(asset.dataset.h) || 0;
        asset.style.zIndex = Math.round(ay + ah);
    });

    updateSlimes(x, y, pixelSize);
    checkExit(x, y);
};

// ─────────────────────────────────────────────
// GAME OVER INTERACTIVE NAVIGATION LOGIC
// ─────────────────────────────────────────────
let goIndex = 0;
let goMenuInitialized = false;

function initGameOverMenu() {
    if (goMenuInitialized) return;
    goMenuInitialized = true;

    const options = document.querySelectorAll(".go-option");
    
    const updateSelection = () => {
        options.forEach((opt, idx) => {
            opt.classList.toggle("active", idx === goIndex);
        });
    };

    // Track keyboard navigation inside the modal popup overlay container
    document.addEventListener("keydown", (e) => {
        if (playerStatus !== "dead") return;

        // Up arrow or W key
        if (e.keyCode === 38 || e.keyCode === 87) {
            goIndex = (goIndex - 1 + options.length) % options.length;
            updateSelection();
        }
        // Down arrow or S key
        if (e.keyCode === 40 || e.keyCode === 83) {
            goIndex = (goIndex + 1) % options.length;
            updateSelection();
        }
        // Enter Key -> Execute Active Action
        if (e.keyCode === 13) {
            const action = options[goIndex].getAttribute("data-action");
            executeGameOverAction(action);
        }
        // Escape Key -> Shortcut fallback straight to main menu
        if (e.keyCode === 27) {
            executeGameOverAction("exit");
        }
    });

    // Add pointer click fallback support for mouse interactions
    options.forEach((opt, idx) => {
        opt.addEventListener("mouseenter", () => {
            goIndex = idx;
            updateSelection();
        });
        opt.addEventListener("click", () => {
            executeGameOverAction(opt.getAttribute("data-action"));
        });
    });
}

function executeGameOverAction(action) {
    if (action === "respawn") {
        location.reload(); // Quick reset map reloader
    } else if (action === "exit") {
        window.location.href = "main.html"; // Returns player to surface index map layer
    }
}

const step = () => {
    placeCharacter();
    window.requestAnimationFrame(step);
};
renderHearts();
step();

document.addEventListener("keydown", (e) => {
    if (e.which === 16) isSprinting = true;
    const dir = keys[e.which];
    if (dir && held_directions.indexOf(dir) === -1) held_directions.unshift(dir);
});

document.addEventListener("keyup", (e) => {
    if (e.which === 16) isSprinting = false;
    const dir = keys[e.which];
    const idx = held_directions.indexOf(dir);
    if (idx > -1) held_directions.splice(idx, 1);
});

let debugOn = false;
let debugBoxes = [];

const drawDebug = () => {
    debugBoxes.forEach(b => b.remove());
    debugBoxes = [];
    if (!debugOn) return;
    const ps = 5;
    colliders.forEach(obj => {
        const box = document.createElement("div");
        box.style.cssText = `
            position:absolute;
            left:${(obj.x-obj.w/2)*ps}px; top:${(obj.y-obj.h/2)*ps}px;
            width:${obj.w*ps}px; height:${obj.h*ps}px;
            border:2px solid rgba(255,0,0,0.8);
            background:rgba(255,0,0,0.15);
            pointer-events:none; z-index:9999;
        `;
        map.appendChild(box);
        debugBoxes.push(box);
    });
};

document.addEventListener("keydown", (e) => {
    if (e.key === "/") { debugOn = !debugOn; drawDebug(); }
});
// ─── TOUCH EXIT BUTTON ────────────────────────────────────────────────────
const caveExitBtn = document.getElementById("cave_exit_btn");

// Patch checkExit to also show/hide the touch button
const _origCheckExit = checkExit;
checkExit = function(px, py) {
    _origCheckExit(px, py);
    if (caveExitBtn) {
        if (nearExit && playerStatus === "alive") {
            caveExitBtn.classList.remove("hidden");
        } else {
            caveExitBtn.classList.add("hidden");
        }
    }
};

if (caveExitBtn) {
    caveExitBtn.addEventListener("click", () => {
        if (nearExit && playerStatus === "alive") {
            window.location.href = "main.html";
        }
    });
}

// ─── TOUCH D-PAD ──────────────────────────────────────────────────────────
(function () {
    const dpad = document.getElementById("dpad");
    if (!dpad) return;

    const pointerToDir = new Map();

    function startDir(dir, pointerId) {
        if (held_directions.indexOf(dir) === -1) held_directions.unshift(dir);
        pointerToDir.set(pointerId, dir);
    }

    function endDir(pointerId) {
        const d = pointerToDir.get(pointerId);
        if (!d) return;
        pointerToDir.delete(pointerId);
        const idx = held_directions.indexOf(d);
        if (idx > -1) held_directions.splice(idx, 1);
    }

    dpad.querySelectorAll(".dpad_btn").forEach(btn => {
        const dir = btn.dataset.dir;

        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.setPointerCapture(e.pointerId);
            btn.classList.add("dpad_pressed");
            startDir(dir, e.pointerId);
        });

        btn.addEventListener("pointerup", (e) => {
            e.preventDefault();
            btn.classList.remove("dpad_pressed");
            endDir(e.pointerId);
        });

        btn.addEventListener("pointercancel", (e) => {
            btn.classList.remove("dpad_pressed");
            endDir(e.pointerId);
        });
    });

    // Double-tap to toggle sprint
    let lastTap = 0;
    dpad.addEventListener("pointerdown", () => {
        const now = Date.now();
        if (now - lastTap < 300) isSprinting = !isSprinting;
        lastTap = now;
    });
})();