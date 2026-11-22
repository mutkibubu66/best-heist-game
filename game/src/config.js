// MIDNIGHT VAULT — tuning constants.
export const TILE = 40;
export const STEP = 1 / 60;

export const PLAYER_SPEED = 148; // px/s walking
export const PLAYER_SNEAK = 86; // px/s sneaking
export const GUARD_SPEED = 92; // px/s on patrol
export const GUARD_CHASE = 178; // px/s chasing
export const CAMERA_DISABLE_TIME = 1.5; // seconds holding E beside a camera
export const VAULT_CRACK_TIME = 3.0; // seconds holding E beside the vault

export const GUARD_RANGE = 215;
export const GUARD_HALF_ANGLE = 0.62; // ~35 degrees
export const CAMERA_RANGE = 235;
export const CAMERA_HALF_ANGLE = 0.5;
export const CATCH_RADIUS = 24;

export const ALARM_MAX = 100;
export const ALARM_DECAY = 2.0; // per second while unseen
export const ALARM_CAMERA_RATE = 32; // per second while a camera sees the player
export const ALARM_CHASE_RATE = 8; // per second while any guard chases
export const ALARM_CAUGHT_BUMP = 20;

export const SCORE_GOLD = 100;
export const SCORE_DIAMOND = 300;
export const SCORE_VAULT = 500;
export const SCORE_GHOST_BONUS = 300; // level clear with alarm never over 25
export const LIVES = 3;

export const COLORS = {
  floorA: '#1a2233',
  floorB: '#161d2c',
  wall: '#0a0e18',
  wallTop: '#2c3a55',
  shadow: '#05070c',
  player: '#e8c85a',
  playerTrim: '#11131c',
  guard: '#c94f4f',
  guardCap: '#7e2a2a',
  camera: '#d97b2f',
  coneGuard: 'rgba(232, 200, 90, 0.20)',
  coneGuardHot: 'rgba(232, 90, 60, 0.30)',
  coneCamera: 'rgba(217, 123, 47, 0.20)',
  gold: '#f2c94c',
  diamond: '#7fe3f0',
  vault: '#8a93a8',
  vaultDoor: '#5a6274',
  exit: '#4fc978',
  exitLocked: '#3a4a5a',
  hud: '#e8ecf4',
  hudDim: '#8b96ab',
  alarm: '#e5484d',
};
