// Version: v0.4

// Resources per click
let foodPerClick = 1;
let woodPerClick = 1;

let fieldCost = 10;
let foodPerField = 2; // per tick
let housingCost = 20;
let populationPerHouse = 2;
let shedCost = 50;
let shedStorageIncrease = 50;

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
const populationDisplay = document.getElementById('population-count');
const maxPopulationDisplays = document.getElementsByClassName('max-population-count');
const foodGainDisplay = document.getElementById('food-gain-per-tick');
const foodLossDisplay = document.getElementById('food-loss-per-tick');

const gatherFoodBtn = document.getElementById('gather-food-btn');
const gatherWoodBtn = document.getElementById('gather-wood-btn');
const buildFieldBtn = document.getElementById('build-field-btn');
const buildHouseBtn = document.getElementById('build-house-btn');
const buildShedBtn = document.getElementById('build-shed-btn');

// Game State
let gameState = {
    resources: {
        food: {
            count: 0,
            max: 100,
        },
        wood: {
            count: 0,
            max: 100,
        },
        stone: {
            count: 0,
            max: 100,
        },
        gold: {
            count: 0,
            max: 100,
        }
    },
    buildings: {
        fields: 0,
        houses: 0,
        sheds: 0,
    },
    population: {
        count: 1,
        max: 1,
    },
    eventIsActive: false,
}
// Game Tick - Resource Consumption


let tickInterval = 3000; // 3 seconds

function getFoodPerColonist() {
    const base = Math.ceil(gameState.population.count * 0.5);
    // sheds reduce food consumption by 5% each
    // todo cap reduction
    const reduction = gameState.buildings.sheds * 0.05;
    return Math.max(1, Math.floor(base * (1 - reduction)));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

setInterval(() => {
    // todo : potentially pause while event is active
    //if (gameState.eventIsActive) return;

    const foodPerColonist = getFoodPerColonist();
    const foodConsumption = gameState.population.count * foodPerColonist;

    // generate food from fields
    const foodFromFields = gameState.buildings.fields * foodPerField;
    gameState.resources.food.count += foodFromFields;
   
    // colonists consuming food
    gameState.resources.food.count -= foodConsumption;

    // Clamp resources => constrain to btwn 0 to max storage capacity
    gameState.resources.food.count = clamp(gameState.resources.food.count, 0, gameState.resources.food.max);
    gameState.resources.wood.count = clamp(gameState.resources.wood.count, 0, gameState.resources.wood.max);

    // if food surplus exists, chance to +1 population
    if (gameState.resources.food.count >= foodConsumption && gameState.population.count < gameState.population.max) {
        if (Math.random() < 0.3) { // 30% chance to grow 
            gameState.population.count += 1;
        }
    }

    //check for events
    checkForEvents();
   
    updateUI();
}, tickInterval);

// Event Listeners

gatherFoodBtn.addEventListener('click', () => {
    gameState.resources.food.count += foodPerClick;
    updateUI();
});

document.getElementById('gather-wood-btn').addEventListener('click', () => {
    gameState.resources.wood.count += woodPerClick;
    updateUI();
});

buildFieldBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= fieldCost) {
        gameState.resources.wood.count -= fieldCost;
        gameState.buildings.fields += 1;
        updateUI();
    }
});

buildHouseBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= housingCost) {
        gameState.resources.wood.count -= housingCost;
        gameState.buildings.houses += 1;
        gameState.population.max += populationPerHouse;
        updateUI();
    }
});

buildShedBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= shedCost) {
        gameState.resources.wood.count -= shedCost;
        gameState.buildings.sheds += 1;

        // increase storage capacity
        gameState.resources.food.max += shedStorageIncrease;
        gameState.resources.wood.max += shedStorageIncrease;
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
    populationDisplay.textContent = gameState.population.count;
    foodGainDisplay.textContent = gameState.buildings.fields * foodPerField;
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
    eventBox.style.display = gameState.eventIsActive ? 'block' : 'none';
    // disable buttons if not enough resources
    buildFieldBtn.disabled = gameState.resources.wood.count < fieldCost;
    buildHouseBtn.disabled = gameState.resources.wood.count < housingCost;
    buildShedBtn.disabled = gameState.resources.wood.count < shedCost;
    gatherFoodBtn.disabled = gameState.resources.food.count >= gameState.resources.food.max;
    gatherWoodBtn.disabled = gameState.resources.wood.count >= gameState.resources.wood.max;
}

// Initial UI update
updateUI();

// Events
function checkForEvents() {
    // guard against multiple events
    if (gameState.eventIsActive) return;

    for (let event of events) {
        if (event.trigger()) {
            triggerEvent(event);
            console.log('event triggered', event)
            break; // only one event active at a time
        }
    }
}

function triggerEvent(event) {
    gameState.eventIsActive = true;
    eventDescription.textContent = event.text;
    eventChoice1.textContent = event.choices[0].label;
    eventChoice1.onclick = () => {
        event.choices[0].effect(); // todo clamp after effects
        gameState.eventIsActive = false;
        updateUI();
    };
    eventChoice2.textContent = event.choices[1].label;
    eventChoice2.onclick = () => {
        event.choices[1].effect();
        gameState.eventIsActive = false;
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
                    if (gameState.population.count < gameState.population.max) {
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