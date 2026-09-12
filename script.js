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
   LOAD SAVE
========================= */

let savedData = null;


try {

  savedData =
    JSON.parse(
      localStorage.getItem(
        "pixelPetData"
      )
    );

} catch {

  savedData = null;
}


let data = {

  ...defaultData,

  ...(savedData || {})
};


const validPatterns = [

  "orange",

  "tuxedo",

  "calico",

  "gray"
];


if (
  !validPatterns.includes(
    data.pattern
  )
) {

  data.pattern =
    "orange";
}


/* =========================
   ELEMENTS
========================= */

const room =
  document.getElementById(
    "room"
  );


const petZone =
  document.getElementById(
    "petZone"
  );


const cat =
  document.getElementById(
    "pixelCat"
  );


const portraitCat =
  document.getElementById(
    "portraitCat"
  );


const speech =
  document.getElementById(
    "speech"
  );


const effect =
  document.getElementById(
    "floatingEffect"
  );


const ball =
  document.getElementById(
    "ball"
  );


const bath =
  document.getElementById(
    "bath"
  );


const bed =
  document.getElementById(
    "bed"
  );


const foodBowl =
  document.getElementById(
    "foodBowl"
  );


const bowlFood =
  document.getElementById(
    "bowlFood"
  );


/* =========================
   STATE
========================= */

let busy = false;


let catDragging =
  false;


let dragMoved =
  false;


let catOffsetX = 0;

let catOffsetY = 0;


let ballDragging =
  false;


let ballLastX = 0;

let ballLastY = 0;


let ballVX = 0;

let ballVY = 0;


let ballAnimationId =
  null;


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
    Math.min(
      100,
      value
    )
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


  petZone.classList.remove(
    "on-bed"
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
      "#ca5f59";

  }

  else if (
    value < 50
  ) {

    bar.style.background =
      "#d7a04f";

  }

  else {

    bar.style.background =
      "#77a870";
  }
}


/* =========================
   FACE
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


  eyes.forEach(
    eye => {

      eye.style.height =
        "8px";

      eye.style.top =
        "24px";

    }
  );


  mouth.style.borderBottom =
    "3px solid #4c302d";


  mouth.style.borderTop =
    "0";


  if (
    data.energy < 20
  ) {

    eyes.forEach(
      eye => {

        eye.style.height =
          "3px";

        eye.style.top =
          "28px";

      }
    );
  }


  if (
    data.hunger < 15 ||
    data.happiness < 25
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
    setTimeout(
      () => {

        speech.classList.add(
          "hidden"
        );

      },

      duration
    );
}


/* =========================
   EFFECT
========================= */

function showEffect(
  symbol
) {

  effect.textContent =
    symbol;


  effect.animate(

    [

      {

        opacity: 0,

        transform:
          "translate(-50%, 8px) scale(.7)"
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

      duration: 950,

      easing:
        "cubic-bezier(.22,.8,.3,1)"
    }
  );


  setTimeout(
    () => {

      effect.textContent =
        "";

    },

    950
  );
}


/* =========================
   CAT PATTERNS
========================= */

function applyPattern(
  pattern
) {

  validPatterns.forEach(
    name => {

      cat.classList.remove(
        name
      );


      portraitCat.classList.remove(
        name
      );

    }
  );


  cat.classList.add(
    pattern
  );


  portraitCat.classList.add(
    pattern
  );


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


          say(
            "new outfit!"
          );


          showEffect("♥");


          save();
        }
      );

    }
  );


/* =========================
   OBJECT POSITION HELPER
========================= */

function getObjectPercent(
  element
) {

  const roomRect =
    room.getBoundingClientRect();


  const objectRect =
    element.getBoundingClientRect();


  const center =
    objectRect.left +
    objectRect.width / 2;


  return (
    (
      center -
      roomRect.left
    )
    /
    roomRect.width
  ) * 100;
}


/* =========================
   FACE DIRECTION
========================= */

function faceTowards(
  screenX
) {

  const rect =
    petZone.getBoundingClientRect();


  const catX =
    rect.left +
    rect.width / 2;


  /*
    We don't flip the whole pet-zone
    because that would also flip effects.
  */

  if (
    screenX < catX
  ) {

    cat.style.scale =
      "-1 1";

  }

  else {

    cat.style.scale =
      "1 1";
  }
}


/* =========================
   WALK / RUN
========================= */

function movePetTo(

  percent,

  {
    run = false,
    callback = null
  } = {}

) {

  clearCatStates();


  const roomRect =
    room.getBoundingClientRect();


  const destinationX =
    roomRect.left +
    roomRect.width *
    percent / 100;


  faceTowards(
    destinationX
  );


  cat.classList.add(

    run
      ? "running"
      : "walking"

  );


  petZone.style.top =
    "";


  petZone.style.bottom =
    "65px";


  petZone.style.transition =
    run

      ? "left .35s cubic-bezier(.2,.8,.25,1)"

      : "left .55s cubic-bezier(.22,.8,.28,1)";


  petZone.style.left =
    percent + "%";


  const current =
    petZone.getBoundingClientRect();


  const distance =
    Math.abs(
      destinationX -
      (
        current.left +
        current.width / 2
      )
    );


  const duration =
    run

      ? Math.max(
          280,
          Math.min(
            600,
            distance * 1.2
          )
        )

      : Math.max(
          350,
          Math.min(
            800,
            distance * 1.7
          )
        );


  setTimeout(
    () => {

      cat.classList.remove(
        "walking",
        "running"
      );


      if (callback) {

        callback();
      }

    },

    duration
  );
}


/* =========================
   PICK UP CAT
========================= */

cat.addEventListener(
  "pointerdown",

  event => {

    if (busy) return;


    catDragging =
      true;


    dragMoved =
      false;


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

    if (
      !catDragging
    ) return;


    dragMoved =
      true;


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
        roomRect.height - 125,
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


function stopCatDrag(
  event
) {

  if (
    !catDragging
  ) return;


  catDragging =
    false;


  try {

    cat.releasePointerCapture(
      event.pointerId
    );

  } catch {}


  cat.classList.remove(
    "carried"
  );


  petZone.classList.remove(
    "is-carried"
  );


  petZone.style.transition =
    "left .52s cubic-bezier(.22,.8,.28,1)";


  cat.classList.add(
    "drop-bounce"
  );


  setTimeout(
    () => {

      cat.classList.remove(
        "drop-bounce"
      );

    },

    400
  );


  if (
    !dragMoved
  ) {

    data.happiness =
      clamp(
        data.happiness + 5
      );


    cat.classList.add(
      "happy"
    );


    say("prrrrr");


    showEffect("♥");


    gainXP(3);


    setTimeout(
      () => {

        cat.classList.remove(
          "happy"
        );

      },

      1400
    );


    updateUI();
  }
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
   FOOD
========================= */

foodBowl.addEventListener(
  "click",

  event => {

    event.stopPropagation();


    if (busy) return;


    busy =
      true;


    const position =
      getObjectPercent(
        foodBowl
      );


    movePetTo(

      position,

      {

        callback: () => {

          clearCatStates();


          cat.classList.add(
            "eating"
          );


          say(
            "nom nom...",
            2300
          );


          let bite = 0;


          const interval =
            setInterval(
              () => {

                bite++;


                bowlFood.style.transform =

                  bite % 2

                    ? "scale(.72)"

                    : "scale(1)";


                showEffect("♪");


                if (
                  bite === 4
                ) {

                  clearInterval(
                    interval
                  );


                  bowlFood.style.opacity =
                    ".22";


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


                  setTimeout(
                    () => {

                      bowlFood.style.opacity =
                        "1";


                      movePetTo(
                        50,
                        {
                          callback: () => {

                            busy =
                              false;
                          }
                        }
                      );

                    },

                    500
                  );
                }

              },

              420
            );

        }

      }

    );

  }
);


/* =========================
   SLEEP EXACTLY ON BED
========================= */

bed.addEventListener(
  "click",

  event => {

    event.stopPropagation();


    if (busy) return;


    busy =
      true;


    const position =
      getObjectPercent(
        bed
      );


    movePetTo(

      position,

      {

        callback: () => {

          clearCatStates();


          /*
            Exact position on top of mattress.
          */

          const roomRect =
            room.getBoundingClientRect();


          const bedRect =
            bed.getBoundingClientRect();


          const sleepX =

            (
              (
                bedRect.left +
                bedRect.width * .57
              )
              -
              roomRect.left
            );


          const sleepY =

            (
              bedRect.top -
              roomRect.top +
              3
            );


          petZone.style.transition =
            "all .35s ease";


          petZone.style.left =
            sleepX + "px";


          petZone.style.top =
            sleepY + "px";


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
            4800
          );


          showEffect("Z");


          setTimeout(
            () => {

              showEffect("z");

            },

            1200
          );


          setTimeout(
            () => {

              showEffect("Z");

            },

            2500
          );


          setTimeout(
            () => {

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


              petZone.style.top =
                "";


              petZone.style.bottom =
                "65px";


              say(
                "good morning!"
              );


              updateUI();


              movePetTo(
                50,
                {
                  callback: () => {

                    busy =
                      false;
                  }
                }
              );

            },

            4800
          );

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


    busy =
      true;


    const position =
      getObjectPercent(
        bath
      );


    movePetTo(

      position,

      {

        callback: () => {

          clearCatStates();


          cat.classList.add(
            "bathing"
          );


          bath.classList.add(
            "active"
          );


          petZone.style.bottom =
            "52px";


          say(
            "splash!",
            3200
          );


          showEffect("○");


          setTimeout(
            () => {

              showEffect("○");

            },

            750
          );


          setTimeout(
            () => {

              showEffect("✦");

            },

            1500
          );


          setTimeout(
            () => {

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


              petZone.style.bottom =
                "65px";


              say(
                "fresh!"
              );


              updateUI();


              movePetTo(
                50,
                {
                  callback: () => {

                    busy =
                      false;
                  }
                }
              );

            },

            3400
          );

        }

      }

    );

  }
);


/* =========================
   BALL PICKUP
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


    ballDragging =
      true;


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
  }
);


ball.addEventListener(
  "pointermove",

  event => {

    if (
      !ballDragging
    ) {

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
      (
        event.clientX -
        22
      ) +
      "px";


    ball.style.top =
      (
        event.clientY -
        22
      ) +
      "px";
  }
);


function finishBallDrag(
  event
) {

  if (
    !ballDragging
  ) {

    return;
  }


  ballDragging =
    false;


  try {

    ball.releasePointerCapture(
      event.pointerId
    );

  } catch {}


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
    ballVX * 1.65;


  let vy =
    ballVY * 1.65;


  if (
    Math.abs(vx) < 2 &&
    Math.abs(vy) < 2
  ) {

    vx = 5;

    vy = -6;
  }


  const gravity =
    .42;


  const friction =
    .987;


  function physics() {

    const roomRect =
      room.getBoundingClientRect();


    const minX =
      roomRect.left + 5;


    const maxX =
      roomRect.right - 49;


    const minY =
      roomRect.top + 5;


    const maxY =
      roomRect.bottom - 49;


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


    if (
      y >= maxY
    ) {

      y = maxY;


      vy *= -.55;


      vx *= .9;
    }


    if (
      y <= minY
    ) {

      y = minY;


      vy *= -.65;
    }


    ball.style.left =
      x + "px";


    ball.style.top =
      y + "px";


    ball.style.transform =
      `rotate(${x * 3}deg)`;


    const stopped =

      Math.abs(vx) < .3 &&

      Math.abs(vy) < .6 &&

      y >= maxY - 2;


    if (
      !stopped
    ) {

      ballAnimationId =
        requestAnimationFrame(
          physics
        );

    }

    else {

      ballAnimationId =
        null;


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
  ballScreenX
) {

  const roomRect =
    room.getBoundingClientRect();


  const localX =
    ballScreenX -
    roomRect.left;


  const percentage =

    Math.max(
      10,

      Math.min(
        90,

        (
          localX /
          roomRect.width
        ) *
        100
      )
    );


  say("BALL!!");


  movePetTo(

    percentage,

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


        setTimeout(
          () => {

            cat.classList.remove(
              "happy"
            );


            resetBall();


            busy =
              false;

          },

          900
        );
      }

    }

  );
}


/* =========================
   RESET BALL
========================= */

function resetBall() {

  if (
    ballAnimationId
  ) {

    cancelAnimationFrame(
      ballAnimationId
    );


    ballAnimationId =
      null;
  }


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


    setTimeout(
      () => {

        say(
          "LEVEL UP!"
        );


        showEffect("★");

      },

      300
    );
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
      .substring(0,12);


  if (!clean) return;


  data.name =
    clean;


  updateUI();


  say(
    "that's me!"
  );
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


  petZone.style.left =
    "48%";


  petZone.style.top =
    "";


  petZone.style.bottom =
    "65px";


  cat.style.scale =
    "1 1";


  resetBall();


  updateUI();


  say(
    "new game!"
  );
}


/* =========================
   RANDOM PET BEHAVIOUR
========================= */

const randomTexts = [

  "meow~",

  "mrrp",

  "pet me!",

  "play?",

  "food?",

  "...",

  "human?"
];


setInterval(
  () => {

    if (
      busy ||
      catDragging ||
      ballDragging
    ) {

      return;
    }


    if (
      data.hunger < 25
    ) {

      say(
        "hungry..."
      );

      return;
    }


    if (
      data.energy < 20
    ) {

      say(
        "sleepy..."
      );

      return;
    }


    if (
      data.cleanliness < 20
    ) {

      say(
        "bath?"
      );

      return;
    }


    if (
      Math.random() < .38
    ) {

      const text =
        randomTexts[
          Math.floor(
            Math.random() *
            randomTexts.length
          )
        ];


      say(text);
    }

  },

  8500
);


/* =========================
   STAT DECAY
========================= */

setInterval(
  () => {

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

  },

  60000
);


/* =========================
   START
========================= */

updateUI();
