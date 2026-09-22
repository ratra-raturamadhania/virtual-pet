/* =========================================================
   PIXEL PET - SPRITE ENGINE SCRIPT
========================================================= */

/* =========================
   DATA & SAVING
========================= */

const defaultData = {
  name: "Sucipto",
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
  level: 1,
  xp: 0,
  coins: 100,
  pattern: "orange"
};

const validPatterns = ["orange", "tuxedo", "calico", "gray"];

let savedData = null;

try {
  savedData = JSON.parse(localStorage.getItem("pixelPetData"));
} catch {
  savedData = null;
}

let data = {
  ...defaultData,
  ...(savedData || {})
};

if (!validPatterns.includes(data.pattern)) {
  data.pattern = "orange";
}

function save() {
  localStorage.setItem("pixelPetData", JSON.stringify(data));
}


/* =========================
   ELEMENTS
========================= */

const room = document.getElementById("room");
const petZone = document.getElementById("petZone");
const catImg = document.getElementById("pixelCat");

const speech = document.getElementById("speech");
const effect = document.getElementById("floatingEffect");

const bed = document.getElementById("bed");
const foodBowl = document.getElementById("foodBowl");
const bowlFood = document.getElementById("bowlFood");
const bath = document.getElementById("bath");
const ball = document.getElementById("ball");


/* =========================
   STATE
========================= */

let busy = false;

let catDragging = false;
let dragMoved = false;
let catPointerId = null;

let catOffsetX = 0;
let catOffsetY = 0;

let ballDragging = false;
let ballPointerId = null;

let ballLastX = 0;
let ballLastY = 0;

let ballVX = 0;
let ballVY = 0;

let idleTimer = null;
let movementTimer = null;
let movementToken = 0;
let currentFlip = 1;


/* =========================
   HELPERS & CANCELLATION
========================= */

function cancelMovement() {
  movementToken++;
  if (movementTimer) {
    clearTimeout(movementTimer);
    movementTimer = null;
  }
  petZone.style.transition = "none";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRoomRect() {
  return room.getBoundingClientRect();
}

function petWidth() {
  return petZone.offsetWidth;
}

function petHeight() {
  return petZone.offsetHeight;
}


/* =========================
   FLOOR & DEPTH SYSTEM
========================= */

function floorFarY() {
  return room.clientHeight * 0.68;
}

function floorNearY() {
  return room.clientHeight - 18;
}

function currentPetX() {
  const r = petZone.getBoundingClientRect();
  const roomR = getRoomRect();
  return r.left - roomR.left + r.width / 2;
}

function currentLogicalTop() {
  const inlineTop = parseFloat(petZone.style.top);
  if (!Number.isNaN(inlineTop)) return inlineTop;
  const rect = petZone.getBoundingClientRect();
  const roomR = getRoomRect();
  return rect.top - roomR.top;
}

function currentFeetY() {
  const stored = parseFloat(petZone.dataset.feetY);
  if (!Number.isNaN(stored)) return stored;
  return currentLogicalTop() + petHeight();
}

function updateDepth(feetY) {
  const range = floorNearY() - floorFarY();
  const progress = clamp((feetY - floorFarY()) / range, 0, 1);
  const scale = 0.85 + progress * 0.20;

  petZone.style.setProperty("--depth-scale", scale);
  petZone.style.zIndex = Math.round(30 + progress * 25);
  applyTransform();
}

function applyTransform() {
  petZone.style.transform = `translateX(-50%) scale(var(--depth-scale)) scaleX(${currentFlip})`;
}


/* =========================
   POSITIONS & STATES
========================= */

function setPetPosition(x, feetY, instant = true) {
  const safeX = clamp(x, petWidth() / 2, room.clientWidth - petWidth() / 2);
  const safeY = clamp(feetY, floorFarY(), floorNearY());
  const top = safeY - petHeight();

  if (instant) {
    petZone.style.transition = "none";
  }

  petZone.style.left = `${safeX}px`;
  petZone.style.top = `${top}px`;
  petZone.style.bottom = "auto";
  petZone.dataset.feetY = safeY;

  updateDepth(safeY);
}

function setSpecialPosition(x, top, { scale = 1, zIndex = 30 } = {}) {
  petZone.style.left = `${x}px`;
  petZone.style.top = `${top}px`;
  petZone.style.bottom = "auto";
  petZone.style.setProperty("--depth-scale", scale);
  petZone.style.zIndex = zIndex;
  applyTransform();
}

function clearCatStates() {
  petZone.classList.remove("is-carried", "on-bed", "in-bath", "at-food");
}


/* =========================
   UI & SPEECH
========================= */

function updateUI() {
  document.getElementById("petName").textContent = data.name;
  document.getElementById("level").textContent = data.level;
  document.getElementById("xp").textContent = data.xp;
  document.getElementById("coins").textContent = data.coins;

  setStat("hunger", data.hunger);
  setStat("happy", data.happiness);
  setStat("energy", data.energy);
  setStat("clean", data.cleanliness);

  save();
}

function setStat(name, value) {
  value = clamp(value, 0, 100);
  document.getElementById(name + "Bar").style.width = value + "%";
  document.getElementById(name + "Text").textContent = Math.round(value);
}

function say(text, duration = 1500) {
  speech.textContent = text;
  speech.classList.remove("hidden");

  clearTimeout(window.speechTimer);
  window.speechTimer = setTimeout(() => {
    speech.classList.add("hidden");
  }, duration);
}

function showEffect(symbol) {
  effect.textContent = symbol;
  effect.animate(
    [
      { opacity: 0, transform: "translate(-50%,0) scale(.6)" },
      { opacity: 1, transform: "translate(-50%,-18px) scale(1)" },
      { opacity: 0, transform: "translate(-50%,-65px) scale(1.2)" }
    ],
    { duration: 900, easing: "ease-out" }
  );

  setTimeout(() => {
    effect.textContent = "";
  }, 900);
}


/* =========================
   MOVEMENT SYSTEM
========================= */

function movePetTo(targetX, targetFeetY, { run = false, callback = null } = {}) {
  cancelMovement();
  clearCatStates();

  const myToken = movementToken;
  const safeX = clamp(targetX, petWidth() / 2, room.clientWidth - petWidth() / 2);
  const safeY = clamp(targetFeetY, floorFarY(), floorNearY());

  const dx = safeX - currentPetX();
  const dy = safeY - currentFeetY();
  const distance = Math.hypot(dx, dy);

  if (dx < -2) {
    currentFlip = -1;
  } else if (dx > 2) {
    currentFlip = 1;
  }

  if (distance < 5) {
    setPetPosition(safeX, safeY);
    if (callback) callback();
    return;
  }

  const duration = run
    ? clamp(distance * 1.25, 250, 650)
    : clamp(distance * 2.1, 400, 1100);

  const targetTop = safeY - petHeight();

  petZone.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
  petZone.style.left = `${safeX}px`;
  petZone.style.top = `${targetTop}px`;
  petZone.dataset.feetY = safeY;

  updateDepth(safeY);

  movementTimer = setTimeout(() => {
    if (myToken !== movementToken) return;

    petZone.style.transition = "none";
    movementTimer = null;

    if (callback) callback();
  }, duration);
}


/* =========================
   FLOOR CLICK
========================= */

room.addEventListener("click", event => {
  if (busy || catDragging || ballDragging) return;

  if (
    event.target.closest(".furniture") ||
    event.target.closest("#pixelCat") ||
    event.target.closest("#ball")
  ) {
    return;
  }

  const roomR = getRoomRect();
  const x = event.clientX - roomR.left;
  const y = event.clientY - roomR.top;

  if (y < floorFarY()) {
    say("that's the wall!");
    return;
  }

  movePetTo(x, y);
});


/* =========================
   DRAG & DROP
========================= */

catImg.addEventListener("pointerdown", event => {
  if (busy) return;

  cancelMovement();
  catDragging = true;
  dragMoved = false;
  catPointerId = event.pointerId;

  catImg.setPointerCapture(event.pointerId);

  const rect = petZone.getBoundingClientRect();
  catOffsetX = event.clientX - rect.left;
  catOffsetY = event.clientY - rect.top;

  clearCatStates();
  petZone.classList.add("is-carried");

  say("mrrp?");
});

catImg.addEventListener("pointermove", event => {
  if (!catDragging) return;

  dragMoved = true;
  const roomR = getRoomRect();

  let x = event.clientX - roomR.left - catOffsetX + petWidth() / 2;
  let y = event.clientY - roomR.top - catOffsetY;

  x = clamp(x, petWidth() / 2, room.clientWidth - petWidth() / 2);
  y = clamp(y, -20, floorNearY() - petHeight());

  petZone.style.transition = "none";
  petZone.style.left = `${x}px`;
  petZone.style.top = `${y}px`;
});

function releaseCat() {
  if (!catDragging) return;

  catDragging = false;
  try { catImg.releasePointerCapture(catPointerId); } catch {}

  petZone.classList.remove("is-carried");

  if (!dragMoved) {
    data.happiness = clamp(data.happiness + 5, 0, 100);
    say("prrr~");
    showEffect("♥");
    updateUI();
    return;
  }

  dropCat();
}

catImg.addEventListener("pointerup", releaseCat);
catImg.addEventListener("pointercancel", releaseCat);

function dropCat() {
  cancelMovement();

  let top = currentLogicalTop();
  let releaseFeet = top + petHeight();

  const targetFeet = releaseFeet < floorFarY()
    ? floorFarY()
    : clamp(releaseFeet, floorFarY(), floorNearY());

  const targetTop = targetFeet - petHeight();

  if (top >= targetTop) {
    setPetPosition(currentPetX(), targetFeet);
    return;
  }

  let velocity = 0;

  function fall() {
    velocity += 0.85;
    top += velocity;

    if (top >= targetTop) {
      top = targetTop;
      petZone.style.top = `${top}px`;
      petZone.dataset.feetY = targetFeet;
      updateDepth(targetFeet);
      return;
    }

    petZone.style.top = `${top}px`;
    const liveFeet = clamp(top + petHeight(), floorFarY(), floorNearY());
    updateDepth(liveFeet);
    requestAnimationFrame(fall);
  }

  requestAnimationFrame(fall);
}


/* =========================
   FURNITURE ACTIONS
========================= */

foodBowl.addEventListener("click", event => {
  event.stopPropagation();
  if (busy) return;

  busy = true;
  cancelMovement();

  const roomR = getRoomRect();
  const bowlR = foodBowl.getBoundingClientRect();
  const eatX = bowlR.right - roomR.left + 35;
  const eatY = floorNearY() - 8;

  movePetTo(eatX, eatY, {
    callback: () => {
      clearCatStates();
      currentFlip = -1;
      applyTransform();
      petZone.classList.add("at-food");

      say("nom nom...", 2400);

      let bites = 0;
      const timer = setInterval(() => {
        bites++;
        bowlFood.style.transform = bites % 2 ? "scale(.72)" : "scale(1)";

        if (bites >= 5) {
          clearInterval(timer);
          bowlFood.style.opacity = ".3";
          bowlFood.style.transform = "";

          data.hunger = clamp(data.hunger + 30, 0, 100);
          data.happiness = clamp(data.happiness + 3, 0, 100);

          clearCatStates();
          updateUI();

          setTimeout(() => {
            bowlFood.style.opacity = "1";
            busy = false;
          }, 350);
        }
      }, 360);
    }
  });
});

bed.addEventListener("click", event => {
  event.stopPropagation();
  if (busy) return;

  busy = true;
  cancelMovement();

  const roomR = getRoomRect();
  const bedR = bed.getBoundingClientRect();
  const approachX = bedR.right - roomR.left + 35;

  movePetTo(approachX, floorNearY() - 8, {
    callback: () => {
      clearCatStates();
      currentFlip = 1;
      applyTransform();

      const sleepX = bedR.left - roomR.left + bedR.width * 0.52;
      const sleepTop = bedR.top - roomR.top - 45;

      petZone.style.transition = "left .38s ease, top .38s ease";
      petZone.classList.add("on-bed");

      setSpecialPosition(sleepX, sleepTop, { scale: 0.85, zIndex: 18 });

      say("zzz...", 4500);
      showEffect("Z");

      setTimeout(() => { showEffect("z"); }, 1200);

      setTimeout(() => {
        data.energy = clamp(data.energy + 38, 0, 100);
        data.hunger = clamp(data.hunger - 7, 0, 100);

        clearCatStates();
        setPetPosition(bedR.right - roomR.left + 40, floorNearY() - 8);

        say("morning!");
        updateUI();
        busy = false;
      }, 4500);
    }
  });
});

bath.addEventListener("click", event => {
  event.stopPropagation();
  if (busy) return;

  busy = true;
  cancelMovement();

  const roomR = getRoomRect();
  const bathR = bath.getBoundingClientRect();
  const approachX = bathR.left - roomR.left - 35;

  movePetTo(approachX, floorNearY() - 8, {
    callback: () => {
      clearCatStates();

      const bathX = bathR.left - roomR.left + bathR.width / 2;
      const bathTop = bathR.top - roomR.top - 48;

      petZone.style.transition = "left .35s ease, top .35s ease";
      petZone.classList.add("in-bath");

      setSpecialPosition(bathX, bathTop, { scale: 0.88, zIndex: 30 });
      bath.classList.add("active");
      say("splash!", 3000);

      setTimeout(() => {
        data.cleanliness = clamp(data.cleanliness + 40, 0, 100);
        data.happiness = clamp(data.happiness + 4, 0, 100);

        bath.classList.remove("active");
        clearCatStates();
        setPetPosition(bathR.left - roomR.left - 35, floorNearY() - 8);

        say("fresh!");
        updateUI();
        busy = false;
      }, 3000);
    }
  });
});


/* =========================
   BALL PHYSICS & CHASE
========================= */

ball.addEventListener("pointerdown", event => {
  if (busy) return;

  ballDragging = true;
  ballPointerId = event.pointerId;
  ball.setPointerCapture(event.pointerId);

  ballLastX = event.clientX;
  ballLastY = event.clientY;
  ballVX = 0;
  ballVY = 0;

  const rect = ball.getBoundingClientRect();
  ball.style.position = "fixed";
  ball.style.left = `${rect.left}px`;
  ball.style.top = `${rect.top}px`;
  ball.style.zIndex = "1000";
});

ball.addEventListener("pointermove", event => {
  if (!ballDragging) return;

  ballVX = event.clientX - ballLastX;
  ballVY = event.clientY - ballLastY;
  ballLastX = event.clientX;
  ballLastY = event.clientY;

  ball.style.left = `${event.clientX - 22}px`;
  ball.style.top = `${event.clientY - 22}px`;
});

function releaseBall() {
  if (!ballDragging) return;
  ballDragging = false;
  try { ball.releasePointerCapture(ballPointerId); } catch {}
  throwBall();
}

ball.addEventListener("pointerup", releaseBall);
ball.addEventListener("pointercancel", releaseBall);

function throwBall() {
  busy = true;

  let x = parseFloat(ball.style.left);
  let y = parseFloat(ball.style.top);
  let vx = ballVX * 1.45;
  let vy = ballVY * 1.45;

  if (Math.abs(vx) < 2 && Math.abs(vy) < 2) {
    vx = 5;
    vy = -6;
  }

  const gravity = 0.48;

  function physics() {
    const box = getRoomRect();
    const minX = box.left + 4;
    const maxX = box.right - 48;
    const minY = box.top + 4;
    const maxY = box.bottom - 48;

    x += vx;
    y += vy;
    vy += gravity;
    vx *= 0.986;

    if (x <= minX || x >= maxX) {
      vx *= -0.68;
      x = clamp(x, minX, maxX);
    }
    if (y < minY) {
      y = minY;
      vy *= -0.5;
    }
    if (y >= maxY) {
      y = maxY;
      vy *= -0.5;
      vx *= 0.89;
    }

    ball.style.left = `${x}px`;
    ball.style.top = `${y}px`;
    ball.style.transform = `rotate(${x * 2.8}deg)`;

    const stopped = Math.abs(vx) < 0.28 && Math.abs(vy) < 0.6 && y >= maxY - 2;

    if (!stopped) {
      requestAnimationFrame(physics);
    } else {
      chaseBall(x + 22);
    }
  }

  physics();
}

function chaseBall(screenX) {
  const roomR = getRoomRect();
  const x = screenX - roomR.left;

  say("BALL!!");

  movePetTo(x, floorNearY() - 6, {
    run: true,
    callback: () => {
      showEffect("★");

      data.happiness = clamp(data.happiness + 15, 0, 100);
      data.energy = clamp(data.energy - 8, 0, 100);
      updateUI();

      setTimeout(() => {
        resetBall();
        busy = false;
      }, 800);
    }
  });
}

function resetBall() {
  ball.style.position = "";
  ball.style.left = "";
  ball.style.top = "";
  ball.style.zIndex = "";
  ball.style.transform = "";
}


/* =========================
   CONTROLS & IDLE AI
========================= */

function renamePet() {
  const name = prompt("Pet name:", data.name);
  if (!name) return;
  data.name = name.trim().substring(0, 12);
  updateUI();
}

function resetPet() {
  if (!confirm("Reset all pet progress?")) return;

  cancelMovement();
  data = { ...defaultData };
  busy = false;

  clearCatStates();
  bath.classList.remove("active");
  resetBall();

  setPetPosition(room.clientWidth / 2, floorNearY() - 25);
  updateUI();
}

function scheduleIdleBehaviour() {
  clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    if (busy || catDragging || ballDragging) {
      scheduleIdleBehaviour();
      return;
    }

    const random = Math.random();

    if (random < 0.60) {
      const x = room.clientWidth * (0.18 + Math.random() * 0.64);
      const y = floorFarY() + 12 + Math.random() * (floorNearY() - floorFarY() - 28);
      movePetTo(x, y);
    } else {
      const messages = ["meow~", "mrrp", "play?", "human?", "prrr...", "feed me?"];
      say(messages[Math.floor(Math.random() * messages.length)]);
    }

    scheduleIdleBehaviour();
  }, 7000 + Math.random() * 5000);
}


/* =========================
   STAT DECAY
========================= */

setInterval(() => {
  data.hunger = clamp(data.hunger - 1.5, 0, 100);
  data.energy = clamp(data.energy - 0.7, 0, 100);
  data.cleanliness = clamp(data.cleanliness - 0.4, 0, 100);

  if (data.hunger < 20) {
    data.happiness = clamp(data.happiness - 0.7, 0, 100);
  }

  updateUI();
}, 60000);


/* =========================
   STARTUP
========================= */

updateUI();

requestAnimationFrame(() => {
  setPetPosition(room.clientWidth / 2, floorNearY() - 30);
});

scheduleIdleBehaviour();
