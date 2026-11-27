// SKYBRIDGE — main loop, screens and wiring. Bootstraps the canvas, runs the
// fixed-step simulation, and draws title / flight / pause / debrief screens.

import { MISSIONS, VIEW_H, VIEW_W } from './config.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { makePlane, stepPlane } from './physics.js';
import { makeWorld } from './world.js';
import { cameraFor, drawBeacons, drawFog, drawPlane, drawSky, drawTargetRing, drawTerrain } from './render.js';
import { drawBanner, drawPanel } from './hud.js';
import { distanceToTarget, makeMissionRun, targetOf, updateMission } from './missions.js';
import { autopilot, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
input.attach(canvas);
const sound = new Sound();

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const autoMode = params.get('auto') === '1';
const seedParam = Number(params.get('seed') || '7');

let screen = 'title'; // title | flying | paused | debrief
let missionIndex = 0;
let world = makeWorld(0, seedParam);
let plane = makePlane(MISSIONS[0]);
let run = makeMissionRun(0, MISSIONS[0], plane);
let lastTime = 0;
let eventsLog = [];

function startMission(i) {
  missionIndex = i;
  world = makeWorld(i, seedParam + i * 101);
  plane = makePlane(MISSIONS[i]);
  run = makeMissionRun(i, MISSIONS[i], plane);
  screen = 'flying';
  run.stage = 'brief';
  sound.unlock();
}

function readControls() {
  const ctl = {
    pitchUp: input.held('up'),
    pitchDown: input.held('down'),
    thrUp: input.held('throttleUp'),
    thrDown: input.held('throttleDown'),
    flapsToggle: input.tapped('flaps'),
    gearToggle: input.tapped('gear'),
  };
  if (autoMode || window.__auto) return autopilot(plane, run, world);
  return ctl;
}

function step(dt) {
  world.time += dt;
  if (screen !== 'flying') return;
  if (run.stage === 'brief' && input.tapped('start')) {
    run.stage = 'flying';
    sound.chime();
  }
  if (run.stage === 'brief') return;

  const ctl = readControls();
  const wind = world.windAt(plane.x, plane.y);
  const events = stepPlane(plane, ctl, wind, dt, run.mission);
  eventsLog.push(...events);
  if (events.includes('takeoff')) sound.blip(520, 0.12, 0.1);
  if (events.includes('stall')) sound.alarm();

  const outcome = updateMission(run, plane, events);
  if (outcome === 'landed' || outcome === 'crashed') {
    screen = 'debrief';
    if (outcome === 'landed') sound.chime();
    else sound.alarm();
  } else if (outcome === 'pickup') {
    sound.chime();
  }
  if (plane.damage >= 100 && screen === 'flying') {
    run.result = { ok: false, title: 'Airframe lost', detail: 'Damage reached 100%.', score: 0, stars: 0, time: run.time, fuel: plane.fuel, damage: 100 };
    run.stage = 'crashed';
    screen = 'debrief';
  }
  sound.engine(plane.throttle, plane.airborne, dt);

  if (input.tapped('pause')) screen = 'paused';
  if (input.tapped('restart')) startMission(missionIndex);
}

function drawTitle() {
  const cam = cameraFor(plane);
  drawSky(ctx, world, cam);
  drawTerrain(ctx, world, cam, world.time);
  drawBeacons(ctx, world, cam, world.time);
  drawPlane(ctx, plane, cam, world.time);
  drawFog(ctx, world, plane, cam);

  ctx.save();
  ctx.fillStyle = 'rgba(6,12,18,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SKYBRIDGE', VIEW_W / 2, 150);
  ctx.fillStyle = '#e8f2ef';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('A cross-channel air ferry in thick fog', VIEW_W / 2, 190);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#9fc4bb';
  ctx.fillText('Fly the twin-prop ferry between two cliff-top airfields. Mind the fog, the wind and your fuel.', VIEW_W / 2, 220);

  // Mission cards.
  MISSIONS.forEach((m, i) => {
    const y = 258 + i * 76;
    const x = VIEW_W / 2 - 320;
    ctx.fillStyle = i === missionIndex ? 'rgba(255,210,122,0.16)' : 'rgba(10,18,22,0.72)';
    ctx.fillRect(x, y, 640, 64);
    ctx.strokeStyle = i === missionIndex ? '#ffd27a' : '#3a4d55';
    ctx.lineWidth = i === missionIndex ? 2.5 : 1.5;
    ctx.strokeRect(x, y, 640, 64);
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${m.name}`, x + 18, y + 26);
    ctx.fillStyle = '#e8f2ef';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(m.tag, x + 18, y + 48);
    ctx.fillStyle = '#9fc4bb';
    ctx.textAlign = 'right';
    ctx.fillText(m.timeOfDay.toUpperCase(), x + 622, y + 26);
    ctx.fillText(m.fog === 'heavy' ? 'HEAVY FOG' : 'LIGHT FOG', x + 622, y + 48);
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click a mission or press 1–4, then ENTER to fly.  ↑↓ pitch · ←→ throttle · F flaps · G gear', VIEW_W / 2, 590);
  ctx.fillStyle = '#9fc4bb';
  ctx.fillText('Land gently with the gear down. Low speed stalls the wing — keep her flying.', VIEW_W / 2, 616);
  ctx.restore();
}

function drawFlying() {
  const cam = cameraFor(plane);
  drawSky(ctx, world, cam);
  drawTerrain(ctx, world, cam, world.time);
  drawBeacons(ctx, world, cam, world.time);
  if (run.stage === 'flying' || run.stage === 'pickup') {
    drawTargetRing(ctx, world, cam, world.time, targetOf(run));
  }
  drawPlane(ctx, plane, cam, world.time);
  drawFog(ctx, world, plane, cam);
  drawBanner(ctx, run, plane);
  drawPanel(ctx, plane, run, world);

  if (run.stage === 'brief') {
    ctx.save();
    ctx.fillStyle = 'rgba(6,12,18,0.72)';
    ctx.fillRect(0, 64, VIEW_W, VIEW_H - 64 - 118);
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MISSION ${run.mission.id}: ${run.mission.name}`, VIEW_W / 2, 190);
    ctx.fillStyle = '#e8f2ef';
    ctx.font = '17px system-ui, sans-serif';
    const words = run.mission.brief.split(' ');
    let line = '';
    let y = 232;
    for (const w of words) {
      if (ctx.measureText(line + w).width > 760) {
        ctx.fillText(line.trim(), VIEW_W / 2, y);
        y += 26;
        line = '';
      }
      line += w + ' ';
    }
    ctx.fillText(line.trim(), VIEW_W / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('Press ENTER to take off', VIEW_W / 2, y + 56);
    ctx.restore();
  }

  if (run.stage === 'pickup') {
    ctx.save();
    ctx.fillStyle = 'rgba(8,16,20,0.85)';
    ctx.fillRect(VIEW_W / 2 - 260, 84, 520, 40);
    ctx.strokeStyle = '#4ecb71';
    ctx.lineWidth = 2;
    ctx.strokeRect(VIEW_W / 2 - 260, 84, 520, 40);
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEEPER ABOARD — take off and fly home to Westfield', VIEW_W / 2, 109);
    ctx.restore();
  }
}

function drawPaused() {
  drawFlying();
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,18,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('P to resume · R to restart the mission', VIEW_W / 2, VIEW_H / 2 + 26);
  ctx.restore();
}

function drawDebrief() {
  drawFlying();
  const r = run.result;
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = r.ok ? '#4ecb71' : '#ff5a4e';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(r.title, VIEW_W / 2, 190);
  ctx.fillStyle = '#e8f2ef';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(r.detail, VIEW_W / 2, 226);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`SCORE ${r.score}`, VIEW_W / 2, 290);
  ctx.font = '44px system-ui, sans-serif';
  ctx.fillText('★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), VIEW_W / 2, 350);
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(
    `Time ${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}   ·   Fuel left ${Math.round(r.fuel)}%   ·   Airframe ${Math.round(100 - r.damage)}%`,
    VIEW_W / 2, 400,
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('ENTER — fly this mission again   ·   M — mission select   ·   R — restart', VIEW_W / 2, 460);
  ctx.restore();
}

function frame(t) {
  const dt = 1 / 60;
  lastTime = t;
  // Title input.
  if (screen === 'title') {
    world.time += dt;
    for (let i = 0; i < 4; i++) {
      if (input.pressed.has(`Digit${i + 1}`) || input.pressed.has(`Numpad${i + 1}`)) {
        missionIndex = i;
        world = makeWorld(i, seedParam + i * 101);
        plane = makePlane(MISSIONS[i]);
        run = makeMissionRun(i, MISSIONS[i], plane);
      }
    }
    for (const c of input.clicks) {
      const i = Math.floor((c.y - 258) / 76);
      if (c.x > VIEW_W / 2 - 320 && c.x < VIEW_W / 2 + 320 && i >= 0 && i < 4) {
        startMission(i);
      }
    }
    if (input.tapped('start')) startMission(missionIndex);
  } else if (screen === 'paused') {
    if (input.tapped('pause')) screen = 'flying';
    if (input.tapped('restart')) startMission(missionIndex);
  } else if (screen === 'debrief') {
    if (input.tapped('start')) startMission(missionIndex);
    if (input.pressed.has('KeyM')) screen = 'title';
    if (input.tapped('restart')) startMission(missionIndex);
  } else {
    step(dt);
  }
  if (screen === 'title') drawTitle();
  else if (screen === 'paused') drawPaused();
  else if (screen === 'debrief') drawDebrief();
  else drawFlying();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Shot mode: stage the scene, step it a fixed number of frames, render once.
function renderShot() {
  world = makeWorld(run.missionIndex, seedParam + run.missionIndex * 101);
  const ok = stageShot(plane, run, shotName);
  if (!ok) return false;
  world.time = 12.5;
  drawFlying();
  document.title = `SKYBRIDGE shot ${shotName}`;
  return true;
}

// Test hooks: the playtest driver reads state and drives the autopilot.
window.__game = {
  get screen() {
    return screen;
  },
  get run() {
    return run;
  },
  get plane() {
    return plane;
  },
  get world() {
    return world;
  },
  get events() {
    return eventsLog;
  },
  startMission(i) {
    startMission(i);
  },
  beginFlight() {
    if (run.stage === 'brief') run.stage = 'flying';
  },
  setAuto(on) {
    window.__auto = on;
  },
  distanceToTarget() {
    return distanceToTarget(run, plane);
  },
};

if (shotName) {
  // Build the staged mission first, then render the shot.
  const shotMission = { cover: 0, fog: 1, rescue: 2, night: 3 }[shotName] ?? 0;
  startMission(shotMission);
  run.stage = 'flying';
  renderShot();
  window.__shotDone = true;
} else {
  requestAnimationFrame(frame);
}
