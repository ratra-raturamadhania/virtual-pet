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
   BASIC HELPERS
========================= */

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roomRect() {
  return room.getBoundingClientRect();
}

function floorY() {
  const rect = roomRect();

  /*
    Floor starts at ~65% room height.
    Pet stands slightly above the room bottom
    because its own height occupies the space.
  */

  return rect.height - 150;
}

function petWidth() {
  return petZone.offsetWidth;
}

function petHeight() {
  return petZone.offsetHeight;
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
    0,
    floorY()
  );

  petZone.style.left = `${safeX}px`;
  petZone.style.top = `${safeY}px`;
  petZone.style.bottom = "auto";
  petZone.style.transform = "translateX(-50%)";
}

function getPetLocalX() {
  const rect = petZone.getBoundingClientRect();
  const roomBox = roomRect();

  return (
    rect.left -
    roomBox.left +
    rect.width / 2
  );
}

function setPetOnGroundAtX(x) {
  setPetPixelPosition(
    x,
    floorY()
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
   MOOD
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
          "translate(-50%, 5px) scale(.7)"
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
    portraitCat.classList.remove(name);
  });

  cat.classList.add(pattern);
  portraitCat.classList.add(pattern);

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
   WALK / RUN
========================= */

function movePetToX(
  targetX,
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

  faceTowards(safeX);

  cat.classList.add(
    run ? "running" : "walking"
  );

  const currentX = getPetLocalX();

  const distance =
    Math.abs(safeX - currentX);

  const duration = run
    ? clamp(distance * 1.35, 220, 650)
    : clamp(distance * 2.2, 320, 900);

  petZone.style.transition =
    `left ${duration}ms cubic-bezier(.22,.75,.25,1)`;

  petZone.style.top =
    `${floorY()}px`;

  petZone.style.bottom =
    "auto";

  petZone.style.left =
    `${safeX}px`;

  setTimeout(() => {
    cat.classList.remove(
      "running",
      "walking"
    );

    if (callback) callback();
  }, duration);
}

/* =========================
   COLLISION / WALKABLE FLOOR
========================= */

function getBlockingRects() {
  const roomBox = roomRect();

  return [
    bed,
    foodBowl,
    bath
  ].map(element => {
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
      x > rect.left - 20 &&
      x < rect.right + 20 &&
      y > rect.top - 30 &&
      y < rect.bottom + 20
    );
  });
}

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

    cat.classList.add("carried");
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

    desiredDragY = clamp(
      desiredDragY,
      0,
      floorY()
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

  setPetPixelPosition(
    desiredDragX,
    desiredDragY
  );
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
    const rect =
      petZone.getBoundingClientRect();

    const roomBox = roomRect();

    let localX =
      rect.left -
      roomBox.left +
      rect.width / 2;

    let localY =
      rect.top -
      roomBox.top;

    velocityY += 1.1;

    localY += velocityY;

    const ground =
      floorY();

    if (localY >= ground) {
      localY = ground;

      setPetPixelPosition(
        localX,
        localY
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

    setPetPixelPosition(
      localX,
      localY
    );

    gravityAnimationId =
      requestAnimationFrame(fall);
  }

  gravityAnimationId =
    requestAnimationFrame(fall);
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
   CLICK FLOOR TO WALK
========================= */

room.addEventListener(
  "click",
  event => {
    if (
      busy ||
      catDragging ||
      ballDragging
    ) {
      return;
    }

    if (
      event.target.closest(
        ".furniture"
      ) ||
      event.target.closest(
        "#pixelCat"
      ) ||
      event.target.closest(
        "#ball"
      )
    ) {
      return;
    }

    const rect = roomRect();

    const x =
      event.clientX -
      rect.left;

    const y =
      event.clientY -
      rect.top;

    /*
      Only floor area is walkable.
    */

    if (y < rect.height * 0.61) {
      say("can't go there!");
      return;
    }

    if (isBlockedPoint(x, y)) {
      say("something's there!");
      return;
    }

    movePetToX(x);
  }
);

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
      getObjectCenterX(foodBowl);

    movePetToX(
      targetX,
      {
        callback: () => {
          clearCatStates();

          cat.classList.add(
            "eating"
          );

          say("nom nom...", 2200);

          let bites = 0;

          const interval =
            setInterval(() => {
              bites++;

              bowlFood.style.transform =
                bites % 2
                  ? "scale(.72)"
                  : "scale(1)";

              if (bites >= 4) {
                clearInterval(interval);

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

                  movePetToX(
                    room.clientWidth / 2,
                    {
                      callback: () => {
                        busy = false;
                      }
                    }
                  );
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

    /*
      Walk to front edge first.
    */

    const approachX =
      bedBox.right -
      roomBox.left -
      35;

    movePetToX(
      approachX,
      {
        callback: () => {
          clearCatStates();

          /*
            Then snap smoothly onto mattress.
          */

          const sleepX =
            bedBox.left -
            roomBox.left +
            bedBox.width * 0.58;

          const sleepY =
            bedBox.top -
            roomBox.top -
            18;

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

          say("zzz...", 4500);

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

            say("morning!");

            updateUI();

            setPetOnGroundAtX(
              bedBox.right -
              roomBox.left +
              40
            );

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
      35;

    movePetToX(
      approachX,
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
            5;

          petZone.style.transition =
            "left .32s ease, top .32s ease";

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

          say("splash!", 3000);

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

            say("fresh!");

            updateUI();

            setPetOnGroundAtX(
              bathBox.left -
              roomBox.left -
              45
            );

            busy = false;
          }, 3000);
        }
      }
    );
  }
);

/* =========================
   BALL
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
    parseFloat(ball.style.left);

  let y =
    parseFloat(ball.style.top);

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

  const gravity = 0.5;

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
   CHASE
========================= */

function chaseBall(ballScreenX) {
  const box = roomRect();

  const x =
    ballScreenX -
    box.left;

  say("BALL!!");

  movePetToX(
    x,
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

  setPetOnGroundAtX(
    room.clientWidth / 2
  );

  cat.style.scale = "1 1";

  resetBall();

  updateUI();

  say("new game!");
}

/* =========================
   IDLE BEHAVIOUR
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

    const random =
      Math.random();

    if (data.energy < 20) {
      cat.classList.add(
        "sitting"
      );

      say("sleepy...");
    }

    else if (data.hunger < 25) {
      say("hungry...");
    }

    else if (random < 0.25) {
      cat.classList.add(
        "sitting"
      );

      say("mrrp");
    }

    else if (random < 0.55) {
      const targetX =
        room.clientWidth *
        (
          0.25 +
          Math.random() * 0.5
        );

      movePetToX(targetX);
    }

    else {
      say(
        [
          "meow~",
          "human?",
          "pet me",
          "...",
          "play?"
        ][
          Math.floor(
            Math.random() * 5
          )
        ]
      );
    }

    scheduleIdleBehaviour();

  }, 7000 + Math.random() * 5000);
}

/* =========================
   DECAY
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
  setPetOnGroundAtX(
    room.clientWidth / 2
  );
});

scheduleIdleBehaviour();
