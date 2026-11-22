// MIDNIGHT VAULT — the simulation: movement, guards, cameras, detection,
// alarm, loot, vault-cracking, lives. Pure logic; rendering lives in render.js.
import {
  TILE, PLAYER_SPEED, PLAYER_SNEAK, GUARD_SPEED, GUARD_CHASE,
  GUARD_RANGE, GUARD_HALF_ANGLE, CAMERA_RANGE, CAMERA_HALF_ANGLE,
  CATCH_RADIUS, ALARM_MAX, ALARM_DECAY, ALARM_CAMERA_RATE,
  ALARM_CHASE_RATE, ALARM_CAUGHT_BUMP, SCORE_GOLD, SCORE_DIAMOND,
  SCORE_VAULT, SCORE_GHOST_BONUS, LIVES, CAMERA_DISABLE_TIME,
  VAULT_CRACK_TIME,
} from './config.js';
import { LEVELS, parseLevel } from './levels.js';

export const EVENT_PICKUP = 1;
export const EVENT_VAULT_OPEN = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_CLEAR = 8;
export const EVENT_GAME_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_CAMERA_DISABLED = 64;
export const EVENT_ALARM_FULL = 128;

const RADIUS = 13;

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.def.grid[ty][tx];
}

export function isWall(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return tileAt(level, tx, ty) === '#';
}

export function isShadow(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return tileAt(level, tx, ty) === 's';
}

/** Line of sight between two points: no wall tile crossed. */
export function losClear(level, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isWall(level, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

/** BFS over floor tiles; returns pixel waypoints from `from` to `to`. */
export function findPath(level, from, to) {
  const sx = Math.floor(from.x / TILE);
  const sy = Math.floor(from.y / TILE);
  const gx = Math.floor(to.x / TILE);
  const gy = Math.floor(to.y / TILE);
  if (sx === gx && sy === gy) return [{ x: to.x, y: to.y }];
  const key = (x, y) => y * level.cols + x;
  const prev = new Map();
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
      if (tileAt(level, nx, ny) === '#') continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, [cx, cy]);
      if (nx === gx && ny === gy) {
        const cells = [[gx, gy]];
        let cur = [gx, gy];
        while (!(cur[0] === sx && cur[1] === sy)) {
          cur = prev.get(key(cur[0], cur[1]));
          cells.push(cur);
        }
        cells.reverse();
        return cells.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
      }
      queue.push([nx, ny]);
    }
  }
  return [];
}

function moveCircle(level, ent, dx, dy) {
  // Axis-separated so the player slides along walls instead of sticking.
  const nx = ent.x + dx;
  if (!isWall(level, nx + Math.sign(dx) * RADIUS, ent.y - RADIUS + 2)
    && !isWall(level, nx + Math.sign(dx) * RADIUS, ent.y + RADIUS - 2)) ent.x = nx;
  const ny = ent.y + dy;
  if (!isWall(level, ent.x - RADIUS + 2, ny + Math.sign(dy) * RADIUS)
    && !isWall(level, ent.x + RADIUS - 2, ny + Math.sign(dy) * RADIUS)) ent.y = ny;
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function createWorld(levelIndex) {
  const def = LEVELS[levelIndex];
  const level = parseLevel(def);
  const state = {
    levelIndex,
    level,
    time: 0,
    score: 0,
    lives: LIVES,
    alarm: 0,
    maxAlarm: 0,
    over: false,
    won: false,
    levelClear: false,
    exitOpen: false,
    player: {
      x: level.player.x, y: level.player.y, dir: 0,
      sneaking: false, moving: false, invuln: 0,
    },
    guards: [],
    cameras: [],
    loot: level.loot.map((l) => ({ ...l })),
    vault: { x: level.vault.x, y: level.vault.y, progress: 0, open: false },
    exit: { ...level.exit },
    crackTarget: null, // 'vault' | camera index | null, for the HUD prompt
  };
  resetWorld(state);
  return state;
}

export function resetWorld(state) {
  const { level } = state;
  state.time = 0;
  state.alarm = 0;
  state.maxAlarm = 0;
  state.over = false;
  state.levelClear = false;
  state.exitOpen = false;
  state.player.x = level.player.x;
  state.player.y = level.player.y;
  state.player.dir = 0;
  state.player.invuln = 0;
  state.guards = level.def.guards.map((g) => {
    const pts = g.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    return {
      x: pts[0].x, y: pts[0].y, angle: 0, path: pts, wp: 1,
      state: 'patrol', detect: 0, lostT: 0, repathT: 0, chasePath: [],
    };
  });
  state.cameras = level.def.cameras.map((c) => ({
    x: (c.tx + 0.5) * TILE, y: (c.ty + 0.5) * TILE,
    baseAngle: c.angle, sweep: c.sweep, speed: c.speed,
    angle: c.angle, phase: 0, disabled: false, disableProgress: 0,
    seen: false, flash: 0,
  }));
  state.loot = level.loot.map((l) => ({ ...l }));
  state.vault = { x: level.vault.x, y: level.vault.y, progress: 0, open: false };
  state.crackTarget = null;
}

function guardSees(state, g) {
  const p = state.player;
  const dx = p.x - g.x;
  const dy = p.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return 0;
  if (angleDiff(Math.atan2(dy, dx), g.angle) > GUARD_HALF_ANGLE) return 0;
  if (!losClear(state.level, g.x, g.y, p.x, p.y)) return 0;
  let rate = dist < 80 ? 1.5 : dist < 150 ? 0.9 : 0.55;
  if (p.sneaking) rate *= 0.45;
  if (isShadow(state.level, p.x, p.y)) rate *= 0.4;
  return rate;
}

function cameraSees(state, c) {
  if (c.disabled) return false;
  const p = state.player;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_RANGE) return false;
  if (angleDiff(Math.atan2(dy, dx), c.angle) > CAMERA_HALF_ANGLE) return false;
  if (!losClear(state.level, c.x, c.y, p.x, p.y)) return false;
  if (p.invuln > 0) return false;
  return true;
}

export function stepWorld(state, dt, input, events) {
  if (state.over || state.levelClear) return;
  const { level } = state;
  const p = state.player;
  state.time += dt;
  if (p.invuln > 0) p.invuln -= dt;

  // --- player movement ---
  const speed = input.sneak ? PLAYER_SNEAK : PLAYER_SPEED;
  const len = Math.hypot(input.dx, input.dy);
  p.sneaking = Boolean(input.sneak);
  p.moving = len > 0.01;
  if (p.moving) {
    const nx = input.dx / len;
    const ny = input.dy / len;
    moveCircle(level, p, nx * speed * dt, ny * speed * dt);
    p.dir = Math.atan2(ny, nx);
  }

  // --- loot pickup ---
  for (const l of state.loot) {
    if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 24) {
      l.taken = true;
      const pts = l.kind === 'diamond' ? SCORE_DIAMOND : SCORE_GOLD;
      state.score += pts;
      events.bits |= EVENT_PICKUP;
    }
  }

  // --- vault cracking / camera disabling (hold E nearby) ---
  state.crackTarget = null;
  const vaultDist = Math.hypot(state.vault.x - p.x, state.vault.y - p.y);
  if (!state.vault.open && vaultDist < 52 && input.interact) {
    state.vault.progress += dt / VAULT_CRACK_TIME;
    state.crackTarget = 'vault';
    if (state.vault.progress >= 1) {
      state.vault.progress = 1;
      state.vault.open = true;
      state.score += SCORE_VAULT;
      events.bits |= EVENT_VAULT_OPEN;
    }
  } else if (!state.vault.open) {
    state.vault.progress = Math.max(0, state.vault.progress - dt * 0.25);
  }
  state.cameras.forEach((c, i) => {
    if (c.disabled) return;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < 48 && input.interact) {
      c.disableProgress += dt / CAMERA_DISABLE_TIME;
      state.crackTarget = `camera:${i}`;
      if (c.disableProgress >= 1) {
        c.disabled = true;
        events.bits |= EVENT_CAMERA_DISABLED;
      }
    } else {
      c.disableProgress = Math.max(0, c.disableProgress - dt * 0.5);
    }
  });

  // --- exit opens once everything is taken ---
  const allLoot = state.loot.every((l) => l.taken);
  state.exitOpen = allLoot && state.vault.open;
  if (state.exitOpen && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 28) {
    const timeBonus = Math.max(0, 500 - Math.floor(state.time) * 5);
    const ghost = state.maxAlarm <= 25 ? SCORE_GHOST_BONUS : 0;
    state.score += timeBonus + ghost;
    state.levelClear = true;
    state.clearBonus = { timeBonus, ghost };
    events.bits |= EVENT_LEVEL_CLEAR;
    if (state.levelIndex >= LEVELS.length - 1) {
      state.won = true;
      events.bits |= EVENT_WIN;
    }
    return;
  }

  // --- guards ---
  let anyChase = false;
  for (const g of state.guards) {
    if (g.state === 'patrol') {
      const target = g.path[g.wp];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        g.wp = (g.wp + 1) % g.path.length;
      } else {
        const heading = Math.atan2(dy, dx);
        g.angle = angleLerp(g.angle, heading, Math.min(1, dt * 8));
        moveCircle(level, g, (dx / dist) * GUARD_SPEED * dt, (dy / dist) * GUARD_SPEED * dt);
      }
      const seen = p.invuln > 0 ? 0 : guardSees(state, g);
      if (seen > 0) {
        g.detect += seen * dt;
        if (g.detect >= 1) {
          g.detect = 1;
          g.state = 'chase';
          g.lostT = 0;
          g.repathT = 0;
        }
      } else {
        g.detect = Math.max(0, g.detect - dt * 0.5);
      }
    } else if (g.state === 'chase') {
      anyChase = true;
      g.repathT -= dt;
      if (g.repathT <= 0) {
        g.repathT = 0.4;
        g.chasePath = findPath(level, g, p);
      }
      const wp = g.chasePath[0] || p;
      const dx = wp.x - g.x;
      const dy = wp.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const heading = Math.atan2(dy, dx);
        g.angle = angleLerp(g.angle, heading, Math.min(1, dt * 10));
        moveCircle(level, g, (dx / dist) * GUARD_CHASE * dt, (dy / dist) * GUARD_CHASE * dt);
      }
      if (p.invuln <= 0 && Math.hypot(p.x - g.x, p.y - g.y) < CATCH_RADIUS) {
        state.lives -= 1;
        state.alarm = Math.min(ALARM_MAX, state.alarm + ALARM_CAUGHT_BUMP);
        events.bits |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.over = true;
          events.bits |= EVENT_GAME_OVER;
          return;
        }
        // Caught: back to the start, guards stand down, brief grace period.
        p.x = level.player.x;
        p.y = level.player.y;
        p.invuln = 2.5;
        for (const gg of state.guards) {
          gg.state = 'patrol';
          gg.detect = 0;
          gg.wp = 0;
          gg.x = gg.path[0].x;
          gg.y = gg.path[0].y;
        }
        continue;
      }
      const seen = p.invuln > 0 ? 0 : guardSees(state, g);
      if (seen > 0) {
        g.lostT = 0;
      } else {
        g.lostT += dt;
        if (g.lostT > 2.5) {
          g.state = 'return';
          g.detect = 0;
        }
      }
    } else if (g.state === 'return') {
      // Walk back to the nearest patrol waypoint, then resume the route.
      let best = 0;
      let bestD = Infinity;
      g.path.forEach((pt, i) => {
        const d = Math.hypot(pt.x - g.x, pt.y - g.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const target = g.path[best];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        g.wp = (best + 1) % g.path.length;
        g.state = 'patrol';
      } else {
        const heading = Math.atan2(dy, dx);
        g.angle = angleLerp(g.angle, heading, Math.min(1, dt * 8));
        moveCircle(level, g, (dx / dist) * GUARD_SPEED * dt, (dy / dist) * GUARD_SPEED * dt);
      }
      const seen = p.invuln > 0 ? 0 : guardSees(state, g);
      if (seen > 0) {
        g.detect += seen * dt;
        if (g.detect >= 1) { g.detect = 1; g.state = 'chase'; g.lostT = 0; g.repathT = 0; }
      }
    }
  }

  // --- cameras sweep; a camera that sees the player feeds the alarm ---
  let cameraSeen = false;
  for (const c of state.cameras) {
    c.phase += dt;
    if (!c.disabled) c.angle = c.baseAngle + Math.sin(c.phase * c.speed) * c.sweep;
    const sees = cameraSees(state, c);
    c.seen = sees;
    if (sees) cameraSeen = true;
    if (c.flash > 0) c.flash -= dt;
    if (sees) c.flash = 0.25;
  }

  // --- alarm ---
  if (cameraSeen) state.alarm += ALARM_CAMERA_RATE * dt;
  if (anyChase) state.alarm += ALARM_CHASE_RATE * dt;
  if (!cameraSeen && !anyChase) state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
  state.alarm = Math.min(ALARM_MAX, state.alarm);
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  if (state.alarm >= ALARM_MAX) {
    state.over = true;
    events.bits |= EVENT_ALARM_FULL | EVENT_GAME_OVER;
  }
}
