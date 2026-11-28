/* Gridlock. Blocks sit in a 6x6 tray and only slide along their own length. Clear a path and slide the key
   block out through the gate. Boards come from gridlock-data.js, each with a known fewest number of slides. */
(function () {
'use strict';
var DATA = window.GRIDLOCK_DATA;
function span(k) { var l = DATA[k]; return l.length + ' boards that need ' + l[0][1] + ' to ' + l[l.length - 1][1] + ' slides, even played perfectly.'; }
var TIERS = { E: { name: 'Easy', blurb: span('E') }, M: { name: 'Medium', blurb: span('M') }, H: { name: 'Hard', blurb: span('H') } };
var N = 6, U = 1.15, T3 = window.THREE, kit, blocks, row, par, moves, hints, undo, board, idx = 0, meshes = [], hintPulse = null, leaving = false;
var done = (function () { try { return JSON.parse(localStorage.getItem('cp-gridlock-done')) || {}; } catch (e) { return {}; } })();

/* ---------- Rules ---------- */
function decode(str, mirror) { // letters to blocks; A is the key
  var seen = {}, out = [];
  for (var i = 0; i < 36; i++) { var ch = str.charAt(i); if (ch === '.' || seen[ch]) continue; seen[ch] = 1;
    var r = Math.floor(i / N), c = i % N, h = c + 1 < N && str.charAt(i + 1) === ch, len = 1; while ((h ? c + len < N && str.charAt(i + len) === ch : r + len < N && str.charAt(i + len * N) === ch)) len++;
    out.push({ id: ch, h: h, len: len, fixed: h ? r : c, pos: h ? c : r }); }
  out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  if (mirror) out.forEach(function (b) { if (b.h) b.fixed = N - 1 - b.fixed; else b.pos = N - b.len - b.pos; });
  return out;
}
function gridOf(bs, pos) { var g = new Int8Array(36).fill(-1); bs.forEach(function (b, i) { var p = pos ? pos[i] : b.pos; for (var k = 0; k < b.len; k++) g[b.h ? b.fixed * N + p + k : (p + k) * N + b.fixed] = i; }); return g; }
function range(bs, i, pos) { // how far block i can slide each way from where it is
  var g = gridOf(bs, pos), b = bs[i], p = pos ? pos[i] : b.pos, lo = p, hi = p;
  while (lo > 0 && g[b.h ? b.fixed * N + lo - 1 : (lo - 1) * N + b.fixed] < 0) lo--;
  while (hi + b.len < N && g[b.h ? b.fixed * N + hi + b.len : (hi + b.len) * N + b.fixed] < 0) hi++;
  return [lo, hi];
}
function solve(bs) { // fewest slides from here: returns the list of [block, new position]
  var start = bs.map(function (b) { return b.pos; }), seen = {}, list = [start], from = [-1], mv = [null]; seen[start.join('')] = 1;
  for (var i = 0; i < list.length && list.length < 120000; i++) { var p = list[i];
    if (p[0] === N - 2) { var path = []; for (var j = i; from[j] >= 0; j = from[j]) path.unshift(mv[j]); return path; }
    for (var b = 0; b < bs.length; b++) { var r = range(bs, b, p); for (var q = r[0]; q <= r[1]; q++) { if (q === p[b]) continue; var n = p.slice(); n[b] = q; var k = n.join(''); if (seen[k]) continue; seen[k] = 1; list.push(n); from.push(i); mv.push([b, q]); } } }
  return null;
}
window.__gridlock = { decode: decode, solve: solve, range: range, get blocks() { return blocks; }, get meshes() { return meshes; } };

/* ---------- Drawing ---------- */
function centre(b, p) { var a = (p + b.len / 2 - N / 2) * U, f = (b.fixed + 0.5 - N / 2) * U; return b.h ? [a, f] : [f, a]; }
function place(b, p) { var c = centre(b, p); b.mesh.position.set(c[0], 0.33, c[1]); }
function build(str, mirror) {
  var mat = kit.setup.mat, pal = kit.PALETTE[mat], frameMat = kit.mat(mat === 'stone' ? 'wood' : 'stone', mat === 'stone' ? 0x5a3d28 : 0x77706a), S = N * U;
  board = new T3.Group(); kit.root.add(board); blocks = decode(str, mirror); row = blocks[0].fixed; meshes = [];
  var base = kit.mesh(kit.roundBox(S + 1.3, 0.33, S + 1.3, 0.1), frameMat); board.add(base);
  var floor = kit.mesh(new T3.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new T3.MeshStandardMaterial({ roughness: 0.9, color: 0xffffff, map: kit.canvasTex(256, function (x, s) {
    x.fillStyle = '#2b2733'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(255,255,255,0.09)'; x.lineWidth = 2; for (var i = 0; i <= N; i++) { x.beginPath(); x.moveTo(i * s / N, 0); x.lineTo(i * s / N, s); x.moveTo(0, i * s / N); x.lineTo(s, i * s / N); x.stroke(); }
    x.fillStyle = 'rgba(240,176,58,0.16)'; x.fillRect(0, row * s / N + 3, s, s / N - 6); }) }), false); floor.position.y = 0.335; floor.material.map.repeat.set(1, 1); board.add(floor);
  function wall(w, d, x, z) { var m = kit.mesh(kit.roundBox(w, 0.62, d, 0.08), frameMat); m.position.set(x, 0.3, z); board.add(m); }
  var e = S / 2 + 0.3, gz = (row + 0.5 - N / 2) * U, up = gz - U / 2 + S / 2, down = S / 2 - gz - U / 2;
  wall(S + 1.2, 0.6, 0, -e); wall(S + 1.2, 0.6, 0, e); wall(0.6, S, -e, 0);
  if (up > 0.01) wall(0.6, up + 0.02, e, -S / 2 + up / 2); if (down > 0.01) wall(0.6, down + 0.02, e, S / 2 - down / 2);
  var glow = new T3.MeshStandardMaterial({ color: 0x201608, emissive: 0xf0b03a, emissiveIntensity: 1.3 });
  for (var a = 0; a < 3; a++) { var ch = new T3.Mesh(new T3.ConeGeometry(0.2, 0.34, 3), glow); ch.rotation.z = -Math.PI / 2; ch.position.set(e + 0.75 + a * 0.5, 0.06, gz); ch.scale.x = 0.2; board.add(ch); } // arrows on the table pointing out of the gate
  blocks.forEach(function (b, i) {
    var w = b.len * U - 0.1, d = U - 0.1, key = i === 0, m = kit.mesh(kit.roundBox(b.h ? w : d, 0.62, b.h ? d : w, 0.1), key ? new T3.MeshStandardMaterial({ color: 0xf0b03a, metalness: 0.45, roughness: 0.3, emissive: 0xb86a00, emissiveIntensity: 0.45, envMapIntensity: 0.6 }) : kit.mat(mat, pal[(i * 3 + b.len) % pal.length], { shade: 0.86 + (i * 29 % 10) / 50 }));
    if (key) { var gem = new T3.Mesh(new T3.OctahedronGeometry(0.2, 0), new T3.MeshStandardMaterial({ color: 0xea4fae, emissive: 0xea4fae, emissiveIntensity: 0.9, roughness: 0.2 })); gem.position.y = 0.66; gem.scale.y = 0.55; m.add(gem); }
    m.userData.block = i; b.mesh = m; place(b, b.pos); board.add(m); meshes.push(m);
  });
}
function stats() { kit.stat('moves', moves); kit.stat('par', par); kit.button('undo').disabled = !undo.length; }
function win() {
  leaving = true; var k = blocks[0], from = k.mesh.position.x; kit.buzz(20); kit.fx('gate');
  kit.tween(0.7, function (t) { k.mesh.position.x = from + t * (N * U); }, function () { leaving = false; });
  var list = done[kit.setup.tier] || (done[kit.setup.tier] = []); if (list.indexOf(idx) < 0) list.push(idx); kit.store('cp-gridlock-done', done);
  var stars = moves <= par ? 3 : moves <= Math.ceil(par * 1.6) ? 2 : 1; if (hints && stars > 2) stars = 2;
  kit.finish({ won: true, title: 'The key is out', stars: stars, text: moves <= par ? (hints ? 'Opened in the fewest slides, with a hint.' : 'Opened in the fewest slides possible.') : 'Opened. The fewest possible is ' + par + ' slides.',
    stats: [['Board', (idx + 1) + ' of ' + DATA[kit.setup.tier].length], ['Slides', moves], ['Fewest possible', par], ['Hints', hints], ['Opened in this tier', list.length + ' of ' + DATA[kit.setup.tier].length]] });
}
function commit(i, to) { var b = blocks[i]; if (to === b.pos) return; undo.push([i, b.pos]); b.pos = to; moves++; stats(); kit.buzz(6); kit.hit(kit.setup.mat, 0.5); kit.say(''); }
function glide(b, to, dur) { var from = b.h ? b.mesh.position.x : b.mesh.position.z, c = centre(b, to), end = b.h ? c[0] : c[1]; kit.tween(dur || 0.12, function (t) { if (b.h) b.mesh.position.x = from + (end - from) * t; else b.mesh.position.z = from + (end - from) * t; }); }

window.CPKit.start({
  id: 'gridlock', name: ['Grid', 'lock'], startLabel: 'Open the tray', env: 'temple', mat: 'stone', matLabel: 'Blocks', lookName: 'The blocks', mats: window.CPKit.MATS,
  lede: 'Every block slides only along its own length. Shift them out of the way and take the gold key block out through the gate.',
  aria: 'A tray of sliding blocks. Drag a block along its length. Drag beside the tray to look around, pinch to zoom.',
  tiers: TIERS, stats: [['moves', 'Slides'], ['par', 'Fewest']], buttons: [['undo', 'Undo'], ['hint', 'Hint'], ['restart', 'Start over']],
  view: { yaw: 0, pitch: 0.95, dist: 13.5, y: 0.3, tableR: 5.6, minPitch: 0.3 },
  bestText: null,
  init: function (k) { kit = k; },
  newGame: function (k, o) {
    var tier = kit.setup.tier, list = DATA[tier], solved = done[tier] || [];
    if (o.demo) idx = 3; else { idx = -1; for (var i = 0; i < list.length; i++) if (solved.indexOf(i) < 0) { idx = i; break; } if (idx < 0) idx = Math.floor(Math.random() * list.length); }
    par = list[idx][1]; moves = 0; hints = 0; undo = []; leaving = false; hintPulse = null; build(list[idx][0], idx % 2 === 1);
    if (!o.demo) { stats(); kit.say('Board ' + (idx + 1) + ' of ' + list.length + '. Drag a block along its length.'); }
  },
  button: function (id) {
    if (leaving) return;
    if (id === 'undo' && undo.length) { var u = undo.pop(), b = blocks[u[0]]; b.pos = u[1]; glide(b, b.pos); moves--; stats(); kit.say('Taken back.'); }
    if (id === 'restart') { while (undo.length) { var r = undo.pop(); blocks[r[0]].pos = r[1]; } blocks.forEach(function (bl) { glide(bl, bl.pos, 0.25); }); moves = 0; hints = 0; stats(); kit.say('Back to the start.'); kit.restartClock(); }
    if (id === 'hint') { var path = solve(blocks); if (!path || !path.length) { kit.say(range(blocks, 0)[1] === N - 2 ? 'The way is clear. Slide the key block out through the gate.' : 'No hint found.'); if (path) hintPulse = { m: blocks[0].mesh, t: 0 }; return; }
      hints++; var hb = blocks[path[0][0]], d = path[0][1] - hb.pos, word = hb.h ? (d > 0 ? 'right' : 'left') : (d > 0 ? 'towards you' : 'away from you');
      hintPulse = { m: hb.mesh, t: 0 }; kit.say('Hint: slide the lit block ' + Math.abs(d) + (Math.abs(d) === 1 ? ' space ' : ' spaces ') + (kit.cam.yaw > -0.6 && kit.cam.yaw < 0.6 ? word : '') + '. ' + path.length + ' slides to go.'); }
  },
  pick: function (ray) {
    if (leaving) return null; var h = kit.hits(meshes); if (!h.length) return null;
    var i = h[0].object.userData.block, b = blocks[i], r = range(blocks, i), top = new T3.Vector3(0, 0.95, 0), up = new T3.Vector3(0, 1, 0), p0 = kit.hitPlane(ray, up, top); if (!p0) return null;
    var out = i === 0 && r[1] === N - 2, hi = out ? N : r[1], grab = (b.h ? p0.x : p0.z) / U - b.pos, cur = b.pos;
    b.mesh.position.y = 0.36;
    return {
      move: function (ray2) { var p = kit.hitPlane(ray2, up, top); if (!p) return; var want = (b.h ? p.x : p.z) / U - grab, c = Math.max(r[0], Math.min(hi, want));
        if (Math.round(c) !== Math.round(cur)) { kit.buzz(3); kit.scrape(kit.setup.mat, 0.6); } if ((c === r[0] || c === r[1]) && cur !== c && c !== b.pos && c < N - 1) kit.hit(kit.setup.mat, 0.4, 0.9); cur = c; var ctr = centre(b, c); b.mesh.position.x = ctr[0]; b.mesh.position.z = ctr[1]; },
      end: function () { b.mesh.position.y = 0.33; var to = Math.round(cur);
        if (out && cur > N - 2 + 0.45) { if (b.pos !== N - 2) moves++; b.pos = N - 2; stats(); win(); return; } // already at the gate: stepping out is free
        to = Math.max(r[0], Math.min(r[1], to)); glide(b, to); commit(i, to); }
    };
  },
  key: function (k) { if (k === 'z' || k === 'u') { this.button('undo'); return true; } if (k === 'h') { this.button('hint'); return true; } return false; },
  frame: function (dt) { if (hintPulse) { hintPulse.t += dt; var m = hintPulse.m.material, on = hintPulse.t < 2.4; if (!m.userData.base) m.userData.base = { e: m.emissive.getHex(), i: m.emissiveIntensity };
      if (on) { m.emissive.setHex(0xf0b03a); m.emissiveIntensity = 0.5 + 0.5 * Math.sin(hintPulse.t * 9); } else { m.emissive.setHex(m.userData.base.e); m.emissiveIntensity = m.userData.base.i; hintPulse = null; } } },
  context: function () { return { board: idx, moves: moves, hints: hints, pos: blocks && blocks.map(function (b) { return b.pos; }) }; }
});
})();
