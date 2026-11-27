// SKYBRIDGE — configuration: world size, aircraft limits, mission definitions.
// A twin-prop air ferry crosses a foggy sea channel between two cliff-top airfields.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PANEL_H = 118; // height of the lit instrument panel strip

// World: x runs west -> east. Altitudes are in feet above sea level (y up).
export const WORLD = {
  width: 12000,
  seaLevel: 0,
  westPlateau: 540, // Westfield cliff-top airfield height
  eastPlateau: 580, // Eastcliff cliff-top airfield height
  westCliffEdge: 1750, // where the west cliff falls to the sea
  eastCliffEdge: 10250, // where the east cliff rises from the sea
  rockX0: 5650, // lighthouse rock, west edge
  rockX1: 6350, // lighthouse rock, east edge
  rockTop: 150, // lighthouse rock landing strip height
  westRunway: { x0: 350, x1: 1250 },
  eastRunway: { x0: 10750, x1: 11650 },
  rockStrip: { x0: 5750, x1: 6250 },
};

export const PLANE = {
  maxThrottle: 1,
  thrust: 34, // ft/s^2 at full throttle
  dragK: 0.00042, // quadratic drag coefficient
  gravity: 32.2,
  liftK: 0.011, // lift per (ft/s)^2 at level flight
  stallClean: 95, // ft/s stall speed, flaps up
  stallFlaps: 68, // ft/s stall speed, flaps down
  maxSpeed: 320,
  pitchRate: 0.85, // rad/s at full authority
  fuelCapacity: 100,
  fuelBurn: 0.55, // units/s at full throttle
  damageHardLanding: 34,
  damageGearUpLanding: 55,
  damageWater: 100,
};

export const FOG = {
  bandLow: 120, // fog band bottom (ft)
  bandHigh: 420, // fog band top (ft)
  heavy: 0.92, // max fog opacity inside the band (heavy missions)
  light: 0.45,
};

// Four missions, each with its own weather, time of day and objective.
export const MISSIONS = [
  {
    id: 1,
    name: 'MAIL RUN',
    tag: 'First crossing — carry the mailbag east',
    from: 'west',
    to: 'east',
    timeOfDay: 'day',
    fog: 'light',
    wind: 6,
    brief:
      'Take off from Westfield, cross the channel and land on Eastcliff. Keep speed above stall and watch your fuel.',
    objective: 'Land on Eastcliff runway',
    startFuel: 100,
  },
  {
    id: 2,
    name: 'FOG LANDING',
    tag: 'Instrument landing — the channel is socked in',
    from: 'east',
    to: 'west',
    timeOfDay: 'day',
    fog: 'heavy',
    wind: 14,
    brief:
      'Fly home through the fog band. Trust the beacons and the instruments — outside the windscreen there is nothing but grey.',
    objective: 'Land on Westfield runway in fog',
    startFuel: 100,
  },
  {
    id: 3,
    name: 'LIGHTHOUSE RESCUE',
    tag: 'Pick up the keeper from the rock, then fly home',
    from: 'west',
    to: 'rock',
    timeOfDay: 'dusk',
    fog: 'light',
    wind: 10,
    brief:
      'Land on the short rock strip beside the lighthouse, pick up the keeper, then take off again and land at Westfield.',
    objective: 'Land on the rock, then return to Westfield',
    startFuel: 100,
  },
  {
    id: 4,
    name: 'NIGHT CROSSING',
    tag: 'Beacon lights only — fly the dark channel',
    from: 'west',
    to: 'east',
    timeOfDay: 'night',
    fog: 'light',
    wind: 8,
    brief:
      'Cross at night. The beacons are your only guides — follow the chain of lights to Eastcliff and put her down gently.',
    objective: 'Land on Eastcliff runway at night',
    startFuel: 100,
  },
];

export const SCORE = {
  timePar: [150, 170, 260, 170], // par seconds per mission
  fuelBonusPerUnit: 12,
  landingSoftVs: 6, // vertical speed ft/s for a "soft" landing
  landingOkVs: 14,
};
