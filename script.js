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

const room = document.getElementById("room");
const petZone = document.getElementById("petZone");
const cat = document.getElementById("pixelCat");
const portraitCat = document.getElementById("portraitCat");

const speech = document.getElementById("speech");
const effect = document.getElementById("floatingEffect");

const bed = document.getElementById("bed");
const foodBowl = document.getElementById("foodBowl");
const bowlFood = document.getElementById("bowlFood");
const bath = document.getElementById("bath");
const ball = document.getElementById("ball");

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

function save() {
  localStorage.setItem(
    "pixelPetData",
    JSON.stringify(data)
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
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

function floorFarY() {
  return room.clientHeight * 0.68;
}

function floorNearY() {
  return room.clientHeight - 18;
}

function currentPetX() {
  const r = petZone.getBoundingClientRect();
  const roomR = getRoomRect();

  return (
    r.left -
    roomR.left +
    r.width / 2
  );
}

function currentFeetY() {
  const stored =
    parseFloat(
      petZone.dataset.feetY
    );

  if (!Number.isNaN(stored)) {
    return stored;
  }

  const r =
    petZone.getBoundingClientRect();

  const roomR =
    getRoomRect();

  return (
    r.bottom -
    roomR.top
  );
}

function updateDepth(feetY) {
  const range =
    floorNearY() -
    floorFarY();

  const progress =
    clamp(
      (feetY - floorFarY()) /
      range,
      0,
      1
    );

  const scale =
    .82 + progress * .18;

  petZone.style.setProperty(
    "--depth-scale",
    scale
  );

  petZone.style.zIndex =
    Math.round(
      30 + progress * 30
    );
}

function setPetPosition(
  x,
  feetY,
  instant = true
) {
  const safeX = clamp(
    x,
    petWidth() / 2,
    room.clientWidth -
      petWidth() / 2
  );

  const safeY = clamp(
    feetY,
    floorFarY(),
    floorNearY()
  );

  const top =
    safeY - petHeight();

  if (instant) {
    petZone.style.transition =
      "none";
  }

  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${top}px`;

  petZone.style.bottom =
    "auto";

  petZone.dataset.feetY =
    safeY;

  updateDepth(safeY);
}

function clearCatStates() {
  cat.classList.remove(
    "carried",
    "walking",
    "running",
    "happy",
    "eating",
    "sleeping",
    "bathing",
    "drop-bounce"
  );

  petZone.classList.remove(
    "is-carried",
    "on-bed"
  );
}

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

  save();
}

function setStat(name, value) {
  document.getElementById(
    name + "Bar"
  ).style.width =
    value + "%";

  document.getElementById(
    name + "Text"
  ).textContent =
    Math.round(value);
}

function say(
  text,
  duration = 1500
) {
  speech.textContent = text;

  speech.classList.remove(
    "hidden"
  );

  clearTimeout(
    window.speechTimer
  );

  window.speechTimer =
    setTimeout(() => {
      speech.classList.add(
        "hidden"
      );
    }, duration);
}

function showEffect(symbol) {
  effect.textContent = symbol;

  effect.animate(
    [
      {
        opacity: 0,
        transform:
          "translate(-50%,0) scale(.6)"
      },
      {
        opacity: 1,
        transform:
          "translate(-50%,-18px) scale(1)"
      },
      {
        opacity: 0,
        transform:
          "translate(-50%,-65px) scale(1.2)"
      }
    ],
    {
      duration: 900
    }
  );

  setTimeout(() => {
    effect.textContent = "";
  }, 900);
}

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
    button.addEventListener(
      "click",
      () => {
        data.pattern =
          button.dataset.pattern;

        applyPattern(data.pattern);

        save();

        say("new look!");
      }
    );
  });

function movePetTo(
  targetX,
  targetFeetY,
  {
    run = false,
    callback = null
  } = {}
) {
  clearCatStates();

  const safeX = clamp(
    targetX,
    petWidth() / 2,
    room.clientWidth -
      petWidth() / 2
  );

  const safeY = clamp(
    targetFeetY,
    floorFarY(),
    floorNearY()
  );

  cat.classList.add(
    run
      ? "running"
      : "walking"
  );

  const dx =
    safeX - currentPetX();

  const dy =
    safeY - currentFeetY();

  const distance =
    Math.hypot(
      dx,
      dy
    );

  const duration = run
    ? clamp(
        distance * 1.2,
        220,
        650
      )
    : clamp(
        distance * 2,
        350,
        950
      );

  const top =
    safeY - petHeight();

  petZone.style.transition = `
    left ${duration}ms cubic-bezier(.22,.7,.25,1),
    top ${duration}ms cubic-bezier(.22,.7,.25,1),
    transform ${duration}ms ease
  `;

  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${top}px`;

  petZone.dataset.feetY =
    safeY;

  updateDepth(safeY);

  setTimeout(() => {
    cat.classList.remove(
      "walking",
      "running"
    );

    if (callback) {
      callback();
    }
  }, duration);
}

/* CLICK FLOOR */

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
      event.target.closest(".furniture") ||
      event.target.closest("#pixelCat") ||
      event.target.closest("#ball")
    ) {
      return;
    }

    const roomR =
      getRoomRect();

    const x =
      event.clientX -
      roomR.left;

    const y =
      event.clientY -
      roomR.top;

    if (y < floorFarY()) {
      say("that's the wall!");
      return;
    }

    movePetTo(
      x,
      y
    );
  }
);

/* DRAG PET */

cat.addEventListener(
  "pointerdown",
  event => {
    if (busy) return;

    catDragging = true;
    dragMoved = false;

    catPointerId =
      event.pointerId;

    cat.setPointerCapture(
      event.pointerId
    );

    const rect =
      petZone.getBoundingClientRect();

    catOffsetX =
      event.clientX - rect.left;

    catOffsetY =
      event.clientY - rect.top;

    clearCatStates();

    cat.classList.add(
      "carried"
    );

    say("mrrp?");
  }
);

cat.addEventListener(
  "pointermove",
  event => {
    if (!catDragging) return;

    dragMoved = true;

    const roomR =
      getRoomRect();

    let x =
      event.clientX -
      roomR.left -
      catOffsetX +
      petWidth() / 2;

    let y =
      event.clientY -
      roomR.top -
      catOffsetY;

    x = clamp(
      x,
      petWidth() / 2,
      room.clientWidth -
        petWidth() / 2
    );

    y = clamp(
      y,
      0,
      floorNearY() -
        petHeight()
    );

    petZone.style.transition =
      "none";

    petZone.style.left =
      `${x}px`;

    petZone.style.top =
      `${y}px`;
  }
);

function releaseCat(event) {
  if (!catDragging) return;

  catDragging = false;

  try {
    cat.releasePointerCapture(
      catPointerId
    );
  } catch {}

  cat.classList.remove(
    "carried"
  );

  if (!dragMoved) {
    data.happiness =
      clamp(
        data.happiness + 5,
        0,
        100
      );

    cat.classList.add(
      "happy"
    );

    say("prrr");
    showEffect("♥");

    setTimeout(() => {
      cat.classList.remove(
        "happy"
      );
    }, 1200);

    updateUI();

    return;
  }

  dropCat();
}

cat.addEventListener(
  "pointerup",
  releaseCat
);

cat.addEventListener(
  "pointercancel",
  releaseCat
);

function dropCat() {
  let velocity = 0;

  const targetTop =
    floorNearY() -
    petHeight();

  function fall() {
    const roomR =
      getRoomRect();

    const rect =
      petZone.getBoundingClientRect();

    let top =
      rect.top -
      roomR.top;

    velocity += .9;
    top += velocity;

    if (top >= targetTop) {
      top =
        targetTop;

      petZone.style.top =
        `${top}px`;

      petZone.dataset.feetY =
        floorNearY();

      updateDepth(
        floorNearY()
      );

      cat.classList.add(
        "drop-bounce"
      );

      setTimeout(() => {
        cat.classList.remove(
          "drop-bounce"
        );
      }, 350);

      return;
    }

    petZone.style.top =
      `${top}px`;

    requestAnimationFrame(
      fall
    );
  }

  requestAnimationFrame(
    fall
  );
}

/* FOOD */

foodBowl.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const roomR =
      getRoomRect();

    const bowlR =
      foodBowl.getBoundingClientRect();

    const x =
      bowlR.left -
      roomR.left +
      bowlR.width / 2;

    movePetTo(
      x,
      floorNearY() - 5,
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

          const timer =
            setInterval(() => {
              bites++;

              bowlFood.style.transform =
                bites % 2
                  ? "scale(.7)"
                  : "scale(1)";

              if (bites >= 4) {
                clearInterval(
                  timer
                );

                bowlFood.style.opacity =
                  ".25";

                bowlFood.style.transform =
                  "";

                data.hunger =
                  clamp(
                    data.hunger + 30,
                    0,
                    100
                  );

                clearCatStates();

                updateUI();

                setTimeout(() => {
                  bowlFood.style.opacity =
                    "1";

                  busy = false;
                }, 400);
              }
            }, 400);
        }
      }
    );
  }
);

/* BED */

bed.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const roomR =
      getRoomRect();

    const bedR =
      bed.getBoundingClientRect();

    const approachX =
      bedR.right -
      roomR.left +
      35;

    movePetTo(
      approachX,
      floorNearY(),
      {
        callback: () => {
          clearCatStates();

          const sleepX =
            bedR.left -
            roomR.left +
            bedR.width * .55;

          const sleepTop =
            bedR.top -
            roomR.top -
            18;

          petZone.style.transition =
            "left .35s ease, top .35s ease";

          petZone.style.left =
            `${sleepX}px`;

          petZone.style.top =
            `${sleepTop}px`;

          petZone.style.zIndex =
            "18";

          petZone.classList.add(
            "on-bed"
          );

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
                data.energy + 38,
                0,
                100
              );

            data.hunger =
              clamp(
                data.hunger - 7,
                0,
                100
              );

            clearCatStates();

            setPetPosition(
              bedR.right -
              roomR.left +
              45,
              floorNearY()
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

/* BATH */

bath.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    const roomR =
      getRoomRect();

    const bathR =
      bath.getBoundingClientRect();

    movePetTo(
      bathR.left -
      roomR.left -
      35,
      floorNearY(),
      {
        callback: () => {
          clearCatStates();

          const x =
            bathR.left -
            roomR.left +
            bathR.width / 2;

          const top =
            bathR.top -
            roomR.top -
            45;

          petZone.style.transition =
            "left .3s ease, top .3s ease";

          petZone.style.left =
            `${x}px`;

          petZone.style.top =
            `${top}px`;

          cat.classList.add(
            "bathing"
          );

          bath.classList.add(
            "active"
          );

          say("splash!");

          setTimeout(() => {
            data.cleanliness =
              clamp(
                data.cleanliness + 40,
                0,
                100
              );

            bath.classList.remove(
              "active"
            );

            clearCatStates();

            setPetPosition(
              bathR.left -
              roomR.left -
              45,
              floorNearY()
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

/* BALL */

ball.addEventListener(
  "pointerdown",
  event => {
    if (busy) return;

    ballDragging = true;

    ballPointerId =
      event.pointerId;

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

function releaseBall(event) {
  if (!ballDragging) return;

  ballDragging = false;

  try {
    ball.releasePointerCapture(
      ballPointerId
    );
  } catch {}

  throwBall();
}

ball.addEventListener(
  "pointerup",
  releaseBall
);

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

  const gravity = .48;

  function physics() {
    const box =
      getRoomRect();

    const minX =
      box.left + 4;

    const maxX =
      box.right - 48;

    const minY =
      box.top + 4;

    const maxY =
      box.bottom - 48;

    x += vx;
    y += vy;

    vy += gravity;
    vx *= .986;

    if (
      x <= minX ||
      x >= maxX
    ) {
      vx *= -.68;

      x = clamp(
        x,
        minX,
        maxX
      );
    }

    if (y >= maxY) {
      y = maxY;

      vy *= -.5;
      vx *= .89;
    }

    ball.style.left =
      `${x}px`;

    ball.style.top =
      `${y}px`;

    ball.style.transform =
      `rotate(${x * 2.8}deg)`;

    const stopped =
      Math.abs(vx) < .28 &&
      Math.abs(vy) < .6 &&
      y >= maxY - 2;

    if (!stopped) {
      requestAnimationFrame(
        physics
      );
    } else {
      chaseBall(
        x + 22
      );
    }
  }

  physics();
}

function chaseBall(screenX) {
  const roomR =
    getRoomRect();

  const x =
    screenX -
    roomR.left;

  say("BALL!!");

  movePetTo(
    x,
    floorNearY() - 5,
    {
      run: true,

      callback: () => {
        cat.classList.add(
          "happy"
        );

        showEffect("★");

        data.happiness =
          clamp(
            data.happiness + 15,
            0,
            100
          );

        data.energy =
          clamp(
            data.energy - 8,
            0,
            100
          );

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
  ball.style.position = "";
  ball.style.left = "";
  ball.style.top = "";
  ball.style.zIndex = "";
  ball.style.transform = "";
}

function renamePet() {
  const name =
    prompt(
      "Pet name:",
      data.name
    );

  if (!name) return;

  data.name =
    name
      .trim()
      .substring(0, 12);

  updateUI();
}

function resetPet() {
  if (
    !confirm(
      "Reset all pet progress?"
    )
  ) {
    return;
  }

  data = {
    ...defaultData
  };

  clearCatStates();

  setPetPosition(
    room.clientWidth / 2,
    floorNearY() - 20
  );

  resetBall();

  updateUI();
}

function scheduleIdleBehaviour() {
  clearTimeout(
    idleTimer
  );

  idleTimer =
    setTimeout(() => {
      if (
        busy ||
        catDragging ||
        ballDragging
      ) {
        scheduleIdleBehaviour();
        return;
      }

      if (
        Math.random() < .6
      ) {
        const x =
          room.clientWidth *
          (
            .18 +
            Math.random() * .64
          );

        const y =
          floorFarY() +
          15 +
          Math.random() *
          (
            floorNearY() -
            floorFarY() -
            25
          );

        movePetTo(
          x,
          y
        );
      } else {
        say(
          [
            "meow~",
            "mrrp",
            "play?",
            "human?"
          ][
            Math.floor(
              Math.random() * 4
            )
          ]
        );
      }

      scheduleIdleBehaviour();

    }, 7000 + Math.random() * 5000);
}

setInterval(() => {
  data.hunger =
    clamp(
      data.hunger - 1.5,
      0,
      100
    );

  data.energy =
    clamp(
      data.energy - .7,
      0,
      100
    );

  data.cleanliness =
    clamp(
      data.cleanliness - .4,
      0,
      100
    );

  updateUI();

}, 60000);

updateUI();

requestAnimationFrame(() => {
  setPetPosition(
    room.clientWidth / 2,
    floorNearY() - 30
  );
});

scheduleIdleBehaviour();
