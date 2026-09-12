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

let data =
  JSON.parse(localStorage.getItem("pixelPetData")) ||
  { ...defaultData };

const room = document.getElementById("room");
const cat = document.getElementById("pixelCat");
const petZone = document.getElementById("petZone");
const speech = document.getElementById("speech");
const effect = document.getElementById("floatingEffect");
const ballBody = document.getElementById("ballBody");

let busy = false;

let catDragging = false;
let catOffsetX = 0;
let catOffsetY = 0;

let ballDragging = false;
let ballStartX = 0;
let ballStartY = 0;
let ballLastX = 0;
let ballLastY = 0;
let ballVX = 0;
let ballVY = 0;

function save() {
  localStorage.setItem(
    "pixelPetData",
    JSON.stringify(data)
  );
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function updateUI() {
  document.getElementById("petName").textContent = data.name;
  document.getElementById("level").textContent = data.level;
  document.getElementById("xp").textContent = data.xp;
  document.getElementById("coins").textContent = data.coins;

  setStat("hunger", data.hunger);
  setStat("happy", data.happiness);
  setStat("energy", data.energy);
  setStat("clean", data.cleanliness);

  setPattern(data.pattern);

  save();
}

function setStat(name, value) {
  document.getElementById(name + "Bar").style.width =
    value + "%";

  document.getElementById(name + "Text").textContent =
    Math.round(value);
}

function say(text, time = 1600) {
  speech.textContent = text;
  speech.classList.remove("hidden");

  clearTimeout(window.sayTimeout);

  window.sayTimeout = setTimeout(() => {
    speech.classList.add("hidden");
  }, time);
}

function showEffect(symbol) {
  effect.textContent = symbol;

  effect.animate(
    [
      {
        opacity: 0,
        transform: "translate(-50%, 10px)"
      },
      {
        opacity: 1,
        transform: "translate(-50%, -10px)"
      },
      {
        opacity: 0,
        transform: "translate(-50%, -55px)"
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

/* CAT PATTERN */

document
  .querySelectorAll("[data-pattern]")
  .forEach(button => {
    button.addEventListener("click", () => {
      data.pattern = button.dataset.pattern;
      setPattern(data.pattern);
      save();
    });
  });

function setPattern(pattern) {
  cat.classList.remove(
    "orange",
    "tuxedo",
    "calico",
    "gray"
  );

  cat.classList.add(pattern);
}

/* CAT DRAG */

cat.addEventListener("pointerdown", event => {
  if (busy) return;

  catDragging = true;

  cat.setPointerCapture(event.pointerId);

  const rect = petZone.getBoundingClientRect();

  catOffsetX = event.clientX - rect.left;
  catOffsetY = event.clientY - rect.top;

  cat.style.animation = "none";
});

cat.addEventListener("pointermove", event => {
  if (!catDragging) return;

  const roomRect = room.getBoundingClientRect();

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
    65,
    Math.min(
      roomRect.width - 65,
      x
    )
  );

  y = Math.max(
    10,
    Math.min(
      roomRect.height - 150,
      y
    )
  );

  petZone.style.left = x + "px";
  petZone.style.bottom = "auto";
  petZone.style.top = y + "px";
  petZone.style.transform = "translateX(-50%)";
});

cat.addEventListener("pointerup", event => {
  if (!catDragging) return;

  catDragging = false;

  cat.releasePointerCapture(event.pointerId);

  cat.style.animation = "";

  data.happiness =
    clamp(data.happiness + 2);

  showEffect("♥");
  say("mrrp!");

  gainXP(2);

  updateUI();
});

/* FOOD */

document
  .getElementById("foodBowl")
  .addEventListener("click", event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    say("nom nom");

    data.hunger =
      clamp(data.hunger + 28);

    data.happiness =
      clamp(data.happiness + 4);

    gainXP(10);

    showEffect("♪");

    updateUI();

    setTimeout(() => {
      busy = false;
    }, 900);
  });

/* BED */

document
  .getElementById("bed")
  .addEventListener("click", event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    say("zzz...", 2500);
    showEffect("Z");

    cat.style.transform =
      "rotate(-8deg) scale(.95)";

    setTimeout(() => {
      data.energy =
        clamp(data.energy + 35);

      data.hunger =
        clamp(data.hunger - 6);

      gainXP(8);

      cat.style.transform = "";

      say("morning!");

      updateUI();

      busy = false;
    }, 2600);
  });

/* BATH */

document
  .getElementById("bath")
  .addEventListener("click", event => {
    event.stopPropagation();

    if (busy) return;

    busy = true;

    say("splash!");
    showEffect("✦");

    data.cleanliness =
      clamp(data.cleanliness + 40);

    data.happiness =
      clamp(data.happiness + 3);

    gainXP(8);

    updateUI();

    setTimeout(() => {
      busy = false;
    }, 900);
  });

/* THROWABLE BALL */

ballBody.addEventListener("pointerdown", event => {
  ballDragging = true;

  ballBody.setPointerCapture(event.pointerId);

  ballStartX = event.clientX;
  ballStartY = event.clientY;

  ballLastX = event.clientX;
  ballLastY = event.clientY;

  ballBody.style.position = "fixed";
  ballBody.style.zIndex = "1000";
  ballBody.style.left =
    event.clientX - 23 + "px";
  ballBody.style.top =
    event.clientY - 23 + "px";
});

ballBody.addEventListener("pointermove", event => {
  if (!ballDragging) return;

  ballVX = event.clientX - ballLastX;
  ballVY = event.clientY - ballLastY;

  ballLastX = event.clientX;
  ballLastY = event.clientY;

  ballBody.style.left =
    event.clientX - 23 + "px";

  ballBody.style.top =
    event.clientY - 23 + "px";
});

ballBody.addEventListener("pointerup", event => {
  if (!ballDragging) return;

  ballDragging = false;

  ballBody.releasePointerCapture(event.pointerId);

  throwBall();
});

function throwBall() {
  let x = parseFloat(ballBody.style.left);
  let y = parseFloat(ballBody.style.top);

  let vx = ballVX * 1.8;
  let vy = ballVY * 1.8;

  const friction = 0.97;
  const gravity = 0.55;

  function animate() {
    x += vx;
    y += vy;

    vy += gravity;

    vx *= friction;
    vy *= friction;

    const roomRect =
      room.getBoundingClientRect();

    const minX = roomRect.left;
    const maxX = roomRect.right - 46;
    const minY = roomRect.top;
    const maxY = roomRect.bottom - 46;

    if (x <= minX || x >= maxX) {
      vx *= -0.72;
      x = Math.max(
        minX,
        Math.min(maxX, x)
      );
    }

    if (y <= minY || y >= maxY) {
      vy *= -0.72;
      y = Math.max(
        minY,
        Math.min(maxY, y)
      );
    }

    ballBody.style.left = x + "px";
    ballBody.style.top = y + "px";

    if (
      Math.abs(vx) > 0.3 ||
      Math.abs(vy) > 0.3
    ) {
      requestAnimationFrame(animate);
    } else {
      catChaseBall(x, y);

      setTimeout(resetBall, 1100);
    }
  }

  animate();
}

function catChaseBall(ballX, ballY) {
  const roomRect =
    room.getBoundingClientRect();

  const localX =
    ballX -
    roomRect.left +
    23;

  const percentage =
    (localX / roomRect.width) * 100;

  petZone.style.left =
    Math.max(
      10,
      Math.min(90, percentage)
    ) + "%";

  petZone.style.top = "auto";
  petZone.style.bottom = "82px";

  data.happiness =
    clamp(data.happiness + 12);

  data.energy =
    clamp(data.energy - 7);

  gainXP(10);

  say("ball!!");
  showEffect("★");

  updateUI();
}

function resetBall() {
  ballBody.style.position = "";
  ballBody.style.zIndex = "";
  ballBody.style.left = "";
  ballBody.style.top = "";
}

/* XP */

function gainXP(amount) {
  data.xp += amount;

  if (data.xp >= 100) {
    data.xp -= 100;
    data.level++;
    data.coins += 50;

    say("LEVEL UP!");
    showEffect("★");
  }
}

/* RENAME */

function renamePet() {
  const newName =
    prompt(
      "Pet name:",
      data.name
    );

  if (!newName) return;

  data.name =
    newName
      .trim()
      .substring(0, 12);

  updateUI();
}

/* RESET */

function resetPet() {
  const confirmed =
    confirm(
      "Reset your pet progress?"
    );

  if (!confirmed) return;

  data = { ...defaultData };

  petZone.style.left = "50%";
  petZone.style.top = "";
  petZone.style.bottom = "82px";

  updateUI();
  say("new game!");
}

/* RANDOM PET TALK */

const randomMessages = [
  "meow",
  "mrrp",
  "play?",
  "food?",
  "pet me",
  "..."
];

setInterval(() => {
  if (
    !busy &&
    !catDragging &&
    Math.random() < 0.4
  ) {
    const randomText =
      randomMessages[
        Math.floor(
          Math.random() *
          randomMessages.length
        )
      ];

    say(randomText);
  }
}, 9000);

/* STAT DECAY */

setInterval(() => {
  data.hunger =
    clamp(data.hunger - 1.5);

  data.happiness =
    clamp(data.happiness - 0.6);

  data.energy =
    clamp(data.energy - 0.8);

  data.cleanliness =
    clamp(data.cleanliness - 0.5);

  updateUI();
}, 60000);

/* START */

updateUI();
