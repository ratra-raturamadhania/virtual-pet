/* =========================================================
   PIXEL PET - STABLE SCRIPT
   - smooth movement
   - stable sleep position
   - stable bath position
   - food placement fixed
   - drag/drop keeps floor depth
   - prevents movement timers fighting each other
========================================================= */


/* =========================
   DATA
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

let idleTimer = null;

let movementTimer = null;
let movementToken = 0;


/* =========================
   BASIC HELPERS
========================= */

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


/* =========================
   FLOOR SYSTEM
========================= */

/*
  titik lantai paling belakang
*/
function floorFarY() {
  return room.clientHeight * 0.68;
}


/*
  titik lantai paling depan
*/
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


function currentLogicalTop() {
  const inlineTop =
    parseFloat(petZone.style.top);

  if (!Number.isNaN(inlineTop)) {
    return inlineTop;
  }

  const rect =
    petZone.getBoundingClientRect();

  const roomR =
    getRoomRect();

  return (
    rect.top -
    roomR.top
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

  return (
    currentLogicalTop() +
    petHeight()
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

  /*
    belakang lebih kecil
    depan lebih besar
  */
  const scale =
    0.82 +
    progress * 0.18;

  petZone.style.setProperty(
    "--depth-scale",
    scale
  );

  petZone.style.zIndex =
    Math.round(
      30 +
      progress * 25
    );
}


/* =========================
   NORMAL PET POSITION
========================= */

function setPetPosition(
  x,
  feetY,
  instant = true
) {

  const safeX =
    clamp(
      x,
      petWidth() / 2,
      room.clientWidth -
      petWidth() / 2
    );

  const safeY =
    clamp(
      feetY,
      floorFarY(),
      floorNearY()
    );

  const top =
    safeY -
    petHeight();

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


/* =========================
   SPECIAL POSITION
   bed / bath
========================= */

function setSpecialPosition(
  x,
  top,
  {
    scale = 1,
    zIndex = 30
  } = {}
) {

  petZone.style.left =
    `${x}px`;

  petZone.style.top =
    `${top}px`;

  petZone.style.bottom =
    "auto";

  petZone.style.setProperty(
    "--depth-scale",
    scale
  );

  petZone.style.zIndex =
    zIndex;
}


/* =========================
   STATE CONTROL
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
    "blink",
    "ear-twitch",
    "curious",
    "drop-bounce"
  );

  petZone.classList.remove(
    "is-carried",
    "on-bed",
    "in-bath",
    "at-food"
  );
}


/* =========================
   UI
========================= */

function updateUI() {

  document.getElementById(
    "petName"
  ).textContent =
    data.name;

  document.getElementById(
    "level"
  ).textContent =
    data.level;

  document.getElementById(
    "xp"
  ).textContent =
    data.xp;

  document.getElementById(
    "coins"
  ).textContent =
    data.coins;

  setStat(
    "hunger",
    data.hunger
  );

  setStat(
    "happy",
    data.happiness
  );

  setStat(
    "energy",
    data.energy
  );

  setStat(
    "clean",
    data.cleanliness
  );

  applyPattern(
    data.pattern
  );

  save();
}


function setStat(
  name,
  value
) {

  value =
    clamp(
      value,
      0,
      100
    );

  document.getElementById(
    name + "Bar"
  ).style.width =
    value + "%";

  document.getElementById(
    name + "Text"
  ).textContent =
    Math.round(value);
}


/* =========================
   SPEECH
========================= */

function say(
  text,
  duration = 1500
) {

  speech.textContent =
    text;

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


/* =========================
   EFFECT
========================= */

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
          "translate(-50%,-18px) scale(1)"
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

  validPatterns.forEach(
    name => {

      cat.classList.remove(
        name
      );

      if (portraitCat) {
        portraitCat.classList.remove(
          name
        );
      }
    }
  );

  cat.classList.add(
    pattern
  );

  if (portraitCat) {
    portraitCat.classList.add(
      pattern
    );
  }

  document
    .querySelectorAll(
      "[data-pattern]"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active-pattern",
          button.dataset.pattern ===
            pattern
        );

      }
    );
}


document
  .querySelectorAll(
    "[data-pattern]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          data.pattern =
            button.dataset.pattern;

          applyPattern(
           data.pattern
         );
         
         updateCatExpression();
         
         save();

          say("new look!");

        }
      );

    }
  );


/* =========================
   WALK / RUN
========================= */

function movePetTo(
  targetX,
  targetFeetY,
  {
    run = false,
    callback = null
  } = {}
) {

  cancelMovement();
  clearCatStates();

  const myToken =
    movementToken;

  const safeX =
    clamp(
      targetX,
      petWidth() / 2,
      room.clientWidth -
      petWidth() / 2
    );

  const safeY =
    clamp(
      targetFeetY,
      floorFarY(),
      floorNearY()
    );

  const dx =
    safeX -
    currentPetX();

  const dy =
    safeY -
    currentFeetY();

  const distance =
    Math.hypot(
      dx,
      dy
    );

  /*
    kalau jaraknya sangat pendek,
    langsung taruh saja.
  */
  if (distance < 5) {

    setPetPosition(
      safeX,
      safeY
    );

    if (callback) {
      callback();
    }

    return;
  }


  cat.classList.add(
    run
      ? "running"
      : "walking"
  );


  const duration =
    run
      ? clamp(
          distance * 1.25,
          220,
          650
        )
      : clamp(
          distance * 2.1,
          380,
          1050
        );


  const targetTop =
    safeY -
    petHeight();


  petZone.style.transition = `
    left ${duration}ms cubic-bezier(.22,.72,.24,1),
    top ${duration}ms cubic-bezier(.22,.72,.24,1),
    transform ${duration}ms ease
  `;


  petZone.style.left =
    `${safeX}px`;

  petZone.style.top =
    `${targetTop}px`;

  petZone.dataset.feetY =
    safeY;

  updateDepth(
    safeY
  );


  movementTimer =
    setTimeout(() => {

      /*
        kalau gerakan lama sudah dibatalkan,
        callback jangan dijalankan.
      */
      if (
        myToken !==
        movementToken
      ) {
        return;
      }


      cat.classList.remove(
        "walking",
        "running"
      );


      movementTimer =
        null;


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


    const roomR =
      getRoomRect();


    const x =
      event.clientX -
      roomR.left;


    const y =
      event.clientY -
      roomR.top;


    /*
      tidak bisa jalan di dinding
    */
    if (
      y <
      floorFarY()
    ) {

      say(
        "that's the wall!"
      );

      return;
    }


    movePetTo(
      x,
      y
    );

  }
);


/* =========================
   PET / DRAG
========================= */

cat.addEventListener(
  "pointerdown",
  event => {

    if (busy) return;


    cancelMovement();


    catDragging =
      true;

    dragMoved =
      false;


    catPointerId =
      event.pointerId;


    cat.setPointerCapture(
      event.pointerId
    );


    const rect =
      petZone
        .getBoundingClientRect();


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

    if (!catDragging) {
      return;
    }


    dragMoved =
      true;


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


    x =
      clamp(
        x,
        petWidth() / 2,
        room.clientWidth -
          petWidth() / 2
      );


    /*
      boleh diangkat ke dinding,
      tapi tidak boleh keluar room.
    */
    y =
      clamp(
        y,
        -20,
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


function releaseCat() {

  if (!catDragging) {
    return;
  }


  catDragging =
    false;


  try {

    cat.releasePointerCapture(
      catPointerId
    );

  } catch {}


  cat.classList.remove(
    "carried"
  );


  petZone.classList.remove(
    "is-carried"
  );


  /*
    kalau cuma tap,
    dianggap dielus.
  */
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


    say("prrr~");


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


/* =========================
   GRAVITY / DROP
========================= */

function dropCat() {

  cancelMovement();


  let top =
    currentLogicalTop();


  /*
    kaki berdasarkan posisi saat dilepas
  */
  let releaseFeet =
    top +
    petHeight();


  /*
    kalau dilepas di area dinding,
    jatuh ke batas lantai belakang.

    kalau dilepas di lantai,
    depth-nya dipertahankan.
  */
  const targetFeet =
    releaseFeet <
      floorFarY()
      ? floorFarY()
      : clamp(
          releaseFeet,
          floorFarY(),
          floorNearY()
        );


  const targetTop =
    targetFeet -
    petHeight();


  /*
    kalau sudah menyentuh lantai,
    tidak perlu jatuh jauh.
  */
  if (
    top >=
    targetTop
  ) {

    setPetPosition(
      currentPetX(),
      targetFeet
    );

    return;
  }


  let velocity =
    0;


  function fall() {

    velocity +=
      0.85;


    top +=
      velocity;


    if (
      top >=
      targetTop
    ) {

      top =
        targetTop;


      petZone.style.top =
        `${top}px`;


      petZone.dataset.feetY =
        targetFeet;


      updateDepth(
        targetFeet
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


    const liveFeet =
      clamp(
        top +
          petHeight(),
        floorFarY(),
        floorNearY()
      );


    updateDepth(
      liveFeet
    );


    requestAnimationFrame(
      fall
    );
  }


  requestAnimationFrame(
    fall
  );
}


/* =========================
   FOOD
========================= */

foodBowl.addEventListener(
  "click",
  event => {

    event.stopPropagation();


    if (busy) {
      return;
    }


    busy =
      true;


    cancelMovement();


    const roomR =
      getRoomRect();


    const bowlR =
      foodBowl
        .getBoundingClientRect();


    /*
      bukan di ATAS mangkuk.
      Kucing berdiri di sebelah kanan.
    */
    const eatX =
      bowlR.right -
      roomR.left +
      48;


    const eatY =
      floorNearY() -
      8;


    movePetTo(
      eatX,
      eatY,
      {

        callback: () => {

          clearCatStates();


          petZone.classList.add(
            "at-food"
          );


          cat.classList.add(
            "eating"
          );


          say(
            "nom nom...",
            2400
          );


          let bites =
            0;


          const timer =
            setInterval(() => {

              bites++;


              bowlFood.style.transform =
                bites % 2
                  ? "scale(.72)"
                  : "scale(1)";


              if (
                bites >=
                5
              ) {

                clearInterval(
                  timer
                );


                bowlFood.style.opacity =
                  ".3";


                bowlFood.style.transform =
                  "";


                data.hunger =
                  clamp(
                    data.hunger + 30,
                    0,
                    100
                  );


                data.happiness =
                  clamp(
                    data.happiness + 3,
                    0,
                    100
                  );


                clearCatStates();


                updateUI();


                setTimeout(() => {

                  bowlFood.style.opacity =
                    "1";


                  busy =
                    false;

                }, 350);
              }

            }, 360);

        }

      }
    );

  }
);


/* =========================
   BED / SLEEP
========================= */

bed.addEventListener(
  "click",
  event => {

    event.stopPropagation();


    if (busy) {
      return;
    }


    busy =
      true;


    cancelMovement();


    const roomR =
      getRoomRect();


    const bedR =
      bed
        .getBoundingClientRect();


    /*
      jalan ke samping kasur dulu
    */
    const approachX =
      bedR.right -
      roomR.left +
      42;


    movePetTo(
      approachX,
      floorNearY() - 8,
      {

        callback: () => {

          clearCatStates();


          /*
            KUNCI POSISI TIDUR

            Kasur tetap di tempatnya.
            Pose tidur juga tidak diubah.

            Yang kita pindah hanya
            petZone supaya sprite berada
            tepat di atas mattress.
          */

          const sleepX =
            bedR.left -
            roomR.left +
            bedR.width * 0.58;


          const sleepTop =
            bedR.top -
            roomR.top -
            62;


          petZone.style.transition =
            "left .38s ease, top .38s ease, transform .38s ease";


          petZone.classList.add(
            "on-bed"
          );


          cat.classList.add(
            "sleeping"
          );


          setSpecialPosition(
            sleepX,
            sleepTop,
            {
              scale: 0.90,
              zIndex: 18
            }
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


            /*
              bangun di samping kasur
            */
            setPetPosition(
              bedR.right -
                roomR.left +
                45,
              floorNearY() -
                8
            );


            say("morning!");


            updateUI();


            busy =
              false;

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


    if (busy) {
      return;
    }


    busy =
      true;


    cancelMovement();


    const roomR =
      getRoomRect();


    const bathR =
      bath
        .getBoundingClientRect();


    /*
      jalan ke kiri bath
    */
    const approachX =
      bathR.left -
      roomR.left -
      45;


    movePetTo(
      approachX,
      floorNearY() - 8,
      {

        callback: () => {

          clearCatStates();


          /*
            posisi tengah bath
          */
          const bathX =
            bathR.left -
            roomR.left +
            bathR.width / 2;


          /*
            naikkan petZone,
            jadi kepala muncul DI DALAM bath
          */
          const bathTop =
            bathR.top -
            roomR.top -
            72;


          petZone.style.transition =
            "left .35s ease, top .35s ease, transform .35s ease";


          petZone.classList.add(
            "in-bath"
          );


          cat.classList.add(
            "bathing"
          );


          setSpecialPosition(
            bathX,
            bathTop,
            {
              scale: 0.92,
              zIndex: 30
            }
          );


          bath.classList.add(
            "active"
          );


          say(
            "splash!",
            3000
          );


          setTimeout(() => {

            data.cleanliness =
              clamp(
                data.cleanliness + 40,
                0,
                100
              );


            data.happiness =
              clamp(
                data.happiness + 4,
                0,
                100
              );


            bath.classList.remove(
              "active"
            );


            clearCatStates();


            /*
              keluar lagi ke kiri bath
            */
            setPetPosition(
              bathR.left -
                roomR.left -
                45,
              floorNearY() -
                8
            );


            say("fresh!");


            updateUI();


            busy =
              false;

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

    if (busy) {
      return;
    }


    ballDragging =
      true;


    ballPointerId =
      event.pointerId;


    ball.setPointerCapture(
      event.pointerId
    );


    ballLastX =
      event.clientX;


    ballLastY =
      event.clientY;


    ballVX =
      0;


    ballVY =
      0;


    const rect =
      ball
        .getBoundingClientRect();


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

    if (!ballDragging) {
      return;
    }


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


function releaseBall() {

  if (!ballDragging) {
    return;
  }


  ballDragging =
    false;


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

  busy =
    true;


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


  /*
    kalau cuma dilepas tanpa lempar,
    kasih lemparan kecil.
  */
  if (
    Math.abs(vx) < 2 &&
    Math.abs(vy) < 2
  ) {

    vx = 5;
    vy = -6;

  }


  const gravity =
    0.48;


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


    vx *=
      0.986;


    /*
      kiri / kanan
    */
    if (
      x <= minX ||
      x >= maxX
    ) {

      vx *=
        -0.68;


      x =
        clamp(
          x,
          minX,
          maxX
        );

    }


    /*
      ceiling
    */
    if (
      y < minY
    ) {

      y =
        minY;


      vy *=
        -0.5;

    }


    /*
      floor
    */
    if (
      y >= maxY
    ) {

      y =
        maxY;


      vy *=
        -0.5;


      vx *=
        0.89;

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


/* =========================
   CHASE BALL
========================= */

function chaseBall(
  screenX
) {

  const roomR =
    getRoomRect();


  const x =
    screenX -
    roomR.left;


  say("BALL!!");


  movePetTo(
    x,
    floorNearY() - 6,
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


          busy =
            false;

        }, 800);

      }

    }
  );
}


/* =========================
   RESET BALL
========================= */

function resetBall() {

  ball.style.position =
    "";

  ball.style.left =
    "";

  ball.style.top =
    "";

  ball.style.zIndex =
    "";

  ball.style.transform =
    "";
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


  if (!name) {
    return;
  }


  data.name =
    name
      .trim()
      .substring(
        0,
        12
      );


  updateUI();
}


/* =========================
   RESET PET
========================= */

function resetPet() {

  if (
    !confirm(
      "Reset all pet progress?"
    )
  ) {
    return;
  }


  cancelMovement();


  data = {
    ...defaultData
  };


  busy =
    false;


  clearCatStates();


  bath.classList.remove(
    "active"
  );


  resetBall();


  setPetPosition(
    room.clientWidth / 2,
    floorNearY() - 25
  );


  updateUI();
}


/* =========================
   IDLE AI
========================= */

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


      const random =
        Math.random();


      /*
        60% jalan-jalan
      */
      if (
        random < 0.60
      ) {

        const x =
          room.clientWidth *
          (
            0.18 +
            Math.random() *
            0.64
          );


        const y =
          floorFarY() +
          12 +
          Math.random() *
          (
            floorNearY() -
            floorFarY() -
            28
          );


        movePetTo(
          x,
          y
        );

      }

      /*
        40% ngomong
      */
      else {

        const messages = [
          "meow~",
          "mrrp",
          "play?",
          "human?",
          "prrr...",
          "feed me?"
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

    },

    7000 +
    Math.random() *
    5000
  );
}


/* =========================
   STAT DECAY
========================= */

setInterval(() => {

  data.hunger =
    clamp(
      data.hunger - 1.5,
      0,
      100
    );


  data.energy =
    clamp(
      data.energy - 0.7,
      0,
      100
    );


  data.cleanliness =
    clamp(
      data.cleanliness - 0.4,
      0,
      100
    );


  /*
    mood turun kalau lapar banget
  */
  if (
    data.hunger <
    20
  ) {

    data.happiness =
      clamp(
        data.happiness - 0.7,
        0,
        100
      );

  }


  updateUI();

}, 60000);

/* =========================================================
   CAT PERSONALITY SYSTEM
========================================================= */

function updateCatExpression() {

  cat.classList.remove(
    "sleepy-face",
    "hungry-face"
  );

  if (data.energy < 30) {
    cat.classList.add("sleepy-face");
  }

  if (data.hunger < 25) {
    cat.classList.add("hungry-face");
  }
}


function blinkCat() {

  if (
    busy ||
    catDragging ||
    ballDragging ||
    cat.classList.contains("sleeping") ||
    cat.classList.contains("bathing")
  ) {
    return;
  }

  cat.classList.add("blink");

  setTimeout(() => {
    cat.classList.remove("blink");
  }, 130);
}


function twitchEars() {

  if (
    busy ||
    catDragging ||
    ballDragging ||
    cat.classList.contains("sleeping")
  ) {
    return;
  }

  cat.classList.add("ear-twitch");

  setTimeout(() => {
    cat.classList.remove("ear-twitch");
  }, 350);
}


function curiousCat() {

  if (
    busy ||
    catDragging ||
    ballDragging
  ) {
    return;
  }

  cat.classList.add("curious");

  setTimeout(() => {
    cat.classList.remove("curious");
  }, 900);
}


function sitCat() {

  if (
    busy ||
    catDragging ||
    ballDragging
  ) {
    return;
  }

  clearCatStates();

  cat.classList.add("sitting");

  const messages = [
    "...",
    "mrrp~",
    "human?",
    "prrr..."
  ];

  if (Math.random() > 0.45) {
    say(
      messages[
        Math.floor(
          Math.random() * messages.length
        )
      ]
    );
  }

  setTimeout(() => {
    cat.classList.remove("sitting");
  }, 2600);
}


/* random blink / ears / curious */
setInterval(() => {

  if (
    busy ||
    catDragging ||
    ballDragging
  ) {
    return;
  }

  const random = Math.random();

  if (random < 0.55) {
    blinkCat();

  } else if (random < 0.82) {
    twitchEars();

  } else {
    curiousCat();
  }

}, 2700);
/* =========================
   STARTUP
========================= */

updateUI();


requestAnimationFrame(() => {

  setPetPosition(
    room.clientWidth / 2,
    floorNearY() - 30
  );

});


scheduleIdleBehaviour();
