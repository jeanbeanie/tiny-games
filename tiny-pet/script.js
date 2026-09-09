// Tiny Pet v0.6

const TICK_INTERVAL = 5000; // update every 5 seconds while open
const STORAGE_KEY = "tiny_pet_save";
const SAVE_VERSION = 1; // bump only when getDefaultPetState()'s shape changes meaningfully
const MAX_ELAPSED_MS = 1000 * 60 * 60 * 24; // 24 hours

// pet.age accumulates in real minutes elapsed (online or offline), not tick count
const CHILD_AGE_MINUTES = 180; // 3 hours
const ADULT_AGE_MINUTES = 1440; // 24 hours

// neglect is derived live from time since last interaction, not stored/accumulated
const NEGLECT_GRACE_HOURS = 6; // no penalty within this window
const NEGLECT_GAME_OVER_HOURS = 24; // hours past the grace period before the pet is lost
const RECOVERY_WINDOW_HOURS = 24; // time for neglect to fully ease off once you're back
const CARE_RATE_PER_MINUTE = 1.2; // bonding trickle while not neglected

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

let pet = getDefaultPetState();
let lastMood = null;

// UI Elements
// undefined outside a browser, so script.js can be required from a node test
let petNameDisplay, petNameInput, faceDisplay, bondLevelDisplay, petMoodDisplay,
    petFlavorTextDisplay, petStageDisplay, hungerBar, happinessBar, energyBar,
    feedButton, playButton, sleepButton, resetPetLink;

if (typeof document !== "undefined") {
    petNameDisplay = document.getElementById("pet-name");
    petNameInput = document.getElementById("pet-name-input");
    faceDisplay = document.getElementById("pet-face");
    bondLevelDisplay = document.getElementById("pet-bond-level");
    petMoodDisplay = document.getElementById("pet-mood");
    petFlavorTextDisplay = document.getElementById("pet-flavor-text");
    petStageDisplay = document.getElementById("pet-stage");
    hungerBar = document.getElementById("hunger-bar");
    happinessBar = document.getElementById("happiness-bar");
    energyBar = document.getElementById("energy-bar");

    feedButton = document.getElementById("feed-btn");
    playButton = document.getElementById("play-btn");
    sleepButton = document.getElementById("sleep-btn");
    resetPetLink = document.getElementById("reset-pet-link");
}


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

    // small bonding trickle while you're within the grace window; checked directly against
    // the interaction time rather than getNeglectHours(), since that can stay above 0 for a
    // while after you interact if it's still fading out from an earlier stretch of neglect
    const hoursSinceInteraction = (now - pet.lastInteractionAt) / (1000 * 60 * 60);
    if (hoursSinceInteraction <= NEGLECT_GRACE_HOURS) {
        pet.careScore += (elapsed / 60000) * CARE_RATE_PER_MINUTE;
    }

    updateUI();
    saveGame();
    checkGameOver();
    if (Math.random() < 0.1) { // 10% chance for random event each tick
        triggerRandomEvent();
    }
}
function initGame() {
    pet = loadGame();

	// in case save file is corrupted
    if (!pet.lastUpdatedAt) {
        pet.lastUpdatedAt = Date.now();
    }
    tick();
}

const returnFaceContent = () => {
    if (pet.stats.energy === 0) return "😵";
    if (pet.stats.happiness === 0) return "😭";
    if (pet.stats.hunger === 0) return "🥺";

    if (pet.stats.hunger < 25 || pet.stats.energy < 25) return "😩";
    if (pet.stats.happiness < 30) return "😐";

    return "😊";
};
function getNeglectHours() {
    const hoursSinceInteraction = (Date.now() - pet.lastInteractionAt) / (1000 * 60 * 60);

    // the neglect present when you last checked in fades out over the recovery window...
    const recoveryProgress = Math.min(1, hoursSinceInteraction / RECOVERY_WINDOW_HOURS);
    const fadingResidual = pet.neglectAtLastInteraction * (1 - recoveryProgress);

    // ...while fresh neglect starts building again once the grace period passes
    const freshNeglect = Math.max(0, hoursSinceInteraction - NEGLECT_GRACE_HOURS);

    return Math.max(fadingResidual, freshNeglect);
}

function getPetMood() {
    if (getNeglectHours() > 12) return "Lonely";
    if (getNeglectHours() > 6) return "Distant";

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
    if (getNeglectHours() > NEGLECT_GAME_OVER_HOURS) {
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
    bondLevelDisplay.textContent = `Bond: ${Math.floor(pet.careScore - getNeglectHours())}`;

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        saveVersion: SAVE_VERSION,
        state: pet,
    }));
}

function loadGame() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPetState();

    // catches malformed/null JSON
    try {
        const { state } = JSON.parse(raw);
        const defaults = getDefaultPetState();
        return {
            ...defaults,
            ...state,
            stats: { ...defaults.stats, ...state?.stats },
        };
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
        lastInteractionAt: Date.now(),
        neglectAtLastInteraction: 0,
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
    growPet(minutes);

	// Stats decrease over time
	pet.stats.hunger -= minutes * DECAY_RATES.hunger;
    pet.stats.energy -= minutes * DECAY_RATES.energy;
    pet.stats.happiness -= minutes * DECAY_RATES.happiness;

    clampStats();
}

// Briefly show flavor text for actions
function setTemporaryFlavor(text, duration = 2000) {
    if (!petFlavorTextDisplay) return; // no op outside a browser

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
    if (age < CHILD_AGE_MINUTES) return "egg";
    if (age < ADULT_AGE_MINUTES) return "child";
    return "adult";
}

function growPet(minutes) {
    const prevStage = pet.stage
    pet.age += minutes;
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
    // grab this now, before lastInteractionAt (which it depends on) gets reset below
    pet.neglectAtLastInteraction = getNeglectHours();
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

// button handlers and game start, browser only
if (typeof document !== "undefined") {

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

setInterval(tick, TICK_INTERVAL);
initGame();

} // end browser only guard

// exposed for script.test.js, undefined in the browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        pet, getDefaultPetState, getStageByAge, growPet,
        getNeglectHours, getPetMood, applyTimeEffects, clampStats, handleInteraction,
    };
}
