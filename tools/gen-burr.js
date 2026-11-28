/* Makes the designs for Burr Knot. Run: node tools/gen-burr.js [seconds] > burr-data.js
   Two families: blocks cut into interlocking pieces (some with hidden gaps inside), and classic six-stick
   burrs with random notches. Every candidate is taken apart by the solver in burr.js, moving one piece at a
   time; only designs that come apart are kept, along with the fewest moves and how many it takes to free
   the first piece. */
'use strict';
var B = require('../burr.js');
function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
var rnd = rng(+process.argv[4] || 8675309);
function pick(a) { return a[Math.floor(rnd() * a.length)]; }

function block(dims, k, voids) { // cut a block into k connected pieces, leaving `voids` cells empty inside
  var cells = [], owner = {};
  for (var x = 0; x < dims[0]; x++) for (var y = 0; y < dims[1]; y++) for (var z = 0; z < dims[2]; z++) cells.push([x, y, z]);
  var inner = cells.filter(function (c) { return c[0] > 0 && c[0] < dims[0] - 1 && c[1] > 0 && c[1] < dims[1] - 1 || c[2] > 0 && c[2] < dims[2] - 1 && c[0] > 0 && c[0] < dims[0] - 1 || c[1] > 0 && c[1] < dims[1] - 1 && c[2] > 0 && c[2] < dims[2] - 1; });
  for (var v = 0; v < voids && inner.length; v++) { var c = inner.splice(Math.floor(rnd() * inner.length), 1)[0]; owner[c.join(',')] = -1; }
  var free = cells.filter(function (c) { return owner[c.join(',')] === undefined; }), pieces = [];
  for (var i = 0; i < k; i++) { var s; do { s = pick(free); } while (owner[s.join(',')] !== undefined); owner[s.join(',')] = i; pieces.push([s]); }
  var left = free.length - k, guard = 0;
  while (left > 0 && guard++ < 5000) { var p = Math.floor(rnd() * k), from = pick(pieces[p]), d = pick(B.DIRS), n = [from[0] + d[0], from[1] + d[1], from[2] + d[2]];
    if (n[0] < 0 || n[1] < 0 || n[2] < 0 || n[0] >= dims[0] || n[1] >= dims[1] || n[2] >= dims[2] || owner[n.join(',')] !== undefined) continue;
    if (pieces[p].length > Math.ceil(free.length / k) + 2) continue; owner[n.join(',')] = p; pieces[p].push(n); left--; }
  if (left > 0 || pieces.some(function (p) { return p.length < 3; })) return null;
  return pieces;
}
function sticks(voidChance) { // six 2x2x6 sticks, two along each axis; every cube that two or three sticks want is given to one of them, or left empty
  var S = [], claim = {};
  function add(fn) { var cs = []; for (var a = 0; a < 6; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++) cs.push(fn(a, b, c)); S.push(cs); }
  add(function (a, b, c) { return [a, 2 + b, 1 + c]; }); add(function (a, b, c) { return [a, 2 + b, 3 + c]; });
  add(function (a, b, c) { return [1 + c, a, 2 + b]; }); add(function (a, b, c) { return [3 + c, a, 2 + b]; });
  add(function (a, b, c) { return [2 + b, 1 + c, a]; }); add(function (a, b, c) { return [2 + b, 3 + c, a]; });
  S.forEach(function (cs, i) { cs.forEach(function (c) { (claim[c.join(',')] = claim[c.join(',')] || []).push(i); }); });
  var pieces = S.map(function () { return []; });
  for (var k in claim) { var who = claim[k], c = k.split(',').map(Number); if (who.length === 1) pieces[who[0]].push(c); else if (rnd() >= voidChance) pieces[pick(who)].push(c); }
  return pieces.every(B.connected) && pieces.every(function (p) { return p.length >= 14; }) ? pieces : null;
}
function looseAt(pieces, pos) { var n = 0; pieces.forEach(function (p, i) { if (!pos[i]) return; var occ = B.occupancy(pieces, pos, i); if (B.DIRS.some(function (d) { return B.reach(pieces, pos, i, d, occ) === B.FAR; })) n++; }); return n; }
/* m: fewest moves. l: moves to free the first piece. loose: pieces that lift straight out at the start.
   choice: how many pieces could be lifted out, added up over every stage of the solution (lower = stricter order). */
function measure(pieces, cap) { var path = B.solve(pieces, null, cap); if (!path) return null; var first = 1; while (first <= path.length && path[first - 1][2] !== 'out') first++;
  var pos = pieces.map(function () { return [0, 0, 0]; }), loose = looseAt(pieces, pos), choice = 0;
  path.forEach(function (mv) { if (mv[2] === 'out') { choice += looseAt(pieces, pos); pos[mv[0]] = null; } else { var d = B.DIRS[mv[1]], o = pos[mv[0]]; pos[mv[0]] = [o[0] + d[0] * mv[2], o[1] + d[1] * mv[2], o[2] + d[2] * mv[2]]; } });
  return { m: path.length, l: first, loose: loose, choice: choice }; }

/* Random cuts fall apart at the first touch, so each design is grown: start from a cut that comes apart, then
   keep making small changes (hand a cube to the piece next to it, or fill a gap) for as long as the knot
   still comes apart and takes more moves to open. */
function climb(pieces, voids, bounds, target, steps, cap, minSize, maxVoids) {
  var cur = measure(pieces, cap); if (!cur) return null; var owner = {};
  pieces.forEach(function (cs, i) { cs.forEach(function (c) { owner[c.join(',')] = i; }); }); voids.forEach(function (c) { owner[c.join(',')] = -1; });
  var keys = Object.keys(owner), score = function (r, v) { return r.l * 100 + r.m - r.loose * 25 - r.choice * 6 - v * 0.5; }, nv = voids.length;
  for (var s = 0; s < steps && (cur.l < target || cur.choice > pieces.length - 1); s++) {
    var k = pick(keys), c = k.split(',').map(Number), a = owner[k], d = pick(B.DIRS), nk = (c[0] + d[0]) + ',' + (c[1] + d[1]) + ',' + (c[2] + d[2]), b = owner[nk];
    if (b === undefined || b === a) continue; if (b === -1 && (a === -1 || rnd() > 0.35)) continue; if (b >= 0 && bounds && !bounds(k, b)) continue;
    owner[k] = b; var next = pieces.map(function () { return []; }); keys.forEach(function (q) { if (owner[q] >= 0) next[owner[q]].push(q.split(',').map(Number)); });
    var ok = next.every(function (p) { return p.length >= minSize && B.connected(p); }), res = ok ? measure(next, cap) : null, v2 = nv - (a === -1 ? 1 : 0) + (b === -1 ? 1 : 0); if (v2 > maxVoids) res = null;
    if (res && score(res, v2) >= score(cur, nv)) { cur = res; pieces = next; nv = v2; } else owner[k] = a;
  }
  return { pieces: pieces, m: cur.m, l: cur.l, voids: nv, choice: cur.choice };
}
function blockVoids(dims, pieces) { var has = {}, out = []; pieces.forEach(function (cs) { cs.forEach(function (c) { has[c.join(',')] = 1; }); });
  for (var x = 0; x < dims[0]; x++) for (var y = 0; y < dims[1]; y++) for (var z = 0; z < dims[2]; z++) if (!has[x + ',' + y + ',' + z]) out.push([x, y, z]); return out; }
var STICK_CLAIMS = null;
function stickSeed() { // loose sticks with most of the shared cubes left empty: these always come apart, and the climb tightens them
  var S = [], claim = {};
  function add(fn) { var cs = []; for (var a = 0; a < 6; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++) cs.push(fn(a, b, c)); S.push(cs); }
  add(function (a, b, c) { return [a, 2 + b, 1 + c]; }); add(function (a, b, c) { return [a, 2 + b, 3 + c]; });
  add(function (a, b, c) { return [1 + c, a, 2 + b]; }); add(function (a, b, c) { return [3 + c, a, 2 + b]; });
  add(function (a, b, c) { return [2 + b, 1 + c, a]; }); add(function (a, b, c) { return [2 + b, 3 + c, a]; });
  S.forEach(function (cs, i) { cs.forEach(function (c) { (claim[c.join(',')] = claim[c.join(',')] || []).push(i); }); }); STICK_CLAIMS = claim;
  var pieces = S.map(function () { return []; }), voids = [], chance = pick([0.3, 0.45, 0.6]);
  for (var k in claim) { var who = claim[k], c = k.split(',').map(Number); if (who.length === 1) pieces[who[0]].push(c); else if (rnd() >= chance) pieces[pick(who)].push(c); else voids.push(c); }
  return pieces.every(B.connected) ? { pieces: pieces, voids: voids } : null;
}
var found = [], seen = {}, t0 = Date.now(), BUDGET = (+process.argv[2] || 120) * 1000, tried = 0;
function keep(kind, r) { if (!r) return; var packed = B.pack(r.pieces), key = packed.slice().sort().join('|'); if (seen[key]) return; seen[key] = 1; found.push({ p: packed, m: r.m, l: r.l, n: r.pieces.length, kind: kind, c: r.choice - (r.pieces.length - 1) });
  process.stderr.write(kind + ' n' + r.pieces.length + ' L' + r.l + ' m' + r.m + ' c' + (r.choice - r.pieces.length + 1) + ' at ' + Math.round((Date.now() - t0) / 1000) + 's\n'); }
while (Date.now() - t0 < BUDGET) { tried++;
  var phase = (Date.now() - t0) / BUDGET;
  if (phase < (+process.argv[3] || 0.45)) { var dims = pick([[3, 3, 3], [3, 3, 3], [4, 3, 3], [4, 3, 3], [4, 4, 2]]), n = pick([3, 4, 4, 5, 5, 5, 6]), start = block(dims, n, pick([2, 3, 4, 5])); if (!start) continue;
    keep('block', climb(start, blockVoids(dims, start), null, pick([1, 2, 2, 3, 3, 4]), 700, 20000, 3, 6)); }
  else { var seed = stickSeed(); if (!seed) continue; keep('sticks', climb(seed.pieces, seed.voids, function (k, b) { return STICK_CLAIMS[k].indexOf(b) >= 0; }, pick([2, 3, 4, 5]), 140, 12000, 12, 99)); }
}
function take(filter, n, sort) { var list = found.filter(function (f) { return !f.used && filter(f); }); list.sort(sort || function (a, b) { return b.l - a.l || b.m - a.m; }); list = list.slice(0, n); list.forEach(function (f) { f.used = 1; }); return list; }
/* c = 0 means only one piece can be lifted out at every stage: the knot has to be undone in one strict order. */
var strict = function (a, b) { return a.c - b.c || b.l - a.l || b.m - a.m; };
var hard = take(function (f) { return f.kind === 'sticks' && f.l >= 2; }, 16).concat(take(function (f) { return f.kind === 'block' && f.n >= 5 && (f.l >= 2 || f.c <= 1); }, 10, strict));
var medium = take(function (f) { return f.kind === 'block' && f.n === 4 && (f.l >= 2 || f.c <= 1); }, 16, strict).concat(take(function (f) { return f.kind === 'block' && f.n === 5 && f.c <= 3; }, 6, strict)).concat(take(function (f) { return f.kind === 'sticks' && f.l === 1; }, 4, strict));
var easy = take(function (f) { return f.kind === 'block' && f.n === 3 && f.m <= 5; }, 12, strict).concat(take(function (f) { return f.kind === 'block' && f.n === 4 && f.l === 1 && f.m <= 5; }, 10, function (a, b) { return b.c - a.c; }));
function tidy(list) { list.sort(function (a, b) { return a.n * 2 + a.l * 3 + a.m - (b.n * 2 + b.l * 3 + b.m); }); return list.map(function (f) { return { p: f.p, m: f.m, l: f.l }; }); }
var hist = {}; found.forEach(function (f) { var k = f.kind + ' n' + f.n + ' L' + f.l; hist[k] = (hist[k] || 0) + 1; });
process.stderr.write('tried ' + tried + ', kept ' + found.length + '\n' + Object.keys(hist).sort().map(function (k) { return k + ': ' + hist[k]; }).join('  ') + '\nE ' + easy.length + ' M ' + medium.length + ' H ' + hard.length + '\n');
console.log('/* Burr Knot designs, made by tools/gen-burr.js. p: one string per piece, three digits (x y z) per cube. m: fewest moves to take it all apart. l: moves needed to free the first piece. */');
console.log('window.BURR_DATA = ' + JSON.stringify({ E: tidy(easy), M: tidy(medium), H: tidy(hard) }).replace(/\},\{/g, '},\n{') + ';');
