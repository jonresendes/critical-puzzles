/* Loose Screws. Plates are screwed to a board in layers. Tap a screw to take it out: it goes into the box of
   its colour, or into the spare tray if no box wants it yet. A plate held by one screw swings down and hangs;
   a plate held by none falls away. Clear every screw without overfilling the tray.

   The first half of this file is the rule book and the puzzle maker (no drawing), the second half draws it. */
(function () {
'use strict';

/* ---------- Settings for each difficulty (tune here) ---------- */
var TIERS = {
  E: { name: 'Easy', plates: 6, loose: 0, colours: 4, tray: 3, boxes: 2, band: [0.8, 1], blurb: '6 plates, two boxes open at a time and 3 spare holes. Taking a screw that matches a box usually works.' },
  M: { name: 'Medium', plates: 8, loose: 1, colours: 4, tray: 5, boxes: 1, band: [0.45, 0.82], blurb: '8 plates and only one box open at a time, with 5 spare holes. The obvious screw is sometimes the wrong one.' },
  H: { name: 'Hard', plates: 10, loose: 2, colours: 5, tray: 4, boxes: 1, band: [0.08, 0.42], blurb: '10 plates, 5 colours, one box at a time and 4 spare holes. Plan several screws ahead.' }
};
var BW = 7, BH = 8.6, EDGE = 0.37, SPACING = 0.8, BOX = 3;

function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/* Plate shapes: an outline, and the spots where a screw looks natural. */
function circlePts(r, n) { var p = []; for (var i = 0; i < n; i++) p.push([Math.cos(i / n * 6.2832) * r, Math.sin(i / n * 6.2832) * r]); return p; }
var SHAPES = {
  bar: function (r) { var w = 3.2 + r() * 1.6, h = 1.15; return { pts: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], slots: [[-w / 2 + 0.6, 0], [w / 2 - 0.6, 0], [0, 0]], round: 0.5 }; },
  plank: function (r) { var w = 4.6 + r() * 1.2, h = 0.98; return { pts: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], slots: [[-w / 2 + 0.55, 0], [w / 2 - 0.55, 0], [0.4, 0]], round: 0.2 }; },
  square: function (r) { var w = 2.3 + r() * 0.5; return { pts: [[-w / 2, -w / 2], [w / 2, -w / 2], [w / 2, w / 2], [-w / 2, w / 2]], slots: [[-w / 2 + 0.55, -w / 2 + 0.55], [w / 2 - 0.55, w / 2 - 0.55], [w / 2 - 0.55, -w / 2 + 0.55], [-w / 2 + 0.55, w / 2 - 0.55]], round: 0.3 }; },
  disc: function (r) { var d = 1.3 + r() * 0.35; return { pts: circlePts(d, 20), slots: [[0, d - 0.55], [0, -d + 0.55], [d - 0.55, 0]], round: 0 }; },
  tri: function (r) { var s = 3.3 + r() * 0.7, h = s * 0.866; return { pts: [[-s / 2, -h / 3], [s / 2, -h / 3], [0, h * 2 / 3]], slots: [[-s / 2 + 0.95, -h / 3 + 0.55], [s / 2 - 0.95, -h / 3 + 0.55], [0, h * 2 / 3 - 1.05]], round: 0.25 }; },
  ell: function (r) { var a = 3 + r() * 0.8, t = 1.15; return { pts: [[0, 0], [a, 0], [a, t], [t, t], [t, a], [0, a]].map(function (p) { return [p[0] - a * 0.36, p[1] - a * 0.36]; }),
    slots: [[a - 0.55, t / 2], [t / 2, a - 0.55], [t / 2, t / 2]].map(function (p) { return [p[0] - a * 0.36, p[1] - a * 0.36]; }), round: 0.12 }; }
};
var SHAPE_NAMES = Object.keys(SHAPES);

function rot(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
function inside(pts, q) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j];
  if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function edgeDist(pts, q) { var best = Infinity; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j], dx = b[0] - a[0], dy = b[1] - a[1];
  var t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)); } return best; }
function centroid(pts) { var a = 0, x = 0, y = 0; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; a += f; x += (pts[j][0] + pts[i][0]) * f; y += (pts[j][1] + pts[i][1]) * f; } return [x / (3 * a), y / (3 * a)]; }

/* Where a plate is now. `hang` is the turn it has made about the one screw still holding it. */
function hangTurn(plate, screw) { var c = plate.centre, dx = c[0] - screw.x, dy = c[1] - screw.y; if (Math.hypot(dx, dy) < 0.08) return 0;
  var d = -Math.PI / 2 - Math.atan2(dy, dx); while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return d; }
function covers(plate, pose, q, grow) { // is the point q under this plate in its current pose?
  var p = q; if (pose && pose.turn) { var r = rot([q[0] - pose.px, q[1] - pose.py], -pose.turn); p = [r[0] + pose.px, r[1] + pose.py]; }
  return inside(plate.world, p) ? true : (grow ? edgeDist(plate.world, p) < grow : false);
}

/* The state of play: which screws are still in, and so which plates hang or have fallen. */
function newState(level) { return { level: level, in: level.screws.map(function () { return true; }), boxes: (level.nb === 1 ? [0] : [0, 1]).map(function (i) { return { q: i, n: 0 }; }), next: level.nb === 1 ? 1 : 2, tray: [], maxTray: 0, out: 0, lost: false }; }
function holding(st, pi) { var L = st.level, out = []; for (var s = 0; s < L.screws.length; s++) if (st.in[s] && L.screws[s].through.indexOf(pi) >= 0) out.push(s); return out; }
function poseOf(st, pi) { var h = holding(st, pi); if (!h.length) return null; if (h.length > 1) return { turn: 0 };
  var sc = st.level.screws[h[0]]; return { turn: hangTurn(st.level.plates[pi], sc), px: sc.x, py: sc.y }; }
function exposed(st, s) { var L = st.level, sc = L.screws[s], top = sc.through.length ? Math.max.apply(null, sc.through) : -1;
  for (var j = top + 1; j < L.plates.length; j++) { if (sc.through.indexOf(j) >= 0) continue; var pose = poseOf(st, j); if (pose && covers(L.plates[j], pose, [sc.x, sc.y], 0.2)) return false; } return true; }
function boxColour(st, b) { return b.q < st.level.queue.length ? st.level.queue[b.q] : -1; }
/* Take screw s out. Returns where it went and what else moved, for the drawing to play back. */
function remove(st, s) {
  var L = st.level, col = L.screws[s].colour, ev = { screw: s, moves: [], fills: [] };
  st.in[s] = false; st.out++;
  function intoBox(sc) { for (var b = 0; b < st.boxes.length; b++) { var bx = st.boxes[b]; if (boxColour(st, bx) === L.screws[sc].colour && bx.n < BOX) { ev.moves.push({ screw: sc, box: b, slot: bx.n, q: bx.q }); bx.n++; return true; } } return false; }
  if (!intoBox(s)) { if (st.tray.length >= L.tray) { st.lost = true; ev.overflow = true; return ev; } st.tray.push(s); ev.moves.push({ screw: s, tray: st.tray.length - 1 }); st.maxTray = Math.max(st.maxTray, st.tray.length); }
  var again = true;
  while (again) { again = false;
    st.boxes.forEach(function (bx, b) { if (bx.n >= BOX && bx.q < L.queue.length) { ev.fills.push({ box: b, q: bx.q, next: st.next < L.queue.length ? st.next : -1 }); bx.q = st.next++; bx.n = 0; again = true;
      for (var i = 0; i < st.tray.length; i++) { var t = st.tray[i]; if (boxColour(st, bx) === L.screws[t].colour && bx.n < BOX) { ev.moves.push({ screw: t, box: b, slot: bx.n, q: bx.q, fromTray: i }); bx.n++; st.tray.splice(i, 1); i--; } }
      ev.trayAfter = st.tray.slice(); } });
  }
  return ev;
}
function won(st) { return st.out === st.level.screws.length && !st.lost; }
function replay(level, order) { var st = newState(level); for (var i = 0; i < order.length; i++) { if (!st.in[order[i]] || !exposed(st, order[i])) return null; remove(st, order[i]); if (st.lost) return null; } return won(st) ? st : null; }

/* ---------- The puzzle maker ---------- */
function attempt(T, rnd) {
  var plates = [], screws = [], tries = 0;
  function fits(q) { // a screw must sit clearly on or clearly off every plate, and clear of other screws
    if (Math.abs(q[0]) > BW / 2 - 0.5 || Math.abs(q[1]) > BH / 2 - 0.5) return false;
    for (var i = 0; i < plates.length; i++) if (edgeDist(plates[i].world, q) < EDGE) return false;
    return !screws.some(function (s) { return Math.hypot(s.x - q[0], s.y - q[1]) < SPACING; });
  }
  function through(q) { var t = []; plates.forEach(function (p, i) { if (inside(p.world, q)) t.push(i); }); return t; }
  // plates go on one at a time, lowest first; each brings its own screws, and may also be pinned by screws already there
  while (plates.length < T.plates && tries++ < 1500) {
    var name = SHAPE_NAMES[Math.floor(rnd() * SHAPE_NAMES.length)], sh = SHAPES[name](rnd), ang = Math.floor(rnd() * 12) * Math.PI / 12, pos = [(rnd() - 0.5) * (BW - 2.2), (rnd() - 0.5) * (BH - 2.2)];
    var world = sh.pts.map(function (p) { var r = rot(p, ang); return [r[0] + pos[0], r[1] + pos[1]]; });
    if (world.some(function (p) { return Math.abs(p[0]) > BW / 2 - 0.25 || Math.abs(p[1]) > BH / 2 - 0.25; })) continue;
    var c = centroid(world), touching = plates.filter(function (o) { return Math.hypot(o.centre[0] - c[0], o.centre[1] - c[1]) < 2.4; }).length;
    if (plates.length && ((touching === 0 && rnd() < 0.8) || touching > 4)) continue;
    if (plates.some(function (o) { return Math.hypot(o.centre[0] - c[0], o.centre[1] - c[1]) < 0.8; })) continue;
    if (screws.some(function (s) { return edgeDist(world, [s.x, s.y]) < EDGE; })) continue; // would half-cover a screw head
    var i = plates.length, p = { shape: name, pts: sh.pts, slots: sh.slots, round: sh.round, angle: ang, pos: pos, world: world, centre: c };
    var under = screws.filter(function (s) { return inside(world, [s.x, s.y]); }), need = Math.max(1, 2 - under.length) + (rnd() < 0.5 ? 1 : 0);
    if (under.length > 3) continue;
    plates.push(p);
    var slots = shuffle(p.slots.slice(), rnd).map(function (s) { var r = rot(s, ang); return [r[0] + pos[0], r[1] + pos[1]]; }), added = [];
    for (var k = 0; k < 30; k++) slots.push([c[0] + (rnd() - 0.5) * 3.4, c[1] + (rnd() - 0.5) * 3.4]); // fall back on any free spot of the plate
    for (var j = 0; j < slots.length && added.length < need; j++) { var q = slots[j]; if (!inside(world, q) || !fits(q)) continue; var sc = { x: q[0], y: q[1], through: through(q) }; screws.push(sc); added.push(sc); }
    if (under.length + added.length < 2 || !added.length) { plates.pop(); added.forEach(function (a) { screws.splice(screws.indexOf(a), 1); }); continue; } // no room for its screws: try another plate
    under.forEach(function (s) { s.through.push(i); });
  }
  if (plates.length < T.plates) return null;
  var guard = 0, loose = T.loose; while ((loose > 0 || screws.length % BOX) && guard++ < 600) { var f = [(rnd() - 0.5) * (BW - 1), (rnd() - 0.5) * (BH - 1)]; if (fits(f) && !through(f).length) { screws.push({ x: f[0], y: f[1], through: [] }); loose--; } }
  if (screws.length % BOX) return null;
  var level = { plates: plates, screws: screws, tray: T.tray, queue: [], colours: T.colours, nb: T.boxes };
  // colours: three of each box colour, dealt at random, then checked by search for a way to clear the board
  var boxes = screws.length / BOX, last = -1, bag = [];
  for (var b = 0; b < boxes; b++) { var col; do { col = Math.floor(rnd() * T.colours); } while (col === last && T.colours > 1); last = col; level.queue.push(col); bag.push(col, col, col); }
  shuffle(bag, rnd); screws.forEach(function (s, i) { s.colour = bag[i]; });
  var order = solve(level); if (!order) return null;
  level.solution = order; level.rate = skill(level, rnd); return level;
}
function clone(st) { return { level: st.level, in: st.in.slice(), boxes: st.boxes.map(function (b) { return { q: b.q, n: b.n }; }), next: st.next, tray: st.tray.slice(), maxTray: st.maxTray, out: st.out, lost: st.lost }; }
/* Search for an order that clears the board. Screws that match a box are tried first. */
function solve(level, from, limit) {
  var seen = {}, path = [], budget = limit || 5000, L = level;
  function key(st) { return st.in.map(function (v) { return v ? 1 : 0; }).join('') + '|' + st.boxes.map(function (b) { return b.q + ':' + b.n; }).join(',') + '|' + st.tray.map(function (s) { return L.screws[s].colour; }).sort().join(''); }
  function go(st) {
    if (won(st)) return true; if (budget-- <= 0) return false; var k = key(st); if (seen[k]) return false; seen[k] = 1;
    var good = [], rest = []; for (var s = 0; s < L.screws.length; s++) if (st.in[s] && exposed(st, s)) { var hit = false; for (var b = 0; b < st.boxes.length; b++) if (boxColour(st, st.boxes[b]) === L.screws[s].colour) hit = true; (hit ? good : rest).push(s); }
    var all = good.concat(rest);
    for (var i = 0; i < all.length; i++) { var n = clone(st); remove(n, all[i]); if (n.lost) continue; path.push(all[i]); if (go(n)) return true; path.pop(); }
    return false;
  }
  return go(from ? clone(from) : newState(level)) ? path : null;
}
/* How often does a player win who takes a screw that matches a box whenever one is showing, and guesses otherwise? */
function skill(level, rnd) { var wins = 0, N = 30;
  for (var n = 0; n < N; n++) { var st = newState(level);
    while (!st.lost && !won(st)) { var open = [], good = []; for (var s = 0; s < level.screws.length; s++) if (st.in[s] && exposed(st, s)) { open.push(s);
        for (var b = 0; b < st.boxes.length; b++) if (boxColour(st, st.boxes[b]) === level.screws[s].colour) { good.push(s); break; } }
      var from = good.length ? good : open; remove(st, from[Math.floor(rnd() * from.length)]); }
    if (won(st)) wins++; }
  return wins / N;
}
function generate(tierKey, seed, T) { // the first board whose difficulty lands in the tier's band; failing that, the nearest one found
  T = T || TIERS[tierKey]; var best = null, gap = 9;
  for (var i = 0; i < 40; i++) { var L = attempt(T, rng(seed + i * 7919)); if (!L) continue; L.seed = seed; L.tier = tierKey;
    var g = L.rate > T.band[1] ? L.rate - T.band[1] : L.rate < T.band[0] ? T.band[0] - L.rate : 0; if (g < gap) { gap = g; best = L; } if (!g) break; }
  return best;
}

var Logic = { TIERS: TIERS, generate: generate, solve: solve, skill: skill, newState: newState, exposed: exposed, remove: remove, won: won, replay: replay, poseOf: poseOf, holding: holding, covers: covers, BW: BW, BH: BH, BOX: BOX };
if (typeof module !== 'undefined') { module.exports = Logic; return; }
window.__screws = Logic;

/* ---------- Drawing ---------- */
var T3 = window.THREE, kit, level, st, seed = 0, board, plateObjs, screwObjs, boxObjs, trayPos, busy = 0, falling = [], hits = [];
var COLOURS = [['#ea4fae', 'slot'], ['#3d8bff', 'cross'], ['#19c2a8', 'hex'], ['#f0b03a', 'square'], ['#a66bff', 'tri']];
var PLATE = { wood: [0xc7925a, 0xa9703c, 0xe0bf8a, 0x8a5a34, 0xd9a86a], plastic: [0xe9ecf2, 0xc5cee0, 0xf1e6d6, 0xcfe3dc, 0xd9d0ea], metal: [0xd9dee8, 0xc9a25a, 0xc48a6a, 0x9aa7b8, 0xe2d2b4], stone: [0xb9ab97, 0x9a9da2, 0xc9a27a, 0x8c968c, 0xd6cdbd] };
var LAYER = 0.2, THICK = 0.15, HEADER = 5.55, headTex = {};
function symbol(x, kind, s) { x.lineWidth = s * 0.12; x.lineCap = 'round'; x.beginPath(); var c = s / 2, r = s * 0.24;
  if (kind === 'slot') { x.moveTo(c - r * 1.2, c); x.lineTo(c + r * 1.2, c); x.stroke(); }
  else if (kind === 'cross') { x.moveTo(c - r, c); x.lineTo(c + r, c); x.moveTo(c, c - r); x.lineTo(c, c + r); x.stroke(); }
  else { var n = kind === 'hex' ? 6 : kind === 'square' ? 4 : 3, off = kind === 'square' ? Math.PI / 4 : -Math.PI / 2; for (var i = 0; i < n; i++) { var a = off + i / n * 6.2832; x[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r); } x.closePath(); x.fill(); } }
function headTexture(ci) { if (headTex[ci]) return headTex[ci]; var c = COLOURS[ci];
  return (headTex[ci] = kit.canvasTex(96, function (x, s) { x.fillStyle = c[0]; x.fillRect(0, 0, s, s); var g = x.createRadialGradient(s * 0.4, s * 0.35, 2, s / 2, s / 2, s * 0.6); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.strokeStyle = x.fillStyle = 'rgba(20,12,24,0.78)'; symbol(x, c[1], s); })); }
function plateShape(p) { // outline with softened corners, in the plate's own space
  var s = new T3.Shape(), pts = p.pts, n = pts.length, r = p.round;
  if (!r) { pts.forEach(function (q, i) { s[i ? 'lineTo' : 'moveTo'](q[0], q[1]); }); s.closePath(); return s; }
  for (var i = 0; i < n; i++) { var a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n], la = Math.hypot(a[0] - b[0], a[1] - b[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]), k = Math.min(r, la / 2, lc / 2);
    var p1 = [b[0] + (a[0] - b[0]) / la * k, b[1] + (a[1] - b[1]) / la * k], p2 = [b[0] + (c[0] - b[0]) / lc * k, b[1] + (c[1] - b[1]) / lc * k];
    s[i ? 'lineTo' : 'moveTo'](p1[0], p1[1]); s.quadraticCurveTo(b[0], b[1], p2[0], p2[1]); }
  s.closePath(); return s;
}
function screwMesh(ci, len) {
  var g = new T3.Group(), steel = new T3.MeshStandardMaterial({ color: 0xcfd4dc, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 });
  var head = new T3.Mesh(new T3.CylinderGeometry(0.3, 0.33, 0.13, 22), [new T3.MeshStandardMaterial({ color: COLOURS[ci][0], metalness: 0.5, roughness: 0.35 }), new T3.MeshStandardMaterial({ map: headTexture(ci), metalness: 0.45, roughness: 0.38 }), steel]);
  head.rotation.x = Math.PI / 2; head.position.z = 0.065; head.castShadow = true; g.add(head);
  var shaft = new T3.Mesh(new T3.CylinderGeometry(0.1, 0.1, len, 10), steel); shaft.rotation.x = Math.PI / 2; shaft.position.z = -len / 2; g.add(shaft);
  for (var i = 0; i < Math.floor(len / 0.11); i++) { var t = new T3.Mesh(new T3.TorusGeometry(0.105, 0.022, 4, 10), steel); t.position.z = -0.08 - i * 0.11; g.add(t); }
  return g;
}
function boxX(b) { return st.boxes.length === 1 ? 0 : b ? 1.85 : -1.85; }
function boxSlot(b, slot) { return new T3.Vector3(boxX(b) + (slot - 1) * 0.78, HEADER + 0.55, 0.42); }
function build(demo) {
  var mat = kit.setup.mat, pal = PLATE[mat];
  board = new T3.Group(); board.rotation.x = -0.26; board.position.set(0, 4.75 * Math.cos(0.26) + 0.12, 0.7); kit.root.add(board);
  var slab = kit.roundBox(BW + 0.9, 0.45, BH + 3.3, 0.12); slab.rotateX(Math.PI / 2); slab.translate(0, 1.2, -0.45); // the backing board, front face at z = 0
  board.add(kit.mesh(slab, kit.mat(mat === 'wood' ? 'plastic' : 'wood', mat === 'wood' ? 0x2a2838 : 0x4a3626)));
  var stand = kit.mesh(new T3.BoxGeometry(0.6, 9.8, 0.4), kit.mat('wood', 0x3a2a1e)); stand.position.set(0, -0.7, -2.05); stand.rotation.x = 0.31; board.add(stand);
  var hole = new T3.MeshBasicMaterial({ color: 0x0c0a12 }), holeG = new T3.CircleGeometry(0.14, 14);
  level.screws.forEach(function (s) { var h = new T3.Mesh(holeG, hole); h.position.set(s.x, s.y, 0.004); board.add(h); });
  plateObjs = level.plates.map(function (p, i) {
    var shape = plateShape(p); level.screws.forEach(function (s) { if (s.through.indexOf(i) < 0) return; var l = rot([s.x - p.pos[0], s.y - p.pos[1]], -p.angle), h = new T3.Path(); h.absarc(l[0], l[1], 0.15, 0, 6.2832, true); shape.holes.push(h); });
    var geo = new T3.ExtrudeGeometry(shape, { depth: THICK - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 10 });
    var uv = geo.attributes.uv; for (var k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.3, uv.getY(k) * 0.1);
    var m = kit.mesh(geo, kit.mat(mat, pal[i % pal.length], { shade: 0.85 + (i * 37 % 10) / 40 })); m.position.set(p.pos[0], p.pos[1], 0.03 + i * LAYER); m.rotation.z = p.angle; board.add(m);
    return { mesh: m, turn: 0, vel: 0, target: 0, pivot: null, gone: false };
  });
  hits = []; screwObjs = level.screws.map(function (s, i) {
    var top = s.through.length ? Math.max.apply(null, s.through) : -1, z = top < 0 ? 0.02 : 0.03 + top * LAYER + THICK, g = screwMesh(s.colour, z + 0.3); g.position.set(s.x, s.y, z); board.add(g);
    var hit = new T3.Mesh(new T3.CylinderGeometry(0.48, 0.48, 0.3, 10), new T3.MeshBasicMaterial({ visible: false })); hit.rotation.x = Math.PI / 2; hit.userData.screw = i; g.add(hit); hits.push(hit);
    return { g: g, home: g.position.clone(), where: 'board', len: z + 0.3 };
  });
  // the shelf: the colour boxes and the spare tray
  var shelf = kit.roundBox(BW + 0.3, 0.3, 2.75, 0.1); shelf.rotateX(Math.PI / 2); shelf.translate(0, HEADER + 0.15, 0); board.add(kit.mesh(shelf, kit.mat('metal', 0x5b6474)));
  boxObjs = st.boxes.map(function (bx, b) { var g = new T3.Group(); g.position.set(boxX(b), HEADER + 0.55, 0.3); board.add(g); return { g: g }; });
  trayPos = []; for (var t = 0; t < level.tray; t++) { var x = (t - (level.tray - 1) / 2) * 0.95, sock = new T3.Mesh(new T3.CylinderGeometry(0.36, 0.36, 0.08, 20), new T3.MeshStandardMaterial({ color: 0x1a1822, metalness: 0.6, roughness: 0.5 }));
    sock.rotation.x = Math.PI / 2; sock.position.set(x, HEADER - 0.75, 0.3); board.add(sock); var hh = new T3.Mesh(holeG, hole); hh.position.set(x, HEADER - 0.75, 0.345); board.add(hh); trayPos.push(new T3.Vector3(x, HEADER - 0.75, 0.36)); }
  st.boxes.forEach(function (bx, b) { drawBox(b); });
  if (!demo) { kit.stat('left', level.screws.length); kit.stat('tray', '0/' + level.tray); }
}
function drawBox(b) {
  var o = boxObjs[b], ci = st.boxes[b].q < level.queue.length ? level.queue[st.boxes[b].q] : -1; kit.clear(o.g); o.g.scale.setScalar(1); o.g.visible = ci >= 0; if (ci < 0) return;
  var body = kit.mesh(kit.roundBox(2.6, 0.2, 1.0, 0.1), new T3.MeshPhysicalMaterial({ color: COLOURS[ci][0], roughness: 0.35, clearcoat: 0.6 })); body.rotation.x = Math.PI / 2; body.geometry.center(); o.g.add(body);
  for (var i = 0; i < BOX; i++) { var h = new T3.Mesh(new T3.CircleGeometry(0.17, 14), new T3.MeshBasicMaterial({ color: 0x15101c })); h.position.set((i - 1) * 0.78, 0, 0.105); o.g.add(h);
    var ring = new T3.Mesh(new T3.RingGeometry(0.3, 0.34, 20), new T3.MeshBasicMaterial({ color: 0x15101c, transparent: true, opacity: 0.35 })); ring.position.copy(h.position); o.g.add(ring); }
  var sp = new T3.Sprite(new T3.SpriteMaterial({ map: headTexture(ci), transparent: true })); sp.scale.set(0.42, 0.42, 1); sp.position.set(0, 0.72, 0.1); o.g.add(sp);
}
function fly(i, to, done) { // unscrew, lift, travel and screw into the new hole
  var o = screwObjs[i], from = o.g.position.clone(), lift = o.len + 0.25; busy++; kit.fx('ratchet');
  kit.tween(0.34, function (k) { o.g.position.z = from.z + lift * k; o.g.rotation.z = -k * 14; }, function () {
    var a = o.g.position.clone(), b = to.clone(); b.z += 0.75;
    kit.tween(0.3, function (k) { o.g.position.lerpVectors(a, b, k); o.g.position.z += Math.sin(k * Math.PI) * 0.9; o.g.scale.setScalar(1 - 0.12 * k); }, function () {
      kit.tween(0.16, function (k) { o.g.position.z = b.z - 0.75 * k; o.g.rotation.z = -14 - k * 6; }, function () { busy--; kit.buzz(6); kit.hit('metal', 0.3, 1.5); if (done) done(); }); }); });
}
function settle(i) { var o = screwObjs[i]; kit.tween(0.22, function (k) { o.g.scale.setScalar(0.88 * (1 - k)); }, function () { o.g.visible = false; }); }
function refreshPlates() {
  level.plates.forEach(function (p, i) { var o = plateObjs[i]; if (o.gone) return; var pose = poseOf(st, i);
    if (!pose) { o.gone = true; falling.push({ o: o, vy: 0, vz: 0.6 + Math.random() * 0.8, spin: (Math.random() - 0.5) * 3 + o.vel, t: 0 }); kit.buzz(14); kit.fx('whoosh'); setTimeout(function () { kit.hit(kit.setup.mat, 0.8, 0.8); }, 420); return; } // falls, then hits the table
    if (pose.px !== undefined && !o.pivot) { o.pivot = [pose.px, pose.py]; o.target = pose.turn; o.vel += (Math.random() - 0.5) * 0.4; if (Math.abs(pose.turn) > 0.05) kit.fx('creak'); } });
}
function act(i) {
  if (busy > 3 || !st.in[i]) return false;
  if (!exposed(st, i)) { var o = screwObjs[i], x0 = o.home.x; kit.tween(0.3, function (k) { o.g.position.x = x0 + Math.sin(k * 18) * 0.05 * (1 - k); }); kit.say('A plate is covering that screw. Free the plate on top first.'); kit.buzz(20); kit.fx('deny'); return true; }
  var ev = remove(st, i); refreshPlates(); kit.say('');
  ev.moves.forEach(function (m, n) { var to = m.box !== undefined ? boxSlot(m.box, m.slot) : trayPos[m.tray]; screwObjs[m.screw].where = m.box !== undefined ? 'box' + m.q : 'tray';
    var go = function () { fly(m.screw, to, null); }; if (m.fromTray !== undefined) setTimeout(go, 520 + n * 90); else go(); });
  ev.fills.forEach(function (f, n) { setTimeout(function () { // the full box leaves with its screws and the next one slides in
      kit.fx('chime'); var o = boxObjs[f.box]; screwObjs.forEach(function (s, si) { if (s.where === 'box' + f.q) { s.where = 'gone'; settle(si); } });
      kit.tween(0.22, function (k) { o.g.scale.setScalar(1 - k * 0.999); }, function () { drawBox(f.box); o.g.scale.setScalar(0.01); kit.tween(0.2, function (k) { o.g.scale.setScalar(Math.max(0.01, k)); }); });
      (ev.trayAfter || []).forEach(function (s, slot) { var so = screwObjs[s]; if (so.where === 'tray') kit.tween(0.2, function (k) { so.g.position.x += (trayPos[slot].x - so.g.position.x) * k; }); });
    }, 760 + n * 320); });
  kit.stat('left', level.screws.length - st.out); kit.stat('tray', st.tray.length + '/' + level.tray);
  if (ev.overflow) { fly(i, new T3.Vector3(0, HEADER - 1.6, 0.6), null); kit.say('The spare tray is full.');
    kit.finish({ won: false, title: 'The tray overflowed', text: 'There was no box for that screw and no spare hole left. Look at which colours the boxes want before you pull the next screw.', stats: [['Screws cleared', (st.out - 1) + ' of ' + level.screws.length]] }); return true; }
  if (st.tray.length === level.tray) kit.say('The spare tray is full. The next screw must match a box.');
  if (won(st)) { var stars = st.maxTray <= Math.floor(level.tray / 2) ? 3 : st.maxTray < level.tray ? 2 : 1, secs = Math.round(kit.elapsed());
    kit.finish({ won: true, delay: 1500, title: 'Board cleared', stars: stars, text: stars === 3 ? 'Every plate is off and the tray barely filled.' : stars === 2 ? 'Every plate is off. Three stars if you never use more than ' + Math.floor(level.tray / 2) + ' spare holes.' : 'Every plate is off, but the tray was full at one point.',
      stats: [['Screws', level.screws.length], ['Most spare holes used', st.maxTray + ' of ' + level.tray], ['Time', kit.clock(secs)]], best: { value: secs, lower: true, label: 'Best time', show: kit.clock } }); }
  return true;
}

/* For tests: where on screen is the next screw of a known way to clear the board? */
window.__screwsDbg = function (bad) { if (!st || won(st) || st.lost) return null; var order = solve(level, st, 20000);
  if (bad) { order = []; level.screws.forEach(function (sc, i) { if (st.in[i] && exposed(st, i) && !st.boxes.some(function (bx) { return boxColour(st, bx) === sc.colour; })) order.push(i); }); } // a screw no box wants
  if (!order || !order.length) return null;
  var v = new T3.Vector3(); screwObjs[order[0]].g.getWorldPosition(v); v.project(kit.camera); var r = kit.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, s: order[0] }; };

window.CPKit.start({
  id: 'screws', name: ['Loose', 'Screws'], startLabel: 'Open the workshop', env: 'neon', mat: 'metal', matLabel: 'Plates', lookName: 'The plates',
  lede: 'Plates are screwed to the board in layers. Take the screws out in the right order, sort them into their boxes, and do not let the spare tray overflow.',
  aria: 'A board of plates held by screws. Tap a screw to take it out. Drag to look around, pinch to zoom.',
  tiers: TIERS, mats: window.CPKit.MATS, stats: [['left', 'Screws'], ['tray', 'Tray']], buttons: [['restart', 'Start over']],
  view: { yaw: 0, pitch: 0.2, dist: 17.5, y: 5.9, tableR: 6.2, minPitch: -0.1, maxPitch: 1.2 },
  bestText: function (b) { return 'Best time: ' + kit.clock(b); },
  init: function (k) { kit = k; },
  newGame: function (k, o) {
    falling = []; busy = 0; if (!o.retry || o.demo || !seed) seed = Math.floor(Math.random() * 1e9);
    level = generate(o.demo ? 'E' : kit.setup.tier, o.demo ? 20261 : seed); st = newState(level); build(o.demo);
    if (!o.demo) kit.say(st.boxes.length === 1 ? 'Tap a screw to take it out. Only one box is open at a time.' : 'Tap a screw to take it out. A box takes three screws of its colour.');
  },
  button: function (id) { if (id === 'restart') kit.replay(); },
  tap: function () { var h = kit.hits(hits.filter(function (m) { return st.in[m.userData.screw]; })); return h.length ? act(h[0].object.userData.screw) : false; },
  frame: function (dt) {
    if (!plateObjs) return;
    plateObjs.forEach(function (o, i) { if (o.gone || !o.pivot) return; // a plate on one screw swings like a pendulum and comes to rest
      var p = level.plates[i]; o.vel += (-22 * Math.sin(o.turn - o.target) - 2.6 * o.vel) * dt; o.turn += o.vel * dt;
      var r = rot([p.pos[0] - o.pivot[0], p.pos[1] - o.pivot[1]], o.turn); o.mesh.position.x = o.pivot[0] + r[0]; o.mesh.position.y = o.pivot[1] + r[1]; o.mesh.rotation.z = p.angle + o.turn; });
    for (var i = falling.length - 1; i >= 0; i--) { var f = falling[i]; f.t += dt; f.vy -= 26 * dt; f.o.mesh.position.y += f.vy * dt; f.o.mesh.position.z += f.vz * dt; f.o.mesh.rotation.z += f.spin * dt; f.o.mesh.rotation.x += dt * 1.4;
      if (f.t > 1.3) { board.remove(f.o.mesh); falling.splice(i, 1); } }
  },
  context: function () { return { seed: seed, tier: level && level.tier, out: st && st.out, tray: st && st.tray.length }; }
});
})();
