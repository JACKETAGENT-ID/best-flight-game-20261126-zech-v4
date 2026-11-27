// World state for SKYBRIDGE: fog, wind, beacons, waves, birds, clouds.
// All of it derives from the mission + seed, so a screenshot is reproducible.

import { FOG, MISSIONS, WORLD } from './config.js';
import { makeClouds, makeGustField } from './random.js';

export function makeWorld(missionIndex, seed) {
  const mission = MISSIONS[missionIndex];
  const fogMax = mission.fog === 'heavy' ? FOG.heavy : FOG.light;
  return {
    mission,
    missionIndex,
    seed,
    time: 0,
    gustAt: makeGustField(seed),
    clouds: makeClouds(seed, 26),
    fogMax,
    // Wind at altitude: base wind plus gusts, stronger higher up.
    windAt(x, alt) {
      const gust = this.gustAt(x) * 9;
      const altFactor = 0.5 + Math.min(1, alt / 900);
      return (mission.wind * altFactor + gust) * (mission.from === 'west' ? 1 : -1) * 0.4;
    },
    // Fog opacity 0..1 at an altitude: thickest inside the fog band.
    fogAt(alt) {
      const { bandLow, bandHigh } = FOG;
      if (alt < bandLow - 60 || alt > bandHigh + 220) return 0.06;
      if (alt >= bandLow && alt <= bandHigh) return this.fogMax;
      const edge = alt < bandLow ? (alt - (bandLow - 60)) / 60 : (bandHigh + 220 - alt) / 220;
      return 0.06 + (this.fogMax - 0.06) * Math.max(0, Math.min(1, edge));
    },
    // Beacon positions: runway edge lights + approach lights + lighthouse.
    beacons() {
      const list = [];
      const addRunway = (r, plateau) => {
        for (let x = r.x0; x <= r.x1; x += 90) {
          list.push({ x, y: plateau + 6, color: '#ffd27a', kind: 'edge' });
        }
        for (let i = 1; i <= 4; i++) {
          list.push({ x: r.x0 - i * 130, y: plateau + 4, color: '#7dffb0', kind: 'approach' });
        }
      };
      addRunway(WORLD.westRunway, WORLD.westPlateau);
      addRunway(WORLD.eastRunway, WORLD.eastPlateau);
      for (let x = WORLD.rockStrip.x0; x <= WORLD.rockStrip.x1; x += 80) {
        list.push({ x, y: WORLD.rockTop + 5, color: '#ff9d5c', kind: 'edge' });
      }
      // Channel marker buoys: a chain of lights across the sea, the night guide.
      for (let x = 2600; x <= 9800; x += 1200) {
        list.push({ x, y: 6, color: '#ff9d5c', kind: 'buoy' });
      }
      list.push({ x: 6000, y: WORLD.rockTop + 150, color: '#ffffff', kind: 'lighthouse' });
      return list;
    },
    // Sea wave phase, deterministic in time.
    wavePhase(x, t) {
      return Math.sin(x * 0.011 + t * 1.7) * 0.5 + Math.sin(x * 0.023 - t * 1.1) * 0.5;
    },
  };
}

// Sky palette per time of day. Returns {top, mid, low, sun, sunX, sunY}.
export function skyFor(timeOfDay) {
  if (timeOfDay === 'night') {
    return {
      top: '#060a1e', mid: '#0d1734', low: '#1b2a4a',
      sun: '#f4ead2', sunX: 0.78, sunY: 0.16, moon: true, stars: true,
    };
  }
  if (timeOfDay === 'dusk') {
    return {
      top: '#2c2a55', mid: '#7a4a63', low: '#e08a5a',
      sun: '#ffb36b', sunX: 0.2, sunY: 0.62, moon: false, stars: false,
    };
  }
  return {
    top: '#3f7fc4', mid: '#8fc3e8', low: '#d9ecf7',
    sun: '#fff3c4', sunX: 0.82, sunY: 0.14, moon: false, stars: false,
  };
}
