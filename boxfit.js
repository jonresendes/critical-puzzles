/* Box Fit. A set of pieces built from cubes, and an outline of a box they exactly fill. Pick pieces up, turn
   them, and set them down: a piece falls until it lands on the table or on another piece, and a piece with
   something resting on it cannot be pulled out. Every puzzle is cut fresh from a full box, so a solution
   always exists, and it can always be built from the bottom up.

   The first half of this file is the rule book and the puzzle maker (no drawing), the second half draws it. */
(function () {
'use strict';
var TIERS = {
  E: { name: 'Easy', dims: [3, 2, 3], pieces: 4, blurb: 'A box two layers high, cut into 4 pieces.' },
  M: { name: 'Medium', dims: [3, 3, 3], pieces: 6, blurb: 'A 3 by 3 by 3 cube cut into 6 pieces.' },
  H: { name: 'Hard', dims: [3, 3, 3], pieces: 7, soma: true, blurb: 'The classic seven pieces that build a cube. Every other puzzle is a taller 3 by 4 by 3 block cut into 8.' }
};
var DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/* Quarter turns about each axis, and the shape slid back so its lowest corner is at 0,0,0. */
var TURN = { x: function (c) { return [c[0], -c[2], c[1]]; }, y: function (c) { return [c[2], c[1], -c[0]]; }, z: function (c) { return [-c[1], c[0], c[2]]; } };
function settle(cells) { var m = [Infinity, Infinity, Infinity]; cells.forEach(function (c) { for (var a = 0; a < 3; a++) m[a] = Math.min(m[a], c[a]); });
  return cells.map(function (c) { return [c[0] - m[0], c[1] - m[1], c[2] - m[2]]; }).sort(function (p, q) { return p[0] - q[0] || p[1] - q[1] || p[2] - q[2]; }); }
function turn(cells, axis, times) { var out = cells; for (var i = 0; i < ((times % 4) + 4) % 4; i++) out = out.map(TURN[axis]); return settle(out); }
function allTurns(cells) { var seen = {}, out = [], cur = settle(cells);
  for (var f = 0; f < 6; f++) { for (var r = 0; r < 4; r++) { var k = JSON.stringify(cur); if (!seen[k]) { seen[k] = 1; out.push(cur); } cur = turn(cur, 'y', 1); } cur = turn(cur, f % 2 ? 'x' : 'z', 1); }
  return out; }
function size(cells) { var m = [0, 0, 0]; cells.forEach(function (c) { for (var a = 0; a < 3; a++) m[a] = Math.max(m[a], c[a] + 1); }); return m; }

/* Can the finished box be taken apart by lifting pieces straight up, one at a time? Returns that order (so the
   reverse order builds it from the bottom up), or null. */
function liftOrder(pieces) {
  var left = pieces.map(function (p, i) { return i; }), order = [];
  while (left.length) { var found = -1;
    for (var a = 0; a < left.length && found < 0; a++) { var i = left[a], clear = true;
      for (var b = 0; b < left.length && clear; b++) { var j = left[b]; if (i === j) continue;
        pieces[i].forEach(function (c) { pieces[j].forEach(function (d) { if (d[0] === c[0] && d[2] === c[2] && d[1] > c[1]) clear = false; }); }); }
      if (clear) found = a; }
    if (found < 0) return null; order.push(left.splice(found, 1)[0]); }
  return order;
}
function cut(dims, k, rnd) { // cut a full box into k connected pieces of 3 to 6 cubes
  var owner = {}, pieces = [], total = dims[0] * dims[1] * dims[2], cap = Math.ceil(total / k) + 1;
  for (var i = 0; i < k; i++) { var s; do { s = [Math.floor(rnd() * dims[0]), Math.floor(rnd() * dims[1]), Math.floor(rnd() * dims[2])]; } while (owner[s.join(',')] !== undefined); owner[s.join(',')] = i; pieces.push([s]); }
  var left = total - k, guard = 0;
  while (left > 0 && guard++ < 6000) { var p = Math.floor(rnd() * k); if (pieces[p].length >= cap) continue; var from = pieces[p][Math.floor(rnd() * pieces[p].length)], d = DIRS[Math.floor(rnd() * 6)], n = [from[0] + d[0], from[1] + d[1], from[2] + d[2]];
    if (n[0] < 0 || n[1] < 0 || n[2] < 0 || n[0] >= dims[0] || n[1] >= dims[1] || n[2] >= dims[2] || owner[n.join(',')] !== undefined) continue; owner[n.join(',')] = p; pieces[p].push(n); left--; }
  if (left > 0 || pieces.some(function (q) { return q.length < 3; })) return null;
  // no straight bars and no flat slabs of a whole layer: they make the puzzle trivial
  if (pieces.some(function (q) { var sz = size(settle(q)); return sz[0] * sz[1] * sz[2] === q.length; })) return null;
  return pieces;
}
/* The classic seven: one of three cubes and six of four. */
var SOMA = [[[0, 0, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 0, 1]], [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [2, 0, 1]],
  [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 1, 0]], [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]]];
function soma(rnd) { // one random way of packing the seven pieces into the cube
  var grid = {}, placed = [], turns = SOMA.map(function (p) { return shuffle(allTurns(p), rnd); }), order = shuffle([0, 1, 2, 3, 4, 5, 6], rnd), used = {}, budget = 200000;
  function firstEmpty() { for (var y = 0; y < 3; y++) for (var z = 0; z < 3; z++) for (var x = 0; x < 3; x++) if (!grid[x + ',' + y + ',' + z]) return [x, y, z]; return null; }
  function go() { var e = firstEmpty(); if (!e) return true; if (budget-- < 0) return false;
    for (var a = 0; a < 7; a++) { var p = order[a]; if (used[p]) continue;
      for (var t = 0; t < turns[p].length; t++) { var shape = turns[p][t];
        for (var anchor = 0; anchor < shape.length; anchor++) { var off = [e[0] - shape[anchor][0], e[1] - shape[anchor][1], e[2] - shape[anchor][2]], cells = shape.map(function (c) { return [c[0] + off[0], c[1] + off[1], c[2] + off[2]]; });
          if (cells.some(function (c) { return c[0] < 0 || c[1] < 0 || c[2] < 0 || c[0] > 2 || c[1] > 2 || c[2] > 2 || grid[c.join(',')]; })) continue;
          cells.forEach(function (c) { grid[c.join(',')] = 1; }); used[p] = 1; placed[p] = cells; if (go()) return true; cells.forEach(function (c) { delete grid[c.join(',')]; }); used[p] = 0; } } }
    return false; }
  return go() ? placed : null;
}
function generate(tierKey, seed, alt) {
  var T = TIERS[tierKey];
  for (var i = 0; i < 2000; i++) { var rnd = rng(seed + i * 9973), dims = T.dims, k = T.pieces, pieces;
    if (T.soma && !alt) pieces = soma(rnd); else { if (T.soma) { dims = [3, 4, 3]; k = 8; } pieces = cut(dims, k, rnd); }
    if (!pieces) continue; var order = liftOrder(pieces); if (!order) continue;
    return { dims: dims, pieces: pieces, build: order.slice().reverse(), seed: seed, tier: tierKey, soma: !!(T.soma && !alt) }; }
  return null;
}
var Logic = { TIERS: TIERS, generate: generate, liftOrder: liftOrder, turn: turn, allTurns: allTurns, settle: settle, size: size, soma: soma, cut: cut };
if (typeof module !== 'undefined') { module.exports = Logic; return; }
window.__boxfit = Logic;

/* ---------- Drawing ---------- */
var T3 = window.THREE, kit, level, P, U = 1, sel = -1, moves, hints, busy = 0, ghost, guide, seed = 0, count = 0, group;
function W(g, y) { return new T3.Vector3((g[0] - level.dims[0] / 2) * U, (y === undefined ? g[1] : y) * U, (g[2] - level.dims[2] / 2) * U); }
function occupied(skip) { var occ = {}; P.forEach(function (p, i) { if (i === skip) return; p.cells.forEach(function (c) { occ[(c[0] + p.pos[0]) + ',' + (c[1] + p.pos[1]) + ',' + (c[2] + p.pos[2])] = i + 1; }); }); return occ; }
function tops(skip) { var top = {}; P.forEach(function (p, i) { if (i === skip) return; p.cells.forEach(function (c) { var k = (c[0] + p.pos[0]) + ',' + (c[2] + p.pos[2]); top[k] = Math.max(top[k] || 0, c[1] + p.pos[1] + 1); }); }); return top; }
function landing(cells, px, pz, top) { var y = 0; cells.forEach(function (c) { y = Math.max(y, (top[(c[0] + px) + ',' + (c[2] + pz)] || 0) - c[1]); }); return y; }
function pinned(i) { var p = P[i]; for (var j = 0; j < P.length; j++) { if (j === i) continue; var q = P[j]; for (var a = 0; a < p.cells.length; a++) for (var b = 0; b < q.cells.length; b++) {
  if (q.cells[b][0] + q.pos[0] === p.cells[a][0] + p.pos[0] && q.cells[b][2] + q.pos[2] === p.cells[a][2] + p.pos[2] && q.cells[b][1] + q.pos[1] > p.cells[a][1] + p.pos[1]) return true; } } return false; }
function inBox(g) { return g[0] >= 0 && g[1] >= 0 && g[2] >= 0 && g[0] < level.dims[0] && g[1] < level.dims[1] && g[2] < level.dims[2]; }
function filled() { var n = 0; P.forEach(function (p) { p.cells.forEach(function (c) { if (inBox([c[0] + p.pos[0], c[1] + p.pos[1], c[2] + p.pos[2]])) n++; }); }); return n; }
function total() { return level.dims[0] * level.dims[1] * level.dims[2]; }
function remesh(p) { var old = p.mesh.geometry; p.mesh.geometry = kit.voxelGeo(p.cells, 0.03, U); old.dispose(); p.mesh.quaternion.set(0, 0, 0, 1); if (p.mesh.children[0]) { p.mesh.children[0].geometry.dispose(); p.mesh.children[0].geometry = new T3.EdgesGeometry(p.mesh.geometry, 30); } }
function sit(p) { p.mesh.position.copy(W(p.pos)); }
function glow() { P.forEach(function (p, i) { p.mesh.material.emissive.setHex(i === sel ? 0xf0b03a : 0x000000); p.mesh.material.emissiveIntensity = i === sel ? 0.22 : 0; }); }
function stats() { kit.stat('fill', filled() + '/' + total()); kit.stat('moves', moves); }
function reachOK(px, pz, cells) { var lim = kit.R / U - 1.2; return cells.every(function (c) { var x = c[0] + px - level.dims[0] / 2 + 0.5, z = c[2] + pz - level.dims[2] / 2 + 0.5; return Math.hypot(x, z) < lim; }); }
function showGhost(p, px, pz, y) { if (!ghost) return; ghost.visible = true; ghost.geometry = p.mesh.geometry; ghost.position.copy(W([px, y, pz]));
  var allIn = p.cells.every(function (c) { return inBox([c[0] + px, c[1] + y, c[2] + pz]); }); ghost.material.color.setHex(allIn ? 0x5fd0a0 : 0xffffff); ghost.material.opacity = allIn ? 0.38 : 0.2; }
function drop(i, px, pz, from, counted) { // let go: the piece falls until it lands
  var p = P[i], y = landing(p.cells, px, pz, tops(i)); p.pos = [px, y, pz]; var a = from || p.mesh.position.clone(), b = W(p.pos); busy++;
  kit.tween(0.16 + Math.min(0.2, Math.abs(a.y - b.y) * 0.03), function (t, k) { p.mesh.position.lerpVectors(a, b, k * k); }, function () { busy--; sit(p); kit.buzz(8); kit.hit(kit.setup.mat, 0.4 + Math.min(0.5, Math.abs(a.y - b.y) * 0.12)); if (counted) { moves++; } stats(); check(); });
  if (ghost) ghost.visible = false;
}
function check() {
  if (filled() !== total() || kit.isOver()) return; var secs = Math.round(kit.elapsed()), stars = hints === 0 ? 3 : hints === 1 ? 2 : 1; sel = -1; glow(); count++;
  kit.finish({ won: true, title: 'The box is full', stars: stars, text: hints ? 'Every piece is in. Three stars for filling the box with no hints.' : 'Every piece is in, with no hints.',
    stats: [['Pieces', P.length], ['Times a piece was set down', moves], ['Hints', hints], ['Time', kit.clock(secs)]], best: { value: secs, lower: true, label: 'Best time', show: kit.clock } });
}
function build(demo) {
  var mat = kit.setup.mat, pal = kit.PALETTE[mat], d = level.dims, rnd = rng(level.seed + 5); U = d[1] > 3 ? 0.95 : 1.05;
  group = new T3.Group(); kit.root.add(group);
  var plate = new T3.Mesh(new T3.PlaneGeometry(d[0] * U, d[2] * U).rotateX(-Math.PI / 2), new T3.MeshStandardMaterial({ transparent: true, roughness: 0.9, map: kit.canvasTex(256, function (x, s) {
    x.fillStyle = 'rgba(16,14,22,0.82)'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(95,208,160,0.75)'; x.lineWidth = 6; x.strokeRect(3, 3, s - 6, s - 6); x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 2;
    for (var i = 1; i < d[0]; i++) { x.beginPath(); x.moveTo(i * s / d[0], 0); x.lineTo(i * s / d[0], s); x.stroke(); } for (var j = 1; j < d[2]; j++) { x.beginPath(); x.moveTo(0, j * s / d[2]); x.lineTo(s, j * s / d[2]); x.stroke(); } }) }));
  plate.position.y = 0.006; plate.receiveShadow = true; plate.material.map.wrapS = plate.material.map.wrapT = T3.ClampToEdgeWrapping; group.add(plate);
  guide = new T3.LineSegments(new T3.EdgesGeometry(new T3.BoxGeometry(d[0] * U, d[1] * U, d[2] * U)), new T3.LineBasicMaterial({ color: 0x5fd0a0, transparent: true, opacity: 0.55 })); guide.position.y = d[1] * U / 2; group.add(guide);
  ghost = new T3.Mesh(new T3.BufferGeometry(), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false })); ghost.visible = false; group.add(ghost);
  // the pieces start scattered round the outline, each turned some other way up
  var n = level.pieces.length, ring = Math.max(d[0], d[2]) / 2 + 2.6, top = {};
  P = level.pieces.map(function (cells, i) {
    var home = settle(cells), hp = [Infinity, Infinity, Infinity]; cells.forEach(function (c) { for (var a = 0; a < 3; a++) hp[a] = Math.min(hp[a], c[a]); });
    var p = { cells: home, home: home, homePos: hp, pos: hp.slice(), mesh: null };
    p.mesh = kit.mesh(kit.voxelGeo(home, 0.03, U), kit.mat(mat, pal[i % pal.length])); p.mesh.userData.piece = i; p.mesh.add(new T3.LineSegments(new T3.EdgesGeometry(p.mesh.geometry, 30), new T3.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }))); group.add(p.mesh);
    return p; });
  if (!demo) { var slots = shuffle(P.map(function (p, i) { return i; }), rnd); P.forEach(function (p, i) {
      var spins = allTurns(p.home); p.cells = spins[Math.floor(rnd() * spins.length)]; var sz = size(p.cells); if (sz[1] > 2) p.cells = turn(p.cells, 'x', 1); sz = size(p.cells); remesh(p);
      for (var tries = 0; tries < 40; tries++) { var a = (slots[i] + tries * 0.37) / n * 6.2832 + 0.4, r = ring + (tries > 8 ? (tries % 3) * 1.2 : 0), px = Math.round(d[0] / 2 + Math.cos(a) * r - sz[0] / 2), pz = Math.round(d[2] / 2 + Math.sin(a) * r - sz[2] / 2);
        var clash = p.cells.some(function (c) { for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) if (top[(c[0] + px + dx) + ',' + (c[2] + pz + dz)]) return true; return false; });
        if (clash && tries < 39) continue; p.pos = [px, 0, pz]; p.cells.forEach(function (c) { top[(c[0] + px) + ',' + (c[2] + pz)] = 1; }); break; }
      sit(p); }); }
  else P.forEach(function (p, i) { p.pos = [p.homePos[0], p.homePos[1] + (level.build.indexOf(i) > level.pieces.length - 3 ? 1.6 : 0), p.homePos[2]]; sit(p); }); // setup preview: nearly built, last pieces hovering
}
function spin(axis, dir) {
  if (busy || sel < 0) { if (sel < 0) kit.say('Tap a piece first, then turn it.'); return; } var i = sel, p = P[i];
  if (pinned(i)) { kit.say('Something is resting on that piece. Lift that off first.'); kit.buzz(20); kit.fx('deny'); return; }
  kit.fx('whoosh');
  var sz = size(p.cells), next = turn(p.cells, axis, dir), nz = size(next), cx = p.pos[0] + sz[0] / 2, cz = p.pos[2] + sz[2] / 2, px = Math.round(cx - nz[0] / 2), pz = Math.round(cz - nz[2] / 2);
  var mesh = p.mesh, c0 = new T3.Vector3(sz[0] / 2 * U, sz[1] / 2 * U, sz[2] / 2 * U), centre = mesh.position.clone().add(c0), ax = new T3.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), lift = Math.max(sz[0], sz[1], sz[2]) * U * 0.5; busy++;
  kit.tween(0.22, function (t) { var q = new T3.Quaternion().setFromAxisAngle(ax, t * dir * Math.PI / 2); mesh.quaternion.copy(q); var c = centre.clone(); c.y += Math.sin(t * Math.PI) * lift * 0.4 + t * lift * 0.5; mesh.position.copy(c).sub(c0.clone().applyQuaternion(q)); }, function () {
    busy--; p.cells = next; remesh(p); var from = centre.clone(); from.y += lift * 0.5; from.sub(new T3.Vector3(nz[0] / 2 * U, nz[1] / 2 * U, nz[2] / 2 * U)); mesh.position.copy(from); drop(i, px, pz, from, true); });
}
function nearestAxis(v) { return Math.abs(v.x) >= Math.abs(v.z) ? ['x', Math.sign(v.x) || 1] : ['z', Math.sign(v.z) || 1]; }
function hint() {
  if (busy) return; var occ = occupied(-1);
  for (var n = 0; n < level.build.length; n++) { var i = level.build[n], p = P[i], home = JSON.stringify(p.cells) === JSON.stringify(p.home) && p.pos.join() === p.homePos.join(); if (home) continue;
    var blocked = p.home.some(function (c) { var o = occ[(c[0] + p.homePos[0]) + ',' + (c[1] + p.homePos[1]) + ',' + (c[2] + p.homePos[2])]; return o && o !== i + 1; });
    if (blocked) { kit.say('Hint: the next piece belongs where another piece is sitting. Clear the outlined space first.'); sel = i; glow(); showGhost({ cells: p.home, mesh: { geometry: kit.voxelGeo(p.home, 0.03, U) } }, p.homePos[0], p.homePos[2], p.homePos[1]); setTimeout(function () { if (ghost) ghost.visible = false; }, 2600); hints++; return; }
    if (pinned(i)) { kit.say('Hint: the lit piece goes in next, but something is resting on it.'); sel = i; glow(); hints++; return; }
    hints++; sel = i; glow(); p.cells = p.home; remesh(p); var from = p.mesh.position.clone(), over = W([p.homePos[0], level.dims[1] + 1.5, p.homePos[2]]); busy++;
    kit.tween(0.5, function (t) { p.mesh.position.lerpVectors(from, over, t); p.mesh.position.y += Math.sin(t * Math.PI) * 0.8; }, function () { busy--; drop(i, p.homePos[0], p.homePos[2], over, false); });
    kit.fx('ding'); kit.say('Hint: that piece goes there.'); return; }
}

window.CPKit.start({
  id: 'boxfit', name: ['Box', 'Fit'], startLabel: 'Tip out the pieces', env: 'ocean', mat: 'plastic', matLabel: 'Pieces', mats: window.CPKit.MATS,
  lede: 'A handful of odd pieces and the outline of the box they exactly fill. Turn them, stack them and leave no gaps.',
  aria: 'Pieces made of cubes around the outline of a box. Drag a piece to move it, tap it and use the turn buttons to rotate it. Drag beside the pieces to look around.',
  tiers: TIERS, stats: [['fill', 'Filled'], ['moves', 'Moves']], buttons: [['hint', 'Hint'], ['restart', 'Start over']],
  view: { yaw: 0.6, pitch: 0.72, dist: 15.5, y: 1.1, tableR: 7.6, minPitch: 0.15 },
  bestText: function (b) { return 'Best time: ' + kit.clock(b); },
  init: function (k) { kit = k; },
  newGame: function (k, o) {
    if (!o.retry || o.demo || !seed) seed = Math.floor(Math.random() * 1e9);
    level = generate(o.demo ? 'M' : kit.setup.tier, o.demo ? 4242 : seed, !o.demo && count % 2 === 1); sel = -1; moves = 0; hints = 0; busy = 0; build(o.demo);
    if (!o.demo) { stats(); kit.pad('<button data-act="ry" type="button">&#8635; Turn</button><button data-act="tip" type="button">&#10549; Tip over</button><button data-act="roll" type="button">&#8634; Roll</button>');
      kit.say(level.soma ? 'The classic seven pieces. Drag a piece into the outline; tap it and use the buttons to turn it.' : 'Drag a piece into the outline. Tap a piece and use the buttons to turn it.'); }
  },
  button: function (id) {
    if (id === 'restart') { kit.replay(); return; }
    if (id === 'hint') return hint();
    if (id === 'ry') return spin('y', 1);
    var yaw = kit.cam.yaw, right = new T3.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), fwd = new T3.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), a = nearestAxis(id === 'tip' ? right : fwd); // tip away from you; roll to the right
    spin(a[0], id === 'tip' ? -a[1] : a[1]);
  },
  pick: function (ray) {
    if (busy) return {}; var h = kit.hits(P.map(function (p) { return p.mesh; })); if (!h.length) return null;
    var i = h[0].object.userData.piece, p = P[i]; sel = i; glow();
    if (pinned(i)) { var x0 = p.mesh.position.x; kit.tween(0.3, function (t) { p.mesh.position.x = x0 + Math.sin(t * 18) * 0.05 * (1 - t); }); kit.say('Something is resting on that piece. Lift that off first.'); kit.buzz(20); kit.fx('deny'); return {}; }
    var top = tops(i), tallest = 0; for (var k in top) tallest = Math.max(tallest, top[k]); var sz = size(p.cells), hover = Math.max(level.dims[1], tallest) + 0.8, up = new T3.Vector3(0, 1, 0), plane = new T3.Vector3(0, (hover + sz[1] / 2) * U, 0);
    var start = kit.hitPlane(ray, up, plane); if (!start) return {}; var base = p.mesh.position.clone(), gx = start.x - base.x, gz = start.z - base.z, moved = false, px = p.pos[0], pz = p.pos[2], y0 = base.y;
    kit.say('');
    return {
      move: function (r2) { var q = kit.hitPlane(r2, up, plane); if (!q) return; if (!moved) { moved = true; kit.buzz(5); kit.hit(kit.setup.mat, 0.12, 1.4); }
        var x = q.x - gx, z = q.z - gz, nx = Math.round(x / U + level.dims[0] / 2), nz = Math.round(z / U + level.dims[2] / 2);
        p.mesh.position.set(x, Math.max(p.mesh.position.y, Math.min(hover * U, p.mesh.position.y + 0.5)), z);
        if (reachOK(nx, nz, p.cells)) { if (nx !== px || nz !== pz) kit.buzz(3); px = nx; pz = nz; } showGhost(p, px, pz, landing(p.cells, px, pz, top)); },
      end: function (tap) { if (!moved || tap) { p.mesh.position.copy(base); if (ghost) ghost.visible = false; kit.say('Use the buttons to turn this piece, or drag it.'); return; }
        var from = p.mesh.position.clone(), snap = W([px, 0, pz]); from.x = snap.x; from.z = snap.z; drop(i, px, pz, from, true); }
    };
  },
  key: function (k) { if (k === 'q') { this.button('ry'); return true; } if (k === 'e') { this.button('tip'); return true; } if (k === 'r') { this.button('roll'); return true; } return false; },
  frame: function (dt) { if (guide) guide.material.opacity = 0.42 + Math.sin(performance.now() / 600) * 0.12; },
  context: function () { return { seed: seed, tier: level && level.tier, moves: moves, hints: hints, pieces: P && P.map(function (p) { return p.pos; }) }; }
});
})();
