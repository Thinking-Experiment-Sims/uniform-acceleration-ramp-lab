/**
 * accelerationPhysics.test.js
 * 
 * Unit tests for AccelerationPhysics kinematics calculations,
 * motion maps, tangents, and question validation.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const AccelerationPhysics = require("../src/accelerationPhysics.js");

test("Scenario 1: Speeding Up in Positive Direction", () => {
  const scenario = AccelerationPhysics.SCENARIOS[1];
  assert.equal(scenario.x0, 0.20);
  assert.equal(scenario.v0, 0.0);
  assert.equal(scenario.a, 1.0);

  // At t = 1.0s: x = 0.20 + 0.5(1.0)(1)^2 = 0.70m, v = 1.0 m/s
  const state = AccelerationPhysics.getState(scenario, 1.0);
  assert.equal(state.x, 0.70);
  assert.equal(state.v, 1.0);
  assert.equal(state.a, 1.0);
  assert.equal(state.direction, "positive");

  // Motion map points
  const map = AccelerationPhysics.generateMotionMap(scenario, 0.5);
  assert.ok(map.length >= 4);
  assert.equal(map[0].x, 0.20);
  assert.equal(map[0].v, 0.0);
  // Velocity vectors should be increasing in length
  assert.ok(map[2].speed > map[1].speed);
});

test("Scenario 2: Slowing Down in Positive Direction", () => {
  const scenario = AccelerationPhysics.SCENARIOS[2];
  assert.equal(scenario.v0, 1.80);
  assert.equal(scenario.a, -1.0);

  // Stops at t = 1.8s
  const stateEnd = AccelerationPhysics.getState(scenario, 1.8);
  assert.equal(stateEnd.v, 0.0);
  assert.equal(stateEnd.x, 1.82);
  assert.equal(stateEnd.direction, "stopped");

  // Tangent slope at t = 0 should be 1.8, at t = 1.8 should be 0
  const tan0 = AccelerationPhysics.getTangentLine(scenario, 0.0);
  assert.equal(tan0.slope, 1.8);
  const tanEnd = AccelerationPhysics.getTangentLine(scenario, 1.8);
  assert.equal(tanEnd.slope, 0.0);
});

test("Scenario 3: Speeding Up in Negative Direction", () => {
  const scenario = AccelerationPhysics.SCENARIOS[3];
  assert.equal(scenario.x0, 2.00);
  assert.equal(scenario.v0, 0.0);
  assert.equal(scenario.a, -1.0);

  const state1 = AccelerationPhysics.getState(scenario, 1.0);
  assert.equal(state1.x, 1.50);
  assert.equal(state1.v, -1.0);
  assert.equal(state1.direction, "negative");
});

test("Scenario 4: Slowing Down in Negative Direction", () => {
  const scenario = AccelerationPhysics.SCENARIOS[4];
  assert.equal(scenario.x0, 2.00);
  assert.equal(scenario.v0, -1.80);
  assert.equal(scenario.a, 1.0);

  const stateEnd = AccelerationPhysics.getState(scenario, 1.8);
  assert.equal(stateEnd.v, 0.0);
  assert.equal(stateEnd.x, 0.38);
});

test("Scenario 5: Up and Down Ramp (Turnaround)", () => {
  const scenario = AccelerationPhysics.SCENARIOS[5];
  assert.equal(scenario.v0, 1.80);
  assert.equal(scenario.a, -1.0);
  assert.equal(scenario.tMax, 3.6);

  // Peak at 1.8s
  const stateApex = AccelerationPhysics.getState(scenario, 1.8);
  assert.equal(stateApex.v, 0.0);
  assert.equal(stateApex.a, -1.0); // Acceleration is NOT zero at apex!

  // Motion map has two rows for turnaround
  const map = AccelerationPhysics.generateMotionMap(scenario, 0.6);
  const upPoints = map.filter(p => p.leg === "up");
  const downPoints = map.filter(p => p.leg === "down");
  assert.ok(upPoints.length > 0);
  assert.ok(downPoints.length > 0);
  assert.ok(downPoints.every(p => p.trackRow === 1));
});

test("Answer Evaluation", () => {
  const answers1 = {
    vSign: "positive",
    aSign: "positive",
    speedChange: "increasing",
    xtSlopeBehavior: "increasing",
    xtSlopeSign: "positive",
    xtSlopeMeaning: "velocity",
    vtSlopeBehavior: "constant",
    vtSlopeSign: "positive",
    vtSlopeMeaning: "acceleration"
  };

  const eval1 = AccelerationPhysics.evaluateAnswers(1, answers1);
  assert.equal(eval1.correct, true);
  assert.equal(eval1.percent, 100);

  // Wrong answer test
  const wrongAnswers = { ...answers1, vSign: "negative" };
  const evalWrong = AccelerationPhysics.evaluateAnswers(1, wrongAnswers);
  assert.equal(evalWrong.correct, false);
  assert.equal(evalWrong.feedback.vSign.correct, false);
});
