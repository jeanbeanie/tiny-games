// Version: v0.9

// ======================
// CONFIG / CONSTANTS
// ======================

const TICK_INTERVAL = 3000;
const SAVE_KEY = "colonySave_v0.9";

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

    // TODO v0.9: Colonist roles may affect spoilage chance
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

let flashedThisTick = new Set();

function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function capitalizeFirstLetter(string) {
    if (!string) return ""; // Handle empty or invalid input
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// ======================
// GAME STATE
// ======================

let gameState = createNewGameState();

// todo: difficulty casual/hardcore...
function createNewGameState() {
    return {
        tick: 0,
        statusMessage: null,
        statusUntilTick: 0,
        land: {
            total: 1000,
            explored: 100,
            unexplored: 900,

            foodRemaining: 50,
            woodRemaining: 100,
            buildable: 1,
        },
        resources: {
            food: {
                count: 15, //
                max: 100,
            },
            wood: {
                count: 5,
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
            max: 1, // todo calculate based on houses
            starvationTicks: 0,
        },
        events: {
            active: null,
            history: {}, // eventID: lastTickOccurred
        },
        workers: {
            food: 0,
            wood: 0,
            explore: 0,
            build: 0,
        },
        construction: {
            active: null // or an object when building {type:string progress:int workRequired:int}
        },
        colonistAssignmentUnlocked:false,
    }
}

// Save and Load
function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

function loadGame() {
    // TODO add migration guards for future versions
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
        gameState = JSON.parse(saved);
    } catch {
        gameState = createNewGameState();
    }
}

function scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
}

function resetColony() {
    localStorage.removeItem(SAVE_KEY);
    eventBox.style.display = 'none';
    gameState = createNewGameState();
    saveGame();
    updateUI();
    setTimeout(scrollToTop, 0);
}

function abandonColony() {
  if(confirm('Are you really sure you want to abandon your colony?')){
    resetColony();
  }
}

// ======================
// CORE SYSTEMS (tick logic)
// ======================

function getAssignedWorkers() {
    const { workers } = gameState;
    return workers.food + workers.wood + workers.explore + workers.build;
}

function getIdleWorkers() {
    return gameState.population.count - getAssignedWorkers();
}

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

function advanceWorkerGathering() {
    const foodWorkers = gameState.workers.food;
    const woodWorkers = gameState.workers.wood;

    const foodGain = Math.min(
        foodWorkers,
        gameState.land.foodRemaining
    );

    const woodGain = Math.min(
        woodWorkers,
        gameState.land.woodRemaining
    );

    gameState.resources.food.count += foodGain;
    gameState.resources.wood.count += woodGain;

    gameState.land.foodRemaining -= foodGain;
    gameState.land.woodRemaining -= woodGain;
}
function advanceEconomy() {
    // Passively produce food
    // TODO fields should either take food from discovered land, 
    //or require a worker to upkeep instead of making food out of thin air
    gameState.resources.food.count += gameState.buildings.fields * EFFECTS.foodPerField;

    // Workers gather resources
    advanceWorkerGathering();

    flashOncePerTick("food", foodDisplays[0].closest(".resource"));
    clampResource(gameState.resources.food);
}
function clampResource(resource) {
    const { count, max } = resource;
    resource.count = Math.max(0, Math.min(max, count));
}
function advanceExploration() {
    const explorers = gameState.workers.explore;
    if (explorers <= 0 || gameState.land.unexplored <= 0) return;

    const rawDiscoverable = explorers * randomIntBetween(5, 10);
    // limit discoverable land to remaining unexplored land
    const discovered = Math.min(rawDiscoverable, gameState.land.unexplored);

    gameState.land.explored += discovered;
    gameState.land.unexplored -= discovered;

    gameState.land.foodRemaining += Math.floor(discovered * 0.2);
    gameState.land.woodRemaining += Math.floor(discovered * 0.3);
    gameState.land.buildable += Math.floor(discovered * 0.05);
}

const advancePopulation = () => {
    const consumption = getTotalFoodConsumption();
    // consume food
    gameState.resources.food.count -= consumption;
    flashOncePerTick("food", foodDisplays[0].closest(".resource"));

    const hasFoodSurplus = gameState.resources.food.count >= 0;
    const hasHousingSpace = gameState.population.count < gameState.population.max;

    // random chance to +1 population if the conditions are right
    if (hasFoodSurplus && hasHousingSpace && Math.random() < 0.3) {
        gameState.population.count++;

        // unlocker worker assignment when pop hits 2 for the first time
        if (!gameState.colonistAssignmentUnlocked) {
            gameState.colonistAssignmentUnlocked = true;
        }
        setTemporaryStatus("A new colonist has joined the colony!");
        showFeedbackTooltip(populationDisplays[0].closest(".resource"), "+1 👥");
    }
};

function advanceConstruction() {
    const project = gameState.construction.active;
    if (!project) return;

    project.progress += gameState.workers.build;

    if (project.progress >= project.workRequired) {
        completeConstruction(project);
    }
}

function completeConstruction(project) {
    // todo refactor to use building data structure instead of hardcoding each type
    if (project.type === "field") {
        gameState.buildings.fields += 1;
    }
    else if (project.type === "house") {
        gameState.buildings.houses += 1;
        gameState.population.max += EFFECTS.populationPerHouse;
    }
    else if (project.type === "shed") {
        gameState.buildings.sheds += 1;
        gameState.resources.food.max += EFFECTS.shedStorageBonus;
        gameState.resources.wood.max += EFFECTS.shedStorageBonus;
    }
    else if (project.type === "granary") {
        gameState.buildings.granaries += 1;
        gameState.resources.food.max += GRANARY.foodStorageBonus;
    }
    gameState.construction.active = null;
    // unassign all builders when construction completes
    gameState.workers.build = 0;
    setTemporaryStatus("Construction completed!");
}

function checkStarvation() {
    if (gameState.resources.food.count > 0) {
        gameState.population.starvationTicks = 0;
        return;
    }

    gameState.population.starvationTicks++;

    if (gameState.population.starvationTicks >= 5) {
        gameState.population.count--;
        gameState.population.starvationTicks = 0;

        // unassign starved colonist from workers. his or her job is done.
        while (getAssignedWorkers() > gameState.population.count) {
            if (gameState.workers.explore > 0) gameState.workers.explore--;
            else if (gameState.workers.build > 0) gameState.workers.build--;
            else if (gameState.workers.wood > 0) gameState.workers.wood--;
            else if (gameState.workers.food > 0) gameState.workers.food--;
        }
        //todo specify which colonist role died : "A woodcutter has starved to death." etc
        setTemporaryStatus("A colonist has starved to death.");
        showFeedbackTooltip(populationDisplays[0].closest(".resource"), "-1 💀");

        if (gameState.population.count <= 0) {
            alert("Your colony has fallen.");
            resetColony();
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
            flashOncePerTick("food", foodDisplays[0].closest(".resource"));
            clampResource(gameState.resources.food);
            // refactor : event system
            triggerSpoilageEvent();
        }
    }
}
function flashResource(element) {
    element.classList.add("flash");
    setTimeout(() => element.classList.remove("flash"), 150);
}
function flashOncePerTick(resourceKey, element) {
    if (flashedThisTick.has(resourceKey)) return;
    flashedThisTick.add(resourceKey);
    flashResource(element);
}

function tick() {
    flashedThisTick.clear();
    gameState.tick++
    // todo : potentially pause while event is active
    //if (gameState.events.active) return;

   
    advancePopulation();
    advanceEconomy();
    advanceConstruction();
    advanceExploration();
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
    showFeedbackTooltip(foodDisplays[0].closest(".resource"), `- ${GRANARY.spoilage.lossAmount} 🌽`);
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
    const choice = event.choices[choiceIndex];
    if (choice.requirementsMet()) { choice.effect() };
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
            { 
                // todo allow overflow population with penalties later
                label: "Share food and welcome them (+1 population, -10 food)",
                requirementsMet: () => gameState.population.count < gameState.population.max && gameState.resources.food.count >= 10,
                effect() {
                        gameState.resources.food.count -= 10;
                        flashOncePerTick("food", foodDisplays[0].closest(".resource"));
                        gameState.population.count += 1;
                        if (!gameState.colonistAssignmentUnlocked) {
                            gameState.colonistAssignmentUnlocked = true;
                        }
                }
            },
            {
                label: "Turn them away",
                requirementsMet: () => true,
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
                requirementsMet: () => gameState.resources.wood.count >= 10,
                effect() {
                        gameState.resources.wood.count -= 10;                  
                }
            },
            {
                label: "Ignore it",
                requirementsMet: () => true,
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
                requirementsMet : () => gameState.resources.wood.count >= 10,
                effect() {  
                    gameState.resources.wood.count -= 10;
                    // todo one person has a chance to die fighting the fire
                }
            },
            {
                label: "Ignore it",
                requirementsMet: () => true,
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
const assignColonistsDiv = document.getElementById('assign-colonists-div');
const clickConstructionUI = document.getElementById('click-construction-ui');

const foodDisplays = document.getElementsByClassName('food-gathered');
const maxFoodDisplays = document.getElementsByClassName('max-food-count');
const maxWoodDisplays = document.getElementsByClassName('max-wood-count');
const woodDisplays = document.getElementsByClassName('wood-gathered');
const populationDisplays = document.getElementsByClassName('population-count');
const maxPopulationDisplays = document.getElementsByClassName('max-population-count');
const exploredLandDisplay = document.getElementById('explored-land');
const totalLandDisplay = document.getElementById('total-land');

const fieldsDisplay = document.getElementById('fields-count');
const housingDisplay = document.getElementById('housing-count');
const shedDisplay = document.getElementById('shed-count');
const granaryDisplay = document.getElementById('granary-count');

const foodGainDisplay = document.getElementById('food-gain-per-tick');
const foodLossDisplay = document.getElementById('food-loss-per-tick');
const foodWorkersDisplay = document.getElementById('food-workers');
const woodWorkersDisplay = document.getElementById('wood-workers');
const exploreWorkersDisplay = document.getElementById('explore-workers');
const buildWorkersDisplay = document.getElementById('build-workers');
const idleWorkersDisplay = document.getElementById('idle-workers');

const foodPlusBtn = document.getElementById('food-plus-btn');
const foodMinusBtn = document.getElementById('food-minus-btn');
const woodPlusBtn = document.getElementById('wood-plus-btn');
const woodMinusBtn = document.getElementById('wood-minus-btn');
const explorePlusBtn = document.getElementById('explore-plus-btn');
const exploreMinusBtn = document.getElementById('explore-minus-btn');
const buildMinusBtn = document.getElementById('build-minus-btn');
const buildPlusBtn = document.getElementById('build-plus-btn');

const clickConstructionBtn = document.getElementById('click-construction-btn');
const constructionProgressDisplay = document.getElementById('construction-progress');
const constructionTypeDisplay = document.getElementById('construction-type');
const constructionRequiredDisplay = document.getElementById('construction-required');

const gatherFoodBtn = document.getElementById('gather-food-btn');
const gatherWoodBtn = document.getElementById('gather-wood-btn');
const exploreLandBtn = document.getElementById('explore-land-btn');
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


const buttonCooldowns = {
  exploreLand: false,
  gatherWood: false,
  workOnConstruction: false,
};

disableButtonAfterClick = (key, button, duration = 1000) => {
    buttonCooldowns[key] = true;
    button.disabled = true;
    setTimeout(() => {
        buttonCooldowns[key] = false;
        updateUI(); // re-evaluate button states
    }, duration);
};

// Event Listeners

clickConstructionBtn.addEventListener('click', () => {
    const project = gameState.construction.active;
    if (!project) return;

    project.progress += 1;
    showFeedbackTooltip(clickConstructionBtn, "+1 🔨");

    if (project.progress >= project.workRequired) {
        completeConstruction(project);
    }

    disableButtonAfterClick("workOnConstruction", clickConstructionBtn, 3000);
    saveGame();
    updateUI();
});

gatherFoodBtn.addEventListener('click', () => {
    if (gameState.land.foodRemaining <= 0) return;

    gameState.resources.food.count += foodPerClick;
    gameState.land.foodRemaining -= foodPerClick;

    if (gameState.land.foodRemaining === 0) {
        setTemporaryStatus("All nearby food sources have been picked clean!");
    }

    showFeedbackTooltip(gatherFoodBtn, `+${foodPerClick} 🌽`);
    saveGame();
    updateUI();
});

gatherWoodBtn.addEventListener('click', () => {
    if (gameState.land.woodRemaining <= 0) return;

    gameState.resources.wood.count += woodPerClick;
    gameState.land.woodRemaining -= woodPerClick;

    if (gameState.land.woodRemaining === 0) {
        setTemporaryStatus("All nearby wood sources have been picked clean!");
    }

    disableButtonAfterClick("gatherWood", gatherWoodBtn, 1000);
    showFeedbackTooltip(gatherWoodBtn, `+${woodPerClick} 🪵`);
    saveGame();
    updateUI();
});



exploreLandBtn.addEventListener('click', () => {
    if (gameState.land.unexplored <= 0) return;

    // Future improvement: simulate biome diversity with different probabilities for food/wood/buildable land
    //  and maybe unique events / resources for each biome
    // Future: mini game for exploration
    const unclampedDiscovered = randomIntBetween(30, 80);
    const discovered = Math.min(unclampedDiscovered, gameState.land.unexplored);
    const foodFound = randomIntBetween(10, 40);
    const woodFound = randomIntBetween(20, 60);
    const buildableFound = randomIntBetween(2, 4);

    gameState.land.explored += discovered;
    gameState.land.unexplored -= discovered;

    gameState.land.foodRemaining += foodFound;
    gameState.land.woodRemaining += woodFound;
    gameState.land.buildable += buildableFound;

    console.log(`Discovered: ${discovered}, Food: ${foodFound}, Wood: ${woodFound}, Buildable: ${buildableFound}`);

    disableButtonAfterClick("exploreLand", exploreLandBtn, 20000);
    setTemporaryStatus("New land has been explored.");
    saveGame();
    updateUI();
});

foodPlusBtn.addEventListener("click", () => {
    if (getIdleWorkers() <= 0) return;
    gameState.workers.food++;
    saveGame();
    updateUI();
});

foodMinusBtn.addEventListener("click", () => {
    if (gameState.workers.food <= 0) return;
    gameState.workers.food--;
    saveGame();
    updateUI();
});

woodPlusBtn.addEventListener("click", () => {
    if (getIdleWorkers() <= 0) return;
    gameState.workers.wood++;
    saveGame();
    updateUI();
});

woodMinusBtn.addEventListener("click", () => {
    if (gameState.workers.wood <= 0) return;
    gameState.workers.wood--;
    saveGame();
    updateUI();
});

explorePlusBtn.addEventListener("click", () => {
    if (getIdleWorkers() <= 0) return;
    gameState.workers.explore++;
    saveGame();
    updateUI();
});

exploreMinusBtn.addEventListener("click", () => {
    if (gameState.workers.explore <= 0) return;
    gameState.workers.explore--;
    saveGame();
    updateUI();
});

buildMinusBtn.addEventListener("click", () => {
    if (gameState.workers.build <= 0) return;
    gameState.workers.build--;
    saveGame();
    updateUI();
});

buildPlusBtn.addEventListener("click", () => {
    if (getIdleWorkers() <= 0) return;
    gameState.workers.build++;
    saveGame();
    updateUI();
});


buildFieldBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.field) {
        if (gameState.construction.active || gameState.land.buildable <= 0) return;

        gameState.resources.wood.count -= COSTS.field;
        gameState.land.buildable -= 1;
        gameState.construction.active = {
            type: "field",
            progress: 0,
            workRequired: 10
        };
        setTemporaryStatus("A field is under construction.");
        saveGame();
        updateUI();
    }
});

buildHouseBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.house) {
        if (gameState.construction.active || gameState.land.buildable <= 0) return;

        gameState.resources.wood.count -= COSTS.house;
        gameState.land.buildable -= 1;
        gameState.construction.active = {
            type: "house",
            progress: 0,
            workRequired: 15
        };
        setTemporaryStatus("A house is under construction.");
        saveGame();
        updateUI();
    }
});

buildShedBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= COSTS.shed) {
        if (gameState.construction.active || gameState.land.buildable <= 0) return;

        gameState.resources.wood.count -= COSTS.shed;
        gameState.land.buildable -= 1;
        gameState.construction.active = {
            type: "shed",
            progress: 0,
            workRequired: 20
        };
        setTemporaryStatus("A storage shed is under construction.");
        saveGame();
        updateUI();
    }
});

buildGranaryBtn.addEventListener('click', () => {
    if (gameState.resources.wood.count >= GRANARY.cost) {
        if (gameState.construction.active || gameState.land.buildable <= 0) return;

        gameState.resources.wood.count -= GRANARY.cost;
        gameState.land.buildable -= 1;
        gameState.construction.active = {
            type: "granary",
            progress: 0,
            workRequired: 25
        };
        setTemporaryStatus("A granary is under construction.");
        saveGame();
        updateUI();
    }
});

function setElementsTextContent(elements, value) {
    for (let elem of elements) {
        elem.textContent = value;
    }
}
function buildingShouldBeDisabled(type) {
    /* todo, below is for when there is a building queue
    const project = gameState.construction.active;
    if (project) {
        if (project.type === type) {
            return true; // disable if same type is already under construction
        }
    }*/
    return (gameState.land.buildable <= 0 || gameState.construction.active); // no buildable land available
}

function updateUI() {
    const project = gameState.construction.active;

    constructionTypeDisplay.textContent = project ? capitalizeFirstLetter(project.type) : "None";
    constructionProgressDisplay.textContent = project ? project.progress : 0;
    constructionRequiredDisplay.textContent = project ? project.workRequired : 0;
    exploredLandDisplay.textContent = gameState.land.explored;
    totalLandDisplay.textContent = gameState.land.total;
    fieldsDisplay.textContent = gameState.buildings.fields;
    housingDisplay.textContent = gameState.buildings.houses;
    shedDisplay.textContent = gameState.buildings.sheds;
    granaryDisplay.textContent = gameState.buildings.granaries;
    foodGainDisplay.textContent = gameState.workers.food + (gameState.buildings.fields * EFFECTS.foodPerField);
    foodLossDisplay.textContent = getTotalFoodConsumption();
    foodWorkersDisplay.textContent = gameState.workers.food;
    woodWorkersDisplay.textContent = gameState.workers.wood;
    exploreWorkersDisplay.textContent = gameState.workers.explore;
    buildWorkersDisplay.textContent = gameState.workers.build;
    idleWorkersDisplay.textContent = getIdleWorkers();

    // show/hide UI elements based on game state
    assignColonistsDiv.style.display = gameState.colonistAssignmentUnlocked ? "block" : "none";
    clickConstructionUI.style.display = project ? "block" : "none";

    setElementsTextContent(foodDisplays, gameState.resources.food.count);
    setElementsTextContent(maxFoodDisplays, gameState.resources.food.max);
    setElementsTextContent(woodDisplays, gameState.resources.wood.count);
    setElementsTextContent(maxWoodDisplays, gameState.resources.wood.max);
    setElementsTextContent(populationDisplays, gameState.population.count);
    setElementsTextContent(maxPopulationDisplays, gameState.population.max);

    const foodSurplus = gameState.resources.food.count - getTotalFoodConsumption();

    // update colony status text
    // todo extract to function
    let status = "";
    if (gameState.resources.food.count === 0) {
        status = "The colony is starving, we need more food!";
    } else if (foodSurplus < 10 * gameState.population.count) {
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

    // disable event choices if conditions not met (e.g. not enough food to share, population full)
    if (gameState.events.active) {
        const event = getEventById(gameState.events.active);
        eventChoice1.disabled = !(event.choices[0].requirementsMet());
        eventChoice2.disabled = !(event.choices[1].requirementsMet());
    }

    // disable building buttons if not enough resources to construct
    buildFieldBtn.disabled = gameState.resources.wood.count < COSTS.field || buildingShouldBeDisabled("field");
    buildHouseBtn.disabled = gameState.resources.wood.count < COSTS.house || buildingShouldBeDisabled("house");
    buildShedBtn.disabled = gameState.resources.wood.count < COSTS.shed || buildingShouldBeDisabled("shed");
    buildGranaryBtn.disabled = gameState.resources.wood.count < GRANARY.cost || buildingShouldBeDisabled("granary");

    // disable gather buttons if no resources left or storage is full
    gatherFoodBtn.disabled = gameState.land.foodRemaining <= 0
        || gameState.resources.food.count >= gameState.resources.food.max;
    gatherWoodBtn.disabled = gameState.land.woodRemaining <= 0
        || gameState.resources.wood.count >= gameState.resources.wood.max
        ||  buttonCooldowns.gatherWood;
    exploreLandBtn.disabled = buttonCooldowns.exploreLand ||  gameState.land.unexplored <= 0;
    
    // check work on construction button cooldown
    clickConstructionBtn.disabled = buttonCooldowns.workOnConstruction;

    // Disabling for worker assignment buttons
    foodPlusBtn.disabled = getIdleWorkers() <= 0;
    woodPlusBtn.disabled = getIdleWorkers() <= 0;
    explorePlusBtn.disabled = getIdleWorkers() <= 0;
    buildPlusBtn.disabled = getIdleWorkers() <= 0;
    buildMinusBtn.disabled = gameState.workers.build <= 0;
    foodMinusBtn.disabled = gameState.workers.food <= 0;
    woodMinusBtn.disabled = gameState.workers.wood <= 0;
    exploreMinusBtn.disabled = gameState.workers.explore <= 0;
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
