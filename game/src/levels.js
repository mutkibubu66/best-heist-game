// MIDNIGHT VAULT — the three heists.
// Grid legend: '#' wall, '.' floor, 's' shadow (hiding), 'P' player start,
// 'X' exit, 'V' vault, 'g' gold (+100), 'd' diamond (+300).
// Guards patrol between tile waypoints; cameras sit on wall tiles and sweep.
export const LEVELS = [
  {
    name: 'The Gallery',
    seed: 7,
    grid: [
      '########################',
      '#P......s......g.......#',
      '#......................#',
      '#..####....####....##..#',
      '#......................#',
      '#....g.........s....V..#',
      '#......................#',
      '#..####.....####.......#',
      '#......................#',
      '#....s......g......s...#',
      '#......................#',
      '#....................X.#',
      '#......................#',
      '#......................#',
      '########################',
    ],
    guards: [
      { path: [[3, 6], [20, 6]] },
      { path: [[17, 2], [17, 12]] },
    ],
    cameras: [
      { tx: 20, ty: 0, angle: Math.PI / 2, sweep: 0.55, speed: 0.55 },
      { tx: 0, ty: 8, angle: 0, sweep: 0.45, speed: 0.7 },
    ],
  },
  {
    name: 'The Bank Floor',
    seed: 21,
    grid: [
      '########################',
      '#P....s.......g........#',
      '#......................#',
      '#...###...####....##...#',
      '#......................#',
      '#..g......s.....d....V.#',
      '#......................#',
      '#...###...####....##...#',
      '#......................#',
      '#......g......s........#',
      '#......................#',
      '#..s.........g.......X.#',
      '#......................#',
      '#......................#',
      '########################',
    ],
    guards: [
      { path: [[2, 4], [21, 4]] },
      { path: [[21, 10], [2, 10]] },
      { path: [[14, 2], [14, 12]] },
    ],
    cameras: [
      { tx: 12, ty: 0, angle: Math.PI / 2, sweep: 0.55, speed: 0.6 },
      { tx: 23, ty: 6, angle: Math.PI, sweep: 0.5, speed: 0.8 },
    ],
  },
  {
    name: 'The Vault Row',
    seed: 42,
    grid: [
      '##########################',
      '#P.....s........g........#',
      '#........................#',
      '#..####...####....###....#',
      '#........................#',
      '#...g......s......d...V..#',
      '#........................#',
      '#..####...####....##.....#',
      '#........................#',
      '#....s.....g.......s.....#',
      '#........................#',
      '#..###...####....##..d...#',
      '#........................#',
      '#....g.........s.......X.#',
      '#........................#',
      '##########################',
    ],
    guards: [
      { path: [[2, 4], [23, 4]] },
      { path: [[23, 10], [2, 10]] },
      { path: [[15, 2], [15, 13]] },
      { path: [[22, 6], [22, 13]] },
    ],
    cameras: [
      { tx: 8, ty: 0, angle: Math.PI / 2, sweep: 0.55, speed: 0.6 },
      { tx: 25, ty: 8, angle: Math.PI, sweep: 0.5, speed: 0.75 },
      { tx: 13, ty: 15, angle: -Math.PI / 2, sweep: 0.5, speed: 0.65 },
    ],
  },
];

/** Parse a level grid into tiles + object spawn points. */
export function parseLevel(def) {
  const rows = def.grid.length;
  const cols = def.grid[0].length;
  const walls = [];
  const shadows = [];
  let player = null;
  let exit = null;
  let vault = null;
  const loot = [];
  for (let y = 0; y < rows; y += 1) {
    walls.push([]);
    shadows.push([]);
    for (let x = 0; x < cols; x += 1) {
      const ch = def.grid[y][x];
      walls[y].push(ch === '#');
      shadows[y].push(ch === 's');
      const cx = (x + 0.5) * 40;
      const cy = (y + 0.5) * 40;
      if (ch === 'P') player = { x: cx, y: cy };
      if (ch === 'X') exit = { x: cx, y: cy, tx: x, ty: y };
      if (ch === 'V') vault = { x: cx, y: cy, tx: x, ty: y };
      if (ch === 'g') loot.push({ kind: 'gold', x: cx, y: cy, taken: false });
      if (ch === 'd') loot.push({ kind: 'diamond', x: cx, y: cy, taken: false });
    }
  }
  return { def, rows, cols, walls, shadows, player, exit, vault, loot };
}
