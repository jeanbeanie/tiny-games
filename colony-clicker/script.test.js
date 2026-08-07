// Run with: node --test colony-clicker/script.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const { getTotalFoodConsumption, gameState } = require("./script.js");

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
