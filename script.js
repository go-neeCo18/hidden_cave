const directions = {
    up: "up", down: "down", left: "left", right: "right",
};
const keys = {
    38: directions.up,   37: directions.left,
    39: directions.right,40: directions.down,
    87: directions.up,   65: directions.left,
    68: directions.right,83: directions.down,
};

var character    = document.querySelector(".character");
var map          = document.querySelector(".map");
var ocean        = document.querySelector(".ocean");
var pond         = document.querySelector(".pond");
var bushElements = document.querySelectorAll(".asset.bush");

var x = 195;
var y = 95;
var held_directions = [];
var isSprinting  = false;
var baseSpeed    = 0.5  ;
var sprintSpeed  = 1;
var charSize     = 8;   // collision half-box in game units

// ─── GAME STATE ────────────────────────────────────────────────────────────
var hasKey       = false;
var keyCollected = false;

// Key position in game units (matches --ax:355px --ay:1250px, sprite 45px = 9gu)
// centre: ax/5 + half_sprite = 355/5 + 4.5 = 71+4.5 ≈ 72
//         ay/5 + half_sprite = 1250/5 + 4.5 = 250+4.5 ≈ 255
const KEY_GU = { x: 50, y: 255, r: 8 }; // centre + pickup radius in game units

// Cave door — placeholder coords; update x/y when the cave asset is placed.
const CAVE_GU = { x: 490, y: 55, r: 12 };

var nearCave = false;

// DOM refs
const keyContainer = document.getElementById("key_container");
const hudKey       = document.getElementById("hud_key");
const cavePrompt   = document.getElementById("cave_prompt");

const popup = document.getElementById("pop_up");
const pop_up_content = document.getElementById("pop_up_content");
const pop_up_text = document.getElementById("pop_up_text");
const pop_up_text2 = document.getElementById("pop_up_text2");
const span = document.getElementsByClassName("close")[0];

function closePopup() {
    popup.style.display = "none";
}

window.addEventListener("click", (e) => {
    if (e.target === popup) closePopup();
});

span?.addEventListener("click", closePopup);


const colliders = [
    // ── HOUSE
    { x:177, y:70,  w:68, h:40, label:"house" },

    // ── ORIGINAL FENCES
    { x:143, y:104, w:40, h:2,  label:"fence"  },
    { x:209, y:104, w:40, h:2,  label:"fence2" },
    { x:123, y:72,  w:2,  h:50, label:"fence5" },
    { x:227, y:72,  w:2,  h:50, label:"fence6" },

    // ── TREES (top-left cluster)
    { x:38,  y:63,  w:10, h:15, label:"tree1-tl" },
    { x:75,  y:62,  w:10, h:15, label:"tree3-tl" },

    // ── TREES (top-right cluster)
    { x:515, y:58,  w:10, h:5, label:"tree2-tr" },
    { x:552, y:70 ,  w:10, h:5, label:"tree4-tr" },
    
    // ── TREES (right grove)
    { x:569, y:215, w:10, h:5, label:"tree3-r2" },

    // ── TREES (left mid)
    { x:49,  y:183, w:10, h:5, label:"tree2-lm" },
    { x:45,  y:218, w:10, h:5, label:"tree5-lm" },

    // ── TREES (bottom-left)
    { x:50, y:390, w:10, h:5, label:"tree1-bl" },

    // ── TREES (bottom-right)
    { x:565, y:388, w:10, h:5, label:"tree4-br" },

    // ── TREE (centre-left lone)
    { x:120, y:319, w:10, h:5, label:"tree3-cl" },

    // ── TREE (pond-side)
    { x:232, y:190, w:15, h:5, label:"tree4-ps" },

    // ── ROCKS
    { x:440, y:230, w:18, h:12, label:"rock2-a" },
    { x:77,  y:310, w:17, h:15, label:"rock3-a" },
    { x:478, y:312, w:10, h:11, label:"rock4-a" },
    { x:265, y:200, w:18, h:12, label:"rock1-b" },
    { x:475, y:78,  w:20, h:16, label:"rock3-b" },
    { x:195, y:330, w:15, h:19, label:"rock2-b" },
    { x:388, y:108,  w:16, h:11, label:"rock4-b" },
    { x:357, y:277,  w:20, h:23 , label:"rock4-b" },

    // ── LOGS
    { x:120, y:335, w:20, h:8,  label:"log1-a" },
    { x:413, y:178, w:15, h:8,  label:"log2-a" },

    // ── MUSHROOM
    { x:485, y:60, w:10, h:10, label:"mush-b" },
    { x:454, y:290, w:10, h:10, label:"mush-b" },

    // ── SCARECROW
    { x:249, y:295, w:3, h:5, label:"scare-a" },
    { x:329, y:265, w:3, h:5, label:"scare-b" },
    // ── WELL
    { x:288, y:263, w:9, h:9, label:"well" },
    // ── CAVE
    { x:490, y:45, w:20, h:15, label:"cave" },
    
    // ── HOUSES
    { x:442, y:140, w:50, h:15, label:"house" },
    { x:485, y:148, w:5, h:5, label:"house" },
    { x:182, y:270, w:52, h:15, label:"house" },
    //1665px; --ay:825px
    { x:353, y:195, w:30, h:4, label:"tent" },
];

// ─── OVERLAP TEST ──────────────────────────────────────────────────────────
const overlaps = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax - aw/2 < bx + bw/2 &&
    ax + aw/2 > bx - bw/2 &&
    ay - ah/2 < by + bh/2 &&
    ay + ah/2 > by - bh/2;

// ─── BUSH DATA for fade-behind effect ──────────────────────────────────────
// Pre-compute bush centres in game units from their --ax/--ay inline styles
const bushData = [];
bushElements.forEach(el => {
    const style   = el.getAttribute("style") || "";
    const axMatch = style.match(/--ax:\s*([\d.]+)px/);
    const ayMatch = style.match(/--ay:\s*([\d.]+)px/);
    // approximate sprite half sizes (bush1≈225×200px, bush2≈200×175px)
    const bw = el.classList.contains("bush1") ? 22 : 20;
    const bh = el.classList.contains("bush1") ? 20 : 18;
    if (axMatch && ayMatch) {
        const ax = parseFloat(axMatch[1]);
        const ay = parseFloat(ayMatch[1]);
        bushData.push({
            el,
            cx: (ax + bw*9/2) / 5,
            cy: (ay + bh*9/2) / 5,
            w:  bw,
            h:  bh,
        });
    }
});

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────
const placeCharacter = () => {
    const pixelSize = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
    );

    const held_direction = held_directions[0];

    if (held_direction) {
        let newX = x;
        let newY = y;
        const spd = isSprinting ? sprintSpeed : baseSpeed;

        if (held_direction === directions.right) { newX += spd; }
        if (held_direction === directions.left)  { newX -= spd; }
        if (held_direction === directions.down)  { newY += spd; }
        if (held_direction === directions.up)    { newY -= spd; }

        // Map bounds
        newX = Math.max(42,  Math.min(newX, 568));
        newY = Math.max(42,  Math.min(newY, 388));

        // Collider check
        let blocked = false;
        for (const obj of colliders) {
            if (overlaps(newX, newY, charSize, charSize, obj.x, obj.y, obj.w, obj.h)) {
                blocked = true;
                break;
            }
        }

        if (!blocked) { x = newX; y = newY; }

        character.setAttribute("facing", held_direction);
    }

    character.setAttribute("walking",   held_direction ? "true" : "false");
    character.setAttribute("sprinting", isSprinting && held_direction ? "true" : "false");

    character.style.left = `${x * pixelSize}px`;
    character.style.top  = `${y * pixelSize}px`;

    // Camera
    const camera_left = window.innerWidth  / 2 - x * pixelSize;
    const camera_top  = window.innerHeight / 2 - y * pixelSize;
    const tx = `translate3d(${camera_left}px, ${camera_top}px, 0)`;
    map.style.transform   = tx;
    ocean.style.transform = tx;
    pond.style.transform  = tx;

    // zIndex for character
    character.style.zIndex = Math.round(y);

    // zIndex for all assets (feet = data-y + data-h)
    document.querySelectorAll(".asset").forEach(asset => {
        const ay = parseFloat(asset.dataset.y) || 0;
        const ah = parseFloat(asset.dataset.h) || 0;
        asset.style.zIndex = Math.round(ay + ah);
    });

    // Bush hide-behind effect: if player overlaps bush AND player y > bush centre y
    // (player is "behind" = visually in front of bush), fade the bush
    bushData.forEach(b => {
        // Expand overlap check slightly so it feels natural
        const behind = overlaps(x, y, charSize + 4, charSize + 4, b.cx, b.cy, b.w, b.h)
                       && y > b.cy;
        b.el.classList.toggle("player-behind", behind);
    });

    // ── KEY PICKUP ────────────────────────────────────────────────────────
    if (!keyCollected) {
        const dx = x - KEY_GU.x;
        const dy = y - KEY_GU.y;

        if (Math.sqrt(dx*dx + dy*dy) < KEY_GU.r) {
            keyCollected = true;
            hasKey       = true;

            popup.style.display = "flex";
            pop_up_text.textContent = "You've got a Key!!";
            pop_up_text2.textContent = "Find the entrance and enter the cave!";


            // Hide the world key
            if (keyContainer) keyContainer.style.display = "none";
            // Show HUD key
            if (hudKey) {
                hudKey.classList.remove("hidden");
                hudKey.classList.add("pickup-flash");
                setTimeout(() => hudKey.classList.remove("pickup-flash"), 600);
            }
        }

    
    }

    // ── CAVE PROXIMITY ────────────────────────────────────────────────────
    const cdx = x - CAVE_GU.x;
    const cdy = y - CAVE_GU.y;
    const wasNearCave = nearCave;
    nearCave = Math.sqrt(cdx*cdx + cdy*cdy) < CAVE_GU.r;
    if (nearCave !== wasNearCave && cavePrompt) {
        if (nearCave && hasKey) {
            cavePrompt.classList.remove("hidden");
        } else {
            cavePrompt.classList.add("hidden");
        }
    }
};

const step = () => {
    placeCharacter();
    window.requestAnimationFrame(step);
};
step();

// ─── INPUT ────────────────────────────────────────────────────────────────
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

// ─── CAVE ENTRY (E key) ───────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    if ((e.key === "e" || e.key === "E") && nearCave && hasKey) {
        hasKey = false;
        if (cavePrompt) cavePrompt.classList.add("hidden");
        if (hudKey)     hudKey.classList.add("hidden");
        window.location.href = "cave.html"
        console.log("[cave] Player entered the cave!");
        // Example: dispatchEvent(new CustomEvent("enterCave"));
    }
});

// ─── DEBUG (toggle with ` key) ─────────────────────────────────────────────
let debugOn = false;
let debugBoxes = [];

const drawDebug = () => {
    const pixelSize = 5;
    debugBoxes.forEach(b => b.remove());
    debugBoxes = [];

    colliders.forEach(obj => {
        const box = document.createElement("div");
        box.style.cssText = `
            position:absolute;
            left:${(obj.x - obj.w/2)*pixelSize}px;
            top:${(obj.y  - obj.h/2)*pixelSize}px;
            width:${obj.w*pixelSize}px;
            height:${obj.h*pixelSize}px;
            border:2px solid rgba(255,0,0,0.7);
            background:rgba(255,0,0,0.08);
            pointer-events:none;
            z-index:9999;
        `;
        document.querySelector(".map").appendChild(box);
        debugBoxes.push(box);
    });

    // bush centres
    bushData.forEach(b => {
        const dot = document.createElement("div");
        dot.style.cssText = `
            position:absolute;
            left:${(b.cx-b.w/2)*pixelSize}px;
            top:${(b.cy-b.h/2)*pixelSize}px;
            width:${b.w*pixelSize}px;
            height:${b.h*pixelSize}px;
            border:2px solid rgba(0,200,255,0.7);
            background:rgba(0, 200, 255, 0.08);
            pointer-events:none;
            z-index:9999;
        `;
        document.querySelector(".map").appendChild(dot);
        debugBoxes.push(dot);
    });
};

document.addEventListener("keydown", (e) => {
    if (e.key === "/") {
        debugOn = !debugOn;
        if (debugOn) drawDebug();
        else { debugBoxes.forEach(b => b.remove()); debugBoxes = []; }
    }
});

