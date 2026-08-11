// Run with: node --test colony-clicker/script.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    getTotalFoodConsumption,
    getFieldWorkerCount,
    getExplorationYieldMultiplier,
    gameState,
    createNewGameState,
    mergeWithDefaults,
    migrateSaveState,
} = require("./script.js");

test("food consumption at 1 colonist matches the original baseline", () => {
    gameState.population.count = 1;
    gameState.buildings.sheds = 0;
    assert.equal(getTotalFoodConsumption(), 1);
});

test("food consumption scales linearly with population, not quadratically", () => {
    gameState.buildings.sheds = 0;

    gameState.population.count = 4;
    const smallColony = getTotalFoodConsumption();

    gameState.population.count = 8;
    const doubledColony = getTotalFoodConsumption();

    // Doubling population should double consumption (2 -> 4), not quadruple it
    // (the old buggy formula produced 8 -> 32, a 4x jump).
    assert.equal(smallColony, 2);
    assert.equal(doubledColony, 4);
});

test("sheds still reduce food consumption", () => {
    gameState.population.count = 10;

    gameState.buildings.sheds = 0;
    const withoutSheds = getTotalFoodConsumption();

    gameState.buildings.sheds = 4;
    const withSheds = getTotalFoodConsumption();

    assert.ok(withSheds < withoutSheds);
});

test("legacy save keeps its values and backfills a missing field", () => {
    const legacySave = createNewGameState();
    legacySave.population.count = 7;
    delete legacySave.population.starvationTicks; // simulate a field added after this save existed

    const merged = mergeWithDefaults(createNewGameState(), legacySave);

    assert.equal(merged.population.count, 7);
    assert.equal(merged.population.starvationTicks, 0);
});

test("events.history survives a merge instead of getting wiped", () => {
    const saved = createNewGameState();
    saved.events.history = { hungry_travelers: 42, worn_tools: 15 };

    const merged = mergeWithDefaults(createNewGameState(), saved);

    assert.deepEqual(merged.events.history, { hungry_travelers: 42, worn_tools: 15 });
});

test("fields removed from defaults get dropped from an old save", () => {
    const saved = createNewGameState();
    saved.someRetiredField = "junk";

    const merged = mergeWithDefaults(createNewGameState(), saved);

    assert.equal("someRetiredField" in merged, false);
});

test("an in progress construction project passes through unchanged", () => {
    const saved = createNewGameState();
    saved.construction.active = { type: "house", progress: 3, workRequired: 15 };

    const merged = mergeWithDefaults(createNewGameState(), saved);

    assert.deepEqual(merged.construction.active, { type: "house", progress: 3, workRequired: 15 });
});

test("a pre migration save (no saveVersion) loads through migrateSaveState", () => {
    const legacySave = createNewGameState();
    legacySave.population.count = 5;

    const migrated = migrateSaveState(legacySave, 0);

    assert.equal(migrated.population.count, 5);
});

test("fields beyond the number of food workers don't count", () => {
    gameState.buildings.fields = 5;
    gameState.workers.food = 2;

    assert.equal(getFieldWorkerCount(), 2);
});

test("food workers beyond the number of fields don't count", () => {
    gameState.buildings.fields = 1;
    gameState.workers.food = 3;

    assert.equal(getFieldWorkerCount(), 1);
});

test("no fields or no food workers means zero staffed fields", () => {
    gameState.buildings.fields = 0;
    gameState.workers.food = 4;
    assert.equal(getFieldWorkerCount(), 0);

    gameState.buildings.fields = 4;
    gameState.workers.food = 0;
    assert.equal(getFieldWorkerCount(), 0);
});

test("exploration yield is full strength when nothing is explored yet", () => {
    gameState.land.total = 5000;
    gameState.land.explored = 0;

    assert.equal(getExplorationYieldMultiplier(), 1);
});

test("exploration yield shrinks as more of the map gets explored", () => {
    gameState.land.total = 5000;

    gameState.land.explored = 1000;
    const early = getExplorationYieldMultiplier();

    gameState.land.explored = 3000;
    const later = getExplorationYieldMultiplier();

    assert.ok(later < early);
});

test("exploration yield never drops below the floor", () => {
    gameState.land.total = 5000;
    gameState.land.explored = 4999;

    assert.equal(getExplorationYieldMultiplier(), 0.15);
});
