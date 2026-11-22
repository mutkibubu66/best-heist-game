// Validates every level: grid shape, one player/vault/exit, reachable
// objectives, walkable guard patrol legs, cameras mounted on walls.
// Run: `node scripts/validate-levels.mjs` — exits 1 on any failure.
import { TILE } from '../game/src/config.js';
import { LEVELS, parseLevel } from '../game/src/levels.js';
import { findPath, isWall } from '../game/src/world.js';

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}

function segmentWalkable(level, ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (isWall(level, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

for (const def of LEVELS) {
  const label = def.name;
  const rows = def.grid.length;
  const cols = def.grid[0].length;
  check(def.grid.every((r) => r.length === cols), `${label}: all rows ${cols} wide`);
  const allowed = new Set(['#', '.', 's', 'P', 'X', 'V', 'g', 'd']);
  check(def.grid.every((r) => [...r].every((ch) => allowed.has(ch))), `${label}: only known tiles`);
  const flat = def.grid.join('');
  const count = (ch) => [...flat].filter((c) => c === ch).length;
  check(count('P') === 1, `${label}: exactly one player start`);
  check(count('X') === 1, `${label}: exactly one exit`);
  check(count('V') === 1, `${label}: exactly one vault`);
  check(count('g') + count('d') >= 1, `${label}: at least one loot item`);

  const level = parseLevel(def);
  const from = level.player;
  const targets = [
    ...level.loot.map((l) => [l.kind, l]),
    ['vault', level.vault],
    ['exit', level.exit],
  ];
  for (const [name, t] of targets) {
    const path = findPath(level, from, t);
    check(path.length > 0, `${label}: ${name} reachable from the start`);
  }
  def.guards.forEach((g, gi) => {
    const pts = g.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    pts.forEach((pt, i) => {
      check(!isWall(level, pt.x, pt.y), `${label}: guard ${gi} waypoint ${i} on floor`);
    });
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      check(segmentWalkable(level, a.x, a.y, b.x, b.y),
        `${label}: guard ${gi} patrol leg ${i}->${(i + 1) % pts.length} walkable`);
    }
  });
  def.cameras.forEach((c, ci) => {
    const ch = def.grid[c.ty][c.tx];
    check(ch === '#', `${label}: camera ${ci} mounted on a wall tile (found '${ch}')`);
  });
}

if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('all level checks passed');
