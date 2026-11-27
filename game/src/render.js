// Rendering for SKYBRIDGE: sky, terrain, sea, lighthouse, the ferry, fog and the
// lit instrument panel. One canvas, no images, everything drawn from code.

import { PANEL_H, VIEW_H, VIEW_W, WORLD } from './config.js';
import { groundHeightAt } from './physics.js';
import { skyFor } from './world.js';

const SCALE = 0.5; // screen px per world foot

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function cameraFor(plane) {
  const cx = clamp(plane.x - (VIEW_W * 0.34) / SCALE, -200, WORLD.width - VIEW_W / SCALE + 200);
  const cy = clamp(plane.y - 300, -150, 1500);
  return { x: cx, y: cy };
}

// World -> screen.
function sx(wx, cam) {
  return (wx - cam.x) * SCALE;
}
function sy(wy, cam) {
  return VIEW_H - PANEL_H - (wy - cam.y) * SCALE;
}

export function drawSky(ctx, world, cam) {
  const sky = skyFor(world.mission.timeOfDay);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H - PANEL_H);
  g.addColorStop(0, sky.top);
  g.addColorStop(0.55, sky.mid);
  g.addColorStop(1, sky.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H - PANEL_H);

  if (sky.stars) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 90; i++) {
      const px = ((i * 373) % 1280) + ((i * 91) % 40);
      const py = ((i * 197) % 420) + 10;
      ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 16;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // Sun or moon.
  const sunX = sky.sunX * VIEW_W;
  const sunY = sky.sunY * (VIEW_H - PANEL_H);
  ctx.save();
  ctx.fillStyle = sky.sun;
  ctx.shadowColor = sky.sun;
  ctx.shadowBlur = 42;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sky.moon ? 26 : 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (sky.moon) {
    ctx.fillStyle = 'rgba(13,23,52,0.55)';
    ctx.beginPath();
    ctx.arc(sunX - 10, sunY - 6, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Clouds drift with the world.
  for (const c of world.clouds) {
    const px = sx(c.x, cam);
    if (px < -260 || px > VIEW_W + 260) continue;
    const py = sy(c.y, cam);
    ctx.fillStyle = `rgba(255,255,255,${c.a * (world.mission.timeOfDay === 'night' ? 0.25 : 1)})`;
    ctx.beginPath();
    ctx.ellipse(px, py, c.r, c.r * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(px + c.r * 0.5, py + 8, c.r * 0.6, c.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTerrain(ctx, world, cam, t) {
  const night = world.mission.timeOfDay === 'night';
  // Sea.
  const seaTop = sy(0, cam);
  if (seaTop < VIEW_H - PANEL_H) {
    const g = ctx.createLinearGradient(0, seaTop, 0, VIEW_H - PANEL_H);
    g.addColorStop(0, night ? '#0e2438' : world.mission.timeOfDay === 'dusk' ? '#5a4a6e' : '#2e6f8e');
    g.addColorStop(1, night ? '#081524' : world.mission.timeOfDay === 'dusk' ? '#3a2f52' : '#174a66');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.max(0, seaTop), VIEW_W, VIEW_H - PANEL_H - Math.max(0, seaTop));
    // Wave sparkles.
    ctx.strokeStyle = night ? 'rgba(160,200,230,0.25)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < VIEW_W; x += 46) {
      const wx = cam.x + x / SCALE;
      const wob = world.wavePhase(wx, t) * 3;
      ctx.beginPath();
      ctx.moveTo(x, seaTop + 8 + wob);
      ctx.lineTo(x + 22, seaTop + 8 + wob);
      ctx.stroke();
    }
  }

  // Ground profile: cliffs, slopes, rock.
  ctx.beginPath();
  ctx.moveTo(-4, VIEW_H - PANEL_H);
  for (let px = -4; px <= VIEW_W + 4; px += 8) {
    const wx = cam.x + px / SCALE;
    ctx.lineTo(px, sy(groundHeightAt(wx), cam));
  }
  ctx.lineTo(VIEW_W + 4, VIEW_H - PANEL_H);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, 0, 0, VIEW_H - PANEL_H);
  gg.addColorStop(0, night ? '#1d2f22' : world.mission.timeOfDay === 'dusk' ? '#4a3a3a' : '#5d7d4a');
  gg.addColorStop(1, night ? '#0c1410' : world.mission.timeOfDay === 'dusk' ? '#2c2126' : '#3c5a34');
  ctx.fillStyle = gg;
  ctx.fill();
  // Cliff rock strata lines.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let px = 0; px < VIEW_W; px += 14) {
    const wx = cam.x + px / SCALE;
    const h = groundHeightAt(wx);
    if (h > 40 && h < WORLD.westPlateau - 40) {
      ctx.beginPath();
      ctx.moveTo(px, sy(h - 26, cam));
      ctx.lineTo(px + 10, sy(h - 26, cam));
      ctx.stroke();
    }
  }

  drawRunways(ctx, cam, night);
  drawLighthouse(ctx, world, cam, t, night);
}

function drawRunways(ctx, cam, night) {
  const strips = [
    { r: WORLD.westRunway, y: WORLD.westPlateau, name: 'WESTFIELD' },
    { r: WORLD.eastRunway, y: WORLD.eastPlateau, name: 'EASTCLIFF' },
    { r: WORLD.rockStrip, y: WORLD.rockTop, name: 'LIGHTHOUSE ROCK' },
  ];
  for (const s of strips) {
    const x0 = sx(s.r.x0, cam);
    const x1 = sx(s.r.x1, cam);
    const y = sy(s.y, cam);
    if (x1 < -50 || x0 > VIEW_W + 50) continue;
    ctx.fillStyle = night ? '#2a2f38' : '#3a3f47';
    ctx.fillRect(x0, y - 5, x1 - x0, 6);
    ctx.fillStyle = '#e8e4d2';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, (x0 + x1) / 2, y - 12);
    // Centreline dashes.
    ctx.fillStyle = '#f5f2e4';
    for (let x = x0 + 14; x < x1 - 14; x += 34) ctx.fillRect(x, y - 2.5, 18, 2);
  }
}

function drawLighthouse(ctx, world, cam, t, night) {
  const x = sx(6000, cam);
  const baseY = sy(WORLD.rockTop, cam);
  if (x < -80 || x > VIEW_W + 80) return;
  // Tower.
  ctx.fillStyle = '#e8e2d4';
  ctx.fillRect(x - 9, baseY - 118, 18, 118);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x - 9, baseY - 96, 18, 16);
  ctx.fillRect(x - 9, baseY - 58, 18, 16);
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 12, baseY - 134, 24, 18);
  // Rotating beam.
  const ang = t * 0.9;
  const bx = Math.cos(ang) * 260;
  const by = Math.sin(ang) * 60;
  const grad = ctx.createLinearGradient(x, baseY - 126, x + bx, baseY - 126 + by);
  grad.addColorStop(0, night ? 'rgba(255,244,180,0.85)' : 'rgba(255,244,180,0.35)');
  grad.addColorStop(1, 'rgba(255,244,180,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, baseY - 126);
  ctx.lineTo(x + bx, baseY - 126 + by - 26);
  ctx.lineTo(x + bx, baseY - 126 + by + 26);
  ctx.closePath();
  ctx.fill();
  // Lamp glow.
  ctx.save();
  ctx.fillStyle = '#fff2b0';
  ctx.shadowColor = '#ffe98a';
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(x, baseY - 126, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBeacons(ctx, world, cam, t) {
  const night = world.mission.timeOfDay === 'night';
  for (const b of world.beacons()) {
    const x = sx(b.x, cam);
    const y = sy(b.y, cam);
    if (x < -20 || x > VIEW_W + 20 || y < -20 || y > VIEW_H) continue;
    const pulse = 0.65 + 0.35 * Math.sin(t * 3 + b.x * 0.05);
    ctx.save();
    ctx.fillStyle = b.color;
    ctx.globalAlpha = night ? pulse : 0.55 + 0.45 * pulse;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = night ? 18 : 8;
    ctx.beginPath();
    ctx.arc(x, y, b.kind === 'lighthouse' ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Destination target ring: a glowing ring over the landing runway.
export function drawTargetRing(ctx, world, cam, t, target) {
  let r;
  let y;
  if (target === 'east') {
    r = WORLD.eastRunway;
    y = WORLD.eastPlateau;
  } else if (target === 'west') {
    r = WORLD.westRunway;
    y = WORLD.westPlateau;
  } else {
    r = WORLD.rockStrip;
    y = WORLD.rockTop;
  }
  const cx = sx((r.x0 + r.x1) / 2, cam);
  const cy = sy(y + 90, cam);
  if (cx < -160 || cx > VIEW_W + 160) {
    // Off-screen: draw a direction arrow at the screen edge.
    const dirX = cx < 0 ? 48 : VIEW_W - 48;
    ctx.save();
    ctx.fillStyle = '#ffd27a';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(dirX + (cx < 0 ? -12 : 12), cy);
    ctx.lineTo(dirX + (cx < 0 ? 12 : -12), cy - 12);
    ctx.lineTo(dirX + (cx < 0 ? 12 : -12), cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', dirX, cy + 30);
    ctx.restore();
    return;
  }
  const pulse = 1 + 0.12 * Math.sin(t * 2.4);
  ctx.save();
  ctx.strokeStyle = '#ffd27a';
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = '#ffd27a';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 52 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAND HERE', cx, cy - 66);
}

// The twin-prop ferry, drawn facing its travel direction, pitched by p.pitch.
export function drawPlane(ctx, plane, cam, t) {
  const x = sx(plane.x, cam);
  const y = sy(plane.y, cam);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(plane.dir, 1);
  ctx.rotate(-plane.pitch);
  // Shadow on the ground below.
  ctx.restore();
  ctx.save();
  const g = groundHeightAt(plane.x);
  const hAbove = Math.max(0, plane.y - g);
  if (hAbove < 700) {
    ctx.globalAlpha = 0.22 * (1 - hAbove / 700);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, sy(g + 2, cam), 42, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.translate(x, y);
  ctx.scale(plane.dir, 1);
  ctx.rotate(-plane.pitch);

  // Wings.
  ctx.fillStyle = '#2f6f6a';
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(26, -16);
  ctx.lineTo(34, -12);
  ctx.lineTo(6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#275e5a';
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(-30, 12);
  ctx.lineTo(-24, 15);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-46, -18);
  ctx.lineTo(-38, -18);
  ctx.lineTo(-28, -4);
  ctx.closePath();
  ctx.fill();
  // Fuselage: cream body, teal stripe.
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f6f6a';
  ctx.fillRect(-38, -2, 76, 4);
  // Windows.
  ctx.fillStyle = '#1c3a4a';
  for (let i = -1; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(6 + i * 11, -4, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cockpit glass.
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.ellipse(34, -4, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Twin props, spinning.
  for (const px of [-2, 16]) {
    ctx.save();
    ctx.translate(px, 2);
    ctx.strokeStyle = 'rgba(40,40,40,0.55)';
    ctx.lineWidth = 3;
    const a = t * 34 + px;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
    ctx.lineTo(-Math.cos(a) * 16, -Math.sin(a) * 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40,40,40,0.18)';
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Landing gear.
  if (plane.gear) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, 8);
    ctx.lineTo(-24, 16);
    ctx.moveTo(24, 8);
    ctx.lineTo(24, 16);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-24, 17, 4, 0, Math.PI * 2);
    ctx.arc(24, 17, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Fog: a visibility bubble around the plane, grey everywhere else.
export function drawFog(ctx, world, plane, cam) {
  const fog = world.fogAt(plane.y);
  if (fog < 0.05) return;
  const px = sx(plane.x, cam);
  const py = sy(plane.y, cam);
  const night = world.mission.timeOfDay === 'night';
  const col = night ? '8,14,28' : '198,208,216';
  const g = ctx.createRadialGradient(px, py, 90, px, py, 460);
  g.addColorStop(0, `rgba(${col},0)`);
  g.addColorStop(0.55, `rgba(${col},${(fog * 0.55).toFixed(3)})`);
  g.addColorStop(1, `rgba(${col},${fog.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H - PANEL_H);
}
