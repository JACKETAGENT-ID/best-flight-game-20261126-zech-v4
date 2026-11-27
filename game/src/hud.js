// HUD for SKYBRIDGE: the lit instrument panel along the bottom of the screen,
// the mission banner on top, and the message line. All canvas-drawn, no images.

import { PANEL_H, VIEW_H, VIEW_W } from './config.js';
import { distanceToTarget } from './missions.js';

const PANEL_Y = VIEW_H - PANEL_H;

function dial(ctx, cx, cy, r, label, value, min, max, unit, warn) {
  ctx.save();
  // Lit dial face.
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
  g.addColorStop(0, '#1d2b33');
  g.addColorStop(1, '#0a1216');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = warn ? '#ff5a4e' : '#7fd8c8';
  ctx.lineWidth = 2;
  ctx.shadowColor = warn ? '#ff5a4e' : '#7fd8c8';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Ticks.
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 8; i++) {
    const a = (-Math.PI * 0.75) + (i / 8) * Math.PI * 1.5;
    const x1 = cx + Math.cos(a) * (r - 5);
    const y1 = cy + Math.sin(a) * (r - 5);
    const x2 = cx + Math.cos(a) * (r - 11);
    const y2 = cy + Math.sin(a) * (r - 11);
    ctx.strokeStyle = '#cfe8e2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Needle.
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const na = (-Math.PI * 0.75) + frac * Math.PI * 1.5;
  ctx.strokeStyle = warn ? '#ff8a7a' : '#ffe9a8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  // Readout.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(String(Math.round(value)), cx, cy + r * 0.45);
  ctx.fillStyle = '#9fc4bb';
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText(label, cx, cy - r - 6);
  ctx.fillText(unit, cx, cy + r * 0.45 + 11);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, label, text) {
  ctx.fillStyle = '#0a1216';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.max(0, Math.min(1, frac))), h - 4);
  ctx.strokeStyle = '#7fd8c8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 4);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(text, x + w, y + h + 14);
}

function lamp(ctx, x, y, label, on, color) {
  ctx.save();
  ctx.fillStyle = on ? color : '#22303a';
  if (on) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 20);
}

export function drawPanel(ctx, plane, run, world) {
  // Panel background: dark metal with a top edge light.
  ctx.fillStyle = '#10181d';
  ctx.fillRect(0, PANEL_Y, VIEW_W, PANEL_H);
  ctx.fillStyle = '#2a3d45';
  ctx.fillRect(0, PANEL_Y, VIEW_W, 2);
  ctx.fillStyle = '#1b262c';
  ctx.fillRect(0, PANEL_Y + 2, VIEW_W, 2);

  const cy = PANEL_Y + 58;
  dial(ctx, 70, cy, 34, 'AIRSPEED', plane.speed * 0.592, 0, 190, 'KT', plane.stalled);
  dial(ctx, 165, cy, 34, 'ALTITUDE', plane.y, 0, 2000, 'FT', false);
  dial(ctx, 260, cy, 34, 'VERT SPEED', plane.vs, -40, 40, 'FT/S', plane.vy < -18);
  // Artificial horizon.
  ctx.save();
  ctx.beginPath();
  ctx.arc(355, cy, 34, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2f6f9e';
  ctx.fillRect(321, cy - 34, 68, 34 + Math.sin(plane.pitch) * 40);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(321, cy + Math.sin(plane.pitch) * 40, 68, 68);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(321, cy + Math.sin(plane.pitch) * 40);
  ctx.lineTo(389, cy + Math.sin(plane.pitch) * 40);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(355, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#7fd8c8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(355, cy, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fc4bb';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', 355, cy - 40);

  // Compass strip: heading from travel direction and pitch.
  const heading = plane.dir > 0 ? 90 : 270;
  ctx.fillStyle = '#0a1216';
  ctx.fillRect(420, PANEL_Y + 22, 150, 30);
  ctx.strokeStyle = '#7fd8c8';
  ctx.strokeRect(420, PANEL_Y + 22, 150, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${heading}° ${plane.dir > 0 ? 'E' : 'W'}`, 495, PANEL_Y + 43);
  ctx.fillStyle = '#9fc4bb';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('HEADING', 495, PANEL_Y + 15);

  // Fuel + damage bars.
  bar(ctx, 600, PANEL_Y + 30, 150, 14, plane.fuel / 100, plane.fuel < 25 ? '#ff5a4e' : '#4ecb71', 'FUEL', `${Math.round(plane.fuel)}%`);
  bar(ctx, 600, PANEL_Y + 66, 150, 14, 1 - plane.damage / 100, plane.damage > 60 ? '#ff5a4e' : '#e8b64c', 'AIRFRAME', `${Math.round(100 - plane.damage)}%`);

  // Flaps / gear / throttle lamps.
  lamp(ctx, 800, PANEL_Y + 40, 'FLAPS', plane.flaps === 1, '#4ecb71');
  lamp(ctx, 850, PANEL_Y + 40, 'GEAR', plane.gear === 1, '#4ecb71');
  lamp(ctx, 900, PANEL_Y + 40, 'STALL', plane.stalled, '#ff5a4e');
  lamp(ctx, 950, PANEL_Y + 40, 'FOG', world.fogAt(plane.y) > 0.5, '#e8b64c');

  // Throttle lever.
  ctx.fillStyle = '#0a1216';
  ctx.fillRect(1000, PANEL_Y + 18, 14, 66);
  ctx.strokeStyle = '#7fd8c8';
  ctx.strokeRect(1000, PANEL_Y + 18, 14, 66);
  ctx.fillStyle = '#ffe9a8';
  const ty = PANEL_Y + 18 + 66 - plane.throttle * 66;
  ctx.fillRect(994, ty - 4, 26, 8);
  ctx.fillStyle = '#9fc4bb';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', 1007, PANEL_Y + 100);

  // Wind readout.
  const wind = world.windAt(plane.x, plane.y);
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`WIND ${wind >= 0 ? 'E' : 'W'} ${Math.abs(Math.round(wind * 0.592))} KT`, 1050, PANEL_Y + 40);
  ctx.fillText(`DIST ${distanceToTarget(run, plane)} FT`, 1050, PANEL_Y + 62);
  ctx.fillText(`TIME ${Math.floor(run.time / 60)}:${String(Math.floor(run.time % 60)).padStart(2, '0')}`, 1050, PANEL_Y + 84);
}

export function drawBanner(ctx, run, plane) {
  const m = run.mission;
  ctx.save();
  ctx.fillStyle = 'rgba(8,16,20,0.78)';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SKYBRIDGE — ${m.name}`, 18, 28);
  ctx.fillStyle = '#e8f2ef';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`Mission ${m.id}/4 · ${m.objective}`, 18, 50);
  // Stage chip on the right.
  const stageText =
    run.stage === 'brief' ? 'READY — press ENTER to fly' :
    run.stage === 'pickup' ? 'KEEPER ABOARD — FLY HOME' :
    run.stage === 'flying' ? 'IN FLIGHT' : run.stage.toUpperCase();
  ctx.fillStyle = run.stage === 'flying' || run.stage === 'pickup' ? '#4ecb71' : '#ffd27a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(stageText, VIEW_W - 18, 28);
  ctx.fillStyle = '#9fc4bb';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('↑↓ pitch · ←→ throttle · F flaps · G gear · P pause', VIEW_W - 18, 50);
  ctx.restore();

  if (run.message) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,16,20,0.85)';
    const w = ctx.measureText(run.message).width + 36;
    ctx.fillRect((VIEW_W - w) / 2, 78, w, 34);
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect((VIEW_W - w) / 2, 78, w, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(run.message, VIEW_W / 2, 100);
    ctx.restore();
  }
}
