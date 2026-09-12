const defaultData = {
  name: "Mochi",
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
  level: 1,
  xp: 0,
  coins: 100
};

let data =
  JSON.parse(localStorage.getItem("pixelPetData")) ||
  { ...defaultData };

const cat = document.getElementById("pixelCat");
const petZone = document.getElementById("petZone");
const speech = document.getElementById("speech");
const effect = document.getElementById("floatingEffect");

let busy = false;

function save() {
  localStorage.setItem("pixelPetData", JSON.stringify(data));
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

  updateFace();
  save();
}

function setStat(name, value) {
  document.getElementById(name + "Bar").style.width = value + "%";
  document.getElementById(name + "Text").textContent = Math.round(value);
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
      duration: 950
    }
  );

  setTimeout(() => {
    effect.textContent = "";
  }, 950);
}

function walkTo(position) {
  petZone.style.left = position;
}

function returnCenter(delay = 1000) {
  setTimeout(() => {
    petZone.style.left = "50%";
  }, delay);
}

function updateFace() {
  const eyes = document.querySelectorAll(".eye");

  if (data.energy < 20) {
    eyes.forEach(eye => {
      eye.style.height = "3px";
      eye.style.top = "28px";
    });
  } else {
    eyes.forEach(eye => {
      eye.style.height = "8px";
      eye.style.top = "24px";
    });
  }
}

cat.addEventListener("click", () => {
  if (busy) return;

  data.happiness = clamp(data.happiness + 5);

  cat.classList.add("happy");

  showEffect("♥");
  say("prrr...");

  setTimeout(() => {
    cat.classList.remove("happy");
  }, 1600);

  gainXP(3);
  updateUI();
});

document.getElementById("foodBowl").addEventListener("click", () => {
  if (busy) return;

  busy = true;

  walkTo("31%");

  setTimeout(() => {
    say("nom nom");
    showEffect("♪");

    data.hunger = clamp(data.hunger + 28);
    data.happiness = clamp(data.happiness + 4);

    gainXP(10);
    updateUI();
  }, 850);

  returnCenter(2000);

  setTimeout(() => {
    busy = false;
  }, 2800);
});

document.getElementById("ball").addEventListener("click", () => {
  if (busy) return;

  if (data.energy < 15) {
    say("too tired...");
    return;
  }

  busy = true;

  const ballBody = document.querySelector(".ball-body");

  ballBody.animate(
    [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(-100px) rotate(180deg)" },
      { transform: "translateX(0) rotate(360deg)" }
    ],
    {
      duration: 1300
    }
  );

  walkTo("61%");

  cat.classList.add("happy");

  showEffect("★");
  say("play!");

  data.happiness = clamp(data.happiness + 20);
  data.energy = clamp(data.energy - 12);
  data.hunger = clamp(data.hunger - 5);

  gainXP(15);

  setTimeout(() => {
    cat.classList.remove("happy");
  }, 1500);

  returnCenter(1700);

  setTimeout(() => {
    busy = false;
    updateUI();
  }, 2300);
});

document.getElementById("bed").addEventListener("click", () => {
  if (busy) return;

  busy = true;

  walkTo("14%");

  setTimeout(() => {
    cat.classList.add("sleeping");
    say("zzz...", 3000);
    showEffect("Z");
  }, 700);

  setTimeout(() => {
    data.energy = clamp(data.energy + 35);
    data.hunger = clamp(data.hunger - 7);

    gainXP(8);

    cat.classList.remove("sleeping");

    say("morning!");
    returnCenter(100);

    updateUI();
  }, 3600);

  setTimeout(() => {
    busy = false;
  }, 4600);
});

document.getElementById("bath").addEventListener("click", () => {
  if (busy) return;

  busy = true;

  walkTo("85%");

  setTimeout(() => {
    say("splash!");
    showEffect("✦");

    data.cleanliness = clamp(data.cleanliness + 40);
    data.happiness = clamp(data.happiness + 3);

    gainXP(8);

    updateUI();
  }, 850);

  returnCenter(2100);

  setTimeout(() => {
    busy = false;
  }, 2900);
});

function gainXP(amount) {
  data.xp += amount;

  if (data.xp >= 100) {
    data.xp -= 100;
    data.level++;
    data.coins += 50;

    setTimeout(() => {
      say("LEVEL UP!");
      showEffect("★");
    }, 500);
  }
}

function renamePet() {
  const newName = prompt("Pet name:", data.name);

  if (!newName) return;

  data.name = newName.trim().substring(0, 12);

  updateUI();
}

function resetPet() {
  const confirmed = confirm("Reset your pet progress?");

  if (!confirmed) return;

  data = { ...defaultData };

  updateUI();
  say("new game!");
}

const randomMessages = [
  "meow",
  "mrrp",
  "...",
  "play?",
  "food?",
  "pet me"
];

setInterval(() => {
  if (busy) return;

  if (Math.random() < 0.4) {
    const text =
      randomMessages[
        Math.floor(Math.random() * randomMessages.length)
      ];

    say(text);
  }
}, 9000);

setInterval(() => {
  data.hunger = clamp(data.hunger - 1.5);
  data.happiness = clamp(data.happiness - 0.6);
  data.energy = clamp(data.energy - 0.8);
  data.cleanliness = clamp(data.cleanliness - 0.5);

  updateUI();
}, 60000);

updateUI();
