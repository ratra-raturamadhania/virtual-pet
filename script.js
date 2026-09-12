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


/* =========================
   LOAD + FIX OLD SAVE
========================= */

let savedData = null;

try {

  savedData =
    JSON.parse(
      localStorage.getItem(
        "pixelPetData"
      )
    );

} catch (error) {

  savedData = null;
}


/*
  Spread defaultData FIRST.

  So old saves that don't have
  "pattern" automatically get orange.
*/

let data = {

  ...defaultData,

  ...(savedData || {})
};


/*
  Extra safety:
*/

if (
  ![
    "orange",
    "tuxedo",
    "calico",
    "gray"
  ].includes(data.pattern)
) {

  data.pattern = "orange";
}


/* =========================
   ELEMENTS
========================= */

const room =
  document.getElementById("room");

const petZone =
  document.getElementById("petZone");

const cat =
  document.getElementById("pixelCat");

const shadow =
  document.getElementById("petShadow");

const speech =
  document.getElementById("speech");

const effect =
  document.getElementById(
    "floatingEffect"
  );

const ball =
  document.getElementById("ball");

const ballHome =
  document.getElementById("ballHome");

const bath =
  document.getElementById("bath");

const bowlFood =
  document.getElementById(
    "bowlFood"
  );


/* =========================
   STATE
========================= */

let busy = false;

let catDragging = false;

let dragMoved = false;

let catOffsetX = 0;
let catOffsetY = 0;

let ballDragging = false;

let ballLastX = 0;
let ballLastY = 0;

let ballVX = 0;
let ballVY = 0;

let ballAnimationId = null;


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

function clamp(value) {

  return Math.max(
    0,
    Math.min(100, value)
  );
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
    "bathing"
  );
}


function setFaceDirection(targetX) {

  const catRect =
    petZone.getBoundingClientRect();

  const catCenter =
    catRect.left +
    catRect.width / 2;

  if (targetX < catCenter) {

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

  updateMood();

  save();
}


function setStat(
  name,
  value
) {

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
      "#c95f59";

  } else if (value < 50) {

    bar.style.background =
      "#d7a14f";

  } else {

    bar.style.background =
      "#77a870";
  }
}


/* =========================
   MOOD FACE
========================= */

function updateMood() {

  const eyes =
    document.querySelectorAll(
      ".eye"
    );

  const mouth =
    document.querySelector(
      ".mouth"
    );


  eyes.forEach(eye => {

    eye.style.height = "8px";

    eye.style.top = "24px";
  });


  mouth.style.width = "12px";

  mouth.style.borderBottom =
    "3px solid #4c302d";


  if (data.energy < 20) {

    eyes.forEach(eye => {

      eye.style.height = "3px";

      eye.style.top = "28px";
    });
  }


  if (
    data.happiness < 25 ||
    data.hunger < 15
  ) {

    mouth.style.borderBottom =
      "0";

    mouth.style.borderTop =
      "3px solid #4c302d";
  }
}


/* =========================
   SPEECH
========================= */

function say(
  text,
  duration = 1600
) {

  speech.textContent = text;

  speech.classList.remove(
    "hidden"
  );


  clearTimeout(
    window.petSpeechTimer
  );


  window.petSpeechTimer =
    setTimeout(() => {

      speech.classList.add(
        "hidden"
      );

    }, duration);
}


/* =========================
   FLOATING EFFECT
========================= */

function showEffect(symbol) {

  effect.textContent = symbol;


  effect.animate(

    [

      {
        opacity: 0,

        transform:
          "translate(-50%, 10px) scale(.6)"
      },

      {
        opacity: 1,

        transform:
          "translate(-50%, -10px) scale(1)"
      },

      {
        opacity: 0,

        transform:
          "translate(-50%, -60px) scale(1.2)"
      }

    ],

    {
      duration: 950,

      easing: "ease-out"
    }
  );


  setTimeout(() => {

    effect.textContent = "";

  }, 950);
}


/* =========================
   PATTERNS
========================= */

function applyPattern(
  pattern
) {

  cat.classList.remove(

    "orange",
    "tuxedo",
    "calico",
    "gray"
  );


  cat.classList.add(
    pattern || "orange"
  );


  document
    .querySelectorAll(
      "[data-pattern]"
    )
    .forEach(button => {

      button.classList.toggle(

        "active-pattern",

        button.dataset.pattern ===
        pattern
      );

    });
}


document
  .querySelectorAll(
    "[data-pattern]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        data.pattern =
          button.dataset.pattern;

        applyPattern(
          data.pattern
        );

        save();

        say("new look!");

        showEffect("★");
      }
    );

  });


/* =========================
   WALK
========================= */

function walkToPercent(
  percent,
  running = false,
  callback = null
) {

  clearCatStates();


  const roomRect =
    room.getBoundingClientRect();


  const currentRect =
    petZone.getBoundingClientRect();


  const currentCenter =
    currentRect.left +
    currentRect.width / 2;


  const targetX =
    roomRect.left +
    roomRect.width *
    percent / 100;


  setFaceDirection(
    targetX
  );


  cat.classList.add(
    running
      ? "running"
      : "walking"
  );


  petZone.style.top = "";

  petZone.style.bottom =
    "79px";


  /*
    Faster when chasing.
  */

  petZone.style.transition =
    running
      ? "left .38s linear"
      : "left .65s linear";


  petZone.style.left =
    percent + "%";


  const distance =
    Math.abs(
      targetX -
      currentCenter
    );


  const duration =
    running
      ? Math.max(
          250,
          Math.min(
            700,
            distance * 1.4
          )
        )

      : Math.max(
          350,
          Math.min(
            900,
            distance * 2
          )
        );


  setTimeout(() => {

    cat.classList.remove(
      "running",
      "walking"
    );


    petZone.style.transition =
      "left .65s linear";


    if (callback) {

      callback();
    }

  }, duration);
}


/* =========================
   CAT DRAG / PICK UP
========================= */

cat.addEventListener(
  "pointerdown",
  event => {

    if (busy) return;


    catDragging = true;

    dragMoved = false;


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


    const roomRect =
      room.getBoundingClientRect();


    let x =
      event.clientX -
      roomRect.left -
      catOffsetX +
      petZone.offsetWidth / 2;


    let y =
      event.clientY -
      roomRect.top -
      catOffsetY;


    x = Math.max(
      50,
      Math.min(
        roomRect.width - 50,
        x
      )
    );


    y = Math.max(
      5,
      Math.min(
        roomRect.height - 130,
        y
      )
    );


    petZone.style.transition =
      "none";


    petZone.style.left =
      x + "px";


    petZone.style.top =
      y + "px";


    petZone.style.bottom =
      "auto";
  }
);


function finishCatDrag(
  event
) {

  if (!catDragging) return;


  catDragging = false;


  try {

    cat.releasePointerCapture(
      event.pointerId
    );

  } catch (error) {}


  cat.classList.remove(
    "carried"
  );


  petZone.classList.remove(
    "is-carried"
  );


  petZone.style.transition =
    "left .65s linear";


  cat.classList.add(
    "drop-bounce"
  );


  setTimeout(() => {

    cat.classList.remove(
      "drop-bounce"
    );

  }, 380);


  /*
    If user only tapped,
    treat it as petting.
  */

  if (!dragMoved) {

    data.happiness =
      clamp(
        data.happiness + 5
      );


    cat.classList.add(
      "happy"
    );


    showEffect("♥");

    say("prrrr");


    gainXP(3);


    setTimeout(() => {

      cat.classList.remove(
        "happy"
      );

    }, 1400);


    updateUI();
  }
}


cat.addEventListener(
  "pointerup",
  finishCatDrag
);


cat.addEventListener(
  "pointercancel",
  finishCatDrag
);


/* =========================
   FOOD
========================= */

document
  .getElementById(
    "foodBowl"
  )
  .addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (
        busy ||
        catDragging
      ) return;


      busy = true;


      bowlFood.style.opacity =
        "1";


      walkToPercent(
        30,
        false,
        () => {

          clearCatStates();


          cat.classList.add(
            "eating"
          );


          say(
            "nom nom nom",
            2200
          );


          let bites = 0;


          const biteTimer =
            setInterval(() => {

              bites++;

              bowlFood.style.transform =
                bites % 2
                  ? "scale(.8)"
                  : "scale(1)";


              showEffect("♪");


              if (
                bites >= 4
              ) {

                clearInterval(
                  biteTimer
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


                  walkToPercent(
                    50,
                    false,
                    () => {

                      busy = false;
                    }
                  );

                }, 500);
              }

            }, 420);

        }
      );

    }
  );


/* =========================
   BED / REAL SLEEP POSE
========================= */

document
  .getElementById(
    "bed"
  )
  .addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (busy) return;


      busy = true;


      walkToPercent(
        13,
        false,
        () => {

          clearCatStates();


          cat.classList.add(
            "sleeping"
          );


          petZone.style.bottom =
            "48px";


          say(
            "zzz...",
            4200
          );


          showEffect("Z");


          setTimeout(() => {

            showEffect("z");

          }, 1000);


          setTimeout(() => {

            showEffect("Z");

          }, 2000);


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


            petZone.style.bottom =
              "79px";


            say("good morning!");


            updateUI();


            walkToPercent(
              50,
              false,
              () => {

                busy = false;
              }
            );

          }, 4300);

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


    walkToPercent(
      86,
      false,
      () => {

        clearCatStates();


        cat.classList.add(
          "bathing"
        );


        bath.classList.add(
          "active"
        );


        petZone.style.bottom =
          "45px";


        say(
          "splash!",
          3000
        );


        showEffect("✦");


        setTimeout(() => {

          showEffect("○");

        }, 600);


        setTimeout(() => {

          showEffect("○");

        }, 1300);


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


          clearCatStates();


          bath.classList.remove(
            "active"
          );


          petZone.style.bottom =
            "79px";


          say("so clean!");


          updateUI();


          walkToPercent(
            50,
            false,
            () => {

              busy = false;
            }
          );

        }, 3200);

      }
    );

  }
);


/* =========================
   BALL DRAG + THROW
========================= */

ball.addEventListener(
  "pointerdown",
  event => {

    if (
      busy ||
      ballAnimationId
    ) return;


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
      rect.left + "px";

    ball.style.top =
      rect.top + "px";


    ball.style.zIndex =
      "1000";


    ball.style.margin =
      "0";
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
      event.clientX -
      24 +
      "px";


    ball.style.top =
      event.clientY -
      24 +
      "px";
  }
);


function finishBallDrag(
  event
) {

  if (!ballDragging) return;


  ballDragging = false;


  try {

    ball.releasePointerCapture(
      event.pointerId
    );

  } catch (error) {}


  throwBall();
}


ball.addEventListener(
  "pointerup",
  finishBallDrag
);


ball.addEventListener(
  "pointercancel",
  finishBallDrag
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
    ballVX * 1.65;


  let vy =
    ballVY * 1.65;


  /*
    If user barely moved:
    give it a small toss.
  */

  if (
    Math.abs(vx) < 2 &&
    Math.abs(vy) < 2
  ) {

    vx = 4;

    vy = -5;
  }


  const gravity = .45;

  const friction = .985;


  function physics() {

    const roomRect =
      room.getBoundingClientRect();


    const minX =
      roomRect.left + 5;


    const maxX =
      roomRect.right - 53;


    const minY =
      roomRect.top + 5;


    const maxY =
      roomRect.bottom - 54;


    x += vx;

    y += vy;


    vy += gravity;


    vx *= friction;


    if (
      x <= minX ||
      x >= maxX
    ) {

      vx *= -.72;


      x = Math.max(
        minX,
        Math.min(
          maxX,
          x
        )
      );
    }


    if (y >= maxY) {

      y = maxY;

      vy *= -.57;

      vx *= .91;
    }


    if (y <= minY) {

      y = minY;

      vy *= -.65;
    }


    ball.style.left =
      x + "px";


    ball.style.top =
      y + "px";


    ball.style.transform =
      `rotate(${x * 2}deg)`;


    const stopped =
      Math.abs(vx) < .28 &&
      Math.abs(vy) < .6 &&
      y >= maxY - 2;


    if (!stopped) {

      ballAnimationId =
        requestAnimationFrame(
          physics
        );

    } else {

      ballAnimationId = null;


      chaseBall(
        x + 24
      );
    }
  }


  physics();
}


/* =========================
   CAT CHASE BALL
========================= */

function chaseBall(
  ballScreenX
) {

  const roomRect =
    room.getBoundingClientRect();


  const localX =
    ballScreenX -
    roomRect.left;


  const percent =
    Math.max(
      11,
      Math.min(
        89,
        localX /
        roomRect.width *
        100
      )
    );


  say("BALL!!");


  walkToPercent(
    percent,
    true,
    () => {

      clearCatStates();


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

      }, 900);

    }
  );
}


/* =========================
   RESET BALL
========================= */

function resetBall() {

  if (ballAnimationId) {

    cancelAnimationFrame(
      ballAnimationId
    );

    ballAnimationId = null;
  }


  ball.style.position =
    "";

  ball.style.left =
    "";

  ball.style.top =
    "";

  ball.style.zIndex =
    "";

  ball.style.margin =
    "";

  ball.style.transform =
    "";
}


/* =========================
   XP
========================= */

function gainXP(
  amount
) {

  data.xp += amount;


  while (
    data.xp >= 100
  ) {

    data.xp -= 100;

    data.level++;

    data.coins += 50;


    setTimeout(() => {

      say("LEVEL UP!");

      showEffect("★");

    }, 300);
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


  const cleanName =
    name
      .trim()
      .substring(0, 12);


  if (!cleanName) return;


  data.name =
    cleanName;


  updateUI();


  say("that's me!");
}


/* =========================
   RESET
========================= */

function resetPet() {

  const confirmation =
    confirm(
      "Reset all pet progress?"
    );


  if (!confirmation) return;


  data = {
    ...defaultData
  };


  clearCatStates();


  petZone.classList.remove(
    "is-carried"
  );


  petZone.style.left =
    "50%";


  petZone.style.top =
    "";


  petZone.style.bottom =
    "79px";


  resetBall();


  updateUI();


  say("new game!");
}


/* =========================
   RANDOM BEHAVIOUR
========================= */

const randomMessages = [

  "meow~",

  "mrrp",

  "pet me!",

  "play?",

  "food?",

  "...",

  "hello human"
];


setInterval(() => {

  if (
    busy ||
    catDragging ||
    ballDragging
  ) {

    return;
  }


  /*
    Mood-specific requests
  */

  if (data.hunger < 25) {

    say("hungry...");

    return;
  }


  if (data.energy < 20) {

    say("sleepy...");

    return;
  }


  if (data.cleanliness < 20) {

    say("bath...?");

    return;
  }


  if (
    Math.random() < .38
  ) {

    const text =
      randomMessages[
        Math.floor(
          Math.random() *
          randomMessages.length
        )
      ];


    say(text);
  }

}, 8500);


/* =========================
   NATURAL DECAY
========================= */

setInterval(() => {

  data.hunger =
    clamp(
      data.hunger - 1.5
    );


  data.happiness =
    clamp(
      data.happiness - .55
    );


  data.energy =
    clamp(
      data.energy - .75
    );


  data.cleanliness =
    clamp(
      data.cleanliness - .45
    );


  updateUI();

}, 60000);


/* =========================
   START
========================= */

updateUI();
