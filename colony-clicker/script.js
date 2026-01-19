// Version: v0.3

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
const foodDisplay = document.getElementById('food-gathered');
const maxFoodDisplay = document.getElementById('max-food-count');
const woodDisplay = document.getElementById('wood-gathered');
const fieldsDisplay = document.getElementById('fields-count');
const housingDisplay = document.getElementById('housing-count');
const shedDisplay = document.getElementById('shed-count');
const populationDisplay = document.getElementById('population-count');
const maxPopulationDisplays = document.getElementsByClassName('max-population-count');
const foodGainDisplay = document.getElementById('food-gain-per-tick');
const foodLossDisplay = document.getElementById('food-loss-per-tick');

const gatherFoodBtn = document.getElementById('gather-food-btn');
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
    }
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
    const foodPerColonist = getFoodPerColonist();
    const foodConsumption = gameState.population.count * foodPerColonist;

    // generate food from fields
    const foodFromFields = gameState.buildings.fields * foodPerField;
    gameState.resources.food.count += foodFromFields;
   
    // colonists consuming food
    gameState.resources.food.count -= foodConsumption;

    // Clamp resources => constrain food btwn 0 to max storage capacity
    gameState.resources.food.count = clamp(gameState.resources.food.count, 0, gameState.resources.food.max);

    // if food surplus exists, chance to +1 population
    if (gameState.resources.food.count >= foodConsumption && gameState.population.count < gameState.population.max) {
        if (Math.random() < 0.3) { // 30% chance to grow 
            gameState.population.count += 1;
        }
    }
   
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
        // todo increase max storage for all resources
        gameState.resources.food.max += shedStorageIncrease; // increase food storage cap
        updateUI();
    }
});

function updateUI() {
    const foodPerColonist = getFoodPerColonist();
    const foodConsumption = gameState.population.count * foodPerColonist;

    foodDisplay.textContent = gameState.resources.food.count;
    maxFoodDisplay.textContent = gameState.resources.food.max;
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

    // disable buttons if not enough resources
    buildFieldBtn.disabled = gameState.resources.wood.count < fieldCost;
    buildHouseBtn.disabled = gameState.resources.wood.count < housingCost;
    buildShedBtn.disabled = gameState.resources.wood.count < shedCost;
    gatherFoodBtn.disabled = gameState.resources.food.count >= gameState.resources.food.max;
}

// Initial UI update
updateUI();