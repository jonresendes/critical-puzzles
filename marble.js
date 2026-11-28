/* Marble Tilt. A marble on a walled board. Tilt the board to roll the marble to the cup, past the pits.
   The marble is a real rolling ball: it speeds up down the slope, carries its speed, bounces off walls and
   drops into any pit it rolls over. Every maze is made fresh.

   The first half of this file makes the maze and moves the ball (no drawing), the second half draws it. */
(function () {
'use strict';
var TIERS = {
  E: { name: 'Easy', n: 6, loops: 5, traps: 4, edges: 0, lives: 0, blurb: 'A 6 by 6 board with a few pits in dead ends. As many marbles as you need.' },
  M: { name: 'Medium', n: 8, loops: 5, traps: 9, edges: 3, lives: 5, blurb: 'An 8 by 8 board, pits in the side passages and three beside the route. Five marbles.' },
  H: { name: 'Hard', n: 10, loops: 4, traps: 16, edges: 8, lives: 3, blurb: 'A 10 by 10 board with pits right beside the route, so the marble has to hug the far wall. Three marbles.' }
};
var BALL = 0.27, WALL = 0.12, PIT = 0.33, DROP = 0.2, GRAV = 30, MAX_TILT = 0.2;
function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/* ---------- The maze ---------- */
function generate(tierKey, seed) {
  var T = TIERS[tierKey], n = T.n, rnd = rng(seed), open = {}; // open["a|b"]: cells a and b (a < b) are joined
  function id(x, z) { return z * n + x; }
  function join(a, b) { open[Math.min(a, b) + '|' + Math.max(a, b)] = 1; }
  function joined(a, b) { return !!open[Math.min(a, b) + '|' + Math.max(a, b)]; }
  function nbrs(c) { var x = c % n, z = Math.floor(c / n), out = []; if (x > 0) out.push(c - 1); if (x < n - 1) out.push(c + 1); if (z > 0) out.push(c - n); if (z < n - 1) out.push(c + n); return out; }
  var seen = [0], stack = [0], mark = {}; mark[0] = 1;
  while (stack.length) { var c = stack[stack.length - 1], opts = nbrs(c).filter(function (q) { return !mark[q]; }); if (!opts.length) { stack.pop(); continue; } var nx = opts[Math.floor(rnd() * opts.length)]; join(c, nx); mark[nx] = 1; stack.push(nx); seen.push(nx); }
  for (var l = 0, g = 0; l < T.loops && g < 200; g++) { var a = Math.floor(rnd() * n * n), bs = nbrs(a).filter(function (q) { return !joined(a, q); }); if (bs.length) { join(a, bs[Math.floor(rnd() * bs.length)]); l++; } }
  function route(from, to, avoid) { var prev = {}, q = [from]; prev[from] = -1; for (var i = 0; i < q.length; i++) { if (q[i] === to) break; nbrs(q[i]).forEach(function (m) { if (prev[m] === undefined && joined(q[i], m) && !(avoid && avoid[m])) { prev[m] = q[i]; q.push(m); } }); }
    if (prev[to] === undefined) return null; var path = []; for (var p = to; p >= 0; p = prev[p]) path.unshift(p); return path; }
  var start = id(0, n - 1), goal = id(n - 1, 0), path = route(start, goal), onPath = {}; path.forEach(function (c) { onPath[c] = 1; });
  var cellPos = function (c) { return [(c % n) - (n - 1) / 2, Math.floor(c / n) - (n - 1) / 2]; };
  // pits in the middle of cells off the route: stray into one and the marble is gone
  var off = shuffle(Array.from({ length: n * n }, function (v, i) { return i; }).filter(function (c) { return !onPath[c]; }), rnd), pits = [], trapCell = {};
  off.slice(0, T.traps).forEach(function (c) { var p = cellPos(c); pits.push({ x: p[0], z: p[1], cell: c }); trapCell[c] = 1; });
  // pits beside the route on straight stretches: there is room to pass, but only along the far wall
  var straight = []; for (var i = 2; i < path.length - 2; i++) { var d1 = path[i] - path[i - 1], d2 = path[i + 1] - path[i]; if (d1 === d2) straight.push(i); }
  shuffle(straight, rnd); var used = {};
  straight.forEach(function (i) { if (pits.length >= T.traps + T.edges || used[i - 1] || used[i + 1]) return; used[i] = 1; var c = path[i], p = cellPos(c), alongX = Math.abs(path[i + 1] - c) === 1, side = rnd() < 0.5 ? -1 : 1;
    pits.push({ x: p[0] + (alongX ? 0 : side * 0.27), z: p[1] + (alongX ? side * 0.27 : 0), cell: c, edge: true }); });
  // checkpoints: a third and two thirds of the way along
  var checks = [path[Math.floor(path.length / 3)], path[Math.floor(path.length * 2 / 3)]].filter(function (c) { return !pits.some(function (p) { return p.cell === c; }); });
  // walls as rectangles [x0, z0, x1, z1]
  var walls = [], h = n / 2, t = WALL / 2;
  walls.push([-h - WALL, -h - WALL, h + WALL, -h], [-h - WALL, h, h + WALL, h + WALL], [-h - WALL, -h, -h, h], [h, -h, h + WALL, h]);
  for (var z = 0; z < n; z++) for (var x = 0; x < n; x++) { var cc = id(x, z), px = x - h, pz = z - h;
    if (x < n - 1 && !joined(cc, cc + 1)) walls.push([px + 1 - t, pz - t, px + 1 + t, pz + 1 + t]);
    if (z < n - 1 && !joined(cc, cc + n)) walls.push([px - t, pz + 1 - t, px + 1 + t, pz + 1 + t]); }
  return { n: n, tier: tierKey, seed: seed, walls: walls, pits: pits, start: cellPos(start), goal: cellPos(goal), path: path.map(cellPos), checks: checks.map(cellPos), lives: T.lives };
}

/* ---------- The ball ---------- */
function newBall(level, at) { return { x: at[0], z: at[1], vx: 0, vz: 0, hit: 0 }; }
/* Move the ball for dt seconds with the board tilted by (ax, az) radians. Returns 'pit', 'goal' or null. */
function step(level, b, ax, az, dt) {
  var sub = 4, h = dt / sub; b.hit = 0;
  for (var s = 0; s < sub; s++) {
    b.vx += GRAV * Math.sin(ax) * 5 / 7 * h; b.vz += GRAV * Math.sin(az) * 5 / 7 * h; // a solid ball rolling without slipping
    var drag = Math.max(0, 1 - 0.5 * h); b.vx *= drag; b.vz *= drag; b.x += b.vx * h; b.z += b.vz * h;
    for (var w = 0; w < level.walls.length; w++) { var r = level.walls[w]; if (b.x < r[0] - BALL || b.x > r[2] + BALL || b.z < r[1] - BALL || b.z > r[3] + BALL) continue;
      var cx = Math.max(r[0], Math.min(r[2], b.x)), cz = Math.max(r[1], Math.min(r[3], b.z)), dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz);
      if (d >= BALL) continue; if (d < 1e-6) { // centre inside the wall: push out the short way
        var l = b.x - r[0], rr = r[2] - b.x, u = b.z - r[1], dn = r[3] - b.z, m = Math.min(l, rr, u, dn); if (m === l) { dx = -1; dz = 0; } else if (m === rr) { dx = 1; dz = 0; } else if (m === u) { dx = 0; dz = -1; } else { dx = 0; dz = 1; } d = -m; } else { dx /= d; dz /= d; }
      b.x += dx * (BALL - d); b.z += dz * (BALL - d); var vn = b.vx * dx + b.vz * dz; if (vn < 0) { b.vx -= 1.38 * vn * dx; b.vz -= 1.38 * vn * dz; b.hit = Math.max(b.hit, -vn); } }
    for (var p = 0; p < level.pits.length; p++) { var pit = level.pits[p]; if (Math.hypot(b.x - pit.x, b.z - pit.z) < DROP) return 'pit'; }
    if (Math.hypot(b.x - level.goal[0], b.z - level.goal[1]) < 0.24) return 'goal';
  }
  return null;
}
/* A simple pilot that steers along the route, used to check that a maze can be finished. */
function pilot(level, maxTime) {
  var b = newBall(level, level.start), k = 1, t = 0, dt = 1 / 60;
  while (t < maxTime) { var tgt = level.path[Math.min(k, level.path.length - 1)], avoidX = 0, avoidZ = 0;
    level.pits.forEach(function (p) { if (p.edge && Math.hypot(p.x - b.x, p.z - b.z) < 1.2) { var c = [Math.round(p.x + (level.n - 1) / 2) - (level.n - 1) / 2, Math.round(p.z + (level.n - 1) / 2) - (level.n - 1) / 2]; avoidX += (c[0] - p.x) * 0.55; avoidZ += (c[1] - p.z) * 0.55; } });
    var ex = tgt[0] + avoidX - b.x, ez = tgt[1] + avoidZ - b.z; if (Math.hypot(tgt[0] - b.x, tgt[1] - b.z) < 0.3 && k < level.path.length - 1) k++;
    var ax = Math.max(-MAX_TILT, Math.min(MAX_TILT, ex * 0.5 - b.vx * 0.2)), az = Math.max(-MAX_TILT, Math.min(MAX_TILT, ez * 0.5 - b.vz * 0.2)), res = step(level, b, ax, az, dt); t += dt;
    if (res === 'goal') return t; if (res === 'pit') return -1; }
  return 0;
}
var Logic = { TIERS: TIERS, generate: generate, newBall: newBall, step: step, pilot: pilot, MAX_TILT: MAX_TILT, BALL: BALL };
if (typeof module !== 'undefined') { module.exports = Logic; return; }
window.__marble = Logic;

/* ---------- Drawing ---------- */
var T3 = window.THREE, kit, level, ball, board, ballMesh, S = 1, tilt = { x: 0, z: 0, tx: 0, tz: 0 }, lives, falls, check, state = 'idle', seed = 0, stick, keys = {}, sensor = null, zero = null, checkMeshes = [], cup;
var BALLS = [['steel', 'Steel'], ['glass', 'Glass swirl'], ['wood', 'Wooden bead'], ['stone', 'Stone']];
function ballMat(kind) {
  var stripes = function (a, b, c) { return kit.canvasTex(128, function (x, s) { x.fillStyle = a; x.fillRect(0, 0, s, s); x.strokeStyle = b; x.lineWidth = 9; for (var i = -1; i < 5; i++) { x.beginPath(); x.moveTo(0, i * 40); x.bezierCurveTo(40, i * 40 + 50, 90, i * 40 - 30, s, i * 40 + 34); x.stroke(); }
    x.strokeStyle = c; x.lineWidth = 3; for (var j = 0; j < 4; j++) { x.beginPath(); x.moveTo(0, j * 40 + 16); x.bezierCurveTo(40, j * 40 + 60, 90, j * 40 - 16, s, j * 40 + 48); x.stroke(); } }); };
  if (kind === 'glass') return new T3.MeshPhysicalMaterial({ map: stripes('#bfe9ff', '#ea4fae', '#1f7af0'), roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 });
  if (kind === 'wood') return new T3.MeshStandardMaterial({ map: kit.texture('wood'), color: 0xc98a4a, roughness: 0.6, envMapIntensity: 0.4 });
  if (kind === 'stone') return new T3.MeshStandardMaterial({ map: kit.texture('stone'), color: 0xb9b2a6, roughness: 0.85 });
  return new T3.MeshStandardMaterial({ map: stripes('#f4f6fa', '#c2c8d4', '#ffffff'), color: 0xffffff, metalness: 1, roughness: 0.16, envMapIntensity: 1.4 });
}
function build(demo) {
  var mat = kit.setup.mat, n = level.n, pal = kit.PALETTE[mat]; S = 8.6 / n;
  board = new T3.Group(); board.position.y = 1.7; board.scale.setScalar(S); kit.root.add(board);
  var post = kit.mesh(new T3.CylinderGeometry(0.22, 0.34, 1.5, 14), kit.mat('metal', 0x8a8f9c)); post.position.y = 0.75; kit.root.add(post);
  var knob = kit.mesh(new T3.SphereGeometry(0.34, 16, 12), kit.mat('metal', 0xd9a441)); knob.position.y = 1.45; kit.root.add(knob);
  var foot = kit.mesh(new T3.CylinderGeometry(1.6, 1.9, 0.2, 30), kit.mat('metal', 0x6b7080)); foot.position.y = 0.1; kit.root.add(foot);
  var base = kit.mesh(kit.roundBox(n + 0.7, 0.3, n + 0.7, 0.08), kit.mat(mat, pal[1], { shade: 0.8 })); base.position.y = -0.3; board.add(base);
  var floorTex = kit.canvasTex(512, function (x, s) { x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s); var u = s / n;
    x.strokeStyle = 'rgba(0,0,0,0.07)'; x.lineWidth = 1; for (var i = 1; i < n; i++) { x.beginPath(); x.moveTo(i * u, 0); x.lineTo(i * u, s); x.moveTo(0, i * u); x.lineTo(s, i * u); x.stroke(); }
    function P(p) { return [(p[0] + n / 2) * u, (p[1] + n / 2) * u]; }
    level.pits.forEach(function (p) { var c = P([p.x, p.z]), g = x.createRadialGradient(c[0], c[1] - PIT * u * 0.25, PIT * u * 0.2, c[0], c[1], PIT * u * 1.12); g.addColorStop(0, '#000'); g.addColorStop(0.8, '#0c0a10'); g.addColorStop(0.88, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(c[0], c[1], PIT * u * 1.12, 0, 7); x.fill(); });
    level.checks.forEach(function (p) { var c = P(p); x.strokeStyle = 'rgba(240,176,58,0.85)'; x.lineWidth = u * 0.05; x.beginPath(); x.arc(c[0], c[1], u * 0.3, 0, 7); x.stroke(); });
    var s0 = P(level.start); x.fillStyle = 'rgba(31,122,240,0.3)'; x.beginPath(); x.arc(s0[0], s0[1], u * 0.34, 0, 7); x.fill();
    var g0 = P(level.goal), gg = x.createRadialGradient(g0[0], g0[1], 2, g0[0], g0[1], u * 0.4); gg.addColorStop(0, '#04130d'); gg.addColorStop(0.62, '#0a2a1c'); gg.addColorStop(0.7, '#5fd0a0'); gg.addColorStop(1, 'rgba(95,208,160,0)'); x.fillStyle = gg; x.beginPath(); x.arc(g0[0], g0[1], u * 0.4, 0, 7); x.fill(); });
  floorTex.wrapS = floorTex.wrapT = T3.ClampToEdgeWrapping;
  var floorMat = kit.mat(mat, pal[2] || pal[0]); floorMat.map = floorTex; floorMat.bumpMap = null; if (mat === 'metal') { floorMat.roughnessMap = null; floorMat.roughness = 0.5; floorMat.metalness = 0.6; }
  var floor = kit.mesh(new T3.PlaneGeometry(n, n).rotateX(-Math.PI / 2), floorMat, false); floor.position.y = 0.002; board.add(floor);
  var wallMat = kit.mat(mat, pal[0]), geos = level.walls.map(function (r) { var g = new T3.BoxGeometry(r[2] - r[0], 0.42, r[3] - r[1]); g.translate((r[0] + r[2]) / 2, 0.21, (r[1] + r[3]) / 2); return g; });
  board.add(kit.mesh(kit.planarUV(kit.merge(geos), 0.6), wallMat));
  cup = new T3.PointLight(0x5fd0a0, 0.9, 3 * S); cup.position.set(level.goal[0], 0.5, level.goal[1]); board.add(cup);
  ballMesh = kit.mesh(new T3.SphereGeometry(BALL, 28, 20), ballMat(kit.setup.ball)); board.add(ballMesh);
  ball = newBall(level, level.start); ballMesh.position.set(ball.x, BALL, ball.z);
}
function hud() { kit.stat('lives', level.lives ? lives : '∞'); }
function respawn() { ball = newBall(level, check); ballMesh.scale.setScalar(1); ballMesh.position.set(ball.x, BALL, ball.z); tilt.tx = tilt.tz = 0; state = 'roll'; }
function fell() {
  state = 'fall'; falls++; kit.buzz(40); kit.fx('drop'); var from = ballMesh.position.clone();
  kit.tween(0.3, function (t) { ballMesh.scale.setScalar(1 - t * 0.75); ballMesh.position.y = from.y - t * 0.5; }, function () {
    if (level.lives && --lives <= 0) { hud(); kit.say('That was the last marble.'); kit.finish({ won: false, title: 'Out of marbles', text: 'The last marble went down a pit. Ease off the tilt before the turns: the marble keeps the speed it has picked up.', stats: [['Pits fallen into', falls], ['Time', kit.clock(kit.elapsed())]] }); return; }
    hud(); kit.say(level.lives ? 'Down a pit. ' + lives + (lives === 1 ? ' marble' : ' marbles') + ' left.' : 'Down a pit. Back to the last ring.'); respawn(); });
}
function ballVoice() { var b = kit.setup.ball; return b === 'steel' ? 'metal' : b; }
function win() {
  state = 'won'; kit.fx('cup'); var from = ballMesh.position.clone(), secs = Math.round(kit.elapsed() * 10) / 10, parT = level.path.length + 5;
  kit.tween(0.35, function (t) { ballMesh.position.set(from.x + (level.goal[0] - from.x) * t, from.y - t * 0.2, from.z + (level.goal[1] - from.z) * t); ballMesh.scale.setScalar(1 - t * 0.35); });
  var stars = !falls && secs <= parT ? 3 : (falls <= 1 && secs <= parT * 1.8) ? 2 : 1;
  kit.finish({ won: true, title: 'In the cup', stars: stars, text: stars === 3 ? 'No pits and a quick run.' : 'Three stars for reaching the cup in ' + Math.round(parT) + ' seconds without falling into a pit.',
    stats: [['Time', secs.toFixed(1) + ' s'], ['Pits fallen into', falls]], best: { value: secs, lower: true, label: 'Best time', show: function (v) { return v.toFixed(1) + ' s'; } } });
}
function ask() { // the phone's own tilt, where the phone lets a web page read it
  if (sensor || !window.DeviceOrientationEvent) return; var on = function () { sensor = { b: 0, g: 0, ok: false }; window.addEventListener('deviceorientation', function (e) { if (e.beta === null) return; sensor.b = e.beta; sensor.g = e.gamma; sensor.ok = true; }); };
  try { if (typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') on(); else kit.say('Motion access was refused, so drag to tilt instead.'); }).catch(function () {}); else on(); } catch (e) {}
}

window.__marbleDbg = { level: function () { return level; }, ball: function () { return ball; }, tilt: function (x, z) { tilt.tx = x; tilt.tz = z; }, state: function () { return state; } };

window.CPKit.start({
  id: 'marble', name: ['Marble', 'Tilt'], startLabel: 'Set the marble down', env: 'ice', mat: 'wood', matLabel: 'Board', lookName: 'The board', mats: window.CPKit.MATS,
  extras: [{ key: 'ball', label: 'Marble', list: BALLS, def: 'steel' }, { key: 'control', label: 'How to tilt', file: 'tier', list: [['drag', 'Drag on screen'], ['phone', 'Tilt the phone']], def: 'drag',
    hint: function (v) { return v === 'phone' ? 'Hold the phone flat and tip it. The way you are holding it when the marble is set down counts as level.' : 'Put a finger anywhere and drag: the board tips the way you drag, further for a longer drag.'; } }],
  lede: 'Tip the board to roll the marble to the green cup. It gathers speed, bounces off the walls and drops into any pit it rolls over.',
  aria: 'A tilting maze with a marble. Drag to tilt the board, or use the W A S D keys. Use two fingers to turn and zoom the view.',
  tiers: TIERS, stats: [['time', 'Time'], ['lives', 'Marbles']], buttons: [['restart', 'Start over']], clockStat: 'time',
  view: { yaw: 0, pitch: 1.12, dist: 19, y: 1.6, tableR: 6.6, minPitch: 0.5 },
  bestText: function (b) { return 'Best time: ' + b.toFixed(1) + ' s'; },
  init: function (k) { kit = k;
    stick = document.createElement('div'); stick.style.cssText = 'position:absolute;width:86px;height:86px;margin:-43px 0 0 -43px;border-radius:50%;border:2px solid rgba(239,236,247,.35);pointer-events:none;z-index:2;display:none';
    stick.innerHTML = '<i style="position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(234,79,174,.85)"></i>'; document.getElementById('app').appendChild(stick);
    window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = 1; }); window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = 0; }); },
  newGame: function (k, o) {
    if (!o.retry || o.demo || !seed) seed = Math.floor(Math.random() * 1e9);
    for (var i = 0; i < 30; i++) { level = generate(o.demo ? 'E' : kit.setup.tier, (o.demo ? 77 : seed) + i * 101); if (pilot(level, 90) > 0) break; } // only deal mazes the test pilot can finish
    lives = level.lives; falls = 0; check = level.start; tilt = { x: 0, z: 0, tx: 0, tz: 0 }; zero = null; build(o.demo); state = o.demo ? 'idle' : 'roll'; stick.style.display = 'none';
    if (!o.demo) { hud(); if (kit.setup.control === 'phone') { ask(); kit.say('Tip the phone to tilt the board. Reach the green cup.'); } else kit.say('Drag anywhere to tilt the board. Reach the green cup.'); }
  },
  button: function (id) { if (id === 'restart') kit.replay(); },
  pick: function (ray, ev) {
    if (state !== 'roll' || kit.setup.control === 'phone') return null; var x0 = ev.clientX, y0 = ev.clientY, r = kit.canvas.getBoundingClientRect(), dot = stick.firstChild;
    stick.style.left = (x0 - r.left) + 'px'; stick.style.top = (y0 - r.top) + 'px'; stick.style.display = 'block'; dot.style.transform = '';
    return { move: function (r2, e) { var dx = (e.clientX - x0) / 80, dy = (e.clientY - y0) / 80, m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } dot.style.transform = 'translate(' + dx * 30 + 'px,' + dy * 30 + 'px)';
        var c = Math.cos(kit.cam.yaw), s = Math.sin(kit.cam.yaw); tilt.tx = (dx * c + dy * s) * MAX_TILT; tilt.tz = (-dx * s + dy * c) * MAX_TILT; },
      end: function () { tilt.tx = tilt.tz = 0; stick.style.display = 'none'; } };
  },
  frame: function (dt, live) {
    if (!board) return;
    if (live && state === 'roll') {
      var kx = (keys.d || 0) - (keys.a || 0), kz = (keys.s || 0) - (keys.w || 0);
      if (kx || kz) { var c = Math.cos(kit.cam.yaw), s = Math.sin(kit.cam.yaw), m = Math.hypot(kx, kz); tilt.tx = (kx * c + kz * s) / m * MAX_TILT; tilt.tz = (-kx * s + kz * c) / m * MAX_TILT; tilt.keyed = true; } else if (tilt.keyed) { tilt.tx = tilt.tz = 0; tilt.keyed = false; }
      if (kit.setup.control === 'phone' && sensor && sensor.ok) { if (!zero) zero = { b: sensor.b, g: sensor.g }; var land = (window.orientation || 0), gx = (sensor.g - zero.g) / 22, gz = (sensor.b - zero.b) / 22;
        if (land === 90) { var t1 = gx; gx = gz; gz = -t1; } else if (land === -90 || land === 270) { var t2 = gx; gx = -gz; gz = t2; }
        var mm = Math.hypot(gx, gz); if (mm > 1) { gx /= mm; gz /= mm; } var cc = Math.cos(kit.cam.yaw), ss = Math.sin(kit.cam.yaw); tilt.tx = (gx * cc + gz * ss) * MAX_TILT; tilt.tz = (-gx * ss + gz * cc) * MAX_TILT; }
    }
    var ease = Math.min(1, dt * 9); tilt.x += (tilt.tx - tilt.x) * ease; tilt.z += (tilt.tz - tilt.z) * ease; // the board follows the hand quickly but not instantly
    board.rotation.z = -tilt.x; board.rotation.x = tilt.z;
    if (cup) cup.intensity = 0.8 + Math.sin(performance.now() / 300) * 0.25;
    if (!live || state !== 'roll') { kit.roll(0); return; }
    var px = ball.x, pz = ball.z, res = step(level, ball, tilt.x, tilt.z, dt); if (ball.hit > 2.2) kit.buzz(Math.min(18, ball.hit * 3)); if (ball.hit > 0.7) kit.hit(ballVoice(), Math.min(1, ball.hit / 7));
    kit.roll(Math.hypot(ball.vx, ball.vz), ballVoice());
    ballMesh.position.set(ball.x, BALL, ball.z);
    var dx = ball.x - px, dz = ball.z - pz, d = Math.hypot(dx, dz); if (d > 1e-5) ballMesh.rotateOnWorldAxis(new T3.Vector3(dz / d, 0, -dx / d), d / BALL); // it rolls, it does not slide
    level.checks.forEach(function (c) { if (check !== c && Math.hypot(ball.x - c[0], ball.z - c[1]) < 0.3 && level.checks.indexOf(c) >= level.checks.indexOf(check)) { check = c; kit.say('Ring reached. A lost marble comes back here.'); kit.buzz(10); kit.fx('ding'); } });
    if (res === 'pit') fell(); else if (res === 'goal') win();
  },
  context: function () { return { seed: seed, tier: level && level.tier, falls: falls, lives: lives, ball: ball && [ball.x, ball.z] }; }
});
})();
