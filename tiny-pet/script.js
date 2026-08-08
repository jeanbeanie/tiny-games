// Tiny Pet v0.5

const TICK_INTERVAL = 5000; // update every 5 seconds while open
const STORAGE_KEY = "tiny_pet_v0.5";
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
    Lonely: {
        flavor: (name) => `${name} looks around… like they were waiting for you.`,
    },
    Distant: {
        flavor: (name) => `${name} doesn't seem as excited to see you.`,
    },
    Attached: {
        flavor: (name) => `${name} lights up the moment you appear.`,
    },
};

let pet = loadGame();
let lastMood = null;

// UI Elements
const petNameDisplay = document.getElementById("pet-name");
const petNameInput = document.getElementById("pet-name-input");
const faceDisplay = document.getElementById("pet-face");
const bondLevelDisplay = document.getElementById("pet-bond-level");
const petMoodDisplay = document.getElementById("pet-mood");
const petFlavorTextDisplay = document.getElementById("pet-flavor-text");
const petStageDisplay = document.getElementById("pet-stage");
const hungerBar = document.getElementById("hunger-bar");
const happinessBar = document.getElementById("happiness-bar");
const energyBar = document.getElementById("energy-bar");

const feedButton = document.getElementById("feed-btn");
const playButton = document.getElementById("play-btn");
const sleepButton = document.getElementById("sleep-btn");
const resetPetLink = document.getElementById("reset-pet-link");


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
    const timeSinceLastInteraction = now - pet.lastInteractionAt;
    // hours since last interaction
    const hours = timeSinceLastInteraction / (1000 * 60 * 60);

    if (hours > 6) { // if no interaction in last 6 hours, increase neglect score
        pet.neglectScore += 1;
        // cut care score in half if neglecting for long time
        pet.careScore *= 0.5;
    } else { // if any interaction recently, give tiny care score boost
        pet.careScore += 0.1;
    }

    updateUI();
    saveGame();
    checkGameOver();
    if (Math.random() < 0.1) { // 10% chance for random event each tick
        triggerRandomEvent();
    }
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
    if (pet.neglectScore > 10) return "Lonely";
    if (pet.neglectScore > 5) return "Distant";

    if (pet.stats.hunger === 0 || pet.stats.happiness === 0) return "Neglected";
    if (pet.stats.energy < 20) return "Exhausted";
    if (pet.stats.hunger < 25) return "Hungry";
    if (pet.stats.happiness > 80 && pet.careScore > 100) return "Attached";
    if (pet.stats.happiness > 80) return "Happy";
    return "Okay";
}
function getPetFlavorText() {
    const mood = getPetMood();
    const config = MOOD_CONFIG[mood];
    return config ? config.flavor(pet.name) : "";
}

function checkGameOver() {
    if (pet.neglectScore > 20) {
        alert(`${pet.name} waited and waited...but eventually it wandered away.`);
        resetPet();
    }
}

function updateUI() {
    petNameDisplay.textContent = pet.name;

    hungerBar.style.width = pet.stats.hunger + "%";
    happinessBar.style.width = pet.stats.happiness + "%";
    energyBar.style.width = pet.stats.energy + "%";

    faceDisplay.textContent = returnFaceContent();
    bondLevelDisplay.textContent = `Bond: ${Math.floor(pet.careScore - pet.neglectScore)}`;

    const mood = getPetMood();
    petMoodDisplay.textContent = mood;
    petStageDisplay.textContent = getStageFlavorText(pet.stage);

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
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    } catch {
        // storage unavailable or full; skip saving for now
    }
}

function loadGame() {
    let saved;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch {
        return getDefaultPetState();
    }
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
        stage: "egg", // egg, child, adult
		stats: { // stats range from 0 to 100
            hunger: 80,     
            happiness: 80,
            energy: 80,
        },
        lastUpdatedAt: Date.now(),
        careScore: 0,
        neglectScore: 0,
        lastInteractionAt: Date.now(),
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
    const minutes = elapsedMs / 60000; // 60000ms = 1 minute

    // pet ages
    growPet();

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

const disableButtonAfterClick = (key, button, duration = 1000) => {
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
    if (age < 50) return "egg";
    if (age < 150) return "child";
    return "adult";
}

function growPet() {
    const prevStage = pet.stage
    pet.age += 1;
    pet.stage = getStageByAge(pet.age);

    if (prevStage !== pet.stage) {
        setTemporaryFlavor(`${pet.name} grew into ${getStageFlavorText(pet.stage)}...they seem different`, 5000);
        pet.careScore += 5; // bonding boost for growing up
    }
}

function getStageFlavorText(stage) {
    if (stage === "egg") return "🥚 Egg";
    if (stage === "child") return "🐣 Child";
    return "🐾 Adult";
}

function handleInteraction() {
    pet.lastInteractionAt = Date.now();
    pet.careScore += 1;
}

function triggerRandomEvent() {
    const events = [
        `${pet.name} attempts a clumsy front flip.`,
        `${pet.name} stares intently at something invisible.`,
        `${pet.name} sneezes and wiggles its nose.`,
        `${pet.name} looks around curiously.`,
        `${pet.name} scratches behind its ear.`,
        `${pet.name} seems to be entertained by its own shadow.`,
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    setTemporaryFlavor(event, 4000);
}

// button handlers
resetPetLink.addEventListener("click", resetPet);

petNameDisplay.addEventListener("click", () => {
    petNameInput.style.display = "block";
    petNameDisplay.style.display = "none";

    petNameInput.value = pet.name;
    petNameInput.focus();
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
    handleInteraction();
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
    handleInteraction();
    disableButtonAfterClick("play", playButton);
    setTemporaryFlavor(`${pet.name} plays enthusiastically.`);
    updateUI();
    saveGame();
});

sleepButton.addEventListener("click", () => {
    pet.stats.energy += 15;
    pet.stats.happiness += 5;

    clampStats();
    handleInteraction();
    disableButtonAfterClick("sleep", sleepButton);
    setTemporaryFlavor(`${pet.name} blinks and starts gently snoring.`);
    updateUI();
    saveGame();
});

initGame();