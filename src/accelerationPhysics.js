/**
 * accelerationPhysics.js
 * 
 * Pure physics engine and mathematical utilities for the Uniform Acceleration
 * Ramp & Cart Modeling Simulation. Zero DOM dependencies for node testability.
 * 
 * Part of "The Thinking Experiment" PhysicsKit.
 */

class AccelerationPhysics {
  /**
   * Define predefined presets for the 5 Modeling Instruction scenarios.
   */
  static get SCENARIOS() {
    return {
      1: {
        id: 1,
        title: "1. Increasing Speed in the Positive Direction",
        shortTitle: "1. Speeding Up (+)",
        description: "Cart starts from rest near the motion detector (0 position) and rolls down the incline away from the detector (+ direction).",
        tilt: "down-right", // Left is higher, right is lower
        angleDeg: -12, // Left lifted
        detectorSide: "left", // Detector at x = 0 (left)
        positiveDirection: "right", // + direction is to the right (downhill)
        x0: 0.20, // m
        v0: 0.0,  // m/s
        a: 1.0,   // m/s^2 (points in + direction, speeding up)
        speedChange: "increasing",
        tMax: 2.2, // s
        trackLength: 2.6, // m
        expectedAnswers: {
          vSign: "positive",
          aSign: "positive",
          xtSlopeBehavior: "increasing",
          xtSlopeSign: "positive",
          xtSlopeMeaning: "velocity",
          vtSlopeBehavior: "constant",
          vtSlopeSign: "positive",
          vtSlopeMeaning: "acceleration"
        },
        explanation: "The cart begins at rest and moves in the positive direction (away from detector). Because gravity accelerates it down the incline in the positive direction (a > 0), both v and a are positive. Instantaneous velocity (the slope of position-time) increases from 0 to positive values (+2.2 m/s). The velocity-time graph is a straight line with constant positive slope (+1.0 m/s²), representing uniform acceleration."
      },
      2: {
        id: 2,
        title: "2. Decreasing Speed in the Positive Direction",
        shortTitle: "2. Slowing Down (+)",
        description: "Cart is given an initial push up the ramp starting near the detector (0 position), moving in the positive direction and coasting to a stop at its highest point.",
        tilt: "up-right", // Left is lower, right is higher
        angleDeg: 12, // Right lifted
        detectorSide: "left", // Detector at x = 0 (left)
        positiveDirection: "right", // + direction is to the right (uphill)
        x0: 0.20, // m
        v0: 1.80, // m/s
        a: -1.0,  // m/s^2 (points down ramp in - direction, slowing down)
        speedChange: "decreasing",
        tMax: 1.8, // s (stops at t = 1.8s)
        trackLength: 2.6, // m
        expectedAnswers: {
          vSign: "positive",
          aSign: "negative",
          xtSlopeBehavior: "decreasing",
          xtSlopeSign: "positive",
          xtSlopeMeaning: "velocity",
          vtSlopeBehavior: "constant",
          vtSlopeSign: "negative",
          vtSlopeMeaning: "acceleration"
        },
        explanation: "The cart moves away from the detector in the positive direction (v > 0), but gravity accelerates it down the incline in the negative direction (a < 0). Since v and a have opposite signs, the cart slows down. Instantaneous velocity (the slope of position-time) decreases from +1.8 m/s to 0 m/s. The velocity-time graph is a straight line with constant negative slope (-1.0 m/s²), representing uniform acceleration."
      },
      3: {
        id: 3,
        title: "3. Increasing Speed in the Negative Direction",
        shortTitle: "3. Speeding Up (-)",
        description: "Cart starts from rest at the top of the ramp (+ position) and rolls down the incline towards the motion detector (0 position).",
        tilt: "up-right", // Right is higher, left is lower (detector at bottom)
        angleDeg: 12, // Right lifted
        detectorSide: "left", // Detector at x = 0 (left)
        positiveDirection: "right", // + direction is to the right (uphill)
        x0: 2.00, // m
        v0: 0.0,  // m/s
        a: -1.0,  // m/s^2 (points down ramp in - direction towards detector)
        speedChange: "increasing",
        tMax: 1.9, // s
        trackLength: 2.6, // m
        expectedAnswers: {
          vSign: "negative",
          aSign: "negative",
          xtSlopeBehavior: "decreasing",
          xtSlopeSign: "negative",
          xtSlopeMeaning: "velocity",
          vtSlopeBehavior: "constant",
          vtSlopeSign: "negative",
          vtSlopeMeaning: "acceleration"
        },
        explanation: "The cart is released from rest at a positive position (x = 2.0 m, v = 0) and rolls down towards the detector in the negative direction. Instantaneous velocity (the slope of the position-time graph) starts at 0 and becomes negative (reaching -1.9 m/s). Because a negative number is less than zero (-1.9 < 0), the slope is decreasing in numerical value (while the magnitude of speed |v| increases). Meanwhile, the velocity-time graph is a straight line with constant negative slope (-1.0 m/s²), representing uniform downward acceleration."
      },
      4: {
        id: 4,
        title: "4. Decreasing Speed in the Negative Direction",
        shortTitle: "4. Slowing Down (-)",
        description: "Cart is given an initial push up the ramp from the bottom right (+) towards the motion detector (0 position at the top), coasting to a stop at its highest point.",
        tilt: "down-right", // Left is higher (detector at top), right is lower
        angleDeg: -12, // Left lifted
        detectorSide: "left", // Detector at x = 0 (left, top of ramp)
        positiveDirection: "right", // + direction is to the right (downhill)
        x0: 2.00, // m
        v0: -1.80, // m/s (moving left towards detector)
        a: 1.0,   // m/s^2 (gravity pulls downhill to the right, + direction)
        speedChange: "decreasing",
        tMax: 1.8, // s (stops at t = 1.8s)
        trackLength: 2.6, // m
        expectedAnswers: {
          vSign: "negative",
          aSign: "positive",
          xtSlopeBehavior: "increasing",
          xtSlopeSign: "negative",
          xtSlopeMeaning: "velocity",
          vtSlopeBehavior: "constant",
          vtSlopeSign: "positive",
          vtSlopeMeaning: "acceleration"
        },
        explanation: "The cart moves up the ramp toward the detector in the negative direction (v < 0), while gravity accelerates it downhill in the positive direction (a > 0). Instantaneous velocity (the slope of the position-time graph) starts at -1.8 m/s and approaches 0 m/s. Because -1.8 is less than 0, moving toward zero means the slope is increasing in numerical value (while speed |v| decreases). Meanwhile, the velocity-time graph is a straight line with constant positive slope (+1.0 m/s²), representing uniform downhill acceleration."
      },
      5: {
        id: 5,
        title: "5. Up and Down the Ramp (The Turnaround)",
        shortTitle: "5. Up & Down Ramp",
        description: "Cart is pushed up the ramp from near the detector (0 position), coasts to a stop at the apex, turns around, and rolls back down towards the detector.",
        tilt: "up-right", // Left is lower, right is higher
        angleDeg: 12, // Right lifted
        detectorSide: "left", // Detector at x = 0 (left)
        positiveDirection: "right", // + direction is uphill
        x0: 0.20, // m
        v0: 1.80, // m/s
        a: -1.0,  // m/s^2 (constant down ramp throughout)
        speedChange: "first-decrease-then-increase",
        tMax: 3.6, // s (apex at 1.8s, returns to start at 3.6s)
        trackLength: 2.6, // m
        expectedAnswers: {
          vDirChange: "yes",
          aDirChange: "no",
          xtSlopeMeaning: "velocity",
          vtSlopeBehavior: "constant",
          vtSlopeSign: "negative",
          vtSlopeMeaning: "acceleration"
        },
        explanation: "On the way up, velocity is positive and decreasing (+1.8 m/s down to 0). At the peak (apex at t = 1.8 s), instantaneous velocity is 0 m/s, but acceleration is still -1.0 m/s² down the ramp! On the way down, velocity becomes negative and speed increases (0 down to -1.8 m/s). Because velocity changes continuously from +1.8 m/s through 0 to -1.8 m/s, the numerical slope of the position-time graph decreases continuously throughout the entire motion (dv/dt = a = -1.0 < 0). Meanwhile, the slope of the velocity-time graph is constant and negative (-1.0 m/s²) the entire time."
      }
    };
  }

  /**
   * Calculate position at time t: x(t) = x0 + v0*t + 0.5*a*t^2
   */
  static getPosition(x0, v0, a, t) {
    return x0 + v0 * t + 0.5 * a * t * t;
  }

  /**
   * Calculate velocity at time t: v(t) = v0 + a*t
   */
  static getVelocity(v0, a, t) {
    return v0 + a * t;
  }

  /**
   * Calculate acceleration at time t: a(t) = a
   */
  static getAcceleration(a, t) {
    return a;
  }

  /**
   * Calculate incline acceleration given tilt angle (degrees)
   * Positive angle = Right side lifted (cart accelerates left / - direction)
   * Negative angle = Left side lifted (cart accelerates right / + direction)
   * Zero = Flat track (a = 0)
   */
  static calculateAccelerationFromAngle(angleDeg, g = 9.8) {
    const rad = (angleDeg * Math.PI) / 180;
    // Scaled acceleration along track (using realistic lab scale)
    const rawA = -g * Math.sin(rad);
    // Scale for standard tabletop lab cart (e.g. friction-compensated 0.5 scale factor or direct)
    const scaledA = Number((rawA * 0.5).toFixed(2));
    return scaledA;
  }

  /**
   * Calculate duration tMax for a custom scenario so the cart stays on the track
   */
  static calculateMaxTime(x0, v0, a, trackLength = 2.6) {
    if (Math.abs(a) < 0.001) {
      if (Math.abs(v0) < 0.001) return 3.0;
      const tEnd = v0 > 0 ? (trackLength - 0.15 - x0) / v0 : (0.15 - x0) / v0;
      return Math.max(1.0, Math.min(5.0, Number(Math.abs(tEnd).toFixed(2))));
    }

    // Check turnaround
    const tApex = -v0 / a;
    let candidates = [3.5];

    // Position boundaries (0.15m and trackLength - 0.15m)
    [0.15, trackLength - 0.15].forEach(xBound => {
      // 0.5*a*t^2 + v0*t + (x0 - xBound) = 0
      const A = 0.5 * a;
      const B = v0;
      const C = x0 - xBound;
      const disc = B * B - 4 * A * C;
      if (disc >= 0) {
        const t1 = (-B + Math.sqrt(disc)) / (2 * A);
        const t2 = (-B - Math.sqrt(disc)) / (2 * A);
        if (t1 > 0.1) candidates.push(t1);
        if (t2 > 0.1) candidates.push(t2);
      }
    });

    const validTimes = candidates.filter(t => t > 0.2);
    const minPositiveT = Math.min(...validTimes);
    return Math.max(1.5, Math.min(5.0, Number(minPositiveT.toFixed(2))));
  }

  /**
   * Get complete kinematic state at time t
   */
  static getState(params, t) {
    const clampedT = Math.max(0, Math.min(t, params.tMax));
    const x = this.getPosition(params.x0, params.v0, params.a, clampedT);
    const v = this.getVelocity(params.v0, params.a, clampedT);
    const a = params.a;
    const speed = Math.abs(v);
    const direction = v > 0.0001 ? "positive" : (v < -0.0001 ? "negative" : "stopped");

    return {
      t: clampedT,
      x: Number(x.toFixed(4)),
      v: Number(v.toFixed(4)),
      a: Number(a.toFixed(4)),
      speed: Number(speed.toFixed(4)),
      direction
    };
  }

  /**
   * Generate array of Motion Map strobe points.
   */
  static generateMotionMap(params, dt = 0.3) {
    const points = [];
    const tMax = params.tMax;
    const isTurnaround = params.id === 5 || (params.v0 > 0 && params.a < 0 && (-params.v0 / params.a < tMax));
    const tApex = (params.a !== 0) ? -params.v0 / params.a : null;

    let t = 0;
    let stepIndex = 0;
    while (t <= tMax + 0.0001) {
      const state = this.getState(params, t);
      
      let trackRow = 0;
      let leg = "single";
      if (isTurnaround && tApex !== null) {
        if (t < tApex - 0.0001) {
          trackRow = 0;
          leg = "up";
        } else if (Math.abs(t - tApex) <= 0.0001) {
          trackRow = 0;
          leg = "apex";
        } else {
          trackRow = 1;
          leg = "down";
        }
      }

      points.push({
        index: stepIndex,
        t: Number(t.toFixed(2)),
        x: state.x,
        v: state.v,
        a: state.a,
        speed: state.speed,
        trackRow,
        leg,
        isApex: Math.abs(state.v) < 0.001
      });

      t += dt;
      stepIndex++;
    }

    return points;
  }

  /**
   * Generate time series data points for plotting graphs
   */
  static generateTimeSeries(params, numSteps = 100, addSensorNoise = false) {
    const data = {
      t: [],
      x: [],
      v: [],
      a: [],
      xSensor: [],
      vSensor: []
    };

    const dt = params.tMax / numSteps;
    for (let i = 0; i <= numSteps; i++) {
      const t = i * dt;
      const state = this.getState(params, t);
      data.t.push(Number(t.toFixed(3)));
      data.x.push(state.x);
      data.v.push(state.v);
      data.a.push(state.a);

      if (addSensorNoise) {
        const noiseX = (Math.random() - 0.5) * 0.015;
        data.xSensor.push(Number((state.x + noiseX).toFixed(3)));
        const noiseV = (Math.random() - 0.5) * 0.04;
        data.vSensor.push(Number((state.v + noiseV).toFixed(3)));
      } else {
        data.xSensor.push(state.x);
        data.vSensor.push(state.v);
      }
    }

    return data;
  }

  /**
   * Calculate tangent line data for Position-Time graph at time t
   */
  static getTangentLine(params, t, deltaT = 0.5) {
    const state = this.getState(params, t);
    const slope = state.v;
    const t0 = Math.max(0, t - deltaT);
    const t1 = Math.min(params.tMax, t + deltaT);

    const x0 = state.x + slope * (t0 - t);
    const x1 = state.x + slope * (t1 - t);

    return {
      tCenter: t,
      xCenter: state.x,
      slope: Number(slope.toFixed(3)),
      t0,
      x0,
      t1,
      x1,
      interpretation: slope > 0 ? "Positive Slope (Moving in + Direction)" : (slope < 0 ? "Negative Slope (Moving in - Direction)" : "Zero Slope (Momentarily at Rest)")
    };
  }

  /**
   * Calculate area under Velocity-Time curve between t = 0 and t = tCurrent (Displacement Delta x)
   */
  static getDisplacementArea(params, tCurrent) {
    const clampedT = Math.max(0, Math.min(tCurrent, params.tMax));
    const v0 = params.v0;
    const vCurrent = this.getVelocity(params.v0, params.a, clampedT);
    const area = 0.5 * (v0 + vCurrent) * clampedT;
    const x0 = params.x0;
    const xCurrent = this.getPosition(params.x0, params.v0, params.a, clampedT);
    const deltaX = xCurrent - x0;

    return {
      t: clampedT,
      v0,
      vCurrent: Number(vCurrent.toFixed(3)),
      area: Number(area.toFixed(3)),
      deltaX: Number(deltaX.toFixed(3)),
      xCurrent: Number(xCurrent.toFixed(3))
    };
  }

  /**
   * Check student answers for a scenario
   */
  static evaluateAnswers(scenarioId, userAnswers) {
    const scenario = this.SCENARIOS[scenarioId];
    if (!scenario) return { correct: false, score: 0, total: 0, feedback: {} };

    const expected = scenario.expectedAnswers;
    const feedback = {};
    let correctCount = 0;
    let totalQuestions = 0;

    for (const key of Object.keys(expected)) {
      totalQuestions++;
      const userVal = (userAnswers[key] || "").toLowerCase().trim();
      const expVal = expected[key].toLowerCase().trim();
      const isMatch = userVal === expVal;

      if (isMatch) correctCount++;

      feedback[key] = {
        correct: isMatch,
        userValue: userVal,
        expectedValue: expVal
      };
    }

    return {
      correct: correctCount === totalQuestions,
      score: correctCount,
      total: totalQuestions,
      percent: Math.round((correctCount / totalQuestions) * 100),
      feedback,
      explanation: scenario.explanation
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccelerationPhysics;
}
