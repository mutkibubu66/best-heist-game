// MIDNIGHT VAULT — the game loop, screens, click-to-move, and the
// ?shot= staging hook the screenshots use.
import { STEP, TILE } from './config.js';
import {
  createWorld, stepWorld, findPath,
  EVENT_PICKUP, EVENT_VAULT_OPEN, EVENT_CAUGHT, EVENT_LEVEL_CLEAR,
  EVENT_GAME_OVER, EVENT_WIN, EVENT_CAMERA_DISABLED, EVENT_ALARM_FULL,
} from './world.js';
import { LEVELS } from './levels.js';
import {
  drawScreen, worldTransform,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_WIN,
} from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

let best = 0;
try { best = Number(localStorage.getItem('midnight-vault-best') || 0) || 0; } catch { best = 0; }
function saveBest(score) {
  if (score > best) {
    best = score;
    try { localStorage.setItem('midnight-vault-best', String(best)); } catch { /* private mode */ }
  }
}

let world = createWorld(0);
let screen = SCREEN_TITLE;
let paused = false;
let clickPath = null;
let scoreAtLevelStart = 0;
let alarmStingPlayed = false;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Screenshot mode: stage one deterministic scene, draw it once, signal ready.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  drawScreen(ctx, world, screen, canvas.width, canvas.height, staged.best);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;

    if (input.mutePressed) {
      input.mutePressed = false;
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off' : 'Sound on');
    }
    if (input.pausePressed) {
      input.pausePressed = false;
      if (screen === SCREEN_PLAY) paused = !paused;
    }

    if (input.enterPressed) {
      input.enterPressed = false;
      audio.ensure();
      if (screen === SCREEN_TITLE) {
        screen = SCREEN_PLAY;
        announce(`${world.level.def.name}: grab the loot, crack the vault, reach the exit.`);
      } else if (screen === SCREEN_LEVEL_CLEAR) {
        if (world.won) {
          screen = SCREEN_WIN;
        } else {
          scoreAtLevelStart = world.score;
          world = createWorld(world.levelIndex + 1);
          world.score = scoreAtLevelStart;
          screen = SCREEN_PLAY;
          alarmStingPlayed = false;
          announce(`${world.level.def.name}: grab the loot, crack the vault, reach the exit.`);
        }
      } else if (screen === SCREEN_OVER) {
        world = createWorld(world.levelIndex);
        world.score = scoreAtLevelStart;
        screen = SCREEN_PLAY;
        alarmStingPlayed = false;
      } else if (screen === SCREEN_WIN) {
        scoreAtLevelStart = 0;
        world = createWorld(0);
        screen = SCREEN_TITLE;
      }
    }

    if (screen === SCREEN_PLAY && !paused) {
      // Click-to-move: turn the click into a path through the world.
      if (input.click) {
        const t = worldTransform(canvas.width, canvas.height, world.level);
        const wx = (input.click.x - t.ox) / t.scale;
        const wy = (input.click.y - t.oy) / t.scale;
        input.click = null;
        if (wx >= 0 && wy >= 0 && wx < world.level.cols * TILE && wy < world.level.rows * TILE) {
          clickPath = findPath(world.level, world.player, { x: wx, y: wy });
        }
      }
      let dx = input.dx;
      let dy = input.dy;
      if (dx !== 0 || dy !== 0) clickPath = null;
      if (clickPath && clickPath.length) {
        const wp = clickPath[0];
        const ddx = wp.x - world.player.x;
        const ddy = wp.y - world.player.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist < 8) {
          clickPath.shift();
        } else {
          dx = ddx / dist;
          dy = ddy / dist;
        }
      }
      const events = { bits: 0 };
      while (acc >= STEP) {
        stepWorld(world, STEP, { dx, dy, sneak: input.sneak, interact: input.interact }, events);
        acc -= STEP;
        if (events.bits) break;
      }
      if (events.bits & EVENT_PICKUP) audio.pickup();
      if (events.bits & EVENT_VAULT_OPEN) audio.vault();
      if (events.bits & EVENT_CAMERA_DISABLED) audio.cameraOff();
      if (events.bits & EVENT_CAUGHT) {
        audio.caught();
        clickPath = null;
        announce('Caught! Back to the start — the alarm is up.');
      }
      if (events.bits & EVENT_ALARM_FULL) audio.alarm();
      if (!alarmStingPlayed && world.alarm >= 50) {
        alarmStingPlayed = true;
        audio.alarm();
      }
      if (events.bits & EVENT_LEVEL_CLEAR) {
        saveBest(world.score);
        if (world.won) {
          audio.win();
          screen = SCREEN_WIN;
          announce(`All heists cleared! Final score ${world.score}.`);
        } else {
          audio.clear();
          screen = SCREEN_LEVEL_CLEAR;
          announce(`${world.level.def.name} cleared! Score ${world.score}.`);
        }
      }
      if (events.bits & EVENT_GAME_OVER) {
        saveBest(world.score);
        audio.over();
        screen = SCREEN_OVER;
        announce('Busted. Press Enter to try this heist again.');
      }
      void EVENT_WIN;
    } else {
      acc = 0;
    }

    drawScreen(ctx, world, screen, canvas.width, canvas.height, best);
    if (paused && screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(4,6,12,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e8ecf4';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED — press P to resume', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'left';
    }
  }
  requestAnimationFrame(frame);
}

void LEVELS;
