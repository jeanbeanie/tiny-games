// Version: v0.6

// ======================
// CONFIG / CONSTANTS
// ======================

const TICK_INTERVAL = 3000;
const SAVE_KEY = "colonySave_v0.6";

//todo refactor costs and effects into data structures
const COSTS = {
    field: 10,
    house: 20,
    shed: 50,
};

const EFFECTS = {
    foodPerField: 2,
    populationPerHouse: 2,
    shedStorageBonus: 50,
};

const GRANARY = {
    cost: 90,
    foodStorageBonus: 150,

    // TODO v0.7: Colonist roles may affect spoilage chance
    // TODO v0.7: Granary workers reduce food loss instead of chance
    spoilage: {
        thresholdRatio: 0.7, // % of max food when spoilage starts
        chancePerTick: 0.08, // chance of spoilage occurring per tick when above threshold
        lossAmount: 8, // amount of food lost when spoilage occurs, todo make it a range
        mitigationPerGranary: 0.03, // reduction in chance per granary
    }
}

// Resources per click
// potential constant var candidates
let foodPerClick = 1;
let woodPerClick = 1;


// ======================
// GAME STATE
// ======================

let gameState = createNewGameState();

function createNewGameState() {
    return {
        tick: 0,
        statusMessage: null,
        statusUntilTick: 0,
        resources: {
            food: {
                count: 0,
                max: 100, // todo calculate based on buildings
            },
            wood: {
                count: 0,
                max: 100, // todo calculate based on buildings
            },
        },
        buildings: {
            fields: 0,
            houses: 0,
            sheds: 0,
            granaries: 0,
        },
        population: {
            count: 1,
            max: 1, // todo calculate based on houses
            starvationTicks: 0,
        },
        events: {
            active: null,
            history: {}, // eventID: lastTickOccurred
        },
    }
}

// Save and Load
function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
        gameState = JSON.parse(saved);
    } catch {
        gameState = createNewGameState();
    }
}

function abandonColony() {
    localStorage.removeItem(SAVE_KEY);
    gameState = createNewGameState();
    saveGame();
    updateUI();
}

// ======================
// CORE SYSTEMS (tick logic)
// ======================
function setTemporaryStatus(message, durationTicks = 2) {
    gameState.statusMessage = message;
    gameState.statusUntilTick = gameState.tick + durationTicks;
}
function getFoodPerColonist() {
    // base consumption is 50% of a colonist
    const base = Math.ceil(gameState.population.count * 0.5);

    // sheds reduce food consumption by 5% each
    // todo cap reduction
    const reduction = gameState.buildings.sheds * 0.05;
    return Math.max(1, Math.floor(base * (1 - reduction)));
}

const getTotalFoodConsumption = () => {
    return gameState.population.count * getFoodPerColonist();
}

function advanceEconomy() {
    // Produce food
    gameState.resources.food.count += gameState.buildings.fields * EFFECTS.foodPerField;
    clampResource(gameState.resources.food);
}
function clampResource(resource) {
    const { count, max } = resource;
    resource.count = Math.max(0, Math.min(max, count));
}

const advancePopulation = () => {
    const consumption = getTotalFoodConsumption();
    const hasFoodSurplus = gameState.resources.food.count >= consumption;
    const hasHousingSpace = gameState.population.count < gameState.population.max;

    // consume food
    gameState.resources.food.count -= consumption;
    // why does clamping here cause gameState.resources.food.count to not update properly??
    //clampResource(gameState.resources.food);

    // chance to +1 population if the conditions are right
    if (hasFoodSurplus && hasHousingSpace && Math.random() < 0.3) {
        gameState.population.count++;
        setTemporaryStatus("A new colonist has joined the colony!");
        showFeedbackTooltip(populationDisplay, "+1 👥");
    }
};

function checkStarvation() {
    if (gameState.resources.food.count > 0) {
        gameState.population.starvationTicks = 0;
        return;
    }

    gameState.population.starvationTicks++;

    if (gameState.population.starvationTicks >= 5) {
        gameState.population.count--;
        gameState.population.starvationTicks = 0;
        setTemporaryStatus("A colonist has starved to death.");
        showFeedbackTooltip(populationDisplay, "-1 💀");
        if (gameState.population.count <= 0) {
            abandonColony();
            alert("Your colony has fallen.");
        }
    }
}

function checkFoodSpoilage() {
    const food = gameState.resources.food;
    const threshold = food.max * GRANARY.spoilage.thresholdRatio;

    if (food.count > threshold) {
        //reduce spoilage chance based on granaries owned
        const mitigation = gameState.buildings.granaries * GRANARY.spoilage.mitigationPerGranary;
        const spoilageChance = Math.max(0, GRANARY.spoilage.chancePerTick - mitigation);
        
        if (Math.random() < spoilageChance) {
            gameState.resources.food.count -= GRANARY.spoilage.lossAmount;
            clampResource(gameState.resources.food);
            // refactor : event system
            triggerSpoilageEvent();
        }
    }
}


function tick() {
    gameState.tick++
    // todo : potentially pause while event is active
    //if (gameState.events.active) return;

   
    advancePopulation();
    advanceEconomy();
    checkFoodSpoilage();
    checkStarvation();
    checkForEvents();

    // clamp resources after all changes
    clampResource(gameState.resources.food);
    clampResource(gameState.resources.wood);
    saveGame();
    updateUI();
}



// ======================
// EVENTS SYSTEM
// ======================
function triggerSpoilageEvent() {
    setTemporaryStatus("Some food has spoiled in storage.");
    showFeedbackTooltip(foodDisplay, `- ${GRANARY.spoilage.lossAmount} 🌽`);
}

function getEventById(id) {
    return events.find(e => e.id === id) || null;
}

function checkForEvents() {
    // guard against multiple events
    if (gameState.events.active) return;

    for (const event of events) {
        const lastTick = gameState.events.history[event.id] || 0;
        //console.log('checking event', event.id, 'lastTick:', lastTick, 'currentTick:', gameState.tick); 
        if (gameState.tick - lastTick < event.cooldown) continue; // still in cooldown

        if (event.trigger()) {
            triggerEvent(event);
            //console.log('event triggered', event)
            break;
        }
    }
}

function triggerEvent(event) {
    gameState.events.active = event.id;
    gameState.events.history[event.id] = gameState.tick;
   
    renderActiveEvent(event);
}

const renderActiveEvent = (event) => {
    eventDescription.textContent = event.text;
    eventChoice1.textContent = event.choices[0].label;
    eventChoice1.onclick = () => {
        resolveEventChoice(event, 0);
    };
    eventChoice2.textContent = event.choices[1].label;
    eventChoice2.onclick = () => {
        resolveEventChoice(event, 1);
    };
    eventBox.style.display = 'block';
}

function resolveEventChoice(event, choiceIndex) {
    event.choices[choiceIndex].effect();
    gameState.events.active = null;
    eventBox.style.display = 'none';
    saveGame();
    updateUI();
}

const events = [
    {
        id: "hungry_travelers",
        cooldown: 40,
        trigger() {
            return gameState.resources.food.count > 20 &&
                Math.random() < 0.05;
        },
        text: "Hungry travelers pass by your colony. They ask you to spare some food. One wants to join your colony.",
        choices: [
            {   // NOTE: choice should be disabled when population is full (future UX improvement)
                // todo allow overflow population with penalties later
                label: "Share food and welcome them (+1 population, -10 food)",
                effect() {
                    if (gameState.population.count < gameState.population.max && gameState.resources.food.count >= 10) {
                        gameState.resources.food.count -= 10;
                        gameState.population.count += 1;
                    }
                }
            },
            {
                label: "Turn them away",
                effect() {
                    // nothing happens
                    // TODO maybe something bad DOES happen later. Like revenge.
                }
            }
        ]
    },
    {
        id: "worn_tools",
        cooldown: 50,
        trigger() {
            return gameState.resources.wood.count > 20 &&
                Math.random() < 0.05;
        },
        text: "Your gathering tools are wearing down. Productivity will suffer if they're not replaced.",
        choices: [
            {
                label: "Spend wood to repair tools",
                effect() {
                    if (gameState.resources.wood.count >= 10) {
                        gameState.resources.wood.count -= 10;
                    }
                }
            },
            {
                label: "Ignore it",
                effect() {
                    // TODO productivity penalty at a later time
                }
            }
        ]
    },
    {
        id: "small_fire",
        cooldown: 30,
        trigger() {
            return gameState.buildings.sheds >= 1 &&
                Math.random() < 0.05;
        },
        text: "A small fire breaks out near a storage shed!",
        choices: [
            {
                label: "Use wood to smother the flames (-10 wood)",
                effect() {
                    if (gameState.resources.wood.count >= 10) {
                        gameState.resources.wood.count -= 10;
                    }
                    // todo one person has a chance to die fighting the fire
                }
            },
            {
                label: "Ignore it",
                effect() {
                    if (gameState.buildings.sheds > 0) {
                        gameState.buildings.sheds -= 1;

                        // decrease storage capacity
                        gameState.resources.food.max -= EFFECTS.shedStorageBonus;
                        gameState.resources.wood.max -= EFFECTS.shedStorageBonus;

                        setTemporaryStatus("A storage shed was lost to the fire.");
                        showFeedbackTooltip(shedDisplay, "-1 🛖");
                    }
                }
            }
        ]
    }
];

// ======================
// UI + INPUT
// ======================


const colonyStatus = document.getElementById('colony-status');
const eventBox = document.getElementById('event-box');
const eventDescription = document.getElementById('event-description');
const eventChoice1 = document.getElementById('event-choice-1'); // todo better naming
const eventChoice2 = document.getElementById('event-choice-2');

const foodDisplay = document.getElementById('food-gathered');
const maxFoodDisplay = document.getElementById('max-food-count');
const maxWoodDisplay = document.getElementById('max-wood-count');
const woodDisplay = document.getElementById('wood-gathered');
const fieldsDisplay = document.getElementById('fields-count');
const housingDisplay = document.getElementById('housing-count');
const shedDisplay = document.getElementById('shed-count');
const granaryDisplay = document.getElementById('granary-count');
const populationDisplay = document.getElementById('population-count');
const maxPopulationDisplays = document.getElementsByClassName('max-population-count');
const foodGainDisplay = document.getElementById('food-gain-per-tick');
const foodLossDisplay = document.getElementById('food-loss-per-tick');

const gatherFoodBtn = document.getElementById('gather-food-btn');
const gatherWoodBtn = document.getElementById('gather-wood-btn');
const buildFieldBtn = document.getElementById('build-field-btn');
const buildHouseBtn = document.getElementById('build-house-btn');
const buildShedBtn = document.getElementById('build-shed-btn');
const buildGranaryBtn = document.getElementById('build-granary-btn');

function showFeedbackTooltip(targetElement, text) {
    const tooltip= document.createElement("span");
    tooltip.className = "feedback-tooltip";
    tooltip.textContent = text;

    const rect = targetElement.getBoundingClientRect();

    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.top = (rect.top - 20) + "px";

    document.body.appendChild(tooltip);

    setTimeout(() => {
        tooltip.remove();
    }, 600);
}

// Event Listeners

gatherFoodBtn.addEventListener('click', () => {
    gameState.resources.food.count += foodPerClick;
    showFeedbackTooltip(gatherFoodBtn, `+${foodPerClick} 🌽`);
    saveGame();
    updateUI();
});

document.getElementById('gather-wood-btn').addEventListener('click', () => {
    gameState.resources.wood.count += woodPerClick;
    showFeedbackTooltip(gatherWoodBtn, `+${woodPerClick} 🪵`);
    saveGame();
    updateUI();
});

buildFieldBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.field) {
        gameState.resources.wood.count -= COSTS.field;
        gameState.buildings.fields += 1;
        saveGame();
        updateUI();
    }
});

buildHouseBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.house) {
        gameState.resources.wood.count -= COSTS.house;
        gameState.buildings.houses += 1;
        // todo create func to apply effects
        gameState.population.max += EFFECTS.populationPerHouse;
        saveGame();
        updateUI();
    }
});

buildShedBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.shed) {
        gameState.resources.wood.count -= COSTS.shed;
        gameState.buildings.sheds += 1;

        // increase storage capacity
        gameState.resources.food.max += EFFECTS.shedStorageBonus;
        gameState.resources.wood.max += EFFECTS.shedStorageBonus;
        saveGame();
        updateUI();
    }
});

buildGranaryBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= GRANARY.cost) {
        gameState.resources.wood.count -= GRANARY.cost;
        gameState.buildings.granaries += 1;

        // increase food storage capacity
        gameState.resources.food.max += GRANARY.foodStorageBonus;
        saveGame();
        updateUI();
    }
});

function updateUI() {
    foodDisplay.textContent = gameState.resources.food.count;
    maxFoodDisplay.textContent = gameState.resources.food.max;
    maxWoodDisplay.textContent = gameState.resources.wood.max;
    woodDisplay.textContent = gameState.resources.wood.count;
    fieldsDisplay.textContent = gameState.buildings.fields;
    housingDisplay.textContent = gameState.buildings.houses;
    shedDisplay.textContent = gameState.buildings.sheds;
    granaryDisplay.textContent = gameState.buildings.granaries;
    populationDisplay.textContent = gameState.population.count;
    foodGainDisplay.textContent = gameState.buildings.fields * EFFECTS.foodPerField;
    foodLossDisplay.textContent = getTotalFoodConsumption();

    for (let elem of maxPopulationDisplays) {
        elem.textContent = gameState.population.max;
    }

    const foodSurplus = gameState.resources.food.count - getTotalFoodConsumption();

    // update colony status text
    // todo extract to function
    let status = "";
    if (gameState.resources.food.count === 0) {
        status = "The colony is starving, we need more food!";
    } else if (foodSurplus < 10*gameState.population.count) {
        status = "The colony is surviving...just barely.";
    } else if (foodSurplus > 0 && gameState.population.count < gameState.population.max) {
        status = "The colony is thriving (space available).";
    } else {
        // todo future event where the status first subtly says "the colony is stable...lets fix that",
        // and it means something horrible is about to happen.
        status = "The colony is stable.";
    }

    if (gameState.resources.food.count == gameState.resources.food.max) {
        status += " Food storage is full! It's hard keeping food fresh.";
    }

    // show temporary status messages over default status
    if (gameState.statusMessage && gameState.tick <= gameState.statusUntilTick) {
        colonyStatus.textContent = gameState.statusMessage;
    } else {
        gameState.statusMessage = null;
        colonyStatus.textContent = status;
    }

    //eventBox.style.display = gameState.events.active ? 'block' : 'none';
    // disable buttons if not enough resources
    buildFieldBtn.disabled = gameState.resources.wood.count < COSTS.field;
    buildHouseBtn.disabled = gameState.resources.wood.count < COSTS.house;
    buildShedBtn.disabled = gameState.resources.wood.count < COSTS.shed;
    buildGranaryBtn.disabled = gameState.resources.wood.count < GRANARY.cost;
    gatherFoodBtn.disabled = gameState.resources.food.count >= gameState.resources.food.max;
    gatherWoodBtn.disabled = gameState.resources.wood.count >= gameState.resources.wood.max;
}

// ======================
// START THE GAME
// ======================

loadGame();
if (gameState.events.active) {
    const event = getEventById(gameState.events.active);
    if (event) {
        renderActiveEvent(event);
    } else {
        // safety: invalid event id
        gameState.events.active = null;
    }
}
setInterval(tick, TICK_INTERVAL);

// Initial UI update
updateUI();
