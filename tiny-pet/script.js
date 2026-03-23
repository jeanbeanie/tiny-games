// Tiny Pet v0.3

const TICK_INTERVAL = 5000; // update every 5 seconds while open
const STORAGE_KEY = "tiny_pet_v0.3";
const MAX_ELAPSED_MS = 1000 * 60 * 60 * 24; // 24 hours

const MOOD_CONFIG = {
    Neglected: {
        flavor: (name) => `${name} is in desperate need of care.`,
    },
    Exhausted: {
        flavor: (name) => `${name} curls up and yawns loudly.`,
    },
    Hungry: {
        flavor: (name) => `${name}'s stomach makes a loud growl.`,
    },
    Happy: {
        flavor: (name) => `${name} smiles at you and wags their tail.`,
    },
    Okay: {
        flavor: (name) => `${name} is just chillin.`,
    },
};

let pet = loadGame();
let lastMood = null;

// UI Elements
const petNameDisplay = document.getElementById("pet-name");
const petNameInput = document.getElementById("pet-name-input");
const faceDisplay = document.getElementById("pet-face");
const petMoodDisplay = document.getElementById("pet-mood");
const petFlavorTextDisplay = document.getElementById("pet-flavor-text");
const hungerBar = document.getElementById("hunger-bar");
const happinessBar = document.getElementById("happiness-bar");
const energyBar = document.getElementById("energy-bar");

const feedButton = document.getElementById("feed-btn");
const playButton = document.getElementById("play-btn");
const sleepButton = document.getElementById("sleep-btn");


function resetPet() {
    pet = getDefaultPetState();
    pet.lastUpdatedAt = Date.now();
    saveGame();
    updateUI();
}   

function tick() {
    const now = Date.now();
    const elapsed = Math.min(now - pet.lastUpdatedAt, MAX_ELAPSED_MS);

    applyTimeEffects(elapsed);
    pet.lastUpdatedAt = now;

    updateUI();
    saveGame();
    checkGameOver();
}
function initGame() {
	// in case save file is corrupted
    if (!pet.lastUpdatedAt) {
        pet.lastUpdatedAt = Date.now();
    }
    tick();
}

setInterval(tick, TICK_INTERVAL);

const returnFaceContent = () => {
    if (pet.stats.energy === 0) return "😵";
    if (pet.stats.happiness === 0) return "😭";
    if (pet.stats.hunger === 0) return "🥺";

    if (pet.stats.hunger < 25 || pet.stats.energy < 25) return "😩";
    if (pet.stats.happiness < 30) return "😐";

    return "😊";
};
function getPetMood() {
    if (pet.stats.hunger === 0 || pet.stats.happiness === 0) return "Neglected";
    if (pet.stats.energy < 20) return "Exhausted";
    if (pet.stats.hunger < 25) return "Hungry";
    if (pet.stats.happiness > 80) return "Happy";
    return "Okay";
}
function getPetFlavorText() {
    const mood = getPetMood();
    const config = MOOD_CONFIG[mood];
    return config ? config.flavor(pet.name) : "";
}

function checkGameOver() {
    const zeroStats = Object.values(pet.stats).filter(v => v === 0).length;
    if (zeroStats >= 2) {
        alert(`${pet.name} feels too neglected and wanders off...`);
        resetPet();
    }
}

function updateUI() {
    console.log("Pet stats:", pet.stats);
    petNameDisplay.textContent = pet.name;

    hungerBar.style.width = pet.stats.hunger + "%";
    happinessBar.style.width = pet.stats.happiness + "%";
    energyBar.style.width = pet.stats.energy + "%";

    faceDisplay.textContent = returnFaceContent();

    const mood = getPetMood();
    petMoodDisplay.textContent = mood;
    // only update flavor text if mood changed
    if(mood !== lastMood) {
        petFlavorTextDisplay.textContent = getPetFlavorText();
        lastMood = mood;
    }

    // disable buttons if stats are full/empty without overriding temporary disable
    feedButton.disabled = buttonCooldowns.feed || pet.stats.hunger >= 95;
    playButton.disabled = buttonCooldowns.play || pet.stats.energy < 15;
    sleepButton.disabled = buttonCooldowns.sleep || pet.stats.energy >= 95;
}

// Save and load pet state
function saveGame() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
}

function loadGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getDefaultPetState();

    try {
        return JSON.parse(saved);
    } catch {
        return getDefaultPetState();
    }
}


// for when no pet exists
function getDefaultPetState() {
    return {
        name: "Bean",
        age: 0,
        stahe: "egg", // egg, child, adult
		stats: { // stats range from 0 to 100
            hunger: 80,     
            happiness: 80,
            energy: 80,
        },
        lastUpdatedAt: Date.now(),
    };
}

// Apply clamping to ensure stats stay within 0-100
function clampStats() {
    for (let key in pet.stats) {
        pet.stats[key] = Math.max(0, Math.min(100, pet.stats[key]));
    }
}

// life is hard
const DECAY_RATES = {
    hunger: 0.5,
    energy: 0.3,
    happiness: 0.7,
};
function applyTimeEffects(elapsedMs) {
    const minutes = elapsedMs / 60000;

	// Stats decrease over time
	pet.stats.hunger -= minutes * DECAY_RATES.hunger;
    pet.stats.energy -= minutes * DECAY_RATES.energy;
    pet.stats.happiness -= minutes * DECAY_RATES.happiness;

    clampStats();
}

// Briefly show flavor text for actions
function setTemporaryFlavor(text, duration = 2000) {
    petFlavorTextDisplay.textContent = text;
    setTimeout(() => {
        petFlavorTextDisplay.textContent = getPetFlavorText();
    }, duration);
}

const buttonCooldowns = {
    feed: false,
    play: false,
    sleep: false,
};

disableButtonAfterClick = (key, button, duration = 1000) => {
    buttonCooldowns[key] = true;
    button.disabled = true;

    setTimeout(() => {
        buttonCooldowns[key] = false;
        updateUI(); // re-evaluate button states
    }, duration);
};

function saveName() {
    pet.name = petNameInput.value.trim() || "Noname";

    petNameInput.style.display = "none";
    petNameDisplay.style.display = "block";
    updateUI();
    saveGame();
}

function getStageByAge(age) {
    if (age < 5) return "egg";
    if (age < 15) return "child";
    return "adult";
}

// button handlers
petNameDisplay.addEventListener("click", () => {
    petNameInput.style.display = "block";
    petNameDisplay.style.display = "none";

    petNameInput.value = pet.name;
    nameInput.focus();
});

petNameInput.addEventListener("blur", saveName);

petNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        saveName();
    }
});

feedButton.addEventListener("click", () => {
    pet.stats.hunger += 15;
    pet.stats.happiness += 5;

    clampStats();
    disableButtonAfterClick("feed", feedButton);
    setTemporaryFlavor(`${pet.name} happily munches on the mango.`);
    updateUI();
    saveGame();
});

playButton.addEventListener("click", () => {
    pet.stats.energy -= 15;
    pet.stats.hunger -= 10;
    pet.stats.happiness += 15;

    clampStats();
    disableButtonAfterClick("play", playButton);
    setTemporaryFlavor(`${pet.name} plays enthusiastically.`);
    updateUI();
    saveGame();
});

sleepButton.addEventListener("click", () => {
    pet.stats.energy += 15;
    pet.stats.happiness += 5;

    clampStats();
    disableButtonAfterClick("sleep", sleepButton);
    setTemporaryFlavor(`${pet.name} blinks and starts gently snoring.`);
    updateUI();
    saveGame();
});

initGame();