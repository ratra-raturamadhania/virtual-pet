const defaultPet = {
  name: "Mochi",
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
  level: 1,
  xp: 0,
  coins: 100
};

let petData =
  JSON.parse(localStorage.getItem("mochiPet")) || {...defaultPet};

const pet = document.getElementById("pet");
const petWrapper = document.getElementById("petWrapper");
const speech = document.getElementById("speech");
const effect = document.getElementById("effect");

function save() {
  localStorage.setItem("mochiPet", JSON.stringify(petData));
}

function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function update() {
  document.getElementById("petName").textContent = petData.name;
  document.getElementById("level").textContent = petData.level;
  document.getElementById("coins").textContent = petData.coins;

  document.getElementById("hungerBar").style.width =
    petData.hunger + "%";

  document.getElementById("happyBar").style.width =
    petData.happiness + "%";

  document.getElementById("energyBar").style.width =
    petData.energy + "%";

  document.getElementById("cleanBar").style.width =
    petData.cleanliness + "%";

  updateMood();

  save();
}

function say(text) {
  speech.textContent = text;
  speech.classList.remove("hidden");

  clearTimeout(window.speechTimer);

  window.speechTimer = setTimeout(() => {
    speech.classList.add("hidden");
  }, 1800);
}

function showEffect(symbol) {
  effect.textContent = symbol;

  effect.animate(
    [
      {opacity: 1, transform: "translate(-50%,0) scale(.7)"},
      {opacity: 1, transform: "translate(-50%,-25px) scale(1.2)"},
      {opacity: 0, transform: "translate(-50%,-60px) scale(.8)"}
    ],
    {
      duration: 900
    }
  );

  setTimeout(() => {
    effect.textContent = "";
  }, 900);
}

function updateMood() {
  if (petData.energy < 20) {
    pet.textContent = "😿";
    return;
  }

  if (petData.hunger < 20) {
    pet.textContent = "🙀";
    return;
  }

  if (petData.happiness > 85) {
    pet.textContent = "😻";
    return;
  }

  pet.textContent = "🐱";
}

/* PETTING */

pet.addEventListener("click", () => {
  petData.happiness = clamp(petData.happiness + 4);

  showEffect("💗");
  say("prrrr ♡");

  pet.classList.add("happy");

  setTimeout(() => {
    pet.classList.remove("happy");
  }, 1500);

  update();
});

/* DRAG ITEMS */

document.querySelectorAll(".item").forEach(item => {

  item.addEventListener("dragstart", event => {
    event.dataTransfer.setData(
      "item",
      item.dataset.item
    );
  });

});

petWrapper.addEventListener("dragover", event => {
  event.preventDefault();
});

petWrapper.addEventListener("drop", event => {

  event.preventDefault();

  const item =
    event.dataTransfer.getData("item");

  if (item === "food") {
    eatFood("🍗", 25);
  }

  if (item === "fish") {
    eatFood("🐟", 35);
  }

  if (item === "ball") {
    playBall();
  }

});

function eatFood(food, amount) {

  petData.hunger =
    clamp(petData.hunger + amount);

  petData.happiness =
    clamp(petData.happiness + 5);

  showEffect(food);

  say("nom nom!");

  pet.classList.add("happy");

  setTimeout(() => {
    pet.classList.remove("happy");
  }, 1200);

  gainXP(10);

  update();
}

function playBall() {

  if (petData.energy < 15) {
    say("too tired...");
    return;
  }

  petData.happiness =
    clamp(petData.happiness + 20);

  petData.energy =
    clamp(petData.energy - 12);

  petData.hunger =
    clamp(petData.hunger - 5);

  showEffect("🎾");

  say("play!!");

  pet.classList.add("happy");

  setTimeout(() => {
    pet.classList.remove("happy");
  }, 1500);

  gainXP(15);

  update();
}

/* BED */

document.getElementById("bed").addEventListener("click", () => {

  petWrapper.style.left = "18%";
  petWrapper.style.bottom = "80px";

  pet.classList.add("sleeping");

  pet.textContent = "😴";

  say("zzz...");

  showEffect("💤");

  setTimeout(() => {

    petData.energy =
      clamp(petData.energy + 35);

    petData.hunger =
      clamp(petData.hunger - 7);

    pet.classList.remove("sleeping");

    petWrapper.style.left = "50%";
    petWrapper.style.bottom = "82px";

    gainXP(8);

    update();

    say("good morning!");

  }, 3000);

});

/* BATH */

document.getElementById("bath").addEventListener("click", () => {

  petWrapper.style.left = "82%";

  showEffect("🫧");

  say("splash!");

  petData.cleanliness =
    clamp(petData.cleanliness + 40);

  petData.happiness =
    clamp(petData.happiness + 4);

  setTimeout(() => {
    petWrapper.style.left = "50%";
  }, 1500);

  gainXP(8);

  update();
});

/* LEVEL */

function gainXP(amount) {

  petData.xp += amount;

  if (petData.xp >= 100) {

    petData.xp -= 100;

    petData.level++;

    petData.coins += 50;

    say("level up! ⭐");

    showEffect("⭐");
  }
}

/* RENAME */

function renamePet() {

  const name =
    prompt("Name your pet:", petData.name);

  if (!name) return;

  petData.name =
    name.trim().substring(0, 14);

  update();
}

/* PET TALKS RANDOMLY */

const messages = [
  "meow~",
  "pet me!",
  "i'm bored...",
  "hello human ♡",
  "food?",
  "mrrp!"
];

setInterval(() => {

  if (Math.random() < .35) {

    const random =
      messages[Math.floor(Math.random() * messages.length)];

    say(random);
  }

}, 10000);

/* NATURAL DECAY */

setInterval(() => {

  petData.hunger =
    clamp(petData.hunger - 2);

  petData.happiness =
    clamp(petData.happiness - 1);

  petData.energy =
    clamp(petData.energy - 1);

  petData.cleanliness =
    clamp(petData.cleanliness - .7);

  update();

}, 60000);

update();
