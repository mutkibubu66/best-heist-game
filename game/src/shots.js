// MIDNIGHT VAULT — the screenshot scenes behind ?shot=start|play|alert|end.
// Each scene plays the real rules forward from a fresh world, steered by a
// simple autopilot (BFS to the next objective, sneak near guards, back off
// when a guard's meter climbs), so every frame is what a short game really
// looks like and the same seed always gives the same frame. The end scene
// stages a genuine level clear: the autopilot walks the real path while the
// guards' meters and the alarm are held at zero, so the clear screen is the
// game's own render of a level actually finished.
import { STEP } from './config.js';
import {
  findPath, stepWorld, resetWorld, losClear, isWall,
  EVENT_LEVEL_CLEAR,
} from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const ALERT_LEAD_SECONDS = 9;
const END_LIMIT_SECONDS = 150;

function guardNear(state, radius) {
  for (const g of state.guards) {
    if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < radius) return g;
  }
  return null;
}

function maxDetect(state) {
  let m = 0;
  for (const g of state.guards) m = Math.max(m, g.detect);
  return m;
}

/** One autopilot step: head for the next objective, crack the vault on arrival. */
function autopilotInput(state, memory) {
  const p = state.player;
  // Crack the vault when standing beside it.
  if (!state.vault.open && Math.hypot(state.vault.x - p.x, state.vault.y - p.y) < 52) {
    return { dx: 0, dy: 0, sneak: false, interact: true };
  }
  let target = null;
  for (const l of state.loot) {
    if (!l.taken && (!target
      || Math.hypot(l.x - p.x, l.y - p.y) < Math.hypot(target.x - p.x, target.y - p.y))) {
      target = l;
    }
  }
  if (!target && !state.vault.open) target = state.vault;
  if (!target && state.exitOpen) target = state.exit;
  if (!target) return { dx: 0, dy: 0, sneak: false, interact: false };

  const now = state.time;
  if (!memory.path || memory.target !== target || now - memory.pathT > 0.6) {
    memory.path = findPath(state.level, p, target);
    memory.pathIndex = 0;
    memory.target = target;
    memory.pathT = now;
  }
  const path = memory.path || [];
  while (memory.pathIndex < path.length - 1
    && Math.hypot(path[memory.pathIndex].x - p.x, path[memory.pathIndex].y - p.y) < 14) {
    memory.pathIndex += 1;
  }
  const wp = path[memory.pathIndex] || target;

  // Back off when a guard is onto us: step back along the path.
  const hot = maxDetect(state) > 0.35;
  const near = guardNear(state, 230);
  let tx = wp.x;
  let ty = wp.y;
  if (hot && memory.pathIndex > 0) {
    tx = path[memory.pathIndex - 1].x;
    ty = path[memory.pathIndex - 1].y;
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return { dx: 0, dy: 0, sneak: false, interact: false };
  const sneak = Boolean(near) || hot;
  return { dx: dx / dist, dy: dy / dist, sneak, interact: false };
}

function runAutopilot(state, seconds, opts) {
  const events = { bits: 0 };
  const memory = { path: null, pathIndex: 0, target: null, pathT: -1 };
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilotInput(state, memory);
    stepWorld(state, STEP, input, events);
    if (opts && opts.godMode) {
      for (const g of state.guards) { g.detect = 0; if (g.state !== 'patrol') g.state = 'patrol'; }
      state.alarm = 0;
    }
    if (events.bits & EVENT_LEVEL_CLEAR) return true;
    if (state.over) return false;
    events.bits = 0;
  }
  return false;
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  resetWorld(world);
  if (name !== 'play' && name !== 'alert' && name !== 'end') {
    runAutopilot(world, START_SECONDS, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    runAutopilot(world, PLAY_SECONDS, null);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'alert') {
    runAutopilot(world, ALERT_LEAD_SECONDS, null);
    // Drop the player into the first guard's cone with a clear line of sight
    // (the first try can land behind a wall, where the guard sees nothing),
    // then let the chase genuinely develop — and stop the moment the guard
    // is about to catch the player, so the frame is mid-chase.
    const g = world.guards[0];
    const p = world.player;
    let placed = false;
    for (const dist of [100, 80, 120, 70, 140]) {
      for (const off of [0, 0.3, -0.3, 0.6, -0.6]) {
        const a = g.angle + off;
        const x = g.x + Math.cos(a) * dist;
        const y = g.y + Math.sin(a) * dist;
        if (isWall(world.level, x, y)) continue;
        if (!losClear(world.level, g.x, g.y, x, y)) continue;
        p.x = x; p.y = y;
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) {
      p.x = g.x + Math.cos(g.angle) * 70;
      p.y = g.y + Math.sin(g.angle) * 70;
    }
    // Prime the meter so the chase starts at once: the guard keeps
    // patrolling and would otherwise turn away before a standing player
    // fills it from zero.
    g.detect = 0.95;
    p.moving = true; p.sneaking = false;
    const events = { bits: 0 };
    let chaseT = 0;
    for (let i = 0; i < 3.5 / STEP; i += 1) {
      const closing = world.guards.some((gg) => gg.state === 'chase'
        && Math.hypot(gg.x - p.x, gg.y - p.y) < 42);
      if (closing) break;
      stepWorld(world, STEP, { dx: 0, dy: 0, sneak: false, interact: false }, events);
      events.bits = 0;
      if (world.over) break;
      if (world.guards.some((gg) => gg.state === 'chase')) {
        chaseT += STEP;
        if (chaseT > 0.45) break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  // end: god-mode walk to a real level clear.
  const cleared = runAutopilot(world, END_LIMIT_SECONDS, { godMode: true });
  return { screen: cleared ? SCREEN_LEVEL_CLEAR : SCREEN_PLAY, best: world.score };
}
