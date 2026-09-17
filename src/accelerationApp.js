/**
 * accelerationApp.js
 * 
 * Interactive controller, drawing canvas, and rendering engine for the
 * Uniform Acceleration Ramp & Cart Modeling Simulation.
 * 
 * Compliant with "The Thinking Experiment" Design System.
 */

(function () {
  "use strict";

  // State Management
  const state = {
    activeScenarioId: 1,
    workflowMode: "predict", // "predict" | "observe"
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1.0,
    animationFrameId: null,
    lastFrameTime: null,
    
    // Toggles
    showVectors: true,
    showRuler: true,
    showSonarWaves: true,
    showTangent: true,
    showArea: false,
    showTheoryGuide: false,
    sensorNoise: false,
    recordData: true,

    // Interactive Drawing / Prediction State
    activeDrawingGraph: null, // "xt" | "vt" | "at" | null
    isDrawing: false,
    currentStroke: [],
    predictions: {},

    // Sandbox params (Free Play)
    sandbox: {
      id: "sandbox",
      title: "Sandbox: Custom Incline & Free Play",
      shortTitle: "🧪 Sandbox",
      description: "Freely customize track angle (lift left or right side!), initial position, and launch velocity.",
      x0: 0.20,
      v0: 1.50,
      a: -1.0,
      angleDeg: 12, // Positive = Right Lifted, Negative = Left Lifted, 0 = Flat
      tMax: 3.5,
      trackLength: 2.6,
      tilt: "up-right",
      detectorSide: "left",
      positiveDirection: "right"
    },

    // User Answers cache
    answers: {}
  };

  // Safe Rounded Rect Helper (Strictly avoiding ctx.roundRect as per Design System)
  function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Get active scenario object
  function getActiveScenario() {
    if (state.activeScenarioId === "sandbox") {
      return state.sandbox;
    }
    return AccelerationPhysics.SCENARIOS[state.activeScenarioId];
  }

  // DOM Elements cache
  let dom = {};

  function initDOM() {
    dom = {
      scenarioTabs: document.querySelectorAll(".scenario-tab"),
      bannerTitle: document.getElementById("bannerTitle"),
      bannerDesc: document.getElementById("bannerDesc"),
      sandboxSettings: document.getElementById("sandboxSettings"),

      // Workflow buttons
      btnModePredict: document.getElementById("btnModePredict"),
      btnModeObserve: document.getElementById("btnModeObserve"),

      // Sandbox controls
      sliderAngle: document.getElementById("sliderAngle"),
      valAngle: document.getElementById("valAngle"),
      btnTiltLeft: document.getElementById("btnTiltLeft"),
      btnTiltFlat: document.getElementById("btnTiltFlat"),
      btnTiltRight: document.getElementById("btnTiltRight"),
      sliderX0: document.getElementById("sliderX0"),
      sliderV0: document.getElementById("sliderV0"),
      valX0: document.getElementById("valX0"),
      valV0: document.getElementById("valV0"),
      valA: document.getElementById("valA"),

      // Canvases
      rampCanvas: document.getElementById("rampCanvas"),
      motionMapCanvas: document.getElementById("motionMapCanvas"),
      xtCanvas: document.getElementById("xtCanvas"),
      vtCanvas: document.getElementById("vtCanvas"),
      atCanvas: document.getElementById("atCanvas"),

      // Playback Controls
      btnPlayPause: document.getElementById("btnPlayPause"),
      btnPreviewMotion: document.getElementById("btnPreviewMotion"),
      btnStepBack: document.getElementById("btnStepBack"),
      btnStepForward: document.getElementById("btnStepForward"),
      btnReset: document.getElementById("btnReset"),
      scrubSlider: document.getElementById("scrubSlider"),
      timeDisplay: document.getElementById("timeDisplay"),
      speedButtons: document.querySelectorAll(".speed-btn"),

      // Toggles
      chkVectors: document.getElementById("chkVectors"),
      chkRuler: document.getElementById("chkRuler"),
      chkSonar: document.getElementById("chkSonar"),
      chkTangent: document.getElementById("chkTangent"),
      chkArea: document.getElementById("chkArea"),
      chkTheoryGuide: document.getElementById("chkTheoryGuide"),
      chkNoise: document.getElementById("chkNoise"),

      // Telemetry
      telemPos: document.getElementById("telemPos"),
      telemVel: document.getElementById("telemVel"),
      telemAcc: document.getElementById("telemAcc"),
      telemSpeed: document.getElementById("telemSpeed"),

      // Inquiry Section
      inquiryGrid: document.getElementById("inquiryGrid"),
      btnCheckAnswers: document.getElementById("btnCheckAnswers"),
      btnResetAnswers: document.getElementById("btnResetAnswers"),
      explanationBox: document.getElementById("explanationBox"),
      explanationText: document.getElementById("explanationText")
    };
  }

  // Resize all canvases for high-DPI displays
  function resizeCanvases() {
    const canvases = [
      dom.rampCanvas,
      dom.motionMapCanvas,
      dom.xtCanvas,
      dom.vtCanvas,
      dom.atCanvas
    ];

    canvases.forEach(canvas => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    });
  }

  // -------------------------------------------------------------
  // RAMP & CART CANVAS RENDERING (Zero Overlap)
  // -------------------------------------------------------------
  function renderRampCanvas() {
    const canvas = dom.rampCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const scenario = getActiveScenario();
    const stateKin = AccelerationPhysics.getState(scenario, state.currentTime);

    // Track coordinates in canvas pixels
    const padX = 75;
    const trackWidth = w - padX * 2;
    const angleDeg = scenario.angleDeg !== undefined ? scenario.angleDeg : (scenario.tilt === "down-right" ? -12 : 12);
    
    // Incline slope calculation
    const baseTableY = h * 0.78;
    const maxDrop = h * 0.38;
    const tiltFrac = Math.max(-1, Math.min(1, angleDeg / 18));
    
    let trackYLeft, trackYRight;
    if (tiltFrac > 0.02) {
      // Right side lifted
      trackYLeft = baseTableY - 18;
      trackYRight = baseTableY - 18 - tiltFrac * maxDrop;
    } else if (tiltFrac < -0.02) {
      // Left side lifted
      trackYLeft = baseTableY - 18 - Math.abs(tiltFrac) * maxDrop;
      trackYRight = baseTableY - 18;
    } else {
      // Flat
      trackYLeft = baseTableY - 24;
      trackYRight = baseTableY - 24;
    }

    const angleRad = Math.atan2(trackYRight - trackYLeft, trackWidth);

    // Subtle Triangular Ramp Wedge Under Track
    ctx.fillStyle = "#f1f7fa";
    ctx.beginPath();
    ctx.moveTo(padX, trackYLeft + 16);
    ctx.lineTo(padX + trackWidth, trackYRight + 16);
    ctx.lineTo(padX + trackWidth, baseTableY);
    ctx.lineTo(padX, baseTableY);
    ctx.closePath();
    ctx.fill();

    // Tabletop Base Line
    ctx.strokeStyle = "#a9c4cf";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(padX - 30, baseTableY);
    ctx.lineTo(padX + trackWidth + 30, baseTableY);
    ctx.stroke();

    // Support Post / Stand (Rendered under lifted end)
    if (Math.abs(tiltFrac) > 0.02) {
      const isLeftLifted = tiltFrac < 0;
      const standX = isLeftLifted ? padX + 20 : padX + trackWidth - 20;
      const standTopY = isLeftLifted ? trackYLeft + 14 : trackYRight + 14;
      
      ctx.fillStyle = "#4b6570";
      ctx.fillRect(standX - 6, standTopY, 12, baseTableY - standTopY);
      ctx.fillStyle = "#123140";
      ctx.fillRect(standX - 16, baseTableY - 6, 32, 6);
      ctx.fillStyle = "#d67b19";
      drawRoundedRect(ctx, standX - 9, standTopY + 4, 18, 8, 2, true, false);
    } else {
      ctx.fillStyle = "#4b6570";
      ctx.fillRect(padX + 15, trackYLeft + 14, 10, baseTableY - (trackYLeft + 14));
      ctx.fillRect(padX + trackWidth - 25, trackYRight + 14, 10, baseTableY - (trackYRight + 14));
    }

    // Incline Track Beam
    ctx.save();
    ctx.translate(padX, trackYLeft);
    ctx.rotate(angleRad);

    const beamLen = Math.hypot(trackWidth, trackYRight - trackYLeft);
    
    // Main Aluminum Track Beam
    ctx.fillStyle = "#dfe9ee";
    ctx.strokeStyle = "#0f7e9b";
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, -10, 0, beamLen + 20, 16, 3, true, true);

    // Track Center Groove
    ctx.strokeStyle = "#a9c4cf";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(beamLen, 8);
    ctx.stroke();

    // Metric Ruler
    if (state.showRuler) {
      const maxMeters = scenario.trackLength;
      const pxPerMeter = beamLen / maxMeters;
      ctx.fillStyle = "#123140";
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (let m = 0; m <= maxMeters; m += 0.2) {
        const xPos = m * pxPerMeter;
        const isMajor = Math.round(m * 10) % 5 === 0;
        const tickH = isMajor ? 7 : 3.5;
        
        ctx.strokeStyle = "#4b6570";
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, -tickH);
        ctx.stroke();

        if (isMajor && m > 0.1 && m < maxMeters - 0.1) {
          ctx.fillText(m.toFixed(1) + "m", xPos, 18);
        }
      }

      // Origin label placed cleanly below sensor
      ctx.fillStyle = "#0f7e9b";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("0 position", 10, 24);

      // Positive (+) Arrow
      ctx.strokeStyle = "#d67b19";
      ctx.fillStyle = "#d67b19";
      ctx.lineWidth = 2;
      const arrowX = beamLen - 30;
      ctx.beginPath();
      ctx.moveTo(arrowX - 40, -18);
      ctx.lineTo(arrowX, -18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrowX, -18);
      ctx.lineTo(arrowX - 6, -22);
      ctx.lineTo(arrowX - 6, -14);
      ctx.closePath();
      ctx.fill();
      ctx.font = "bold 12px 'Inter', sans-serif";
      ctx.fillText("+", arrowX + 12, -24);
    }

    // Motion Detector Sensor at x = 0
    ctx.save();
    ctx.translate(0, -16);
    ctx.fillStyle = "#123140";
    ctx.strokeStyle = "#095f76";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -22, -16, 22, 34, 4, true, true);
    ctx.fillStyle = "#0f7e9b";
    ctx.beginPath();
    ctx.arc(-8, -4, 4.5, 0, Math.PI * 2);
    ctx.arc(-8, 8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Clean Localized Sonar Wave Pulse
    if (state.showSonarWaves && state.recordData) {
      const pulsePhase = (state.currentTime * 3.5) % 1;
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const r = ((pulsePhase + k * 0.33) % 1) * 38 + 6;
        const alpha = Math.max(0, 1 - r / 44);
        ctx.strokeStyle = `rgba(15, 126, 155, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 5, Math.PI / 5);
        ctx.stroke();
      }
    }
    ctx.restore();

    // End Stop Bumper
    ctx.fillStyle = "#4b6570";
    drawRoundedRect(ctx, beamLen - 4, -14, 8, 22, 2, true, false);

    // ---------------- CART RENDERING ----------------
    const cartX = (stateKin.x / scenario.trackLength) * beamLen;
    ctx.save();
    ctx.translate(cartX, 0);

    // Cart Chassis
    const cartW = 44;
    const cartH = 18;
    ctx.fillStyle = "#0f7e9b";
    ctx.strokeStyle = "#095f76";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -cartW / 2, -cartH - 6, cartW, cartH, 4, true, true);

    // Flag
    ctx.fillStyle = "#123140";
    ctx.fillRect(-1.5, -cartH - 18, 3, 12);
    ctx.fillStyle = "#d67b19";
    drawRoundedRect(ctx, -5, -cartH - 22, 10, 5, 2, true, false);

    // Wheels
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-cartW / 2 + 8, -4, 5.5, 0, Math.PI * 2);
    ctx.arc(cartW / 2 - 8, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-cartW / 2 + 8, -4, 2, 0, Math.PI * 2);
    ctx.arc(cartW / 2 - 8, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cart Label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CART", 0, -cartH + 6);

    // ---------------- LIVE VECTORS (Zero Collision) ----------------
    if (state.showVectors) {
      // 1. VELOCITY VECTOR (Amber arrow placed ABOVE the cart)
      const vMag = stateKin.v;
      const vScale = 26;
      const vLen = vMag * vScale;
      const vY = -cartH - 28; // above cart

      if (Math.abs(vMag) > 0.04) {
        ctx.strokeStyle = "#d67b19";
        ctx.fillStyle = "#d67b19";
        ctx.lineWidth = 2.8;

        ctx.beginPath();
        ctx.moveTo(0, vY);
        ctx.lineTo(vLen, vY);
        ctx.stroke();

        const arrowDir = vLen > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(vLen, vY);
        ctx.lineTo(vLen - arrowDir * 6, vY - 4);
        ctx.lineTo(vLen - arrowDir * 6, vY + 4);
        ctx.closePath();
        ctx.fill();

        // Velocity Text Badge (with crisp white container pill)
        const vText = `v = ${stateKin.v > 0 ? "+" : ""}${stateKin.v.toFixed(2)} m/s`;
        ctx.font = "bold 10px 'Inter', sans-serif";
        const txtW = ctx.measureText(vText).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.strokeStyle = "#d67b19";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, vLen / 2 - txtW / 2 - 4, vY - 18, txtW + 8, 14, 3, true, true);

        ctx.fillStyle = "#b06210";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(vText, vLen / 2, vY - 11);
      } else {
        const vText = "v = 0 m/s";
        ctx.font = "bold 10px 'Inter', sans-serif";
        const txtW = ctx.measureText(vText).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.strokeStyle = "#d67b19";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, -txtW / 2 - 4, vY - 18, txtW + 8, 14, 3, true, true);

        ctx.fillStyle = "#b06210";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(vText, 0, vY - 11);
      }

      // 2. ACCELERATION VECTOR (Teal arrow placed UNDER THE TRACK BEAM)
      const aVal = stateKin.a;
      const aScale = 24;
      const aLen = aVal * aScale;
      const aY = 24; // Beneath track

      if (Math.abs(aVal) > 0.01) {
        ctx.strokeStyle = "#095f76";
        ctx.fillStyle = "#095f76";
        ctx.lineWidth = 2.4;

        ctx.beginPath();
        ctx.moveTo(0, aY);
        ctx.lineTo(aLen, aY);
        ctx.stroke();

        const arrowDirA = aLen > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(aLen, aY);
        ctx.lineTo(aLen - arrowDirA * 5, aY - 3.5);
        ctx.lineTo(aLen - arrowDirA * 5, aY + 3.5);
        ctx.closePath();
        ctx.fill();

        // Acceleration Text Badge (with crisp white container pill under track)
        const aText = `a = ${stateKin.a > 0 ? "+" : ""}${stateKin.a.toFixed(2)} m/s²`;
        ctx.font = "bold 10px 'Inter', sans-serif";
        const txtWA = ctx.measureText(aText).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.strokeStyle = "#095f76";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, aLen / 2 - txtWA / 2 - 4, aY + 4, txtWA + 8, 14, 3, true, true);

        ctx.fillStyle = "#095f76";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(aText, aLen / 2, aY + 11);
      }
    }

    ctx.restore(); // Restore Cart

    ctx.restore(); // Restore Track

    // Incline Angle & Status text
    const displayAngle = Math.round(Math.abs(angleDeg));
    const tiltDesc = angleDeg > 0.5 ? "Right Lifted (Uphill)" : (angleDeg < -0.5 ? "Left Lifted (Downhill)" : "Flat Track (0°)");
    ctx.fillStyle = "#4b6570";
    ctx.font = "600 11px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Incline: ${displayAngle}° [${tiltDesc}] | Track: ${scenario.trackLength}m`, padX, h * 0.93);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // MOTION MAP CANVAS RENDERING (Clean Spacing)
  // -------------------------------------------------------------
  function renderMotionMapCanvas() {
    const canvas = dom.motionMapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const scenario = getActiveScenario();
    const dt = scenario.id === 5 ? 0.35 : 0.25;
    const mapPoints = AccelerationPhysics.generateMotionMap(scenario, dt);

    const padLeft = 70;
    const padRight = 40;
    const mapWidth = w - padLeft - padRight;
    const isTurnaround = scenario.id === 5;

    const lineY1 = isTurnaround ? h * 0.38 : h * 0.52;
    const lineY2 = isTurnaround ? h * 0.74 : null;

    // Reference Line(s)
    ctx.strokeStyle = "#c8dbe3";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(padLeft, lineY1);
    ctx.lineTo(padLeft + mapWidth, lineY1);
    ctx.stroke();

    if (isTurnaround) {
      ctx.beginPath();
      ctx.moveTo(padLeft, lineY2);
      ctx.lineTo(padLeft + mapWidth, lineY2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Reference Labels
    ctx.fillStyle = "#123140";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("0 position", padLeft, lineY1 - 22);

    ctx.fillStyle = "#d67b19";
    ctx.textAlign = "right";
    ctx.fillText("+", padLeft + mapWidth, lineY1 - 22);

    if (isTurnaround) {
      ctx.fillStyle = "#4b6570";
      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Ascent (Moving Up)", padLeft - 60, lineY1 - 6);
      ctx.fillText("Descent (Moving Down)", padLeft - 60, lineY2 - 6);
    }

    let lastLabelX = -100;

    // Strobe Position Dots & Vectors
    mapPoints.forEach(pt => {
      const isPastOrCurrent = (state.currentTime >= pt.t - 0.05);
      if (!isPastOrCurrent && state.workflowMode === "predict") return;

      const alpha = isPastOrCurrent ? 1.0 : 0.25;
      const ptX = padLeft + (pt.x / scenario.trackLength) * mapWidth;
      const ptY = (pt.trackRow === 1 && lineY2) ? lineY2 : lineY1;

      ctx.globalAlpha = alpha;

      // Strobe Dot
      ctx.fillStyle = "#0f7e9b";
      ctx.beginPath();
      ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity Vector Arrow (Amber)
      const vScale = 18;
      const vLen = pt.v * vScale;

      if (Math.abs(pt.v) > 0.05) {
        ctx.strokeStyle = "#d67b19";
        ctx.fillStyle = "#d67b19";
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        ctx.moveTo(ptX, ptY);
        ctx.lineTo(ptX + vLen, ptY);
        ctx.stroke();

        const arrDir = vLen > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(ptX + vLen, ptY);
        ctx.lineTo(ptX + vLen - arrDir * 5, ptY - 3.5);
        ctx.lineTo(ptX + vLen - arrDir * 5, ptY + 3.5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Dot at rest (v=0)
        ctx.fillStyle = "#d67b19";
        ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("v=0", ptX, ptY - 22);
      }

      // Acceleration Vector Arrow (Teal above dot)
      const aScale = 14;
      const aLen = pt.a * aScale;
      const aY = ptY - 12;

      ctx.strokeStyle = "#095f76";
      ctx.fillStyle = "#095f76";
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(ptX, aY);
      ctx.lineTo(ptX + aLen, aY);
      ctx.stroke();

      const arrDirA = aLen > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(ptX + aLen, aY);
      ctx.lineTo(ptX + aLen - arrDirA * 4, aY - 3);
      ctx.lineTo(ptX + aLen - arrDirA * 4, aY + 3);
      ctx.closePath();
      ctx.fill();

      // Time tag below dot (Skip if crowded)
      if (Math.abs(ptX - lastLabelX) >= 24 || pt.t === 0 || pt.t >= scenario.tMax - 0.05) {
        ctx.fillStyle = "#4b6570";
        ctx.font = "8px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${pt.t}s`, ptX, ptY + 14);
        lastLabelX = ptX;
      }
    });

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // -------------------------------------------------------------
  // TRIPLE KINEMATIC GRAPHS RENDERING
  // -------------------------------------------------------------
  function renderGraphs() {
    const scenario = getActiveScenario();
    const timeData = AccelerationPhysics.generateTimeSeries(scenario, 80, state.sensorNoise);
    const tCurrent = state.currentTime;

    renderXTGraph(dom.xtCanvas, scenario, timeData, tCurrent);
    renderVTGraph(dom.vtCanvas, scenario, timeData, tCurrent);
    renderATGraph(dom.atCanvas, scenario, timeData, tCurrent);
  }

  function renderPredictionStrokes(ctx, strokes, w, h) {
    if (!strokes || strokes.length === 0) return;

    ctx.save();
    ctx.strokeStyle = "#d67b19";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });

    ctx.restore();
  }

  // 1. Position vs. Time Graph
  function renderXTGraph(canvas, scenario, data, tCurrent) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 45, padR = 25, padT = 15, padB = 25;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const tMax = scenario.tMax;
    const xMax = 2.6;

    // Grid Lines
    ctx.strokeStyle = "#e2eef3";
    ctx.lineWidth = 1;
    for (let t = 0; t <= tMax; t += 0.5) {
      const gx = padL + (t / tMax) * plotW;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, padT + plotH);
      ctx.stroke();
    }
    for (let x = 0; x <= xMax; x += 0.5) {
      const gy = padT + plotH - (x / xMax) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#123140";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#123140";
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("x (m)", padL - 6, padT + 6);
    ctx.fillText("0", padL - 6, padT + plotH);
    ctx.fillText(xMax.toFixed(1), padL - 6, padT + 12);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("t (s)", padL + plotW, padT + plotH + 6);
    ctx.fillText(tMax.toFixed(1) + "s", padL + plotW - 10, padT + plotH + 6);

    // Student Prediction Strokes
    const sId = state.activeScenarioId;
    const xtStrokes = (state.predictions[sId] && state.predictions[sId].xt) || [];
    renderPredictionStrokes(ctx, xtStrokes, w, h);

    // Theoretical Guide Line
    if (state.showTheoryGuide) {
      ctx.strokeStyle = "rgba(15, 126, 155, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < data.t.length; i++) {
        const px = padL + (data.t[i] / tMax) * plotW;
        const py = padT + plotH - (data.x[i] / xMax) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Live Motion Detector Trace
    if (state.recordData && tCurrent > 0) {
      ctx.strokeStyle = "#0f7e9b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < data.t.length; i++) {
        if (data.t[i] <= tCurrent + 0.02) {
          const px = padL + (data.t[i] / tMax) * plotW;
          const py = padT + plotH - (data.xSensor[i] / xMax) * plotH;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();

      // Tangent Line
      if (state.showTangent && tCurrent > 0) {
        const tan = AccelerationPhysics.getTangentLine(scenario, tCurrent, 0.4);
        const px0 = padL + (tan.t0 / tMax) * plotW;
        const py0 = padT + plotH - (tan.x0 / xMax) * plotH;
        const px1 = padL + (tan.t1 / tMax) * plotW;
        const py1 = padT + plotH - (tan.x1 / xMax) * plotH;

        ctx.strokeStyle = "#d67b19";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.stroke();

        const curX = padL + (tCurrent / tMax) * plotW;
        const curY = padT + plotH - (tan.xCenter / xMax) * plotH;
        ctx.fillStyle = "#d67b19";
        ctx.beginPath();
        ctx.arc(curX, curY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Playhead Line
      const curTimeX = padL + (tCurrent / tMax) * plotW;
      ctx.strokeStyle = "#d67b19";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curTimeX, padT);
      ctx.lineTo(curTimeX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // 2. Velocity vs. Time Graph
  function renderVTGraph(canvas, scenario, data, tCurrent) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 45, padR = 25, padT = 15, padB = 25;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const tMax = scenario.tMax;
    const vMaxAbs = 2.5;
    const zeroY = padT + plotH / 2;

    // Grid Lines
    ctx.strokeStyle = "#e2eef3";
    ctx.lineWidth = 1;
    for (let t = 0; t <= tMax; t += 0.5) {
      const gx = padL + (t / tMax) * plotW;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, padT + plotH);
      ctx.stroke();
    }

    // Zero velocity baseline
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(padL + plotW, zeroY);
    ctx.stroke();

    // Axes
    ctx.strokeStyle = "#123140";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#123140";
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("+v (m/s)", padL - 6, padT + 6);
    ctx.fillText("0", padL - 6, zeroY);
    ctx.fillText("-v", padL - 6, padT + plotH - 6);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("t (s)", padL + plotW, padT + plotH + 6);

    // Student Prediction Strokes
    const sId = state.activeScenarioId;
    const vtStrokes = (state.predictions[sId] && state.predictions[sId].vt) || [];
    renderPredictionStrokes(ctx, vtStrokes, w, h);

    // Theoretical Guide Line
    if (state.showTheoryGuide) {
      ctx.strokeStyle = "rgba(15, 126, 155, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < data.t.length; i++) {
        const px = padL + (data.t[i] / tMax) * plotW;
        const py = zeroY - (data.v[i] / vMaxAbs) * (plotH / 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Live v-t Trace
    if (state.recordData && tCurrent > 0) {
      if (state.showArea) {
        ctx.fillStyle = "rgba(214, 123, 25, 0.2)";
        ctx.beginPath();
        ctx.moveTo(padL, zeroY);
        for (let i = 0; i < data.t.length; i++) {
          if (data.t[i] <= tCurrent) {
            const px = padL + (data.t[i] / tMax) * plotW;
            const py = zeroY - (data.v[i] / vMaxAbs) * (plotH / 2);
            ctx.lineTo(px, py);
          }
        }
        const curX = padL + (tCurrent / tMax) * plotW;
        ctx.lineTo(curX, zeroY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = "#0f7e9b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < data.t.length; i++) {
        if (data.t[i] <= tCurrent + 0.02) {
          const px = padL + (data.t[i] / tMax) * plotW;
          const py = zeroY - (data.vSensor[i] / vMaxAbs) * (plotH / 2);
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();

      // Playhead Line
      const curTimeX = padL + (tCurrent / tMax) * plotW;
      ctx.strokeStyle = "#d67b19";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curTimeX, padT);
      ctx.lineTo(curTimeX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // 3. Acceleration vs. Time Graph
  function renderATGraph(canvas, scenario, data, tCurrent) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 45, padR = 25, padT = 15, padB = 25;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const tMax = scenario.tMax;
    const aMaxAbs = 2.0;
    const zeroY = padT + plotH / 2;

    // Grid & Zero baseline
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(padL + plotW, zeroY);
    ctx.stroke();

    // Axes
    ctx.strokeStyle = "#123140";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#123140";
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("+a (m/s²)", padL - 6, padT + 6);
    ctx.fillText("0", padL - 6, zeroY);
    ctx.fillText("-a", padL - 6, padT + plotH - 6);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("t (s)", padL + plotW, padT + plotH + 6);

    // Student Prediction Strokes
    const sId = state.activeScenarioId;
    const atStrokes = (state.predictions[sId] && state.predictions[sId].at) || [];
    renderPredictionStrokes(ctx, atStrokes, w, h);

    // Theoretical Guide Line
    if (state.showTheoryGuide) {
      const aY = zeroY - (scenario.a / aMaxAbs) * (plotH / 2);
      ctx.strokeStyle = "rgba(15, 126, 155, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, aY);
      ctx.lineTo(padL + plotW, aY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Live Acceleration Trace
    if (state.recordData && tCurrent > 0) {
      const aY = zeroY - (scenario.a / aMaxAbs) * (plotH / 2);
      const curTimeX = padL + (tCurrent / tMax) * plotW;

      ctx.strokeStyle = "#095f76";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padL, aY);
      ctx.lineTo(curTimeX, aY);
      ctx.stroke();

      // Playhead Line
      ctx.strokeStyle = "#d67b19";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curTimeX, padT);
      ctx.lineTo(curTimeX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // PREDICTION DRAWING & SKETCH INTERACTION
  // -------------------------------------------------------------
  function setupGraphDrawing() {
    const graphConfigs = [
      { key: "xt", canvas: dom.xtCanvas },
      { key: "vt", canvas: dom.vtCanvas },
      { key: "at", canvas: dom.atCanvas }
    ];

    graphConfigs.forEach(({ key, canvas }) => {
      if (!canvas) return;

      function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      }

      function onStart(e) {
        state.isDrawing = true;
        state.activeDrawingGraph = key;
        const pt = getCoords(e);
        state.currentStroke = [pt];
      }

      function onMove(e) {
        if (!state.isDrawing || state.activeDrawingGraph !== key) return;
        const pt = getCoords(e);
        state.currentStroke.push(pt);

        renderGraphs();
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#d67b19";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(state.currentStroke[0].x, state.currentStroke[0].y);
        for (let i = 1; i < state.currentStroke.length; i++) {
          ctx.lineTo(state.currentStroke[i].x, state.currentStroke[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      function onEnd() {
        if (!state.isDrawing || state.activeDrawingGraph !== key) return;
        state.isDrawing = false;
        const sId = state.activeScenarioId;
        if (!state.predictions[sId]) state.predictions[sId] = { xt: [], vt: [], at: [] };
        if (!state.predictions[sId][key]) state.predictions[sId][key] = [];
        
        if (state.currentStroke.length > 1) {
          state.predictions[sId][key].push([...state.currentStroke]);
        }
        state.currentStroke = [];
        state.activeDrawingGraph = null;
        renderGraphs();
      }

      canvas.addEventListener("mousedown", onStart);
      canvas.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);

      canvas.addEventListener("touchstart", onStart, { passive: true });
      canvas.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    });

    // Clear Sketch Buttons
    document.querySelectorAll(".btn-clear-sketch").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        const sId = state.activeScenarioId;
        if (!state.predictions[sId]) state.predictions[sId] = { xt: [], vt: [], at: [] };

        if (target === "all") {
          state.predictions[sId] = { xt: [], vt: [], at: [] };
        } else {
          state.predictions[sId][target] = [];
        }
        renderGraphs();
      });
    });

    // Preset Shape Inserts
    document.querySelectorAll(".btn-preset-shape").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        const shape = btn.getAttribute("data-shape");
        const canvas = dom[target + "Canvas"];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const padL = 45, padR = 25, padT = 15, padB = 25;
        const plotW = w - padL - padR;
        const plotH = h - padT - padB;
        const zeroY = padT + plotH / 2;

        const stroke = [];
        const steps = 30;

        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const px = padL + frac * plotW;
          let py = padT + plotH;

          if (shape === "flat-zero") {
            py = zeroY;
          } else if (shape === "flat-pos") {
            py = padT + plotH * 0.25;
          } else if (shape === "flat-neg") {
            py = padT + plotH * 0.75;
          } else if (shape === "linear-pos") {
            py = padT + plotH - frac * plotH * 0.8;
          } else if (shape === "linear-neg") {
            py = padT + plotH * 0.2 + frac * plotH * 0.8;
          } else if (shape === "parabola-up") {
            py = padT + plotH - (frac * frac) * plotH * 0.85;
          } else if (shape === "parabola-down") {
            py = padT + plotH * 0.15 + (frac * frac) * plotH * 0.85;
          }

          stroke.push({ x: px, y: py });
        }

        const sId = state.activeScenarioId;
        if (!state.predictions[sId]) state.predictions[sId] = { xt: [], vt: [], at: [] };
        state.predictions[sId][target] = [stroke];
        renderGraphs();
      });
    });
  }

  // -------------------------------------------------------------
  // SANDBOX / FREE PLAY UPDATE
  // -------------------------------------------------------------
  function updateSandboxPhysics() {
    const s = state.sandbox;
    s.a = AccelerationPhysics.calculateAccelerationFromAngle(s.angleDeg);
    s.tilt = s.angleDeg < -0.5 ? "down-right" : (s.angleDeg > 0.5 ? "up-right" : "flat");
    s.tMax = AccelerationPhysics.calculateMaxTime(s.x0, s.v0, s.a, s.trackLength);

    if (dom.valAngle) {
      const dirText = s.angleDeg > 0.5 ? "Right Lifted" : (s.angleDeg < -0.5 ? "Left Lifted" : "Flat");
      dom.valAngle.textContent = `${Math.abs(s.angleDeg)}° (${dirText})`;
    }
    if (dom.valA) {
      dom.valA.textContent = (s.a >= 0 ? "+" : "") + s.a.toFixed(2) + " m/s²";
    }
    if (dom.valX0) {
      dom.valX0.textContent = s.x0.toFixed(2) + " m";
    }
    if (dom.valV0) {
      dom.valV0.textContent = (s.v0 >= 0 ? "+" : "") + s.v0.toFixed(2) + " m/s";
    }
  }

  // -------------------------------------------------------------
  // TELEMETRY & UI UPDATES
  // -------------------------------------------------------------
  function updateUI() {
    const scenario = getActiveScenario();
    const curState = AccelerationPhysics.getState(scenario, state.currentTime);

    // Time display & Slider
    dom.timeDisplay.textContent = state.currentTime.toFixed(2) + "s";
    dom.scrubSlider.max = scenario.tMax;
    dom.scrubSlider.value = state.currentTime;

    // Telemetry values
    dom.telemPos.textContent = curState.x.toFixed(2) + " m";
    dom.telemVel.textContent = (curState.v >= 0 ? "+" : "") + curState.v.toFixed(2) + " m/s";
    dom.telemAcc.textContent = (curState.a >= 0 ? "+" : "") + curState.a.toFixed(2) + " m/s²";
    dom.telemSpeed.textContent = curState.speed.toFixed(2) + " m/s";

    dom.btnPlayPause.innerHTML = state.isPlaying ? "⏸ Pause" : "▶ Run Detector";

    const tangentBadge = document.getElementById("tangentBadge");
    if (tangentBadge) {
      const tan = AccelerationPhysics.getTangentLine(scenario, state.currentTime);
      tangentBadge.textContent = `Slope (v) = ${tan.slope > 0 ? "+" : ""}${tan.slope.toFixed(2)} m/s`;
    }
  }

  function renderAll() {
    renderRampCanvas();
    renderMotionMapCanvas();
    renderGraphs();
    updateUI();
  }

  // -------------------------------------------------------------
  // ANIMATION LOOP
  // -------------------------------------------------------------
  function animationLoop(timestamp) {
    if (!state.lastFrameTime) state.lastFrameTime = timestamp;
    const deltaSec = (timestamp - state.lastFrameTime) / 1000;
    state.lastFrameTime = timestamp;

    if (state.isPlaying) {
      const scenario = getActiveScenario();
      state.currentTime += deltaSec * state.playbackSpeed;

      if (state.currentTime >= scenario.tMax) {
        state.currentTime = scenario.tMax;
        state.isPlaying = false;
      }
    }

    renderAll();

    if (state.isPlaying) {
      state.animationFrameId = requestAnimationFrame(animationLoop);
    }
  }

  function startPlayback(withRecording = true) {
    state.recordData = withRecording;
    const scenario = getActiveScenario();
    if (state.currentTime >= scenario.tMax) {
      state.currentTime = 0;
    }
    state.isPlaying = true;
    state.lastFrameTime = performance.now();
    state.animationFrameId = requestAnimationFrame(animationLoop);
  }

  function pausePlayback() {
    state.isPlaying = false;
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    renderAll();
  }

  function resetPlayback() {
    pausePlayback();
    state.currentTime = 0;
    renderAll();
  }

  // -------------------------------------------------------------
  // INQUIRY QUESTIONS SETUP
  // -------------------------------------------------------------
  function buildInquiryForm() {
    const scenarioId = state.activeScenarioId;
    const scenario = getActiveScenario();
    if (!scenario || scenarioId === "sandbox") {
      dom.inquiryGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 1rem; color: var(--muted); font-size: 0.9rem;">Free Play Sandbox enabled: Lift either the left or right side of the ramp, adjust initial velocity and position, and test your predictions!</div>`;
      dom.btnCheckAnswers.style.display = "none";
      dom.btnResetAnswers.style.display = "none";
      dom.explanationBox.classList.remove("show");
      return;
    }

    dom.btnCheckAnswers.style.display = "inline-flex";
    dom.btnResetAnswers.style.display = "inline-flex";
    dom.explanationBox.classList.remove("show");

    const isTurnaround = scenarioId === 5;
    let html = "";

    if (!isTurnaround) {
      html += `
        <!-- Question c: Velocity Sign -->
        <div class="question-card" id="card_vSign">
          <div class="question-letter">Question c</div>
          <div class="question-prompt">Is the velocity positive or negative?</div>
          <div class="question-select-row">
            <select class="inquiry-select" data-key="vSign">
              <option value="">-- Select --</option>
              <option value="positive">Positive (+)</option>
              <option value="negative">Negative (-)</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_vSign"></div>
        </div>

        <!-- Question d: Acceleration Sign -->
        <div class="question-card" id="card_aSign">
          <div class="question-letter">Question d</div>
          <div class="question-prompt">Is the acceleration positive or negative?</div>
          <div class="question-select-row">
            <select class="inquiry-select" data-key="aSign">
              <option value="">-- Select --</option>
              <option value="positive">Positive (+)</option>
              <option value="negative">Negative (-)</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_aSign"></div>
        </div>

        <!-- Question g: Slope of x-t graph -->
        <div class="question-card" id="card_xtSlope">
          <div class="question-letter">Question g</div>
          <div class="question-prompt">The slope of the <b>position-time</b> graph is:</div>
          <div class="question-select-row" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
            <select class="inquiry-select" data-key="xtSlopeBehavior">
              <option value="">-- Behavior --</option>
              <option value="constant">constant</option>
              <option value="increasing">increasing</option>
              <option value="decreasing">decreasing</option>
            </select>
            <select class="inquiry-select" data-key="xtSlopeSign">
              <option value="">-- Sign --</option>
              <option value="positive">positive</option>
              <option value="negative">negative</option>
            </select>
            <select class="inquiry-select" data-key="xtSlopeMeaning">
              <option value="">-- Represents --</option>
              <option value="position">position</option>
              <option value="velocity">velocity</option>
              <option value="acceleration">acceleration</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_xtSlope"></div>
        </div>

        <!-- Question h: Slope of v-t graph -->
        <div class="question-card" id="card_vtSlope">
          <div class="question-letter">Question h</div>
          <div class="question-prompt">The slope of the <b>velocity-time</b> graph is:</div>
          <div class="question-select-row" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
            <select class="inquiry-select" data-key="vtSlopeBehavior">
              <option value="">-- Behavior --</option>
              <option value="constant">constant</option>
              <option value="increasing">increasing</option>
              <option value="decreasing">decreasing</option>
            </select>
            <select class="inquiry-select" data-key="vtSlopeSign">
              <option value="">-- Sign --</option>
              <option value="positive">positive</option>
              <option value="negative">negative</option>
            </select>
            <select class="inquiry-select" data-key="vtSlopeMeaning">
              <option value="">-- Represents --</option>
              <option value="displacement">displacement</option>
              <option value="velocity">velocity</option>
              <option value="acceleration">acceleration</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_vtSlope"></div>
        </div>
      `;
    } else {
      html += `
        <!-- Question c: Velocity Direction Change -->
        <div class="question-card" id="card_vDirChange">
          <div class="question-letter">Question c</div>
          <div class="question-prompt">Does the direction of the velocity change?</div>
          <div class="question-select-row">
            <select class="inquiry-select" data-key="vDirChange">
              <option value="">-- Select --</option>
              <option value="yes">Yes (changes + to -)</option>
              <option value="no">No (stays same)</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_vDirChange"></div>
        </div>

        <!-- Question d: Acceleration Direction Change -->
        <div class="question-card" id="card_aDirChange">
          <div class="question-letter">Question d</div>
          <div class="question-prompt">Does the direction of the acceleration change?</div>
          <div class="question-select-row">
            <select class="inquiry-select" data-key="aDirChange">
              <option value="">-- Select --</option>
              <option value="yes">Yes (reverses at apex)</option>
              <option value="no">No (constant negative down ramp)</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_aDirChange"></div>
        </div>

        <!-- Question g: Slope of x-t graph for Turnaround -->
        <div class="question-card" id="card_xtSlope">
          <div class="question-letter">Question g</div>
          <div class="question-prompt">The slope of the <b>position-time</b> graph represents:</div>
          <div class="question-select-row" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
            <select class="inquiry-select" data-key="xtSlopeMeaning">
              <option value="">-- Represents --</option>
              <option value="position">position</option>
              <option value="velocity">velocity (changes from + to 0 to -)</option>
              <option value="acceleration">acceleration</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_xtSlope"></div>
        </div>

        <!-- Question h: Slope of v-t graph for Turnaround -->
        <div class="question-card" id="card_vtSlope">
          <div class="question-letter">Question h</div>
          <div class="question-prompt">The slope of the <b>velocity-time</b> graph is:</div>
          <div class="question-select-row" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
            <select class="inquiry-select" data-key="vtSlopeBehavior">
              <option value="">-- Behavior --</option>
              <option value="constant">constant</option>
              <option value="increasing">increasing</option>
              <option value="decreasing">decreasing</option>
            </select>
            <select class="inquiry-select" data-key="vtSlopeSign">
              <option value="">-- Sign --</option>
              <option value="positive">positive</option>
              <option value="negative">negative</option>
            </select>
            <select class="inquiry-select" data-key="vtSlopeMeaning">
              <option value="">-- Represents --</option>
              <option value="displacement">displacement</option>
              <option value="velocity">velocity</option>
              <option value="acceleration">acceleration</option>
            </select>
          </div>
          <div class="feedback-msg" id="fb_vtSlope"></div>
        </div>
      `;
    }

    dom.inquiryGrid.innerHTML = html;

    const cached = state.answers[scenarioId] || {};
    dom.inquiryGrid.querySelectorAll(".inquiry-select").forEach(sel => {
      const key = sel.getAttribute("data-key");
      if (cached[key]) {
        sel.value = cached[key];
      }
      sel.addEventListener("change", (e) => {
        if (!state.answers[scenarioId]) state.answers[scenarioId] = {};
        state.answers[scenarioId][key] = e.target.value;
      });
    });
  }

  function handleCheckAnswers() {
    const scenarioId = state.activeScenarioId;
    const userAns = state.answers[scenarioId] || {};
    const evalRes = AccelerationPhysics.evaluateAnswers(scenarioId, userAns);
    const feedback = evalRes.feedback;

    if (feedback.vSign) {
      const card = document.getElementById("card_vSign");
      const fb = document.getElementById("fb_vSign");
      if (card && fb) {
        card.classList.toggle("correct", feedback.vSign.correct);
        card.classList.toggle("incorrect", !feedback.vSign.correct);
        fb.textContent = feedback.vSign.correct ? "✓ Correct!" : `✗ Re-check: velocity is ${feedback.vSign.expectedValue}.`;
        fb.className = `feedback-msg show ${feedback.vSign.correct ? "correct" : "incorrect"}`;
      }
    }

    if (feedback.vDirChange) {
      const card = document.getElementById("card_vDirChange");
      const fb = document.getElementById("fb_vDirChange");
      if (card && fb) {
        card.classList.toggle("correct", feedback.vDirChange.correct);
        card.classList.toggle("incorrect", !feedback.vDirChange.correct);
        fb.textContent = feedback.vDirChange.correct ? "✓ Correct! Velocity changes from positive to negative." : "✗ Velocity reverses direction at the apex.";
        fb.className = `feedback-msg show ${feedback.vDirChange.correct ? "correct" : "incorrect"}`;
      }
    }

    if (feedback.aSign) {
      const card = document.getElementById("card_aSign");
      const fb = document.getElementById("fb_aSign");
      if (card && fb) {
        card.classList.toggle("correct", feedback.aSign.correct);
        card.classList.toggle("incorrect", !feedback.aSign.correct);
        fb.textContent = feedback.aSign.correct ? "✓ Correct!" : `✗ Re-check: acceleration is ${feedback.aSign.expectedValue}.`;
        fb.className = `feedback-msg show ${feedback.aSign.correct ? "correct" : "incorrect"}`;
      }
    }

    if (feedback.aDirChange) {
      const card = document.getElementById("card_aDirChange");
      const fb = document.getElementById("fb_aDirChange");
      if (card && fb) {
        card.classList.toggle("correct", feedback.aDirChange.correct);
        card.classList.toggle("incorrect", !feedback.aDirChange.correct);
        fb.textContent = feedback.aDirChange.correct ? "✓ Correct! Gravity constantly accelerates down the ramp." : "✗ Notice that acceleration is constant down the ramp the entire time!";
        fb.className = `feedback-msg show ${feedback.aDirChange.correct ? "correct" : "incorrect"}`;
      }
    }

    const xtCard = document.getElementById("card_xtSlope");
    const xtFb = document.getElementById("fb_xtSlope");
    if (xtCard && xtFb) {
      const xtCorrect = (feedback.xtSlopeBehavior ? feedback.xtSlopeBehavior.correct : true) &&
                        (feedback.xtSlopeSign ? feedback.xtSlopeSign.correct : true) &&
                        (feedback.xtSlopeMeaning ? feedback.xtSlopeMeaning.correct : true);
      xtCard.classList.toggle("correct", xtCorrect);
      xtCard.classList.toggle("incorrect", !xtCorrect);
      if (xtCorrect) {
        if (scenarioId === 3) {
          xtFb.textContent = "✓ Correct! The slope of x-t is velocity, which decreases from 0 to negative values (a negative number is less than zero).";
        } else if (scenarioId === 4) {
          xtFb.textContent = "✓ Correct! The slope of x-t is velocity, which increases from negative values toward 0 (-1.8 < 0).";
        } else if (scenarioId === 1) {
          xtFb.textContent = "✓ Correct! The slope of x-t is velocity, which increases from 0 to positive values.";
        } else if (scenarioId === 2) {
          xtFb.textContent = "✓ Correct! The slope of x-t is velocity, which decreases from positive values toward 0.";
        } else {
          xtFb.textContent = "✓ Correct! The slope of x-t represents velocity (decreasing continuously throughout).";
        }
      } else {
        if (feedback.xtSlopeBehavior && !feedback.xtSlopeBehavior.correct) {
          if (scenarioId === 3) {
            xtFb.textContent = "✗ Note on slope behavior: A negative number is less than zero. Going from 0 to negative velocity means the slope is decreasing in numerical value.";
          } else if (scenarioId === 4) {
            xtFb.textContent = "✗ Note on slope behavior: Moving from a negative number toward 0 is an increase in numerical value (the slope is increasing).";
          } else {
            xtFb.textContent = "✗ Check behavior: Slope on position-time indicates instantaneous velocity.";
          }
        } else if (feedback.xtSlopeSign && !feedback.xtSlopeSign.correct) {
          xtFb.textContent = `✗ Check sign: Velocity points in the ${feedback.xtSlopeSign.expectedValue} direction.`;
        } else {
          xtFb.textContent = "✗ Recall: The slope of position-time represents instantaneous velocity.";
        }
      }
      xtFb.className = `feedback-msg show ${xtCorrect ? "correct" : "incorrect"}`;
    }

    const vtCard = document.getElementById("card_vtSlope");
    const vtFb = document.getElementById("fb_vtSlope");
    if (vtCard && vtFb) {
      const vtCorrect = (feedback.vtSlopeBehavior ? feedback.vtSlopeBehavior.correct : true) &&
                        (feedback.vtSlopeSign ? feedback.vtSlopeSign.correct : true) &&
                        (feedback.vtSlopeMeaning ? feedback.vtSlopeMeaning.correct : true);
      vtCard.classList.toggle("correct", vtCorrect);
      vtCard.classList.toggle("incorrect", !vtCorrect);
      if (vtCorrect) {
        const userVtBeh = (userAns.vtSlopeBehavior || "").toLowerCase().trim();
        if (userVtBeh === "decreasing" || userVtBeh === "increasing") {
          vtFb.textContent = "✓ Correct! (Note: While velocity values change, the slope of the straight v-t line is constant uniform acceleration).";
        } else {
          vtFb.textContent = "✓ Correct! The slope of v-t is constant uniform acceleration.";
        }
      } else {
        if (feedback.vtSlopeBehavior && !feedback.vtSlopeBehavior.correct) {
          vtFb.textContent = "✗ Recall: The velocity-time graph is a straight line, so its slope is constant uniform acceleration.";
        } else if (feedback.vtSlopeSign && !feedback.vtSlopeSign.correct) {
          vtFb.textContent = `✗ Check sign: Acceleration is directed in the ${feedback.vtSlopeSign.expectedValue} direction.`;
        } else {
          vtFb.textContent = "✗ Recall: The slope of velocity-time represents acceleration.";
        }
      }
      vtFb.className = `feedback-msg show ${vtCorrect ? "correct" : "incorrect"}`;
    }

    dom.explanationText.textContent = evalRes.explanation;
    dom.explanationBox.classList.add("show");
  }

  function handleResetAnswers() {
    const scenarioId = state.activeScenarioId;
    state.answers[scenarioId] = {};
    buildInquiryForm();
  }

  // -------------------------------------------------------------
  // SWITCH SCENARIOS
  // -------------------------------------------------------------
  function setScenario(id) {
    pausePlayback();
    state.activeScenarioId = id;
    state.currentTime = 0;
    state.recordData = false;

    dom.scenarioTabs.forEach(tab => {
      const tabId = tab.getAttribute("data-scenario");
      tab.classList.toggle("active", tabId === String(id));
    });

    const scenario = getActiveScenario();
    dom.bannerTitle.textContent = scenario.title;
    dom.bannerDesc.textContent = scenario.description;

    if (id === "sandbox") {
      dom.sandboxSettings.classList.add("show");
      updateSandboxPhysics();
    } else {
      dom.sandboxSettings.classList.remove("show");
    }

    buildInquiryForm();
    renderAll();
  }

  // -------------------------------------------------------------
  // EVENT LISTENERS INITIALIZATION
  // -------------------------------------------------------------
  function attachEventListeners() {
    dom.scenarioTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const idStr = tab.getAttribute("data-scenario");
        const id = idStr === "sandbox" ? "sandbox" : parseInt(idStr, 10);
        setScenario(id);
      });
    });

    if (dom.btnModePredict) {
      dom.btnModePredict.addEventListener("click", () => {
        dom.btnModePredict.classList.add("active");
        dom.btnModeObserve.classList.remove("active");
        state.workflowMode = "predict";
        state.recordData = false;
        resetPlayback();
      });
    }
    if (dom.btnModeObserve) {
      dom.btnModeObserve.addEventListener("click", () => {
        dom.btnModeObserve.classList.add("active");
        dom.btnModePredict.classList.remove("active");
        state.workflowMode = "observe";
        state.recordData = true;
        startPlayback(true);
      });
    }

    dom.btnPlayPause.addEventListener("click", () => {
      if (state.isPlaying) {
        pausePlayback();
      } else {
        startPlayback(true);
      }
    });

    if (dom.btnPreviewMotion) {
      dom.btnPreviewMotion.addEventListener("click", () => {
        startPlayback(false);
      });
    }

    dom.btnReset.addEventListener("click", resetPlayback);

    dom.btnStepBack.addEventListener("click", () => {
      pausePlayback();
      state.currentTime = Math.max(0, state.currentTime - 0.05);
      renderAll();
    });

    dom.btnStepForward.addEventListener("click", () => {
      const scenario = getActiveScenario();
      pausePlayback();
      state.currentTime = Math.min(scenario.tMax, state.currentTime + 0.05);
      renderAll();
    });

    dom.scrubSlider.addEventListener("input", (e) => {
      pausePlayback();
      state.currentTime = parseFloat(e.target.value);
      state.recordData = true;
      renderAll();
    });

    dom.speedButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        dom.speedButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.playbackSpeed = parseFloat(btn.getAttribute("data-speed"));
      });
    });

    dom.chkVectors.addEventListener("change", (e) => {
      state.showVectors = e.target.checked;
      renderAll();
    });
    dom.chkRuler.addEventListener("change", (e) => {
      state.showRuler = e.target.checked;
      renderAll();
    });
    dom.chkSonar.addEventListener("change", (e) => {
      state.showSonarWaves = e.target.checked;
      renderAll();
    });
    dom.chkTangent.addEventListener("change", (e) => {
      state.showTangent = e.target.checked;
      renderAll();
    });
    dom.chkArea.addEventListener("change", (e) => {
      state.showArea = e.target.checked;
      renderAll();
    });
    if (dom.chkTheoryGuide) {
      dom.chkTheoryGuide.addEventListener("change", (e) => {
        state.showTheoryGuide = e.target.checked;
        renderAll();
      });
    }
    dom.chkNoise.addEventListener("change", (e) => {
      state.sensorNoise = e.target.checked;
      renderAll();
    });

    // Sandbox Incline Lift Controls
    if (dom.sliderAngle) {
      dom.sliderAngle.addEventListener("input", (e) => {
        state.sandbox.angleDeg = parseInt(e.target.value, 10);
        updateSandboxPhysics();
        resetPlayback();
      });
    }
    if (dom.btnTiltLeft) {
      dom.btnTiltLeft.addEventListener("click", () => {
        state.sandbox.angleDeg = -14;
        if (dom.sliderAngle) dom.sliderAngle.value = -14;
        updateSandboxPhysics();
        resetPlayback();
      });
    }
    if (dom.btnTiltFlat) {
      dom.btnTiltFlat.addEventListener("click", () => {
        state.sandbox.angleDeg = 0;
        if (dom.sliderAngle) dom.sliderAngle.value = 0;
        updateSandboxPhysics();
        resetPlayback();
      });
    }
    if (dom.btnTiltRight) {
      dom.btnTiltRight.addEventListener("click", () => {
        state.sandbox.angleDeg = 14;
        if (dom.sliderAngle) dom.sliderAngle.value = 14;
        updateSandboxPhysics();
        resetPlayback();
      });
    }

    if (dom.sliderX0) {
      dom.sliderX0.addEventListener("input", (e) => {
        state.sandbox.x0 = parseFloat(e.target.value);
        updateSandboxPhysics();
        resetPlayback();
      });
    }
    if (dom.sliderV0) {
      dom.sliderV0.addEventListener("input", (e) => {
        state.sandbox.v0 = parseFloat(e.target.value);
        updateSandboxPhysics();
        resetPlayback();
      });
    }

    dom.btnCheckAnswers.addEventListener("click", handleCheckAnswers);
    dom.btnResetAnswers.addEventListener("click", handleResetAnswers);

    setupGraphDrawing();

    window.addEventListener("resize", () => {
      resizeCanvases();
      renderAll();
    });
  }

  function init() {
    initDOM();
    resizeCanvases();
    attachEventListeners();
    setScenario(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
