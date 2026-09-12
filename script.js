const defaultPet = {
  name: "Mochi",
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
  coins: 100,
  xp: 0,
  level: 1,
  lastUpdate: Date.now()
};

let pet = loadPet();

function loadPet() {
  const saved = localStorage.getItem("virtualPet");

  if (saved) {
    const data = JSON.parse(saved);
    applyOfflineDecay(data);
    return data;
  }

  return { ...defaultPet };
}

function savePet() {
  pet.lastUpdate = Date.now();
  localStorage.setItem("virtualPet", JSON.stringify(pet));
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function applyOfflineDecay(data) {
  const now = Date.now();
  const last = data.lastUpdate || now;

  const minutesAway = Math.floor((now - last) / 60000);

  if (minutesAway <= 0) return;

  const decay = Math.min(minutesAway, 30);

  data.hunger = clamp(data.hunger - decay * 0.6);
  data.happiness = clamp(data.happiness - decay * 0.3);
  data.energy = clamp(data.energy - decay * 0.4);
  data.cleanliness = clamp(data.cleanliness - decay * 0.25);

  data.lastUpdate = now;
}

function updateUI() {
  document.getElementById("petName").textContent = pet.name;

  document.getElementById("hungerText").textContent =
    Math.round(pet.hunger) + "%";

  document.getElementById("happinessText").textContent =
    Math.round(pet.happiness) + "%";

  document.getElementById("energyText").textContent =
    Math.round(pet.energy) + "%";

  document.getElementById("cleanlinessText").textContent =
    Math.round(pet.cleanliness) + "%";

  document.getElementById("hungerBar").style.width =
    pet.hunger + "%";

  document.getElementById("happinessBar").style.width =
    pet.happiness + "%";

  document.getElementById("energyBar").style.width =
    pet.energy + "%";

  document.getElementById("cleanlinessBar").style.width =
    pet.cleanliness + "%";

  document.getElementById("coins").textContent = pet.coins;
  document.getElementById("xp").textContent = pet.xp;
  document.getElementById("level").textContent = pet.level;

  updateMood();
  updateStatus();

  savePet();
}

function updateMood() {
  const emoji = document.getElementById("petEmoji");
  const mood = document.getElementById("petMood");

  if (pet.hunger <= 20) {
    emoji.textContent = "🙀";
    mood.textContent = `${pet.name} is very hungry!`;
    return;
  }

  if (pet.energy <= 20) {
    emoji.textContent = "😿";
    mood.textContent = `${pet.name} is exhausted.`;
    return;
  }

  if (pet.cleanliness <= 20) {
    emoji.textContent = "😾";
    mood.textContent = `${pet.name} needs a bath.`;
    return;
  }

  if (pet.happiness <= 20) {
    emoji.textContent = "😿";
    mood.textContent = `${pet.name} wants some attention.`;
    return;
  }

  if (
    pet.hunger >= 75 &&
    pet.happiness >= 75 &&
    pet.energy >= 75 &&
    pet.cleanliness >= 75
  ) {
    emoji.textContent = "😻";
    mood.textContent = `${pet.name} is feeling amazing!`;
    return;
  }

  emoji.textContent = "🐱";
  mood.textContent = `${pet.name} is doing okay.`;
}

function updateStatus() {
  const status = document.getElementById("status");

  const average =
    (pet.hunger +
      pet.happiness +
      pet.energy +
      pet.cleanliness) / 4;

  if (average >= 75) {
    status.textContent = "Great";
  } else if (average >= 50) {
    status.textContent = "Healthy";
  } else if (average >= 25) {
    status.textContent = "Needs Attention";
  } else {
    status.textContent = "Critical";
  }
}

function addXP(amount) {
  pet.xp += amount;

  if (pet.xp >= 100) {
    pet.xp -= 100;
    pet.level++;
    pet.coins += 50;

    alert(
      `Level up! ${pet.name} is now level ${pet.level}. You earned 50 coins!`
    );
  }
}

function feedPet() {
  if (pet.coins < 10) {
    alert("You don't have enough coins to buy food!");
    return;
  }

  pet.coins -= 10;
  pet.hunger = clamp(pet.hunger + 25);
  pet.happiness = clamp(pet.happiness + 3);

  addXP(10);

  showAction(`${pet.name} enjoyed the food! 🍗`);

  updateUI();
}

function playPet() {
  if (pet.energy < 15) {
    showAction(`${pet.name} is too tired to play.`);
    return;
  }

  pet.happiness = clamp(pet.happiness + 20);
  pet.energy = clamp(pet.energy - 12);
  pet.hunger = clamp(pet.hunger - 5);

  pet.coins += 5;

  addXP(15);

  showAction(`${pet.name} had fun playing! 🎾`);

  updateUI();
}

function sleepPet() {
  pet.energy = clamp(pet.energy + 35);
  pet.hunger = clamp(pet.hunger - 8);

  addXP(8);

  showAction(`${pet.name} had a nice nap. 😴`);

  updateUI();
}

function cleanPet() {
  pet.cleanliness = clamp(pet.cleanliness + 40);
  pet.happiness = clamp(pet.happiness + 5);

  addXP(8);

  showAction(`${pet.name} is clean and fresh! 🫧`);

  updateUI();
}

function renamePet() {
  const newName = prompt("What should your pet be called?", pet.name);

  if (!newName) return;

  const cleanName = newName.trim();

  if (cleanName.length === 0) return;

  pet.name = cleanName.substring(0, 15);

  updateUI();
}

function showAction(message) {
  const mood = document.getElementById("petMood");

  mood.textContent = message;

  setTimeout(() => {
    updateMood();
  }, 1500);
}

function naturalDecay() {
  pet.hunger = clamp(pet.hunger - 1);
  pet.happiness = clamp(pet.happiness - 0.5);
  pet.energy = clamp(pet.energy - 0.7);
  pet.cleanliness = clamp(pet.cleanliness - 0.4);

  updateUI();
}

document.getElementById("petEmoji").addEventListener("click", () => {
  pet.happiness = clamp(pet.happiness + 2);

  showAction(`${pet.name} loves the head pats! 💕`);

  updateUI();
});

setInterval(naturalDecay, 60000);

updateUI();
