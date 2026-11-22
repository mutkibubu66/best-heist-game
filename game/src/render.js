// MIDNIGHT VAULT — canvas rendering: the heist floor, vision cones, HUD,
// and the title / clear / over / win screens.
import { TILE, COLORS, ALARM_MAX } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function conePath(ctx, x, y, angle, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, half, range, fill) {
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  conePath(ctx, x, y, angle, half, range);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function worldTransform(w, h, level) {
  const worldW = level.cols * TILE;
  const worldH = level.rows * TILE;
  const scale = Math.min((w - 24) / worldW, (h - 76) / worldH);
  return {
    scale,
    ox: (w - worldW * scale) / 2,
    oy: 60 + (h - 60 - worldH * scale) / 2,
  };
}

function drawWorld(ctx, state) {
  const { level } = state;
  const W = level.cols * TILE;
  const H = level.rows * TILE;

  // Floor checker.
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      const ch = level.def.grid[y][x];
      if (ch === '#') continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  // Shadow patches (hiding spots).
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      if (level.def.grid[y][x] !== 's') continue;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
      ctx.strokeStyle = 'rgba(140,170,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * TILE + 3.5, y * TILE + 3.5, TILE - 7, TILE - 7);
    }
  }
  // Walls.
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      if (level.def.grid[y][x] !== '#') continue;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(x * TILE, y * TILE, TILE, 4);
    }
  }

  // Exit door.
  const e = state.exit;
  ctx.fillStyle = state.exitOpen ? COLORS.exit : COLORS.exitLocked;
  roundRect(ctx, e.x - 16, e.y - 16, 32, 32, 5);
  ctx.fill();
  ctx.fillStyle = '#0a0e18';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.exitOpen ? 'EXIT' : '🔒', e.x, e.y + 1);
  if (state.exitOpen) {
    ctx.strokeStyle = 'rgba(79,201,120,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 20, e.y - 20, 40, 40);
  }

  // Loot.
  for (const l of state.loot) {
    if (l.taken) continue;
    const bob = Math.sin(state.time * 3 + l.x) * 2;
    if (l.kind === 'gold') {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(l.x, l.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('$', l.x, l.y + bob + 1);
    } else {
      ctx.fillStyle = COLORS.diamond;
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
    }
  }

  // Vault.
  const v = state.vault;
  ctx.fillStyle = COLORS.vault;
  roundRect(ctx, v.x - 17, v.y - 17, 34, 34, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.vaultDoor;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dfe6f2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(v.x + 7, v.y - 7);
  ctx.stroke();
  if (v.open) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('OPEN', v.x, v.y - 26);
  } else if (v.progress > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(v.x - 20, v.y - 28, 40, 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(v.x - 19, v.y - 27, 38 * v.progress, 4);
  }

  // Vision cones (under the actors).
  for (const c of state.cameras) {
    if (c.disabled) continue;
    drawCone(ctx, c.x, c.y, c.angle, 0.5, 235,
      c.seen ? 'rgba(229,72,77,0.30)' : COLORS.coneCamera);
  }
  for (const g of state.guards) {
    const hot = g.detect > 0.05 || g.state === 'chase';
    drawCone(ctx, g.x, g.y, g.angle, 0.62, 215,
      hot ? COLORS.coneGuardHot : COLORS.coneGuard);
  }

  // Cameras (wall mounts).
  for (const c of state.cameras) {
    ctx.fillStyle = c.disabled ? '#4a4f5c' : COLORS.camera;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    roundRect(ctx, -4, -6, 16, 12, 3);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = c.disabled ? '#888' : (c.seen ? '#ff5a5a' : '#ffd166');
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (c.disabled) {
      ctx.strokeStyle = '#cfd6e4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x - 5, c.y - 5);
      ctx.lineTo(c.x + 5, c.y + 5);
      ctx.moveTo(c.x + 5, c.y - 5);
      ctx.lineTo(c.x - 5, c.y + 5);
      ctx.stroke();
    }
  }

  // Guards.
  for (const g of state.guards) {
    ctx.fillStyle = g.state === 'chase' ? '#ff5a5a' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardCap;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, g.angle - 1.1, g.angle + 1.1);
    ctx.lineTo(g.x, g.y);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
    ctx.stroke();
    // Detection meter / alert mark.
    if (g.detect > 0.05) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(g.x - 14, g.y - 26, 28, 5);
      ctx.fillStyle = g.detect > 0.7 ? '#ff5a5a' : '#ffd166';
      ctx.fillRect(g.x - 13, g.y - 25, 26 * g.detect, 3);
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('!', g.x, g.y - 30);
    }
  }

  // Player.
  const p = state.player;
  const blink = p.invuln > 0 && Math.floor(state.time * 8) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerTrim;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, p.dir - 0.9, p.dir + 0.9);
    ctx.lineTo(p.x, p.y);
    ctx.fill();
    ctx.strokeStyle = '#fff2c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.dir) * 17, p.y + Math.sin(p.dir) * 17);
    ctx.stroke();
    if (p.sneaking) {
      ctx.fillStyle = 'rgba(140,170,255,0.9)';
      ctx.font = '10px sans-serif';
      ctx.fillText('sneaking', p.x, p.y - 20);
    }
  }

  // Crack progress ring over the player while working.
  if (state.crackTarget) {
    const target = state.crackTarget === 'vault'
      ? state.vault.progress
      : state.cameras[Number(state.crackTarget.split(':')[1])].disableProgress;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + target * Math.PI * 2);
    ctx.stroke();
  }
  void W; void H;
}

function drawHud(ctx, state, w) {
  const pad = 12;
  ctx.fillStyle = 'rgba(5,8,15,0.82)';
  ctx.fillRect(0, 0, w, 52);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Alarm meter.
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', pad, 16);
  ctx.fillStyle = '#222a3c';
  roundRect(ctx, pad, 26, 190, 12, 6);
  ctx.fill();
  const frac = state.alarm / ALARM_MAX;
  ctx.fillStyle = frac > 0.66 ? '#ff5a5a' : frac > 0.33 ? '#f2a541' : '#4fc978';
  if (frac > 0) {
    roundRect(ctx, pad, 26, 190 * frac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.hud;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${Math.floor(state.alarm)}%`, pad + 198, 32);
  // Loot.
  const got = state.loot.filter((l) => l.taken).length;
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`💰 ${got}/${state.loot.length}  ${state.vault.open ? '🔓 VAULT OPEN' : '🔒 VAULT'}`, 270, 20);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60);
  ctx.fillText(`⏱ ${mins}:${String(secs).padStart(2, '0')}`, 270, 40);
  // Level + score + lives, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${state.level.def.name}  ·  Score ${state.score}`, w - pad, 20);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`Lives ${'♥'.repeat(state.lives)}${'♡'.repeat(Math.max(0, 3 - state.lives))}`, w - pad, 40);
  ctx.textAlign = 'left';
}

function overlay(ctx, w, h, title, lines, hint) {
  ctx.fillStyle = 'rgba(4,6,12,0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2c94c';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 130);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '18px sans-serif';
  let y = h / 2 - 70;
  for (const line of lines) {
    ctx.fillText(line, w / 2, y);
    y += 30;
  }
  if (hint) {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px sans-serif';
    ctx.fillText(hint, w / 2, y + 26);
  }
  ctx.textAlign = 'left';
}

export function drawScreen(ctx, state, screen, w, h, best) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070a13';
  ctx.fillRect(0, 0, w, h);
  const { level } = state;
  const t = worldTransform(w, h, level);
  const ox = t.ox;
  const oy = t.oy;
  const scale = t.scale;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  drawWorld(ctx, state);
  ctx.restore();
  drawHud(ctx, state, w);

  if (screen === SCREEN_TITLE) {
    overlay(ctx, w, h, 'MIDNIGHT VAULT', [
      'A top-down heist game. Slip past the guards, dodge the cameras,',
      'crack the vault, grab every last bit of loot — and get out clean.',
      '',
      'WASD / Arrows — move      Shift — sneak      E (hold) — crack vault / disable camera',
      'Click — walk there      P — pause      M — mute',
      'Shadows hide you. A full alarm ends the night. Three heists. One crew: you.',
    ], 'Press ENTER or click to start');
  } else if (screen === SCREEN_LEVEL_CLEAR) {
    const b = state.clearBonus || { timeBonus: 0, ghost: 0 };
    overlay(ctx, w, h, 'CLEAN GETAWAY!', [
      `${state.level.def.name} cleared.`,
      `Time bonus +${b.timeBonus}    Ghost bonus +${b.ghost}`,
      `Score: ${state.score}    Best: ${Math.max(best || 0, state.score)}`,
    ], state.won ? 'Press ENTER for the final tally' : 'Press ENTER for the next heist');
  } else if (screen === SCREEN_OVER) {
    overlay(ctx, w, h, 'BUSTED', [
      state.alarm >= ALARM_MAX ? 'The alarm hit 100% — the whole building woke up.' : 'Caught three times — the crew left without you.',
      `Score: ${state.score}    Best: ${best || 0}`,
    ], 'Press ENTER to try this heist again');
  } else if (screen === SCREEN_WIN) {
    overlay(ctx, w, h, 'THE PERFECT CREW', [
      'All three heists cleared. The vaults of the city are yours.',
      `Final score: ${state.score}    Best: ${Math.max(best || 0, state.score)}`,
    ], 'Press ENTER to run it all back');
  }
}
