// Run with: node --test tiny-pet/script.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    pet, getDefaultPetState, getStageByAge, growPet,
    getNeglectHours, getPetMood,
} = require("./script.js");

const HOUR = 60 * 60 * 1000;

function resetPet() {
    Object.assign(pet, getDefaultPetState());
}

test("age accumulates by elapsed minutes, not a flat amount per call", () => {
    resetPet();

    growPet(30);
    growPet(30);
    growPet(30);

    assert.equal(pet.age, 90);
});

test("stage progresses egg to child to adult at the right age", () => {
    assert.equal(getStageByAge(0), "egg");
    assert.equal(getStageByAge(179), "egg");
    assert.equal(getStageByAge(180), "child");
    assert.equal(getStageByAge(1439), "child");
    assert.equal(getStageByAge(1440), "adult");
});

test("crossing a stage boundary grants a one time care bonus", () => {
    resetPet();
    pet.age = 179;
    pet.stage = "egg";

    growPet(1); // crosses into child at age 180
    assert.equal(pet.stage, "child");
    assert.equal(pet.careScore, 5);

    growPet(1); // no boundary crossed this time
    assert.equal(pet.careScore, 5);
});

test("no neglect within the grace period", () => {
    resetPet();
    pet.lastInteractionAt = Date.now() - 2 * HOUR;
    pet.neglectAtLastInteraction = 0;

    assert.equal(getNeglectHours(), 0);
});

test("neglect grows proportional to hours past the grace period", () => {
    resetPet();
    pet.lastInteractionAt = Date.now() - 10 * HOUR;
    pet.neglectAtLastInteraction = 0;

    // 10 hours since interaction, 6 hour grace period, 4 hours of neglect
    assert.ok(Math.abs(getNeglectHours() - 4) < 0.01);
});

test("neglect fades gradually after reconnecting, not instantly", () => {
    resetPet();
    pet.lastInteractionAt = Date.now() - 1 * HOUR; // checked in an hour ago
    pet.neglectAtLastInteraction = 20; // was quite neglected before that

    const neglect = getNeglectHours();
    assert.ok(neglect > 0 && neglect < 20);
});

test("fresh neglect overtakes a mostly faded residual", () => {
    resetPet();
    pet.lastInteractionAt = Date.now() - 20 * HOUR;
    pet.neglectAtLastInteraction = 2; // barely neglected last time around

    // old residual has almost fully faded by now, but 14 hours of fresh
    // neglect have built up since, so that should win out
    assert.ok(getNeglectHours() > 10);
});

test("mood reaches Distant then Lonely at the neglect hour thresholds", () => {
    resetPet();

    pet.lastInteractionAt = Date.now() - 8 * HOUR; // 2 hours past grace
    assert.equal(getPetMood(), "Okay");

    pet.lastInteractionAt = Date.now() - 13 * HOUR; // 7 hours past grace
    assert.equal(getPetMood(), "Distant");

    pet.lastInteractionAt = Date.now() - 19 * HOUR; // 13 hours past grace
    assert.equal(getPetMood(), "Lonely");
});
