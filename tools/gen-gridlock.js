/* Makes the boards for Gridlock. Run: node tools/gen-gridlock.js > gridlock-data.js
   Each board is found by scattering blocks on a 6x6 tray, exploring every position that can be reached from
   there, and keeping the one furthest from freeing the key block. "Par" is the fewest slides that free it. */
'use strict';
function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
var N = 6, ROW = 2;
function randomBoard(rnd, count) {
  var blocks = [{ h: true, len: 2, fixed: ROW, pos: Math.floor(rnd() * 3) }], grid = new Array(36).fill(-1);
  function cells(b, pos) { var out = []; for (var i = 0; i < b.len; i++) out.push(b.h ? b.fixed * N + pos + i : (pos + i) * N + b.fixed); return out; }
  cells(blocks[0], blocks[0].pos).forEach(function (c) { grid[c] = 0; });
  for (var t = 0; t < 400 && blocks.length < count; t++) {
    var b = { h: rnd() < 0.5, len: rnd() < 0.72 ? 2 : 3, fixed: Math.floor(rnd() * N) }; b.pos = Math.floor(rnd() * (N - b.len + 1));
    if (b.h && b.fixed === ROW) continue;
    var cs = cells(b, b.pos); if (cs.some(function (c) { return grid[c] >= 0; })) continue;
    cs.forEach(function (c) { grid[c] = blocks.length; }); blocks.push(b);
  }
  return blocks.length === count ? blocks : null;
}
function explore(blocks) { // every reachable position, and how many slides each is from a solved one
  var n = blocks.length, start = blocks.map(function (b) { return b.pos; });
  function key(p) { var k = 0; for (var i = 0; i < n; i++) k = k * 5 + p[i]; return k; }
  var seen = new Set(), list = [start]; seen.add(key(start));
  var grid = new Uint8Array(36);
  function moves(p) { var out = []; grid.fill(0);
    for (var i = 0; i < n; i++) { var b = blocks[i]; for (var k = 0; k < b.len; k++) grid[b.h ? b.fixed * N + p[i] + k : (p[i] + k) * N + b.fixed] = 1; }
    for (var j = 0; j < n; j++) { var c = blocks[j];
      for (var d = p[j] - 1; d >= 0 && !grid[c.h ? c.fixed * N + d : d * N + c.fixed]; d--) { var q = p.slice(); q[j] = d; out.push(q); }
      for (var e = p[j] + 1; e + c.len <= N && !grid[c.h ? c.fixed * N + e + c.len - 1 : (e + c.len - 1) * N + c.fixed]; e++) { var r = p.slice(); r[j] = e; out.push(r); } }
    return out; }
  for (var i = 0; i < list.length; i++) { if (list.length > 25000) return null; var ms = moves(list[i]); for (var m = 0; m < ms.length; m++) { var k = key(ms[m]); if (!seen.has(k)) { seen.add(k); list.push(ms[m]); } } }
  var dist = new Map(), queue = []; list.forEach(function (p) { if (p[0] === N - 2) { dist.set(key(p), 0); queue.push(p); } });
  if (!queue.length) return null;
  for (var h = 0; h < queue.length; h++) { var d0 = dist.get(key(queue[h])), ms2 = moves(queue[h]); for (var m2 = 0; m2 < ms2.length; m2++) { var k2 = key(ms2[m2]); if (!dist.has(k2)) { dist.set(k2, d0 + 1); queue.push(ms2[m2]); } } }
  var far = queue[queue.length - 1]; return { pos: far, par: dist.get(key(far)), states: list.length };
}
function encode(blocks, pos) { var g = new Array(36).fill('.'); blocks.forEach(function (b, i) { for (var k = 0; k < b.len; k++) g[b.h ? b.fixed * N + pos[i] + k : (pos[i] + k) * N + b.fixed] = String.fromCharCode(65 + i); }); return g.join(''); }
var BANDS = { E: [6, 9], M: [12, 17], H: [19, 60] }, WANT = 40, out = { E: [], M: [], H: [] }, seen = {}, rnd = rng(20261127), t0 = Date.now(), BUDGET = (+process.argv[2] || 150) * 1000;
for (var t = 0; Date.now() - t0 < BUDGET && (out.E.length < WANT || out.M.length < WANT || out.H.length < WANT); t++) {
  var easyDone = out.E.length >= WANT && out.M.length >= WANT, count = (easyDone ? 10 : 7) + Math.floor(rnd() * (easyDone ? 4 : 7)), blocks = randomBoard(rnd, count); if (!blocks) continue;
  var res = explore(blocks); if (!res) continue;
  for (var tier in BANDS) if (res.par >= BANDS[tier][0] && res.par <= BANDS[tier][1] && out[tier].length < WANT) { var s = encode(blocks, res.pos); if (!seen[s]) { seen[s] = 1; out[tier].push([s, res.par]); if (tier === 'H') process.stderr.write('H ' + out.H.length + ' par ' + res.par + ' after ' + Math.round((Date.now() - t0) / 1000) + 's, ' + t + ' boards\n'); } }
}
['E', 'M', 'H'].forEach(function (k) { out[k].sort(function (a, b) { return a[1] - b[1]; }); });
process.stderr.write(['E', 'M', 'H'].map(function (k) { return k + ': ' + out[k].length + ' boards, par ' + out[k][0][1] + ' to ' + out[k][out[k].length - 1][1]; }).join('\n') + '\n');
console.log('/* Gridlock boards, made by tools/gen-gridlock.js. Each is [36 cells read row by row, par]. A is the key block; it leaves by the right end of the third row. */');
console.log('window.GRIDLOCK_DATA = ' + JSON.stringify(out).replace(/\],\[/g, '],\n[') + ';');
