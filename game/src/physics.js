// Flight model for SKYBRIDGE: thrust, drag, lift, stall, wind, fuel, damage.
// Side view: x east, y up (feet), pitch in radians (positive = nose up).

import { PLANE, WORLD } from './config.js';

export function makePlane(mission) {
  const fromWest = mission.from === 'west';
  const runway = fromWest ? WORLD.westRunway : WORLD.eastRunway;
  const plateau = fromWest ? WORLD.westPlateau : WORLD.eastPlateau;
  const dir = fromWest ? 1 : -1;
  return {
    x: (runway.x0 + runway.x1) / 2,
    y: plateau,
    vx: 0,
    vy: 0,
    speed: 0,
    pitch: 0,
    throttle: 0,
    flaps: 0, // 0 up, 1 down
    gear: 1, // 1 down, 0 up
    fuel: mission.startFuel,
    damage: 0,
    airborne: false,
    airborneTime: 0,
    stalled: false,
    dir, // travel direction: +1 east, -1 west
    vs: 0, // vertical speed ft/s, for the HUD
    groundContact: true,
  };
}

// One fixed step of the flight model. `ctl` is {pitchUp, pitchDown, thrUp, thrDown,
// flapsToggle, gearToggle} and `wind` is the local wind in ft/s (positive = eastward).
// Returns an event string when something notable happens ('takeoff', 'stall', ...).
export function stepPlane(p, ctl, wind, dt, mission) {
  const events = [];

  if (ctl.flapsToggle) p.flaps = p.flaps ? 0 : 1;
  if (ctl.gearToggle) p.gear = p.gear ? 0 : 1;
  if (ctl.thrUp) p.throttle = Math.min(1, p.throttle + dt * 0.9);
  if (ctl.thrDown) p.throttle = Math.max(0, p.throttle - dt * 0.9);

  // Pitch authority grows with speed; on the ground the nose can still rotate a little.
  const authority = p.airborne ? Math.min(1, p.speed / 70) : 0.3;
  const pitchIn = (ctl.pitchUp ? 1 : 0) - (ctl.pitchDown ? 1 : 0);
  p.pitch += pitchIn * PLANE.pitchRate * authority * dt;
  p.pitch = Math.max(-0.6, Math.min(0.6, p.pitch));

  const stallSpeed = p.flaps ? PLANE.stallFlaps : PLANE.stallClean;
  const wasAirborne = p.airborne;

  if (p.fuel > 0 && p.throttle > 0) {
    p.fuel = Math.max(0, p.fuel - PLANE.fuelBurn * p.throttle * dt);
  }
  const thrust = p.fuel > 0 ? p.throttle * PLANE.thrust : 0;

  // Along-track dynamics: thrust minus drag minus the gravity component.
  const drag = PLANE.dragK * p.speed * p.speed * (p.flaps ? 1.35 : 1);
  const along = thrust - drag - PLANE.gravity * Math.sin(p.pitch);
  p.speed = Math.max(0, p.speed + along * dt);
  p.speed = Math.min(p.speed, PLANE.maxSpeed);

  // Lift: enough speed and the wing carries the plane; below stall speed it sinks.
  const liftRatio = Math.min(1, (p.speed * p.speed) / (stallSpeed * stallSpeed));
  const lift = PLANE.gravity * liftRatio * Math.cos(p.pitch);
  const accelY = lift - PLANE.gravity;
  p.stalled = p.airborne && p.speed < stallSpeed * 0.92;

  p.vx = p.dir * p.speed * Math.cos(p.pitch) + (p.airborne ? wind : 0);
  p.vy = p.speed * Math.sin(p.pitch) + accelY * 0.55;
  p.vs = p.vy;
  p.x += p.vx * dt;
  if (p.airborne) {
    p.y += p.vy * dt;
    p.airborneTime += dt;
  } else {
    // Rolling on the ground: stay glued to the terrain.
    p.y = groundHeightAt(p.x);
    p.vy = 0;
    p.vs = 0;
  }

  // Takeoff: rolling fast enough with the nose up lifts off.
  if (!p.airborne && p.speed > stallSpeed * 0.85 && p.pitch > 0.06) {
    p.airborne = true;
    events.push('takeoff');
  }
  if (p.airborne && p.stalled) events.push('stall');

  // World bounds: the channel ends at the cliffs; turn back, do not fly off the map.
  if (p.x < 60) {
    p.x = 60;
    p.dir = 1;
    events.push('edge');
  }
  if (p.x > WORLD.width - 60) {
    p.x = WORLD.width - 60;
    p.dir = -1;
    events.push('edge');
  }
  if (p.y > 2400) {
    p.y = 2400;
    p.vy = Math.min(p.vy, 0);
  }
  if (!wasAirborne && p.airborne) p.groundContact = false;
  return events;
}

// Ground height (ft) at world x: plateaus, cliff slopes, sea, lighthouse rock.
export function groundHeightAt(x) {
  const W = WORLD;
  if (x < W.westCliffEdge - 350) return W.westPlateau;
  if (x < W.westCliffEdge) {
    const t = (x - (W.westCliffEdge - 350)) / 350;
    return W.westPlateau * (1 - t * t * (3 - 2 * t)) + W.seaLevel * (t * t * (3 - 2 * t));
  }
  if (x < W.rockX0 - 260) return W.seaLevel;
  if (x < W.rockX0) {
    const t = (x - (W.rockX0 - 260)) / 260;
    return W.rockTop * (t * t * (3 - 2 * t));
  }
  if (x < W.rockX1) return W.rockTop;
  if (x < W.rockX1 + 260) {
    const t = (x - W.rockX1) / 260;
    return W.rockTop * (1 - t * t * (3 - 2 * t));
  }
  if (x < W.eastCliffEdge) return W.seaLevel;
  if (x < W.eastCliffEdge + 350) {
    const t = (x - W.eastCliffEdge) / 350;
    return W.eastPlateau * (t * t * (3 - 2 * t));
  }
  return W.eastPlateau;
}

// Which runway (if any) the plane is over, and how the touchdown went.
export function landingCheck(p) {
  const g = groundHeightAt(p.x);
  if (p.y > g + 2) return null; // still in the air
  const onRunway =
    (p.x >= WORLD.westRunway.x0 && p.x <= WORLD.westRunway.x1) ||
    (p.x >= WORLD.eastRunway.x0 && p.x <= WORLD.eastRunway.x1) ||
    (p.x >= WORLD.rockStrip.x0 && p.x <= WORLD.rockStrip.x1);
  const onRock = p.x >= WORLD.rockX0 && p.x <= WORLD.rockX1;
  const inSea = g <= WORLD.seaLevel + 1 && !onRock;
  const vs = Math.abs(p.vy);
  if (inSea) return { kind: 'water', damage: PLANE.damageWater, onRunway: false };
  if (!onRunway) {
    return { kind: 'terrain', damage: 70, onRunway: false };
  }
  if (!p.gear) {
    return { kind: 'gearup', damage: PLANE.damageGearUpLanding, onRunway: true };
  }
  if (vs > PLANE.landingSoftVs + 8 || p.speed > 210) {
    return { kind: 'hard', damage: PLANE.damageHardLanding, onRunway: true };
  }
  return { kind: 'landed', damage: 0, onRunway: true };
}
