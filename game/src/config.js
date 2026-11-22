// MIDNIGHT VAULT — constants and the three gallery levels.
// A level is a room: outer walls are implicit (the canvas edge), inner walls are
// cover, patrols are waypoint loops, cameras sweep from ceiling mounts, loot waits
// to be lifted, and the vault holds the level's star piece. The getaway van
// sits outside the south door; reaching it with the star piece ends the level.
// Patrol waypoints are routed through open floor only — no leg crosses a wall,
// so a guard never slides along masonry with its cone buried in a plinth.
export const VIEW = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 165;
export const SNEAK_SPEED = 95;
export const GUARD_TOUCH = 26;
export const PICKUP_RANGE = 36;
export const ALARM_MAX = 100;
export const ALARM_RISE = 52;
export const ALARM_FALL = 13;
export const ALARM_HOLD_TO_BUST = 1.6;
export const SPOT_GRACE = 1.1;
export const SMOKE_SECONDS = 3.5;
export const EMP_SECONDS = 6;
export const CAMERA_RANGE = 230;
export const GUARD_RANGE = 235;

export const TOOL = { SMOKE: 0, EMP: 1, LOCKPICK: 2 };
export const TOOL_NAMES = ['Smoke pellet', 'EMP dart', 'Lockpick'];
export const TOOL_KEYS = ['1', '2', '3'];

// One room per level. Walls are {x,y,w,h} cover blocks. Guards patrol their
// waypoints in order. Cameras sit just inside the north wall and sweep down.
export const LEVELS = [
  {
    name: 'Gallery One — The Quiet Wing',
    target: 500,
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 520 },
    vault: { x: 480, y: 92, value: 500, label: 'Star Sapphire' },
    walls: [
      { x: 200, y: 150, w: 120, h: 26 },
      { x: 640, y: 150, w: 120, h: 26 },
      { x: 160, y: 430, w: 120, h: 26 },
      { x: 680, y: 430, w: 120, h: 26 },
      { x: 430, y: 190, w: 100, h: 60 },
    ],
    guards: [
      { waypoints: [[300, 300], [600, 300], [600, 460], [300, 460]], speed: 62 },
      { waypoints: [[360, 170], [360, 480]], speed: 55 },
    ],
    cameras: [
      { x: 480, y: 72, base: Math.PI / 2, sweep: 0.9, speed: 0.55 },
    ],
    loot: [
      { x: 150, y: 110, kind: 'painting', value: 120, label: 'Moonlit Canal' },
      { x: 810, y: 110, kind: 'painting', value: 120, label: 'Duchess in Blue' },
      { x: 150, y: 300, kind: 'gem', value: 200, label: 'Emerald Case' },
      { x: 810, y: 300, kind: 'gem', value: 200, label: 'Ruby Case' },
      { x: 480, y: 470, kind: 'gold', value: 150, label: 'Gold Idol' },
    ],
    tools: { smoke: 3, emp: 2, lockpick: 1 },
  },
  {
    name: 'Gallery Two — The Marble Hall',
    target: 800,
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 520 },
    vault: { x: 480, y: 92, value: 800, label: 'Crown of Tides' },
    walls: [
      { x: 160, y: 130, w: 26, h: 180 },
      { x: 774, y: 130, w: 26, h: 180 },
      { x: 300, y: 220, w: 110, h: 26 },
      { x: 550, y: 220, w: 110, h: 26 },
      { x: 300, y: 380, w: 110, h: 26 },
      { x: 550, y: 380, w: 110, h: 26 },
      { x: 430, y: 300, w: 100, h: 60 },
    ],
    guards: [
      { waypoints: [[240, 200], [720, 200], [720, 480], [240, 480]], speed: 74 },
      { waypoints: [[480, 150], [480, 280], [700, 300], [700, 480]], speed: 68 },
      { waypoints: [[250, 150], [250, 480]], speed: 66 },
    ],
    cameras: [
      { x: 240, y: 72, base: Math.PI / 2, sweep: 1.0, speed: 0.7 },
      { x: 720, y: 72, base: Math.PI / 2, sweep: 1.0, speed: 0.6 },
    ],
    loot: [
      { x: 120, y: 110, kind: 'painting', value: 150, label: 'Storm over Harbour' },
      { x: 840, y: 110, kind: 'painting', value: 150, label: 'The Pale Violin' },
      { x: 120, y: 470, kind: 'gem', value: 250, label: 'Opal Case' },
      { x: 840, y: 470, kind: 'gem', value: 250, label: 'Topaz Case' },
      { x: 480, y: 520, kind: 'gold', value: 180, label: 'Silver Chalice' },
      { x: 480, y: 190, kind: 'gold', value: 180, label: 'Jade Mask' },
    ],
    tools: { smoke: 3, emp: 2, lockpick: 1 },
  },
  {
    name: 'Gallery Three — The Vault Floor',
    target: 1200,
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 520 },
    vault: { x: 480, y: 92, value: 1200, label: 'The Midnight Diamond' },
    walls: [
      { x: 140, y: 140, w: 100, h: 26 },
      { x: 720, y: 140, w: 100, h: 26 },
      { x: 140, y: 430, w: 100, h: 26 },
      { x: 720, y: 430, w: 100, h: 26 },
      { x: 300, y: 240, w: 26, h: 140 },
      { x: 634, y: 240, w: 26, h: 140 },
      { x: 420, y: 270, w: 120, h: 80 },
    ],
    guards: [
      { waypoints: [[260, 220], [700, 220], [700, 480], [260, 480]], speed: 88 },
      { waypoints: [[360, 420], [600, 420]], speed: 82 },
      { waypoints: [[150, 200], [480, 200], [810, 200]], speed: 80 },
      { waypoints: [[700, 200], [700, 460], [480, 460]], speed: 76 },
    ],
    cameras: [
      { x: 160, y: 72, base: Math.PI / 2, sweep: 1.1, speed: 0.85 },
      { x: 480, y: 72, base: Math.PI / 2, sweep: 0.9, speed: 0.7 },
      { x: 800, y: 72, base: Math.PI / 2, sweep: 1.1, speed: 0.8 },
    ],
    loot: [
      { x: 110, y: 100, kind: 'painting', value: 200, label: 'Night Watch II' },
      { x: 850, y: 100, kind: 'painting', value: 200, label: 'The Gilded Fox' },
      { x: 110, y: 480, kind: 'gem', value: 300, label: 'Sapphire Case' },
      { x: 850, y: 480, kind: 'gem', value: 300, label: 'Amethyst Case' },
      { x: 480, y: 520, kind: 'gold', value: 250, label: 'Golden Scarab' },
      { x: 380, y: 190, kind: 'gold', value: 250, label: 'Ivory Dice' },
      { x: 580, y: 190, kind: 'gold', value: 250, label: 'Bronze Owl' },
    ],
    tools: { smoke: 4, emp: 3, lockpick: 1 },
  },
];
