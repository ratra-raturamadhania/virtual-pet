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

/*
  PENTING:
  Semua posisi Y sekarang berdasarkan TITIK KAKI,
  bukan bagian atas kotak pet.
*/

function floorFarY() {
  return room.clientHeight * 0.68;
}

function floorNearY() {
  return room.clientHeight - 18;
}

/*
  feetY = lokasi telapak kaki.
*/

function setPetPosition(x, feetY, instant = true) {
  const halfWidth = petWidth() / 2;

  const safeX = clamp(
    x,
    halfWidth,
    room.clientWidth - halfWidth
  );

  const safeFeetY = clamp(
    feetY,
    floorFarY(),
    floorNearY()
  );

  const top =
    safeFeetY - petHeight();

  if (instant) {
    petZone.style.transition = "none";
  }

  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${top}px`;

  petZone.style.bottom =
    "auto";

  petZone.dataset.feetY =
    safeFeetY;

  updateDepth(safeFeetY);
}

function currentPetX() {
  const roomBox = getRoomRect();
  const petBox =
    petZone.getBoundingClientRect();

  return (
    petBox.left -
    roomBox.left +
    petBox.width / 2
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

  const roomBox = getRoomRect();
  const petBox =
    petZone.getBoundingClientRect();

  return (
    petBox.bottom -
    roomBox.top
  );
}

/* =========================
   DEPTH / PERSPECTIVE
========================= */

function updateDepth(feetY) {
  const range =
    floorNearY() -
    floorFarY();

  const progress =
    clamp(
      (feetY - floorFarY()) / range,
      0,
      1
    );

  /*
    belakang = 82%
    depan = 100%
  */

  const scale =
    0.82 + progress * 0.18;

  petZone.style.setProperty(
    "--depth-scale",
    scale
  );

  /*
    z-index juga berubah.
    Yang lebih depan muncul di atas.
  */

  petZone.style.zIndex =
    Math.round(
      30 + progress * 30
    );
}

/* =========================
   CAT STATE
========================= */

function clearCatStates() {
  cat.classList.remove(
    "carried",
    "walking",
    "running",
    "happy",
    "eating",
    "sleeping",
    "bathing",
    "sitting",
    "drop-bounce"
  );

  petZone.classList.remove(
    "is-carried",
    "on-bed"
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
  const bar =
    document.getElementById(
      name + "Bar"
    );

  const text =
    document.getElementById(
      name + "Text"
    );

  bar.style.width =
    value + "%";

  text.textContent =
    Math.round(value);

  if (value < 25) {
    bar.style.background =
      "#ca5f59";
  } else if (value < 50) {
    bar.style.background =
      "#d7a04f";
  } else {
    bar.style.background =
      "#77a870";
  }
}

function updateMood() {
  const eyes =
    document.querySelectorAll(".eye");

  const mouth =
    document.querySelector(".mouth");

  eyes.forEach(eye => {
    eye.style.height = "8px";
    eye.style.top = "24px";
  });

  mouth.style.borderTop = "0";
  mouth.style.borderBottom =
    "3px solid #4c302d";

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
   TEXT / EFFECT
========================= */

function say(text, duration = 1600) {
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
  effect.textContent =
    symbol;

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
          "translate(-50%,-20px) scale(1)"
      },
      {
        opacity: 0,
        transform:
          "translate(-50%,-65px) scale(1.2)"
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
   PATTERN
========================= */

function applyPattern(pattern) {
  validPatterns.forEach(name => {
    cat.classList.remove(name);

    if (portraitCat) {
      portraitCat.classList.remove(
        name
      );
    }
  });

  cat.classList.add(pattern);

  if (portraitCat) {
    portraitCat.classList.add(
      pattern
    );
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

        say("new look!");
        showEffect("♥");

        save();
      }
    );
  });

/* =========================
   DIRECTION
========================= */

function faceTowards(x) {
  if (x < currentPetX()) {
    cat.classList.add(
      "face-left"
    );
  } else {
    cat.classList.remove(
      "face-left"
    );
  }
}

/* =========================
   2D MOVEMENT
========================= */

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

  const safeFeetY = clamp(
    targetFeetY,
    floorFarY(),
    floorNearY()
  );

  faceTowards(safeX);

  cat.classList.add(
    run ? "running" : "walking"
  );

  const dx =
    safeX - currentPetX();

  const dy =
    safeFeetY -
    currentFeetY();

  const distance =
    Math.hypot(dx, dy);

  const duration = run
    ? clamp(
        distance * 1.15,
        200,
        600
      )
    : clamp(
        distance * 1.8,
        300,
        850
      );

  const targetTop =
    safeFeetY -
    petHeight();

  petZone.style.transition = `
    left ${duration}ms cubic-bezier(.22,.75,.25,1),
    top ${duration}ms cubic-bezier(.22,.75,.25,1),
    transform ${duration}ms ease
  `;

  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${targetTop}px`;

  petZone.style.bottom =
    "auto";

  petZone.dataset.feetY =
    safeFeetY;

  updateDepth(safeFeetY);

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

/* =========================
   CLICK FLOOR
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

    const box =
      getRoomRect();

    const x =
      event.clientX -
      box.left;

    const y =
      event.clientY -
      box.top;

    /*
      Tembok tidak bisa diinjak.
    */

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

/* =========================
   PICK UP
========================= */

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
      event.clientX -
      rect.left;

    catOffsetY =
      event.clientY -
      rect.top;

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

    const roomBox =
      getRoomRect();

    let x =
      event.clientX -
      roomBox.left -
      catOffsetX +
      petWidth() / 2;

    let y =
      event.clientY -
      roomBox.top -
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

    petZone.style.bottom =
      "auto";
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

  catPointerId = null;

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

/* =========================
   GRAVITY
========================= */

function dropCat() {
  if (gravityAnimationId) {
    cancelAnimationFrame(
      gravityAnimationId
    );
  }

  let velocity = 0;

  /*
    Saat dijatuhkan:
    x tetap.
    kaki harus berakhir di floorNearY().
  */

  const targetTop =
    floorNearY() -
    petHeight();

  function fall() {
    const roomBox =
      getRoomRect();

    const rect =
      petZone.getBoundingClientRect();

    let currentTop =
      rect.top -
      roomBox.top;

    velocity += 0.9;
    currentTop += velocity;

    if (
      currentTop >= targetTop
    ) {
      currentTop =
        targetTop;

      petZone.style.top =
        `${currentTop}px`;

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

      gravityAnimationId =
        null;

      return;
    }

    petZone.style.top =
      `${currentTop}px`;

    gravityAnimationId =
      requestAnimationFrame(
        fall
      );
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
      data.happiness + 5,
      0,
      100
    );

  cat.classList.add(
    "happy"
  );

  say("prrrrr");
  showEffect("♥");

  gainXP(3);

  setTimeout(() => {
    cat.classList.remove(
      "happy"
    );
  }, 1300);

  updateUI();
}

/* =========================
   FOOD
========================= */

foodBowl.addEventListener("click", event => {
  event.stopPropagation();

  if (busy) return;

  busy = true;

  const roomBox = getRoomRect();
  const bowlBox = foodBowl.getBoundingClientRect();

  const targetX =
    bowlBox.left -
    roomBox.left +
    bowlBox.width / 2;

  const targetY =
    floorNearY() - 5;

  movePetTo(
    targetX,
    targetY,
    {
      callback: () => {
        clearCatStates();

        petZone.classList.add("at-food");

        cat.classList.add("eating");

        say("nom nom...", 2200);

        let bites = 0;

        const eatingTimer =
          setInterval(() => {
            bites++;

            bowlFood.style.transform =
              bites % 2
                ? "scale(.65)"
                : "scale(1)";

            if (bites === 2) {
              bowlFood.style.opacity = ".6";
            }

            if (bites === 3) {
              bowlFood.style.opacity = ".35";
            }

            if (bites >= 4) {
              clearInterval(eatingTimer);

              bowlFood.style.opacity = ".15";

              bowlFood.style.transform = "";

              data.hunger = clamp(
                data.hunger + 30,
                0,
                100
              );

              data.happiness = clamp(
                data.happiness + 4,
                0,
                100
              );

              gainXP(10);

              cat.classList.remove("eating");

              petZone.classList.remove("at-food");

              updateUI();

              setTimeout(() => {
                bowlFood.style.opacity = "1";

                busy = false;
              }, 500);
            }
          }, 420);
      }
    }
  );
});

/* =========================
   BED
========================= */

bed.addEventListener("click", event => {
  event.stopPropagation();

  if (busy) return;

  busy = true;

  const roomBox = getRoomRect();
  const bedBox = bed.getBoundingClientRect();

  const approachX =
    bedBox.right -
    roomBox.left +
    35;

  movePetTo(
    approachX,
    floorNearY(),
    {
      callback: () => {
        clearCatStates();

        const sleepX =
          bedBox.left -
          roomBox.left +
          bedBox.width * 0.55;

        /*
          anchor kasur:
          pakai posisi atas kasur + offset tetap.
          Jangan berdasarkan tinggi sprite lagi.
        */
        const sleepTop =
          bedBox.top -
          roomBox.top -
          18;

        petZone.style.transition =
          "left .35s ease, top .35s ease";

        petZone.style.left =
          `${sleepX}px`;

        petZone.style.top =
          `${sleepTop}px`;

        petZone.style.bottom =
          "auto";

        petZone.classList.add("on-bed");

        cat.classList.add("sleeping");

        say("zzz...", 4500);

        showEffect("Z");

        setTimeout(() => {
          showEffect("z");
        }, 1200);

        setTimeout(() => {
          showEffect("Z");
        }, 2500);

        setTimeout(() => {
          data.energy = clamp(
            data.energy + 38,
            0,
            100
          );

          data.hunger = clamp(
            data.hunger - 7,
            0,
            100
          );

          gainXP(8);

          clearCatStates();

          const exitX =
            bedBox.right -
            roomBox.left +
            45;

          setPetPosition(
            exitX,
            floorNearY()
          );

          say("morning!");

          updateUI();

          busy = false;
        }, 4500);
      }
    }
  );
});

/* =========================
   BATH
========================= */

bath.addEventListener("click", event => {
  event.stopPropagation();

  if (busy) return;

  busy = true;

  const roomBox = getRoomRect();
  const bathBox = bath.getBoundingClientRect();

  const approachX =
    bathBox.left -
    roomBox.left -
    35;

  movePetTo(
    approachX,
    floorNearY(),
    {
      callback: () => {
        clearCatStates();

        const bathX =
          bathBox.left -
          roomBox.left +
          bathBox.width / 2;

        /*
          Posisi khusus supaya kepala masuk
          di dalam bak, bukan turun keluar frame.
        */
        const bathTop =
          bathBox.top -
          roomBox.top -
          45;

        petZone.style.transition =
          "left .3s ease, top .3s ease";

        petZone.style.left =
          `${bathX}px`;

        petZone.style.top =
          `${bathTop}px`;

        petZone.style.bottom =
          "auto";

        petZone.classList.add("in-bath");

        cat.classList.add("bathing");

        bath.classList.add("active");

        say("splash!", 3000);

        showEffect("○");

        setTimeout(() => {
          showEffect("○");
        }, 700);

        setTimeout(() => {
          showEffect("✦");
        }, 1400);

        setTimeout(() => {
          data.cleanliness = clamp(
            data.cleanliness + 40,
            0,
            100
          );

          data.happiness = clamp(
            data.happiness + 4,
            0,
            100
          );

          gainXP(8);

          bath.classList.remove("active");

          petZone.classList.remove("in-bath");

          clearCatStates();

          const exitX =
            bathBox.left -
            roomBox.left -
            45;

          setPetPosition(
            exitX,
            floorNearY()
          );

          say("fresh!");

          updateUI();

          busy = false;
        }, 3200);
      }
    }
  );
});

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

ball.addEventListener(
  "pointercancel",
  releaseBall
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
  const box =
    getRoomRect();

  const x =
    ballScreenX -
    box.left;

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

        data.hunger =
          clamp(
            data.hunger - 3,
            0,
            100
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
    floorNearY()
  );

  resetBall();

  updateUI();

  say("new game!");
}

/* =========================
   IDLE AI
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
      }, 2200);

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
      }, 2000);
    }

    else if (random < 0.7) {
      const x =
        room.clientWidth *
        (
          0.16 +
          Math.random() * 0.68
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

      movePetTo(x, y);
    }

    else {
      const texts = [
        "meow~",
        "human?",
        "pet me!",
        "...",
        "play?"
      ];

      say(
        texts[
          Math.floor(
            Math.random() *
            texts.length
          )
        ]
      );
    }

    scheduleIdleBehaviour();

  }, 6500 + Math.random() * 4500);
}

/* =========================
   DECAY
========================= */

setInterval(() => {
  data.hunger =
    clamp(
      data.hunger - 1.5,
      0,
      100
    );

  data.happiness =
    clamp(
      data.happiness - .55,
      0,
      100
    );

  data.energy =
    clamp(
      data.energy - .75,
      0,
      100
    );

  data.cleanliness =
    clamp(
      data.cleanliness - .45,
      0,
      100
    );

  updateUI();

}, 60000);

/* =========================
   START
========================= */

updateUI();

requestAnimationFrame(() => {
  setPetPosition(
    room.clientWidth / 2,
    floorNearY() - 40
  );
});

scheduleIdleBehaviour();
