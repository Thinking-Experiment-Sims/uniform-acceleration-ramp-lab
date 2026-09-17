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

test("Answer Evaluation - All Scenarios", () => {
  // Scenario 1: Speeding Up in Positive Direction
  const answers1 = {
    vSign: "positive",
    aSign: "positive",
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
  assert.equal(eval1.score, 8);

  // Scenario 2: Slowing Down in Positive Direction
  const answers2 = {
    vSign: "positive",
    aSign: "negative",
    xtSlopeBehavior: "decreasing",
    xtSlopeSign: "positive",
    xtSlopeMeaning: "velocity",
    vtSlopeBehavior: "constant",
    vtSlopeSign: "negative",
    vtSlopeMeaning: "acceleration"
  };
  const eval2 = AccelerationPhysics.evaluateAnswers(2, answers2);
  assert.equal(eval2.correct, true);
  assert.equal(eval2.percent, 100);
  assert.equal(eval2.score, 8);

  // Scenario 3: Speeding Up in Negative Direction (0 -> -1.9 m/s, slope decreases numerically)
  const answers3 = {
    vSign: "negative",
    aSign: "negative",
    xtSlopeBehavior: "decreasing", // Negative number is less than zero
    xtSlopeSign: "negative",
    xtSlopeMeaning: "velocity",
    vtSlopeBehavior: "constant",
    vtSlopeSign: "negative",
    vtSlopeMeaning: "acceleration"
  };
  const eval3 = AccelerationPhysics.evaluateAnswers(3, answers3);
  assert.equal(eval3.correct, true);
  assert.equal(eval3.percent, 100);
  assert.equal(eval3.score, 8);

  // Verify that "increasing" for xt in Scenario 3 is now correctly rejected
  const wrong3 = { ...answers3, xtSlopeBehavior: "increasing" };
  const evalWrong3 = AccelerationPhysics.evaluateAnswers(3, wrong3);
  assert.equal(evalWrong3.correct, false);
  assert.equal(evalWrong3.feedback.xtSlopeBehavior.correct, false);

  // Scenario 4: Slowing Down in Negative Direction (-1.8 -> 0 m/s, slope increases numerically)
  const answers4 = {
    vSign: "negative",
    aSign: "positive",
    xtSlopeBehavior: "increasing", // -1.8 < 0, moving to 0 is increasing
    xtSlopeSign: "negative",
    xtSlopeMeaning: "velocity",
    vtSlopeBehavior: "constant",
    vtSlopeSign: "positive",
    vtSlopeMeaning: "acceleration"
  };
  const eval4 = AccelerationPhysics.evaluateAnswers(4, answers4);
  assert.equal(eval4.correct, true);
  assert.equal(eval4.percent, 100);
  assert.equal(eval4.score, 8);

  // Verify that "decreasing" for xt in Scenario 4 is now correctly rejected
  const wrong4 = { ...answers4, xtSlopeBehavior: "decreasing" };
  const evalWrong4 = AccelerationPhysics.evaluateAnswers(4, wrong4);
  assert.equal(evalWrong4.correct, false);
  assert.equal(evalWrong4.feedback.xtSlopeBehavior.correct, false);

  // Scenario 5: Up and Down Ramp (Turnaround)
  const answers5 = {
    vDirChange: "yes",
    aDirChange: "no",
    xtSlopeMeaning: "velocity",
    vtSlopeBehavior: "constant",
    vtSlopeSign: "negative",
    vtSlopeMeaning: "acceleration"
  };
  const eval5 = AccelerationPhysics.evaluateAnswers(5, answers5);
  assert.equal(eval5.correct, true);
  assert.equal(eval5.percent, 100);
  assert.equal(eval5.score, 6);

  // Verify that vtSlopeBehavior is strictly constant across scenarios
  const wrongVtBehavior3 = { ...answers3, vtSlopeBehavior: "decreasing" };
  const evalWrongVt3 = AccelerationPhysics.evaluateAnswers(3, wrongVtBehavior3);
  assert.equal(evalWrongVt3.correct, false);
  assert.equal(evalWrongVt3.feedback.vtSlopeBehavior.correct, false);

  const wrongVtBehavior4 = { ...answers4, vtSlopeBehavior: "increasing" };
  const evalWrongVt4 = AccelerationPhysics.evaluateAnswers(4, wrongVtBehavior4);
  assert.equal(evalWrongVt4.correct, false);
  assert.equal(evalWrongVt4.feedback.vtSlopeBehavior.correct, false);

  // Wrong sign test for Scenario 3
  const wrongSign3 = { ...answers3, xtSlopeSign: "positive" };
  const evalWrongSign3 = AccelerationPhysics.evaluateAnswers(3, wrongSign3);
  assert.equal(evalWrongSign3.correct, false);
  assert.equal(evalWrongSign3.feedback.xtSlopeSign.correct, false);

  // Wrong meaning test for Scenario 3
  const wrongMeaning3 = { ...answers3, xtSlopeMeaning: "acceleration" };
  const evalWrongMeaning3 = AccelerationPhysics.evaluateAnswers(3, wrongMeaning3);
  assert.equal(evalWrongMeaning3.correct, false);
  assert.equal(evalWrongMeaning3.feedback.xtSlopeMeaning.correct, false);
});
