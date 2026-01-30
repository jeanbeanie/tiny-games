// Version: v0.6


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
        lossAmount: 8, // amount of food lost when spoilage occurs
        mitigationPerGranary: 0.03, // reduction in chance per granary
    }
}

// Resources per click
// potential constant var candidates
let foodPerClick = 1;
let woodPerClick = 1;


// UI Elements
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

// Game State
let gameState = createNewGameState();

function createNewGameState() {
    return {
        tick: 0,
        resources: {
            food: {
                count: 0,
                max: 100,
            },
            wood: {
                count: 0,
                max: 100,
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
            max: 1,
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

// Game Tick - Resource Consumption

function getFoodPerColonist() {
    // base consumption is 50% of a colonist
    const base = Math.ceil(gameState.population.count * 0.5);

    // sheds reduce food consumption by 5% each
    // todo cap reduction
    const reduction = gameState.buildings.sheds * 0.05;
    return Math.max(1, Math.floor(base * (1 - reduction)));
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
function getFoodConsumption() {
    return gameState.population.count * getFoodPerColonist();
}

const advancePopulation = () => {
    const consumption = getFoodConsumption();
    gameState.resources.food.count -= consumption;

    // if excess food, chance to +1 population
    if (gameState.resources.food.count >= consumption &&
        gameState.population.count < gameState.population.max &&
        Math.random() < 0.3) {
        gameState.population.count++;
    }
};

function checkStarvation() {
    if (gameState.resources.food.count > 0) {
        gameState.population.starvationTicks = 0;
        return;
    }

    gameState.population.starvationTicks++;

    if (gameState.population.starvationTicks >= 3) {
        gameState.population.count--;
        gameState.population.starvationTicks = 0;

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

function triggerSpoilageEvent() {
    console.log("Food spoilage event triggered");
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
loadGame();
setInterval(tick, TICK_INTERVAL);

// Event Listeners

gatherFoodBtn.addEventListener('click', () => {
    gameState.resources.food.count += foodPerClick;
    saveGame();
    updateUI();
});

document.getElementById('gather-wood-btn').addEventListener('click', () => {
    gameState.resources.wood.count += woodPerClick;
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
    const foodPerColonist = getFoodPerColonist();
    const foodConsumption = gameState.population.count * foodPerColonist;

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
    foodLossDisplay.textContent = foodConsumption;

    for (let elem of maxPopulationDisplays) {
        elem.textContent = gameState.population.max;
    }

    const foodSurplus = gameState.resources.food.count - foodConsumption;

    // update colony status text
    let status = "";
    if (gameState.resources.food.count === 0) {
        status = "The colony is starving.";
    } else if (foodSurplus < 10*gameState.population.count) {
        status = "The colony is surviving...just barely.";
    } else if (foodSurplus > 0 && gameState.population.count < gameState.population.max) {
        status = "The colony is growing (space available).";
    } else {
        status = "The colony is stable.";
    }

    if (gameState.resources.food.count == gameState.resources.food.max) {
        status += " Food storage is full!";
    }

    colonyStatus.textContent = status;
    // todo BUG : eventIsActive not updating properly
    eventBox.style.display = gameState.events.active ? 'block' : 'none';
    // disable buttons if not enough resources
    buildFieldBtn.disabled = gameState.resources.wood.count < COSTS.field;
    buildHouseBtn.disabled = gameState.resources.wood.count < COSTS.house;
    buildShedBtn.disabled = gameState.resources.wood.count < COSTS.shed;
    buildGranaryBtn.disabled = gameState.resources.wood.count < GRANARY.cost;
    gatherFoodBtn.disabled = gameState.resources.food.count >= gameState.resources.food.max;
    gatherWoodBtn.disabled = gameState.resources.wood.count >= gameState.resources.wood.max;
}

// Initial UI update
updateUI();

// Events
function checkForEvents() {
    // guard against multiple events
    if (gameState.events.active) return;

    for (const event of events) {
        const lastTick = gameState.events.history[event.id] || 0;
        //console.log('checking event', event.id, 'lastTick:', lastTick, 'currentTick:', gameState.tick); 
        if (gameState.tick - lastTick < event.cooldown)  continue; // still in cooldown
        
        if (event.trigger()) {
            triggerEvent(event);
            console.log('event triggered', event)
            break; 
        }
    }
}

function triggerEvent(event) {
    gameState.events.active = event.id;
    gameState.events.history[event.id] = gameState.tick;

    eventDescription.textContent = event.text;
    eventChoice1.textContent = event.choices[0].label;
    eventChoice1.onclick = () => {
        event.choices[0].effect(); // todo clamp after effects
        gameState.events.active = null;
        saveGame();
        updateUI();
    };
    eventChoice2.textContent = event.choices[1].label;
    eventChoice2.onclick = () => {
        event.choices[1].effect();
        gameState.events.active = null;
        saveGame();
        updateUI();
    };

}

const events = [
    {
        id: "hungry_travelers",
        cooldown: 10, // in ticks (not implemented yet)
        trigger() {
            return gameState.resources.food.count > 20 &&
                Math.random() < 0.05;
        },
        text: "Hungry travelers pass by your colony. They ask you to spare some food. One wants to join your colony.",
        choices: [
            {   // NOTE: choice should be disabled when population is full (future UX improvement)
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
        cooldown: 10,
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
        cooldown: 10,
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
                    }
                }
            }
        ]
    }
];