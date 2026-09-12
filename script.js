const defaultData = {
  name: "Mochi",
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
  level: 1,
  xp: 0,
  coins: 100,
  pattern: "orange"
};

const validPatterns = [
  "orange",
  "tuxedo",
  "calico",
  "gray"
];

let savedData = null;

try {
  savedData = JSON.parse(
    localStorage.getItem("pixelPetData")
  );
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

/* =========================
   ELEMENTS
========================= */

const room = document.getElementById("room");
const petZone = document.getElementById("petZone");
const cat = document.getElementById("pixelCat");
const portraitCat = document.getElementById("portraitCat");
const speech = document.getElementById("speech");
const effect = document.getElementById("floatingEffect");

const ball = document.getElementById("ball");
const bath = document.getElementById("bath");
const bed = document.getElementById("bed");
const foodBowl = document.getElementById("foodBowl");
const bowlFood = document.getElementById("bowlFood");

/* =========================
   STATE
========================= */

let busy = false;

let catDragging = false;
let dragMoved = false;
let catDragPointerId = null;

let catOffsetX = 0;
let catOffsetY = 0;

let desiredDragX = 0;
let desiredDragY = 0;
let dragFrame = null;

let ballDragging = false;
let ballLastX = 0;
let ballLastY = 0;
let ballVX = 0;
let ballVY = 0;
let ballAnimationId = null;

let gravityAnimationId = null;
let idleTimer = null;

/* =========================
   SAVE
========================= */

function save() {
  localStorage.setItem(
    "pixelPetData",
    JSON.stringify(data)
  );
}

/* =========================
   HELPERS
========================= */

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roomRect() {
  return room.getBoundingClientRect();
}

function petWidth() {
  return petZone.offsetWidth;
}

function petHeight() {
  return petZone.offsetHeight;
}

/*
  Area lantai yang boleh diinjak.
  Atas = mulai sedikit di bawah garis dinding/lantai.
  Bawah = batas paling bawah agar pet tidak keluar layar.
*/

function floorTop() {
  return room.clientHeight * 0.59;
}

function floorBottom() {
  return room.clientHeight - petHeight() + 16;
}

function clearCatStates() {
  cat.classList.remove(
    "carried",
    "drop-bounce",
    "walking",
    "running",
    "happy",
    "eating",
    "sleeping",
    "bathing",
    "sitting",
    "looking"
  );

  petZone.classList.remove(
    "on-bed",
    "is-carried"
  );
}

function setPetPixelPosition(x, y) {
  const rect = roomRect();
  const halfWidth = petWidth() / 2;

  const safeX = clamp(
    x,
    halfWidth,
    rect.width - halfWidth
  );

  const safeY = clamp(
    y,
    floorTop(),
    floorBottom()
  );

  petZone.style.left = `${safeX}px`;
  petZone.style.top = `${safeY}px`;
  petZone.style.bottom = "auto";
  petZone.style.transform = "translateX(-50%)";
}

function setPetOnGroundAtX(x) {
  setPetPixelPosition(
    x,
    floorBottom()
  );
}

function getPetLocalX() {
  const petRect = petZone.getBoundingClientRect();
  const roomBox = roomRect();

  return (
    petRect.left -
    roomBox.left +
    petRect.width / 2
  );
}

function getPetLocalY() {
  const petRect = petZone.getBoundingClientRect();
  const roomBox = roomRect();

  return (
    petRect.top -
    roomBox.top
  );
}

function getObjectCenterX(element) {
  const roomBox = roomRect();
  const box = element.getBoundingClientRect();

  return (
    box.left -
    roomBox.left +
    box.width / 2
  );
}

function getObjectTopY(element) {
  const roomBox = roomRect();
  const box = element.getBoundingClientRect();

  return (
    box.top -
    roomBox.top
  );
}

/* =========================
   UI
========================= */

function updateUI() {
  document.getElementById("petName").textContent =
    data.name;

  document.getElementById("level").textContent =
    data.level;

  document.getElementById("xp").textContent =
    data.xp;

  document.getElementById("coins").textContent =
    data.coins;

  setStat("hunger", data.hunger);
  setStat("happy", data.happiness);
  setStat("energy", data.energy);
  setStat("clean", data.cleanliness);

  applyPattern(data.pattern);
  updateMood();

  save();
}

function setStat(name, value) {
  const bar = document.getElementById(
    name + "Bar"
  );

  const text = document.getElementById(
    name + "Text"
  );

  bar.style.width = value + "%";
  text.textContent = Math.round(value);

  if (value < 25) {
    bar.style.background = "#ca5f59";
  } else if (value < 50) {
    bar.style.background = "#d7a04f";
  } else {
    bar.style.background = "#77a870";
  }
}

/* =========================
   FACE / MOOD
========================= */

function updateMood() {
  const eyes = document.querySelectorAll(".eye");
  const mouth = document.querySelector(".mouth");

  eyes.forEach(eye => {
    eye.style.height = "8px";
    eye.style.top = "24px";
  });

  mouth.style.borderBottom =
    "3px solid #4c302d";

  mouth.style.borderTop = "0";

  if (data.energy < 20) {
    eyes.forEach(eye => {
      eye.style.height = "3px";
      eye.style.top = "28px";
    });
  }

  if (
    data.hunger < 15 ||
    data.happiness < 25
  ) {
    mouth.style.borderBottom = "0";
    mouth.style.borderTop =
      "3px solid #4c302d";
  }
}

/* =========================
   SPEECH / EFFECT
========================= */

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
      {
        opacity: 0,
        transform:
          "translate(-50%, 6px) scale(.7)"
      },
      {
        opacity: 1,
        transform:
          "translate(-50%, -15px) scale(1)"
      },
      {
        opacity: 0,
        transform:
          "translate(-50%, -65px) scale(1.2)"
      }
    ],
    {
      duration: 900,
      easing: "ease-out"
    }
  );

  setTimeout(() => {
    effect.textContent = "";
  }, 900);
}

/* =========================
   PATTERNS
========================= */

function applyPattern(pattern) {
  validPatterns.forEach(name => {
    cat.classList.remove(name);

    if (portraitCat) {
      portraitCat.classList.remove(name);
    }
  });

  cat.classList.add(pattern);

  if (portraitCat) {
    portraitCat.classList.add(pattern);
  }

  document
    .querySelectorAll("[data-pattern]")
    .forEach(button => {
      button.classList.toggle(
        "active-pattern",
        button.dataset.pattern === pattern
      );
    });
}

document
  .querySelectorAll("[data-pattern]")
  .forEach(button => {
    button.addEventListener("click", () => {
      data.pattern =
        button.dataset.pattern;

      applyPattern(data.pattern);

      say("new look!");
      showEffect("♥");

      save();
    });
  });

/* =========================
   FACE DIRECTION
========================= */

function faceTowards(targetX) {
  const currentX = getPetLocalX();

  if (targetX < currentX) {
    cat.style.scale = "-1 1";
  } else {
    cat.style.scale = "1 1";
  }
}

/* =========================
   2D WALK
========================= */

function walkToPoint(
  targetX,
  targetY,
  {
    run = false,
    callback = null
  } = {}
) {
  clearCatStates();

  const safeX = clamp(
    targetX,
    petWidth() / 2,
    room.clientWidth - petWidth() / 2
  );

  const safeY = clamp(
    targetY,
    floorTop(),
    floorBottom()
  );

  const currentX = getPetLocalX();
  const currentY = getPetLocalY();

  faceTowards(safeX);

  cat.classList.add(
    run ? "running" : "walking"
  );

  const distance = Math.hypot(
    safeX - currentX,
    safeY - currentY
  );

  const duration = run
    ? clamp(distance * 1.25, 220, 650)
    : clamp(distance * 1.9, 300, 900);

  petZone.style.transition = `
    left ${duration}ms cubic-bezier(.22,.75,.25,1),
    top ${duration}ms cubic-bezier(.22,.75,.25,1)
  `;

  petZone.style.left = `${safeX}px`;
  petZone.style.top = `${safeY}px`;
  petZone.style.bottom = "auto";

  setTimeout(() => {
    cat.classList.remove(
      "running",
      "walking"
    );

    if (callback) {
      callback();
    }
  }, duration);
}

function movePetToX(
  targetX,
  {
    run = false,
    callback = null
  } = {}
) {
  walkToPoint(
    targetX,
    getPetLocalY(),
    {
      run,
      callback
    }
  );
}

/* =========================
   BLOCKING FURNITURE
========================= */

function getBlockingRects() {
  const roomBox = roomRect();

  return [
    bed,
    foodBowl,
    bath
  ]
    .filter(Boolean)
    .map(element => {
      const rect =
        element.getBoundingClientRect();

      return {
        left:
          rect.left -
          roomBox.left,

        right:
          rect.right -
          roomBox.left,

        top:
          rect.top -
          roomBox.top,

        bottom:
          rect.bottom -
          roomBox.top
      };
    });
}

function isBlockedPoint(x, y) {
  const blocks = getBlockingRects();

  return blocks.some(rect => {
    return (
      x > rect.left - 22 &&
      x < rect.right + 22 &&
      y > rect.top - 30 &&
      y < rect.bottom + 25
    );
  });
}

/* =========================
   CLICK FLOOR TO WALK
========================= */

room.addEventListener("click", event => {
  if (
    busy ||
    catDragging ||
    ballDragging
  ) {
    return;
  }

  if (
    event.target.closest(".furniture") ||
    event.target.closest("#pixelCat") ||
    event.target.closest("#ball")
  ) {
    return;
  }

  const rect = roomRect();

  const targetX =
    event.clientX - rect.left;

  const targetY =
    event.clientY - rect.top;

  if (targetY < floorTop()) {
    say("can't climb the wall!");
    return;
  }

  if (
    isBlockedPoint(
      targetX,
      targetY
    )
  ) {
    say("something's there!");
    return;
  }

  walkToPoint(
    targetX,
    targetY
  );
});

/* =========================
   DRAG CAT
========================= */

cat.addEventListener(
  "pointerdown",
  event => {
    if (busy) return;

    catDragging = true;
    dragMoved = false;
    catDragPointerId =
      event.pointerId;

    cat.setPointerCapture(
      event.pointerId
    );

    const petRect =
      petZone.getBoundingClientRect();

    catOffsetX =
      event.clientX -
      petRect.left;

    catOffsetY =
      event.clientY -
      petRect.top;

    clearCatStates();

    cat.classList.add(
      "carried"
    );

    petZone.classList.add(
      "is-carried"
    );

    say("mrrp?");
  }
);

cat.addEventListener(
  "pointermove",
  event => {
    if (!catDragging) return;

    dragMoved = true;

    const roomBox = roomRect();

    desiredDragX =
      event.clientX -
      roomBox.left -
      catOffsetX +
      petWidth() / 2;

    desiredDragY =
      event.clientY -
      roomBox.top -
      catOffsetY;

    desiredDragX = clamp(
      desiredDragX,
      petWidth() / 2,
      roomBox.width - petWidth() / 2
    );

    /*
      Saat DIANGKAT boleh ada di atas lantai,
      supaya memang terasa sedang diangkat.
      Nanti saat dilepas baru jatuh.
    */

    desiredDragY = clamp(
      desiredDragY,
      0,
      floorBottom()
    );

    if (!dragFrame) {
      dragFrame =
        requestAnimationFrame(
          updateDragFrame
        );
    }
  }
);

function updateDragFrame() {
  dragFrame = null;

  if (!catDragging) return;

  petZone.style.transition =
    "none";

  const rect = roomRect();

  const safeX = clamp(
    desiredDragX,
    petWidth() / 2,
    rect.width - petWidth() / 2
  );

  const safeY = clamp(
    desiredDragY,
    0,
    floorBottom()
  );

  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${safeY}px`;

  petZone.style.bottom =
    "auto";

  petZone.style.transform =
    "translateX(-50%)";
}

function stopCatDrag(event) {
  if (!catDragging) return;

  catDragging = false;

  try {
    cat.releasePointerCapture(
      catDragPointerId
    );
  } catch {}

  catDragPointerId = null;

  cat.classList.remove(
    "carried"
  );

  petZone.classList.remove(
    "is-carried"
  );

  if (!dragMoved) {
    petCat();
    return;
  }

  startGravityDrop();
}

cat.addEventListener(
  "pointerup",
  stopCatDrag
);

cat.addEventListener(
  "pointercancel",
  stopCatDrag
);

/* =========================
   GRAVITY DROP
========================= */

function startGravityDrop() {
  if (gravityAnimationId) {
    cancelAnimationFrame(
      gravityAnimationId
    );
  }

  let velocityY = 0;

  function fall() {
    const currentX =
      getPetLocalX();

    let currentY =
      getPetLocalY();

    velocityY += 0.95;

    currentY += velocityY;

    const ground =
      floorBottom();

    if (currentY >= ground) {
      currentY = ground;

      setPetPixelPosition(
        currentX,
        currentY
      );

      cat.classList.add(
        "drop-bounce"
      );

      setTimeout(() => {
        cat.classList.remove(
          "drop-bounce"
        );
      }, 380);

      gravityAnimationId = null;

      return;
    }

    petZone.style.transition =
      "none";

    petZone.style.left =
      `${currentX}px`;

    petZone.style.top =
      `${currentY}px`;

    petZone.style.bottom =
      "auto";

    gravityAnimationId =
      requestAnimationFrame(
        fall
      );
  }

  gravityAnimationId =
    requestAnimationFrame(
      fall
    );
}

/* =========================
   PETTING
========================= */

function petCat() {
  data.happiness =
    clamp(
      data.happiness + 5
    );

  cat.classList.add(
    "happy"
  );

  say("prrrr");
  showEffect("♥");

  gainXP(3);

  setTimeout(() => {
    cat.classList.remove(
      "happy"
    );
  }, 1200);

  updateUI();
}

/* =========================
   FOOD
========================= */

foodBowl.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const targetX =
      getObjectCenterX(
        foodBowl
      );

    /*
      Datang ke area dekat mangkuk.
    */

    walkToPoint(
      targetX,
      floorBottom() - 15,
      {
        callback: () => {
          clearCatStates();

          cat.classList.add(
            "eating"
          );

          say(
            "nom nom...",
            2200
          );

          let bites = 0;

          const interval =
            setInterval(() => {
              bites++;

              bowlFood.style.transform =
                bites % 2
                  ? "scale(.72)"
                  : "scale(1)";

              showEffect("♪");

              if (bites >= 4) {
                clearInterval(
                  interval
                );

                bowlFood.style.opacity =
                  ".25";

                bowlFood.style.transform =
                  "";

                data.hunger =
                  clamp(
                    data.hunger + 30
                  );

                data.happiness =
                  clamp(
                    data.happiness + 4
                  );

                gainXP(10);

                clearCatStates();
                updateUI();

                setTimeout(() => {
                  bowlFood.style.opacity =
                    "1";

                  busy = false;
                }, 400);
              }
            }, 420);
        }
      }
    );
  }
);

/* =========================
   BED
========================= */

bed.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const roomBox = roomRect();
    const bedBox =
      bed.getBoundingClientRect();

    const approachX =
      bedBox.right -
      roomBox.left -
      25;

    const approachY =
      floorBottom() - 10;

    walkToPoint(
      approachX,
      approachY,
      {
        callback: () => {
          clearCatStates();

          const sleepX =
            bedBox.left -
            roomBox.left +
            bedBox.width * 0.57;

          const sleepY =
            bedBox.top -
            roomBox.top -
            12;

          petZone.style.transition =
            "left .35s ease, top .35s ease";

          petZone.style.left =
            `${sleepX}px`;

          petZone.style.top =
            `${sleepY}px`;

          petZone.style.bottom =
            "auto";

          petZone.classList.add(
            "on-bed"
          );

          cat.style.scale =
            "1 1";

          cat.classList.add(
            "sleeping"
          );

          say(
            "zzz...",
            4500
          );

          showEffect("Z");

          setTimeout(() => {
            showEffect("z");
          }, 1200);

          setTimeout(() => {
            data.energy =
              clamp(
                data.energy + 38
              );

            data.hunger =
              clamp(
                data.hunger - 7
              );

            gainXP(8);

            clearCatStates();

            const exitX =
              bedBox.right -
              roomBox.left +
              40;

            setPetPixelPosition(
              exitX,
              floorBottom()
            );

            say("morning!");

            updateUI();

            busy = false;
          }, 4500);
        }
      }
    );
  }
);

/* =========================
   BATH
========================= */

bath.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const roomBox = roomRect();
    const bathBox =
      bath.getBoundingClientRect();

    const approachX =
      bathBox.left -
      roomBox.left -
      30;

    walkToPoint(
      approachX,
      floorBottom() - 10,
      {
        callback: () => {
          clearCatStates();

          const bathX =
            bathBox.left -
            roomBox.left +
            bathBox.width / 2;

          const bathY =
            bathBox.top -
            roomBox.top +
            8;

          petZone.style.transition =
            "left .3s ease, top .3s ease";

          petZone.style.left =
            `${bathX}px`;

          petZone.style.top =
            `${bathY}px`;

          petZone.style.bottom =
            "auto";

          cat.classList.add(
            "bathing"
          );

          bath.classList.add(
            "active"
          );

          say(
            "splash!",
            3000
          );

          showEffect("○");

          setTimeout(() => {
            showEffect("✦");
          }, 900);

          setTimeout(() => {
            data.cleanliness =
              clamp(
                data.cleanliness + 40
              );

            data.happiness =
              clamp(
                data.happiness + 4
              );

            gainXP(8);

            bath.classList.remove(
              "active"
            );

            clearCatStates();

            const exitX =
              bathBox.left -
              roomBox.left -
              40;

            setPetPixelPosition(
              exitX,
              floorBottom()
            );

            say("fresh!");

            updateUI();

            busy = false;
          }, 3000);
        }
      }
    );
  }
);

/* =========================
   BALL DRAG
========================= */

ball.addEventListener(
  "pointerdown",
  event => {
    if (
      busy ||
      ballAnimationId
    ) {
      return;
    }

    ballDragging = true;

    ball.setPointerCapture(
      event.pointerId
    );

    ballLastX =
      event.clientX;

    ballLastY =
      event.clientY;

    ballVX = 0;
    ballVY = 0;

    const rect =
      ball.getBoundingClientRect();

    ball.style.position =
      "fixed";

    ball.style.left =
      `${rect.left}px`;

    ball.style.top =
      `${rect.top}px`;

    ball.style.zIndex =
      "1000";
  }
);

ball.addEventListener(
  "pointermove",
  event => {
    if (!ballDragging) return;

    ballVX =
      event.clientX -
      ballLastX;

    ballVY =
      event.clientY -
      ballLastY;

    ballLastX =
      event.clientX;

    ballLastY =
      event.clientY;

    ball.style.left =
      `${event.clientX - 22}px`;

    ball.style.top =
      `${event.clientY - 22}px`;
  }
);

function endBallDrag(event) {
  if (!ballDragging) return;

  ballDragging = false;

  try {
    ball.releasePointerCapture(
      event.pointerId
    );
  } catch {}

  throwBall();
}

ball.addEventListener(
  "pointerup",
  endBallDrag
);

ball.addEventListener(
  "pointercancel",
  endBallDrag
);

/* =========================
   BALL PHYSICS
========================= */

function throwBall() {
  busy = true;

  let x =
    parseFloat(
      ball.style.left
    );

  let y =
    parseFloat(
      ball.style.top
    );

  let vx =
    ballVX * 1.45;

  let vy =
    ballVY * 1.45;

  if (
    Math.abs(vx) < 2 &&
    Math.abs(vy) < 2
  ) {
    vx = 5;
    vy = -6;
  }

  const gravity = 0.48;

  function physics() {
    const box = roomRect();

    const minX =
      box.left + 5;

    const maxX =
      box.right - 49;

    const minY =
      box.top + 5;

    const maxY =
      box.bottom - 49;

    x += vx;
    y += vy;

    vy += gravity;

    vx *= 0.986;

    if (
      x <= minX ||
      x >= maxX
    ) {
      vx *= -0.68;

      x = clamp(
        x,
        minX,
        maxX
      );
    }

    if (y >= maxY) {
      y = maxY;

      vy *= -0.5;

      vx *= 0.89;
    }

    if (y <= minY) {
      y = minY;
      vy *= -0.65;
    }

    ball.style.left =
      `${x}px`;

    ball.style.top =
      `${y}px`;

    ball.style.transform =
      `rotate(${x * 2.8}deg)`;

    const stopped =
      Math.abs(vx) < 0.28 &&
      Math.abs(vy) < 0.6 &&
      y >= maxY - 2;

    if (!stopped) {
      ballAnimationId =
        requestAnimationFrame(
          physics
        );
    } else {
      ballAnimationId = null;

      chaseBall(x + 22);
    }
  }

  physics();
}

/* =========================
   CHASE BALL
========================= */

function chaseBall(ballScreenX) {
  const box = roomRect();

  const x =
    ballScreenX -
    box.left;

  /*
    Bola berhenti di lantai.
    Kita clamp agar pet ngejar di area lantai.
  */

  const targetX = clamp(
    x,
    petWidth() / 2,
    room.clientWidth - petWidth() / 2
  );

  const targetY =
    floorBottom() - 5;

  say("BALL!!");

  walkToPoint(
    targetX,
    targetY,
    {
      run: true,

      callback: () => {
        cat.classList.add(
          "happy"
        );

        showEffect("★");

        data.happiness =
          clamp(
            data.happiness + 15
          );

        data.energy =
          clamp(
            data.energy - 8
          );

        data.hunger =
          clamp(
            data.hunger - 3
          );

        gainXP(12);

        updateUI();

        setTimeout(() => {
          cat.classList.remove(
            "happy"
          );

          resetBall();

          busy = false;
        }, 800);
      }
    }
  );
}

function resetBall() {
  if (ballAnimationId) {
    cancelAnimationFrame(
      ballAnimationId
    );

    ballAnimationId = null;
  }

  ball.style.position = "";
  ball.style.left = "";
  ball.style.top = "";
  ball.style.zIndex = "";
  ball.style.transform = "";
}

/* =========================
   XP
========================= */

function gainXP(amount) {
  data.xp += amount;

  while (data.xp >= 100) {
    data.xp -= 100;

    data.level++;

    data.coins += 50;

    setTimeout(() => {
      say("LEVEL UP!");
      showEffect("★");
    }, 200);
  }
}

/* =========================
   RENAME
========================= */

function renamePet() {
  const name =
    prompt(
      "Pet name:",
      data.name
    );

  if (!name) return;

  const clean =
    name
      .trim()
      .substring(0, 12);

  if (!clean) return;

  data.name = clean;

  updateUI();

  say("that's me!");
}

/* =========================
   RESET
========================= */

function resetPet() {
  const ok =
    confirm(
      "Reset all pet progress?"
    );

  if (!ok) return;

  data = {
    ...defaultData
  };

  clearCatStates();

  setPetPixelPosition(
    room.clientWidth / 2,
    floorBottom()
  );

  cat.style.scale = "1 1";

  resetBall();

  updateUI();

  say("new game!");
}

/* =========================
   IDLE BEHAVIOR
========================= */

function scheduleIdleBehaviour() {
  clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    if (
      busy ||
      catDragging ||
      ballDragging
    ) {
      scheduleIdleBehaviour();
      return;
    }

    if (data.hunger < 25) {
      say("hungry...");
      scheduleIdleBehaviour();
      return;
    }

    if (data.energy < 20) {
      cat.classList.add(
        "sitting"
      );

      say("sleepy...");

      setTimeout(() => {
        cat.classList.remove(
          "sitting"
        );
      }, 2500);

      scheduleIdleBehaviour();
      return;
    }

    const random =
      Math.random();

    if (random < 0.25) {
      cat.classList.add(
        "sitting"
      );

      say("mrrp");

      setTimeout(() => {
        cat.classList.remove(
          "sitting"
        );
      }, 2200);
    }

    else if (random < 0.65) {
      const randomX =
        room.clientWidth *
        (
          0.18 +
          Math.random() * 0.64
        );

      const randomY =
        floorTop() +
        Math.random() *
        (
          floorBottom() -
          floorTop()
        );

      if (
        !isBlockedPoint(
          randomX,
          randomY
        )
      ) {
        walkToPoint(
          randomX,
          randomY
        );
      }
    }

    else {
      const messages = [
        "meow~",
        "human?",
        "pet me",
        "...",
        "play?"
      ];

      say(
        messages[
          Math.floor(
            Math.random() *
            messages.length
          )
        ]
      );
    }

    scheduleIdleBehaviour();

  }, 7000 + Math.random() * 5000);
}

/* =========================
   STAT DECAY
========================= */

setInterval(() => {
  data.hunger =
    clamp(
      data.hunger - 1.5
    );

  data.happiness =
    clamp(
      data.happiness - 0.55
    );

  data.energy =
    clamp(
      data.energy - 0.75
    );

  data.cleanliness =
    clamp(
      data.cleanliness - 0.45
    );

  updateUI();

}, 60000);

/* =========================
   START
========================= */

updateUI();

requestAnimationFrame(() => {
  setPetPixelPosition(
    room.clientWidth / 2,
    floorBottom()
  );
});

scheduleIdleBehaviour();
