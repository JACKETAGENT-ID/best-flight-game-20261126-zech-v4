// Mission flow for SKYBRIDGE: stages, objectives, landing verdicts and scoring.
// Each mission is a small state machine: brief -> fly -> (pickup) -> land -> debrief.

import { SCORE, WORLD } from './config.js';
import { groundHeightAt, landingCheck } from './physics.js';

export function makeMissionRun(missionIndex, mission, plane) {
  return {
    missionIndex,
    mission,
    stage: 'brief', // brief | flying | pickup | done | crashed
    time: 0,
    pickedUp: false,
    message: '',
    messageUntil: 0,
    score: 0,
    stars: 0,
    landingKind: '',
    result: null, // {ok, title, detail, score, stars, time, fuel, damage}
  };
}

export function targetOf(run) {
  const m = run.mission;
  if (m.id === 3 && !run.pickedUp) return 'rock';
  if (m.to === 'east') return 'east';
  return 'west';
}

function say(run, text, seconds = 4) {
  run.message = text;
  run.messageUntil = run.time + seconds;
}

// Called every frame while flying. Returns 'landed' | 'crashed' | 'pickup' | null.
export function updateMission(run, plane, events) {
  run.time += 1 / 60;
  if (events.includes('stall')) say(run, 'STALL! Nose down, add power!', 2.5);
  if (events.includes('takeoff')) {
    say(run, run.stage === 'pickup' ? 'Keeper aboard — fly home!' : 'Airborne! Follow the beacons.', 4);
  }
  if (run.message && run.time > run.messageUntil) run.message = '';

  // Touchdown: only once properly airborne and descending onto the ground.
  if (plane.airborne && plane.airborneTime > 1.5 && plane.vy < 4) {
    const g = groundHeightAt(plane.x);
    if (plane.y <= g + 1.5) {
      const lc = landingCheck(plane);
      if (lc) return resolveTouchdown(run, plane, lc);
    }
  }
  return null;
}

function resolveTouchdown(run, plane, lc) {
  plane.airborne = false;
  plane.airborneTime = 0;
  plane.speed = Math.max(0, plane.speed * 0.4);
  plane.y = groundHeightAt(plane.x);
  plane.vy = 0;
  run.landingKind = lc.kind;

  if (lc.kind === 'water') {
    plane.damage = 100;
    return finish(run, plane, false, 'Ditched in the sea', 'The ferry went down in the channel. The mail is soaked.');
  }
  if (lc.kind === 'terrain') {
    plane.damage = Math.min(100, plane.damage + lc.damage);
    return finish(run, plane, false, 'Crashed into the cliffs', 'You hit high ground short of the runway.');
  }
  if (lc.kind === 'gearup') {
    plane.damage = Math.min(100, plane.damage + lc.damage);
    return finish(run, plane, false, 'Belly landing!', 'You landed with the gear up — the ferry slid to a stop, badly scraped.');
  }
  if (lc.kind === 'hard') {
    plane.damage = Math.min(100, plane.damage + lc.damage);
    if (plane.damage >= 100) {
      return finish(run, plane, false, 'Hard landing — airframe lost', 'The touchdown was too hard; the ferry will not fly again.');
    }
    say(run, 'Hard landing! Airframe damaged.', 3);
    return finish(run, plane, true, 'Down — but roughly', 'You made the runway, but the landing was hard.');
  }

  // Clean landing.
  if (run.mission.id === 3 && !run.pickedUp) {
    // Landed on the rock: pick up the keeper, then fly home.
    run.pickedUp = true;
    run.stage = 'pickup';
    plane.speed = 0;
    plane.pitch = 0;
    plane.dir = -1;
    say(run, 'Keeper aboard! Now fly back to Westfield.', 5);
    return 'pickup';
  }
  return finish(run, plane, true, 'Landed', 'Mission complete — welcome home.');
}

function finish(run, plane, ok, title, detail) {
  const m = run.mission;
  const timeBonus = Math.max(0, Math.round((SCORE.timePar[run.missionIndex] - run.time) * 4));
  const fuelBonus = Math.round(plane.fuel * SCORE.fuelBonusPerUnit * 0.1);
  const damagePenalty = Math.round(plane.damage * 3);
  let score = ok ? 1000 + timeBonus + fuelBonus - damagePenalty : Math.max(0, 200 - damagePenalty);
  if (m.id === 3 && run.pickedUp && ok) score += 400; // rescue bonus
  score = Math.max(0, score);
  const stars = !ok ? 0 : score >= 1600 ? 3 : score >= 1250 ? 2 : 1;
  run.score = score;
  run.stars = stars;
  run.result = { ok, title, detail, score, stars, time: run.time, fuel: plane.fuel, damage: plane.damage };
  run.stage = ok ? 'done' : 'crashed';
  return ok ? 'landed' : 'crashed';
}

// Where the plane should be heading, for the HUD distance readout.
export function distanceToTarget(run, plane) {
  const t = targetOf(run);
  let tx;
  if (t === 'east') tx = (WORLD.eastRunway.x0 + WORLD.eastRunway.x1) / 2;
  else if (t === 'west') tx = (WORLD.westRunway.x0 + WORLD.westRunway.x1) / 2;
  else tx = (WORLD.rockStrip.x0 + WORLD.rockStrip.x1) / 2;
  return Math.max(0, Math.round(Math.abs(tx - plane.x)));
}
