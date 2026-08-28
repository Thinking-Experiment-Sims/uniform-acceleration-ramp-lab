# Uniform Acceleration: Ramp & Cart Kinematics Lab

An interactive Modeling Physics simulation aligned with the Modeling Instruction curriculum document **"Uniformly Accelerated Particle Model - Lab Extension: Increasing and Decreasing Speed" (Unit 3 Uniform Acceleration v3.0)**.

Designed and authored as part of **The Thinking Experiment** (PhysicsKit).

---

## 🎯 Pedagogical Objectives
Students explore and build conceptual understanding of:
1. **The 5 Fundamental Uniform Acceleration Scenarios**:
   - **Scenario 1**: Increasing speed in the positive direction (cart starts from rest, rolls down incline away from detector at $x = 0$).
   - **Scenario 2**: Decreasing speed in the positive direction (cart given push up ramp away from detector, coasting to a stop at apex).
   - **Scenario 3**: Increasing speed in the negative direction (cart starts from rest at $+x$, rolls down incline towards detector at $x = 0$).
   - **Scenario 4**: Decreasing speed in the negative direction (cart given push up ramp towards detector, coasting to a stop at apex).
   - **Scenario 5**: Up and down the ramp (cart pushed up ramp, comes to momentary rest at apex $v=0$ while $a \neq 0$, turns around, and rolls back down).
2. **Modeling Motion Maps**:
   - Drawing dots at uniform time intervals ($\Delta t$).
   - Drawing velocity vectors $\vec{v}$ scaling with instantaneous speed.
   - Drawing constant acceleration vectors $\vec{a}$ in the direction of the net force (down the ramp).
   - Dual-track level layout for ascent vs. descent in turnaround motions.
3. **Synchronized Triple Kinematics Graphs**:
   - $x\text{-}t$ (Position vs. Time): Parabolic curves with live tangent slope tool representing instantaneous velocity ($\frac{dx}{dt} = v$).
   - $v\text{-}t$ (Velocity vs. Time): Linear curves with slope representing acceleration ($\frac{dv}{dt} = a$) and shaded area representing displacement ($\Delta x$).
   - $a\text{-}t$ (Acceleration vs. Time): Constant horizontal line representing uniform gravitational acceleration ($a = g \sin\theta$).
4. **Formative Assessment & Reasoning**:
   - Immediate feedback on signs of $v$ and $a$.
   - Speeding up when $v$ and $a$ share signs ($v \cdot a > 0$).
   - Slowing down when $v$ and $a$ have opposite signs ($v \cdot a < 0$).
   - Constant non-zero acceleration at the turnaround apex point.

---

## 🛠️ Technology Stack & Standards
- **No-Build Architecture**: Runs natively in any modern browser via pure vanilla HTML5, Canvas, and JavaScript.
- **Design System Strict Compliance**:
  - Palette: Teal (`#0f7e9b`), Amber (`#d67b19`), White (`#ffffff`), Blueprint Grid (`#e9f4fb`).
  - Zero Prohibited Colors (No `#59118e` purple, No `#ffc61e` gold).
  - Cross-browser safe canvas rendering (`drawRoundedRect` via `arcTo`).
  - Offline math typography (`<span class="math-expr">`).
- **Tested**: Pure physics engine with zero DOM dependencies tested with `node:test` and `node:assert`.

---

## 🧪 Running Unit Tests
```bash
node --test tests/accelerationPhysics.test.js
```
