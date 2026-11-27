// Deterministic screenshots + autopilot for SKYBRIDGE.
// ?shot=<name>&seed=N stages a fixed scene and steps the simulation a fixed
// number of frames, so the same URL always renders the same picture.
// ?auto=1 flies the current mission with a simple pilot (used for playtesting).

import { WORLD } from './config.js';
import { groundHeightAt } from './physics.js';

export const SHOTS = {
  // Cover: just airborne over Westfield, HUD lit, target ring ahead, prompt on top.
  cover: { mission: 0, seed: 11, steps: 0, place: 'climb' },
  // Mid-channel in the fog band, beacons glowing through grey.
  fog: { mission: 1, seed: 23, steps: 0, place: 'fog' },
  // Dusk approach to the lighthouse rock.
  rescue: { mission: 2, seed: 37, steps: 0, place: 'rock' },
  // Night crossing: dark sky, beacon chain, lit panel.
  night: { mission: 3, seed: 41, steps: 0, place: 'night' },
};

// Put the plane at a staged position for a shot. Deterministic, no input.
export function stageShot(plane, run, name) {
  const shot = SHOTS[name];
  if (!shot) return false;
  const put = (x, y, speed, pitch, throttle, airborne) => {
    plane.x = x;
    plane.y = y;
    plane.speed = speed;
    plane.pitch = pitch;
    plane.throttle = throttle;
    plane.airborne = airborne;
    plane.airborneTime = airborne ? 5 : 0;
    plane.dir = run.mission.from === 'west' ? 1 : -1;
    plane.gear = 1;
    plane.flaps = airborne && speed < 120 ? 1 : 0;
    plane.vx = plane.dir * speed * Math.cos(pitch);
    plane.vy = speed * Math.sin(pitch);
  };
  if (shot.place === 'climb') {
    put(1500, WORLD.westPlateau + 260, 165, 0.16, 0.85, true);
    run.stage = 'flying';
  } else if (shot.place === 'fog') {
    put(5600, 300, 150, 0.02, 0.8, true);
    run.stage = 'flying';
    plane.flaps = 1;
  } else if (shot.place === 'rock') {
    put(4800, WORLD.rockTop + 190, 140, -0.06, 0.7, true);
    run.stage = 'flying';
  } else if (shot.place === 'night') {
    put(9800, 700, 170, 0.02, 0.85, true);
    run.stage = 'flying';
  }
  // Keep the plane off the ground function so the shot never shows a crash.
  if (plane.y < groundHeightAt(plane.x) + 40) {
    plane.y = groundHeightAt(plane.x) + 40;
  }
  return true;
}

// A simple scripted pilot: hold altitude, steer toward the target runway,
// descend and land. Returns the control set for this frame.
export function autopilot(plane, run, world) {
  const ctl = { pitchUp: false, pitchDown: false, thrUp: false, thrDown: false, flapsToggle: false, gearToggle: false };
  const targetX = targetXOf(run);
  const dist = targetX - plane.x;
  const ground = targetGround(run);
  // Glide slope: descend steadily toward the runway instead of levelling off
  // above it — the old fixed "ground + 60" target never touched down.
  const adist = Math.abs(dist);
  const targetAlt = adist < 2600 ? ground + Math.max(12, Math.min(420, adist * 0.09)) : 700;
  const altErr = targetAlt - plane.y;

  if (!plane.airborne) {
    ctl.thrUp = plane.throttle < 1;
    ctl.pitchUp = plane.speed > 85;
    if (plane.gear === 0) ctl.gearToggle = true;
    return ctl;
  }
  // Throttle: hold ~150 ft/s cruise, bleed off early on final so we do not
  // overshoot the runway and have to fly to the edge and back.
  const wantSpeed = adist < 1200 ? 100 : adist < 2600 ? 115 : 155;
  if (plane.speed < wantSpeed - 6) ctl.thrUp = true;
  if (plane.speed > wantSpeed + 6) ctl.thrDown = true;
  // Pitch: chase the glide slope, gently.
  if (altErr > 25) ctl.pitchUp = true;
  else if (altErr < -25) ctl.pitchDown = true;
  // Flaps + gear on final approach.
  if (adist < 1600) {
    if (plane.flaps === 0) ctl.flapsToggle = true;
    if (plane.gear === 0) ctl.gearToggle = true;
  }
  // Flare: only check the sink rate just above the runway — pitch up if
  // sinking too fast, otherwise let the slope settle her onto the runway.
  if (adist < 400 && plane.y < ground + 45) {
    if (plane.vy < -14) {
      ctl.pitchUp = true;
      ctl.pitchDown = false;
    }
    if (plane.speed > 105) ctl.thrDown = true;
  }
  return ctl;
}

function targetXOf(run) {
  if (run.mission.id === 3 && !run.pickedUp) return (WORLD.rockStrip.x0 + WORLD.rockStrip.x1) / 2;
  return run.mission.to === 'east'
    ? (WORLD.eastRunway.x0 + WORLD.eastRunway.x1) / 2
    : (WORLD.westRunway.x0 + WORLD.westRunway.x1) / 2;
}

function targetGround(run) {
  if (run.mission.id === 3 && !run.pickedUp) return WORLD.rockTop;
  return run.mission.to === 'east' ? WORLD.eastPlateau : WORLD.westPlateau;
}
