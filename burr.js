/* Burr Knot. Interlocking pieces built from cubes. Slide one piece at a time along a straight line until the
   whole knot has come apart. Designs come from burr-data.js; every one has been taken apart by the solver
   below using single-piece slides only, so the fewest number of moves is known.

   The first half of this file is the rule book and the solver (no drawing), the second half draws it. */
(function () {
'use strict';
var DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], FAR = 16;

/* A position is a list with one entry per piece: its shift [x, y, z] from the assembled knot, or null once it is out. */
function occupancy(pieces, pos, skip) { var occ = {}; for (var i = 0; i < pieces.length; i++) { if (i === skip || !pos[i]) continue; var o = pos[i], cs = pieces[i];
  for (var k = 0; k < cs.length; k++) occ[(cs[k][0] + o[0]) + ',' + (cs[k][1] + o[1]) + ',' + (cs[k][2] + o[2])] = 1; } return occ; }
/* How many whole steps piece i can slide in direction d before it meets another piece. FAR means nothing is in the way: it comes out. */
function reach(pieces, pos, i, d, occ) {
  occ = occ || occupancy(pieces, pos, i); var o = pos[i], cs = pieces[i];
  for (var s = 1; s <= FAR; s++) for (var k = 0; k < cs.length; k++) if (occ[(cs[k][0] + o[0] + d[0] * s) + ',' + (cs[k][1] + o[1] + d[1] * s) + ',' + (cs[k][2] + o[2] + d[2] * s)]) return s - 1;
  return FAR;
}
function left(pos) { var n = 0; for (var i = 0; i < pos.length; i++) if (pos[i]) n++; return n; }
function keyOf(pos) { var b = null, out = ''; for (var i = 0; i < pos.length; i++) { var o = pos[i]; if (!o) { out += 'x;'; continue; } if (!b) b = o; out += (o[0] - b[0]) + ',' + (o[1] - b[1]) + ',' + (o[2] - b[2]) + ';'; } return out; }
/* Fewest moves to take the knot apart from `pos`. A move is one piece slid any distance one way, or lifted clear.
   Returns the list of moves [piece, direction index, steps or 'out'], or null if the search runs out. */
function solve(pieces, pos, limit) {
  pos = pos || pieces.map(function () { return [0, 0, 0]; }); var seen = {}, list = [pos], from = [-1], mv = [null], cap = limit || 150000; seen[keyOf(pos)] = 1;
  for (var h = 0; h < list.length; h++) { var p = list[h];
    if (left(p) <= 1) { var path = []; for (var j = h; from[j] >= 0; j = from[j]) path.unshift(mv[j]); return path; }
    if (list.length > cap) return null;
    for (var i = 0; i < pieces.length; i++) { if (!p[i]) continue; var occ = occupancy(pieces, p, i);
      for (var d = 0; d < 6; d++) { var r = reach(pieces, p, i, DIRS[d], occ); if (!r) continue;
        if (r === FAR) { var q = p.slice(); q[i] = null; var k = keyOf(q); if (!seen[k]) { seen[k] = 1; list.push(q); from.push(h); mv.push([i, d, 'out']); } continue; }
        for (var s = 1; s <= r; s++) { var n = p.slice(); n[i] = [p[i][0] + DIRS[d][0] * s, p[i][1] + DIRS[d][1] * s, p[i][2] + DIRS[d][2] * s];
          if (Math.abs(n[i][0]) > 7 || Math.abs(n[i][1]) > 7 || Math.abs(n[i][2]) > 7) continue; var kk = keyOf(n); if (!seen[kk]) { seen[kk] = 1; list.push(n); from.push(h); mv.push([i, d, s]); } } } }
  }
  return null;
}
function connected(cells) { if (!cells.length) return false; var has = {}, seen = {}, stack = [cells[0]], n = 0; cells.forEach(function (c) { has[c.join(',')] = c; }); seen[cells[0].join(',')] = 1;
  while (stack.length) { var c = stack.pop(); n++; DIRS.forEach(function (d) { var k = (c[0] + d[0]) + ',' + (c[1] + d[1]) + ',' + (c[2] + d[2]); if (has[k] && !seen[k]) { seen[k] = 1; stack.push(has[k]); } }); }
  return n === cells.length; }
/* Designs are stored as text: one digit string per piece, "xyz" per cube. */
function unpack(d) { return d.p.map(function (s) { var out = []; for (var i = 0; i < s.length; i += 3) out.push([+s.charAt(i), +s.charAt(i + 1), +s.charAt(i + 2)]); return out; }); }
function pack(pieces) { return pieces.map(function (cs) { return cs.map(function (c) { return c.join(''); }).join(''); }); }

var Logic = { DIRS: DIRS, FAR: FAR, reach: reach, solve: solve, connected: connected, unpack: unpack, pack: pack, left: left, occupancy: occupancy };
if (typeof module !== 'undefined') { module.exports = Logic; return; }
window.__burr = Logic;

/* ---------- Drawing ---------- */
var DATA = window.BURR_DATA, deepest = Math.max.apply(null, DATA.H.map(function (d) { return d.l; }));
var TIERS = {
  E: { name: 'Easy', blurb: DATA.E.length + ' blocks cut into three or four pieces. Find the piece that lifts out and the rest follow.' },
  M: { name: 'Medium', blurb: DATA.M.length + ' knots of four to six pieces. At most stages only one piece is free, so the order matters.' },
  H: { name: 'Hard', blurb: DATA.H.length + ' classic six-stick burrs. Nothing comes straight out: up to ' + deepest + ' moves are needed before the first stick is free.' }
};
var T3 = window.THREE, kit, pieces, pos, objs, knot, unit, mid, par, level1, moves, hints, undo, idx = 0, anim = 0, hintPulse = null, outCount = 0, design;
var done = (function () { try { return JSON.parse(localStorage.getItem('cp-burr-done')) || {}; } catch (e) { return {}; } })();
function world(i, o) { return new T3.Vector3((o[0] - mid[0]) * unit, (o[1] - mid[1]) * unit, (o[2] - mid[2]) * unit); }
function build() {
  var mat = kit.setup.mat, pal = kit.PALETTE[mat], lo = [9, 9, 9], hi = [0, 0, 0];
  pieces = unpack(design); pieces.forEach(function (cs) { cs.forEach(function (c) { for (var a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], c[a]); hi[a] = Math.max(hi[a], c[a] + 1); } }); });
  var size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); unit = 4.6 / size; mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  knot = new T3.Group(); knot.position.y = 4.1; kit.root.add(knot);
  var post = kit.mesh(new T3.CylinderGeometry(0.09, 0.09, 4.1 - (hi[1] - lo[1]) * unit / 2, 10), kit.mat('metal', 0x8a8f9c)); post.position.y = (4.1 - (hi[1] - lo[1]) * unit / 2) / 2; kit.root.add(post);
  var foot = kit.mesh(new T3.CylinderGeometry(1.1, 1.3, 0.16, 28), kit.mat('metal', 0x6b7080)); foot.position.y = 0.08; kit.root.add(foot);
  pos = pieces.map(function () { return [0, 0, 0]; });
  objs = pieces.map(function (cs, i) { var m = kit.mesh(kit.voxelGeo(cs, 0.03, unit), kit.mat(mat, pal[i % pal.length])); m.userData.piece = i; m.position.copy(world(i, pos[i])); knot.add(m);
    var e = new T3.LineSegments(new T3.EdgesGeometry(m.geometry, 30), new T3.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })); m.add(e); return m; });
}
function endHint() { if (!hintPulse) return; var m = hintPulse.m.material; m.emissive.setHex(hintPulse.e); m.emissiveIntensity = hintPulse.i; hintPulse.m.position.copy(hintPulse.p); hintPulse = null; }
function stats() { kit.stat('moves', moves); kit.stat('left', left(pos)); kit.button('undo').disabled = !undo.length; }
function restSpot(n) { var a = -0.9 + n * 1.05, r = kit.R - 1.2; return new T3.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }
function layAside(i, n, quick) { // a freed piece is set down on the table
  var m = objs[i], cs = pieces[i], low = Infinity, cx = 0, cz = 0; cs.forEach(function (c) { low = Math.min(low, c[1]); cx += c[0] + 0.5; cz += c[2] + 0.5; }); cx /= cs.length; cz /= cs.length;
  var spot = restSpot(n), to = new T3.Vector3(spot.x - cx * unit, -knot.position.y - low * unit + 0.01, spot.z - cz * unit), from = m.position.clone(); anim++;
  kit.tween(quick ? 0.01 : 0.55, function (t) { m.position.lerpVectors(from, to, t); m.position.y += Math.sin(t * Math.PI) * 1.2; }, function () { anim--; if (!quick) kit.hit(kit.setup.mat, 0.6, 0.8); }); // set down on the table
}
function finishIfDone() {
  if (left(pos) > 1) return false; var last = -1; pos.forEach(function (p, i) { if (p) last = i; }); if (last >= 0) { pos[last] = null; layAside(last, outCount++); }
  var list = done[kit.setup.tier] || (done[kit.setup.tier] = []); if (list.indexOf(idx) < 0) list.push(idx); kit.store('cp-burr-done', done);
  var stars = moves <= Math.ceil(par * 1.25) ? 3 : moves <= par * 2 ? 2 : 1; if (hints && stars > 2) stars = 2; stats();
  kit.finish({ won: true, delay: 1100, title: 'The knot is undone', stars: stars, text: moves <= par ? 'Taken apart in the fewest moves possible.' : 'Every piece is free. The fewest possible is ' + par + ' moves.',
    stats: [['Knot', (idx + 1) + ' of ' + DATA[kit.setup.tier].length], ['Pieces', pieces.length], ['Moves', moves], ['Fewest possible', par], ['Hints', hints], ['Undone in this tier', list.length + ' of ' + DATA[kit.setup.tier].length]] });
  return true;
}
function apply(i, d, steps, record) { // steps: a number, or 'out'
  if (record !== false) undo.push({ i: i, from: pos[i].slice(), out: steps === 'out', n: outCount });
  if (steps === 'out') { pos[i] = null; layAside(i, outCount++); } else { pos[i] = [pos[i][0] + DIRS[d][0] * steps, pos[i][1] + DIRS[d][1] * steps, pos[i][2] + DIRS[d][2] * steps]; var m = objs[i], from = m.position.clone(), to = world(i, pos[i]); kit.tween(0.14, function (t) { m.position.lerpVectors(from, to, t); }); }
  moves++; kit.buzz(6); if (steps === 'out') kit.fx('whoosh'); else kit.hit(kit.setup.mat, 0.45); stats(); kit.say(steps === 'out' ? 'A piece is out.' : ''); finishIfDone();
}

/* For tests: the screen points to drag between to make the next move of the shortest solution. */
window.__burrDbg = function () { var path = solve(pieces, pos, 150000); if (!path || !path.length) return null; var mv = path[0], i = mv[0], d = DIRS[mv[1]], steps = mv[2] === 'out' ? 3 : mv[2], r = kit.canvas.getBoundingClientRect();
  var P = function (v) { var q = v.clone().project(kit.camera); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; };
  // find a visible point on the piece by casting from the camera at each cube centre
  var cs = pieces[i], best = null; for (var k = 0; k < cs.length && !best; k++) { var w = new T3.Vector3((cs[k][0] + 0.5 + pos[i][0] - mid[0]) * unit, (cs[k][1] + 0.5 + pos[i][1] - mid[1]) * unit + knot.position.y, (cs[k][2] + 0.5 + pos[i][2] - mid[2]) * unit);
    kit.raycaster.set(kit.camera.position, w.clone().sub(kit.camera.position).normalize()); var h = kit.raycaster.intersectObjects(objs.filter(function (m, j) { return pos[j]; })); if (h.length && h[0].object === objs[i]) best = h[0].point.clone(); }
  if (!best) return null; var to = best.clone().add(new T3.Vector3(d[0], d[1], d[2]).multiplyScalar(steps * unit)); return { a: P(best), b: P(to), mv: mv }; };

window.CPKit.start({
  id: 'burr', name: ['Burr', 'Knot'], startLabel: 'Pick up the knot', env: 'forest', mat: 'wood', matLabel: 'Pieces', mats: window.CPKit.MATS,
  lede: 'Interlocking pieces that only come apart in the right order. Slide one piece at a time until the whole knot is undone.',
  aria: 'An interlocking burr puzzle. Drag a piece to slide it along a straight line. Drag beside it to turn the view, pinch to zoom.',
  tiers: TIERS, stats: [['moves', 'Moves'], ['left', 'Pieces']], buttons: [['undo', 'Undo'], ['hint', 'Hint'], ['restart', 'Start over']],
  view: { yaw: 0.65, pitch: 0.42, dist: 15, y: 3.6, tableR: 6.4, minPitch: -0.6, maxPitch: 1.45 },
  init: function (k) { kit = k; },
  newGame: function (k, o) {
    var tier = kit.setup.tier, list = DATA[tier], solved = done[tier] || [];
    if (o.demo) idx = Math.min(2, list.length - 1); else { idx = -1; for (var i = 0; i < list.length; i++) if (solved.indexOf(i) < 0) { idx = i; break; } if (idx < 0) idx = Math.floor(Math.random() * list.length); }
    design = list[idx]; par = design.m; level1 = design.l; moves = 0; hints = 0; undo = []; anim = 0; outCount = 0; hintPulse = null; build();
    if (!o.demo) { stats(); kit.say('Knot ' + (idx + 1) + ' of ' + list.length + '. Drag a piece to slide it. Turn the view to find one that moves.'); }
  },
  button: function (id) {
    if (anim) return; endHint();
    if (id === 'undo' && undo.length) { var u = undo.pop(); pos[u.i] = u.from; if (u.out) outCount = u.n; var m = objs[u.i], from = m.position.clone(), to = world(u.i, u.from); kit.tween(0.3, function (t) { m.position.lerpVectors(from, to, t); }); moves--; stats(); kit.say('Taken back.'); }
    if (id === 'restart') { undo = []; moves = 0; hints = 0; outCount = 0; pos = pieces.map(function () { return [0, 0, 0]; }); objs.forEach(function (m2, i) { var f = m2.position.clone(), t2 = world(i, pos[i]); kit.tween(0.4, function (t) { m2.position.lerpVectors(f, t2, t); }); }); stats(); kit.say('Put back together.'); kit.restartClock(); }
    if (id === 'hint') { var path = solve(pieces, pos, 60000); if (!path || !path.length) { kit.say('No hint found from here. Try Undo.'); return; }
      hints++; var h = path[0], hm = objs[h[0]]; hintPulse = { m: hm, t: 0, d: DIRS[h[1]], p: hm.position.clone(), e: hm.material.emissive.getHex(), i: hm.material.emissiveIntensity }; kit.say('Hint: the lit piece ' + (h[2] === 'out' ? 'comes straight out' : 'slides ' + h[2] + (h[2] === 1 ? ' step' : ' steps')) + ' the way it is nudging. ' + path.length + ' moves to go.'); }
  },
  pick: function (ray, ev) {
    if (anim) return null; endHint(); var live = objs.filter(function (m, i) { return pos[i]; }), h = kit.hits(live); if (!h.length) return null;
    var i = h[0].object.userData.piece, m = objs[i], at = h[0].point.clone(), home = m.position.clone(), occ = occupancy(pieces, pos, i), sx = ev.clientX, sy = ev.clientY, axis = -1, shift = 0, lim = null;
    var sd = [0, 1, 2].map(function (a) { var v = new T3.Vector3(a === 0 ? unit : 0, a === 1 ? unit : 0, a === 2 ? unit : 0); return kit.screenDir(at, v); }); // one step along each axis, in pixels on screen
    return {
      move: function (r2, ev2) {
        var dx = ev2.clientX - sx, dy = ev2.clientY - sy;
        if (axis < 0 || Math.abs(shift) < 0.12) { // choose the line the finger is following
          var best = -1, bv = 14; for (var a = 0; a < 3; a++) { var len = Math.hypot(sd[a].x, sd[a].y); if (len < 4) continue; var along = Math.abs(dx * sd[a].x + dy * sd[a].y) / len; if (along > bv) { bv = along; best = a; } }
          if (best < 0) { if (axis < 0) return; } else if (best !== axis) { axis = best; lim = [reach(pieces, pos, i, DIRS[axis * 2 + 1], occ), reach(pieces, pos, i, DIRS[axis * 2], occ)]; } }
        var s = sd[axis], want = (dx * s.x + dy * s.y) / (s.x * s.x + s.y * s.y), lo = lim[0] === FAR ? -9 : -lim[0], hi = lim[1] === FAR ? 9 : lim[1], was = shift;
        shift = Math.max(lo, Math.min(hi, want)); if (Math.round(shift) !== Math.round(was)) { kit.buzz(3); kit.scrape(kit.setup.mat, 0.5); } if ((shift === lo || shift === hi) && was !== shift && shift !== 0) kit.hit(kit.setup.mat, 0.35, 0.9); // slid up against another piece
        if ((shift === lo || shift === hi) && want !== shift && Math.abs(want - shift) > 0.5 && !lim.hit) { lim.hit = true; if (hi === 0 && lo === 0) kit.say('That piece is held fast along that line. Try another line, or another piece.'); }
        m.position.copy(home); m.position.setComponent(axis, home.getComponent(axis) + shift * unit);
      },
      end: function () {
        if (axis < 0) { m.position.copy(home); return; } var n = Math.round(shift), d = axis * 2 + (n > 0 ? 0 : 1), free = lim[n > 0 ? 1 : 0] === FAR;
        if (!n) { m.position.copy(home); return; }
        if (free && Math.abs(shift) > 1.4) { apply(i, d, 'out'); return; }
        apply(i, d, Math.abs(n));
        if (free) kit.say('Nothing is in its way now. Keep sliding it to take it out.');
      }
    };
  },
  key: function (k) { if (k === 'z' || k === 'u') { this.button('undo'); return true; } if (k === 'h') { this.button('hint'); return true; } return false; },
  frame: function (dt, live) {
    if (hintPulse) { var hp = hintPulse, m = hp.m.material; hp.t += dt; if (hp.t >= 2.6 || !live) { endHint(); return; }
      m.emissive.setHex(0xf0b03a); m.emissiveIntensity = 0.35 + 0.3 * Math.sin(hp.t * 9); var n = Math.max(0, Math.sin(hp.t * 5)) * 0.18 * unit; hp.m.position.set(hp.p.x + hp.d[0] * n, hp.p.y + hp.d[1] * n, hp.p.z + hp.d[2] * n); }
  },
  context: function () { return { knot: idx, moves: moves, hints: hints, pos: pos }; }
});
})();
