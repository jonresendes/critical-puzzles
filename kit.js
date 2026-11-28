/* Critical Puzzles kit: everything the hands-on games share.
   One stage (renderer, camera you move with drag, pinch, twist and two-finger slide), believable wood,
   plastic, metal and stone, the environments the puzzle sits in, and the setup / play / results screens.
   A game hands CPKit.start() a description of itself and draws its pieces into kit.root, whose y = 0 is the
   top of the table. */
(function () {
'use strict';
var T = window.THREE;
var $ = function (id) { return document.getElementById(id); };
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { rnd = rnd || Math.random; for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

var MATS = [['wood', 'Wood'], ['plastic', 'Plastic'], ['metal', 'Metal'], ['stone', 'Stone']];
var ENVS = [['study', 'Study'], ['forest', 'Forest'], ['neon', 'Neon lab'], ['temple', 'Stone temple'], ['ocean', 'Ocean floor'], ['ice', 'Ice cavern']];
var ENV_BLURB = {
  study: 'A dark desk under one warm lamp.', forest: 'A mossy stump in a clearing, with fireflies.',
  neon: 'A lit platform in a lab above a city of light.', temple: 'A stone dais between old columns and braziers.',
  ocean: 'A flat rock on the sea bed among kelp.', ice: 'A slab of ice in a cavern under the aurora.'
};

/* ---------- Textures drawn in code ---------- */
function canvasTex(size, draw, repeat) {
  var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; if (repeat) t.repeat.set(repeat, repeat); t.anisotropy = 4; return t;
}
function speckle(x, s, r, n, a, light) { for (var i = 0; i < n; i++) { x.fillStyle = 'rgba(' + (r() < light ? '255,255,255' : '0,0,0') + ',' + (r() * a) + ')'; var w = 1 + r() * 3; x.fillRect(r() * s, r() * s, w, w); } }
var tex = {};
function texture(name) {
  if (tex[name]) return tex[name];
  var r = rng(11 + name.length * 7);
  var make = {
    wood: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#c9c9c9'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 90; i++) { x.strokeStyle = 'rgba(' + (r() < 0.5 ? '70,70,70' : '255,255,255') + ',' + (0.05 + r() * 0.16) + ')'; x.lineWidth = 0.6 + r() * 2.2;
        var y = r() * s, w = 3 + r() * 8; x.beginPath(); x.moveTo(0, y); for (var px = 0; px <= s; px += 16) x.lineTo(px, y + Math.sin(px / 40 + i) * w); x.stroke(); } }); },
    stone: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, s, s); speckle(x, s, r, 2600, 0.16, 0.45);
      for (var i = 0; i < 7; i++) { x.strokeStyle = 'rgba(0,0,0,' + (0.1 + r() * 0.12) + ')'; x.lineWidth = 0.7; var px = r() * s, py = r() * s; x.beginPath(); x.moveTo(px, py);
        for (var k = 0; k < 6; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } }); },
    brushed: function () { return canvasTex(128, function (x, s) { x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 260; i++) { x.fillStyle = 'rgba(' + (r() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (r() * 0.14) + ')'; x.fillRect(0, r() * s, s, 1); } }); },
    moss: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#31452c'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 900; i++) { x.fillStyle = ['rgba(70,110,52,0.35)', 'rgba(22,40,24,0.4)', 'rgba(104,128,60,0.22)', 'rgba(60,46,30,0.3)'][Math.floor(r() * 4)];
        x.beginPath(); x.arc(r() * s, r() * s, 2 + r() * 9, 0, 7); x.fill(); } }, 14); },
    bark: function () { return canvasTex(128, function (x, s) { x.fillStyle = '#4a3a2c'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 70; i++) { x.strokeStyle = 'rgba(' + (r() < 0.6 ? '20,14,10' : '120,96,70') + ',' + (0.2 + r() * 0.3) + ')'; x.lineWidth = 1 + r() * 3; var px = r() * s; x.beginPath(); x.moveTo(px, 0);
        for (var py = 0; py <= s; py += 16) x.lineTo(px + Math.sin(py / 18 + i) * 3, py); x.stroke(); } }); },
    rings: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#b08a5c'; x.fillRect(0, 0, s, s);
      for (var i = 2; i < 46; i++) { x.strokeStyle = 'rgba(70,44,20,' + (0.12 + r() * 0.25) + ')'; x.lineWidth = 0.8 + r() * 1.6; x.beginPath(); x.ellipse(s / 2 + 4, s / 2 - 3, i * 2.9 + r() * 1.5, i * 2.75 + r() * 1.5, 0, 0, 7); x.stroke(); }
      x.strokeStyle = 'rgba(40,24,10,0.5)'; x.lineWidth = 1.2; for (var k = 0; k < 5; k++) { var a = r() * 7; x.beginPath(); x.moveTo(s / 2, s / 2); x.lineTo(s / 2 + Math.cos(a) * s * 0.45, s / 2 + Math.sin(a) * s * 0.45); x.stroke(); } }); },
    grid: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.strokeStyle = '#2be4ff'; x.lineWidth = 2; x.strokeRect(0, 0, s, s);
      x.strokeStyle = 'rgba(43,228,255,0.3)'; x.lineWidth = 1; for (var i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4, s); x.moveTo(0, i * s / 4); x.lineTo(s, i * s / 4); x.stroke(); } }, 30); },
    windows: function () { return canvasTex(64, function (x, s) { x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) if (r() < 0.3) { x.fillStyle = r() < 0.5 ? '#39d7ff' : '#ff5ec8'; x.fillRect(i * 8 + 2, j * 8 + 2, 4, 3); } }); },
    slabs: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#a58a66'; x.fillRect(0, 0, s, s); speckle(x, s, r, 2200, 0.14, 0.4);
      x.strokeStyle = 'rgba(40,26,14,0.75)'; x.lineWidth = 3; x.strokeRect(0, 0, s, s); x.beginPath(); x.moveTo(s / 2, 0); x.lineTo(s / 2, s / 2); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.stroke();
      x.strokeStyle = 'rgba(40,26,14,0.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(30, 150); x.lineTo(70, 190); x.lineTo(64, 230); x.stroke(); }, 16); },
    sand: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#c9b88a'; x.fillRect(0, 0, s, s); speckle(x, s, r, 1800, 0.1, 0.5);
      for (var i = 0; i < 16; i++) { x.strokeStyle = 'rgba(90,70,40,0.16)'; x.lineWidth = 3; var y = i * 16 + 6; x.beginPath(); x.moveTo(0, y); for (var px = 0; px <= s; px += 16) x.lineTo(px, y + Math.sin(px / 256 * Math.PI * 4 + i * 0.5) * 5); x.stroke(); } }, 12); },
    snow: function () { return canvasTex(256, function (x, s) { x.fillStyle = '#dfeaf4'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 260; i++) { x.fillStyle = r() < 0.5 ? 'rgba(150,180,215,0.16)' : 'rgba(255,255,255,0.4)'; x.beginPath(); x.arc(r() * s, r() * s, 3 + r() * 14, 0, 7); x.fill(); } }, 10); },
    dot: function () { return canvasTex(64, function (x, s) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }); }
  };
  return (tex[name] = make[name]());
}
function skyTex(stops) { var c = document.createElement('canvas'); c.width = 4; c.height = 256; var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); x.fillStyle = g; x.fillRect(0, 0, 4, 256); var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }

/* ---------- Geometry helpers ---------- */
/* Give box-built shapes UVs from their position, so wood grain runs on across a whole piece. */
function planarUV(geo, scale) {
  var p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2), s = scale || 0.5;
  for (var i = 0; i < p.count; i++) { var ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) { uv[i * 2] = p.getZ(i) * s; uv[i * 2 + 1] = p.getY(i) * s * 0.35 + p.getX(i) * 0.13; }
    else if (ay >= az) { uv[i * 2] = p.getX(i) * s; uv[i * 2 + 1] = p.getZ(i) * s * 0.35 + p.getY(i) * 0.13; }
    else { uv[i * 2] = p.getX(i) * s; uv[i * 2 + 1] = p.getY(i) * s * 0.35 + p.getZ(i) * 0.13; } }
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); return geo;
}
function merge(geos) { // join plain (non-indexed) geometries into one
  var n = 0; geos = geos.map(function (g) { return g.index ? g.toNonIndexed() : g; }); geos.forEach(function (g) { n += g.attributes.position.count; });
  var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), o = 0;
  geos.forEach(function (g) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  var out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); return out;
}
/* A piece made of unit cubes. Sides that face the same piece run flush; open sides are set in by `gap`, so
   two pieces sitting next to each other show a fine line between them. Cells are [x, y, z] corners. */
function voxelGeo(cells, gap, unit) {
  var u = unit || 1, g = gap === undefined ? 0.03 : gap, has = {}, geos = [];
  cells.forEach(function (c) { has[c.join(',')] = 1; });
  cells.forEach(function (c) {
    var lo = [0, 0, 0], hi = [0, 0, 0];
    for (var a = 0; a < 3; a++) { var m = c.slice(), p = c.slice(); m[a]--; p[a]++;
      lo[a] = c[a] * u + (has[m.join(',')] ? 0 : g); hi[a] = (c[a] + 1) * u - (has[p.join(',')] ? 0 : g); }
    var b = new T.BoxGeometry(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); b.translate((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2); geos.push(b);
  });
  return planarUV(merge(geos), 0.5 / u);
}
function roundRect(w, h, r) { var s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
/* A block with softened edges, lying on the x/z plane with its base at y = 0. */
function roundBox(w, h, d, r) {
  r = Math.min(r === undefined ? 0.06 : r, w / 2 - 0.001, d / 2 - 0.001, h / 2 - 0.001);
  var g = new T.ExtrudeGeometry(roundRect(w - 2 * r, d - 2 * r, r), { depth: h - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, r, 0); return planarUV(g, 0.5);
}

/* ---------- The kit ---------- */
function start(def) {
  var app = $('app'), kit = { def: def, MATS: MATS, ENVS: ENVS, rng: rng, shuffle: shuffle, clock: clock, esc: esc, store: store, load: load,
    planarUV: planarUV, merge: merge, voxelGeo: voxelGeo, roundBox: roundBox, roundRect: roundRect, texture: texture, canvasTex: canvasTex };
  var tiers = def.tiers, tierKeys = Object.keys(tiers), mats = def.mats || MATS.slice(0, 3), extras = def.extras || [];
  var view = def.view || {}, R = view.tableR || 6;

  /* ----- saved choices ----- */
  var setup = load('cp-' + def.id + '-setup') || {};
  if (!tiers[setup.tier]) setup.tier = tierKeys[0];
  if (!mats.some(function (m) { return m[0] === setup.mat; })) setup.mat = def.mat || mats[0][0];
  if (!ENVS.some(function (m) { return m[0] === setup.env; })) setup.env = def.env || 'study';
  extras.forEach(function (x) { if (!x.list.some(function (m) { return m[0] === setup[x.key]; })) setup[x.key] = x.def || x.list[0][0]; });
  kit.setup = setup;
  var bests = load('cp-' + def.id + '-best') || {};

  /* ----- page ----- */
  function fileHTML(n, name, descId, body) { return '<details class="file"><summary><span class="lock" aria-hidden="true"></span><span class="ft"><span class="kick">File 0' + n + '</span><span class="fname">' + name +
    '</span><span class="fdesc"' + (descId.charAt(0) === '#' ? ' id="' + descId.slice(1) + '">' : '>' + descId) + '</span></span></summary><div class="fbody">' + body + '</div></details>'; }
  function group(label, id, hintId) { return '<div class="group"><span class="label">' + label + '</span><div class="chips" id="' + id + '"></div>' + (hintId ? '<p class="hint" id="' + hintId + '"></p>' : '') + '</div>'; }
  var lookBody = group(def.matLabel || 'Material', 'k-mats') + extras.filter(function (x) { return x.file !== 'tier'; }).map(function (x) { return group(x.label, 'k-x-' + x.key, x.hint ? 'k-xh-' + x.key : ''); }).join('');
  var tierBody = group('Difficulty', 'k-tiers', 'k-blurb') + extras.filter(function (x) { return x.file === 'tier'; }).map(function (x) { return group(x.label, 'k-x-' + x.key, x.hint ? 'k-xh-' + x.key : ''); }).join('') + '<p class="hint" id="k-best"></p>';
  app.dataset.screen = 'setup';
  app.innerHTML = '<canvas id="view" tabindex="0" aria-label="' + esc(def.aria || '3D puzzle. Drag to look around it, pinch to zoom.') + '"></canvas>' +
    '<section id="setup"><div class="peek"></div><div><a class="btn" href="index.html">&larr; Games</a><h1>' + esc(def.name[0]) + ' <span>' + esc(def.name[1]) + '</span></h1></div>' +
    '<p class="lede">' + esc(def.lede) + '</p><div class="files">' +
    fileHTML(1, 'Difficulty', '#d-tier', tierBody) + fileHTML(2, def.lookName || 'The pieces', '#d-look', lookBody) +
    fileHTML(3, 'The setting', '#d-env', group('Environment', 'k-envs', 'k-envblurb') + (window.CPSound && CPSound.supported ? group('Sound', 'k-sound', 'k-soundnote') : '')) +
    fileHTML(4, 'The app', 'Version, updates and bug reports', '<div class="group"><p class="hint" id="upd-version"></p><div class="row"><button id="upd-check" type="button">Check for update</button>' +
      '<button type="button" data-bug-open>&#128030; Report a bug</button></div><p class="hint" id="upd-status" role="status" aria-live="polite"></p></div>') +
    '</div><div class="group"><div class="row"><button id="start" class="primary" type="button">' + esc(def.startLabel || 'Start') + '</button></div></div></section>' +
    '<header id="hud"><button id="to-setup" type="button">&larr; Setup</button><button id="recentre" type="button">Recentre</button>' + (window.CPSound && CPSound.supported ? '<button id="snd" type="button" aria-label="Sound">&#9834;</button>' : '') +
    (def.buttons || []).map(function (b) { return '<button id="b-' + b[0] + '" type="button">' + esc(b[1]) + '</button>'; }).join('') +
    '<dl id="stats">' + (def.stats || []).map(function (s) { return '<div><dt class="label">' + esc(s[1]) + '</dt><dd id="s-' + s[0] + '">0</dd></div>'; }).join('') + '</dl></header>' +
    '<div id="pad"></div><p id="status" role="status" aria-live="polite"></p>' +
    '<div id="note" class="card" hidden role="dialog" aria-labelledby="note-title"><h2 id="note-title"></h2><div id="note-body"></div><div class="row"><button id="close-note" class="primary" type="button">Continue</button></div></div>' +
    '<div id="end" class="card" hidden role="dialog" aria-labelledby="end-title"><h2 id="end-title"></h2><p class="stars" id="end-stars" aria-hidden="true"></p><p id="end-text"></p><dl id="end-stats"></dl>' +
    '<div class="row"><button id="again" class="primary" type="button">Next puzzle</button><button id="end-look" type="button">Look at the puzzle</button><button id="end-setup" type="button">Change setup</button></div></div>' +
    '<div id="endbar" hidden><button id="show-results" class="primary" type="button">Show results</button><button id="endbar-again" type="button">Next puzzle</button></div>';

  var canvas = $('view'), renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { renderer = null; }
  if (!renderer) { $('setup').insertAdjacentHTML('beforeend', '<p class="hint">This device could not start 3D graphics, so the puzzle cannot be shown.</p>'); $('start').disabled = true; return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  var scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, 0.1, 400);
  var envGroup = new T.Group(), root = new T.Group(); scene.add(envGroup); scene.add(root);
  kit.scene = scene; kit.camera = camera; kit.renderer = renderer; kit.root = root; kit.canvas = canvas; kit.R = R;

  /* ----- materials ----- */
  kit.mat = function (kind, color, o) {
    o = o || {}; var c = new T.Color(color); if (o.shade) c.multiplyScalar(o.shade); var m;
    if (kind === 'wood') m = new T.MeshStandardMaterial({ color: c, map: texture('wood'), bumpMap: texture('wood'), bumpScale: 0.012, roughness: 0.72, metalness: 0, envMapIntensity: 0.4 });
    else if (kind === 'metal') m = new T.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 1, roughnessMap: texture('brushed'), envMapIntensity: 1.0 });
    else if (kind === 'stone') m = new T.MeshStandardMaterial({ color: c, map: texture('stone'), bumpMap: texture('stone'), bumpScale: 0.03, roughness: 0.95, metalness: 0, envMapIntensity: 0.2 });
    else m = new T.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.55 });
    if (o.emissive) { m.emissive = new T.Color(o.emissive); m.emissiveIntensity = o.glow === undefined ? 0.5 : o.glow; }
    return m;
  };
  /* Colours that suit each material: the same five slots, so a game can ask for "slot 2" in any of them. */
  kit.PALETTE = {
    wood: [0xc7925a, 0x8a5a34, 0xe0bf8a, 0x6d4a35, 0xa9703c, 0xd9a86a, 0x7b5a40],
    plastic: [0xea4fae, 0x1f7af0, 0x12b8a6, 0xf0b03a, 0x8a45e0, 0xf2603c, 0xe9ecf2],
    metal: [0xd9dee8, 0xd9a441, 0xc47a52, 0x7f8aa0, 0xe8c9a0, 0x9aa7b8, 0x5b6474],
    stone: [0xb9ab97, 0x8d8f93, 0xc9a27a, 0x6f7a72, 0xa39a8c, 0xd6cdbd, 0x7d6d62]
  };
  kit.mesh = function (geo, mat, shadow) { var m = new T.Mesh(geo, mat); m.castShadow = shadow !== false; m.receiveShadow = true; return m; };
  kit.clear = function (g) { while (g.children.length) { var c = g.children[0]; g.remove(c); c.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); } };

  /* ----- environments ----- */
  var pmrem = new T.PMREMGenerator(renderer), envTick = null, keyLight = null, envT = 0, nearList = [];
  /* Tall scenery near the table fades out while it stands between you and the puzzle, so the setting never gets in the way. */
  function near(m) { m.material = m.material.clone(); m.material.transparent = true; m.userData.full = m.material.opacity; nearList.push({ m: m, a: Math.atan2(m.position.x, m.position.z), r: Math.hypot(m.position.x, m.position.z) }); return m; }
  function fadeNear(camDist) { var reach = camDist * Math.cos(cam.pitch) + 5;
    for (var i = 0; i < nearList.length; i++) { var n = nearList[i], d = Math.abs(n.a - cam.yaw) % 6.2832; if (d > Math.PI) d = 6.2832 - d; var wide = 0.42 + 3 / Math.max(6, n.r);
      var t = n.r > reach ? 1 : Math.max(0, Math.min(1, (d - wide) / 0.22)); n.m.material.opacity = n.m.userData.full * t; n.m.visible = t > 0.02; } }
  function reflections(sky, a, b, c) { // a small lit box the metal can mirror, tinted to the environment
    var env = new T.Scene(), g = new T.BoxGeometry(1, 1, 1);
    var add = function (col, x, y, z, sx, sy, sz) { var m = new T.Mesh(g, new T.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); env.add(m); };
    env.background = new T.Color(sky); add(a, -3, 9, 1, 7, 0.5, 9); add(b, -9, 2, 0, 0.5, 6, 8); add(c, 9, 1, 3, 0.5, 5, 5); add(sky, 0, -9, 0, 14, 0.5, 14); add(a, 2, 4, 9, 4, 3, 0.5); add(c, 4, 9, -5, 3, 0.5, 3);
    try { var old = scene.environment; scene.environment = pmrem.fromScene(env, 0.04).texture; if (old) old.dispose(); } catch (e) {}
  }
  function eMesh(geo, mat, x, y, z, shadow) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.receiveShadow = true; m.castShadow = !!shadow; envGroup.add(m); return m; }
  function std(color, o) { o = o || {}; return new T.MeshStandardMaterial({ color: color, roughness: o.rough === undefined ? 0.9 : o.rough, metalness: o.metal || 0, map: o.map || null,
    emissive: new T.Color(o.emissive || 0), emissiveIntensity: o.glow === undefined ? 1 : o.glow, emissiveMap: o.emap || null, transparent: !!o.opacity, opacity: o.opacity || 1, flatShading: !!o.flat, side: o.side || T.FrontSide, envMapIntensity: o.env === undefined ? 0.3 : o.env }); }
  function sky(stops, fog, near, far) { var m = eMesh(new T.SphereGeometry(180, 24, 16), new T.MeshBasicMaterial({ map: skyTex(stops), side: T.BackSide, fog: false, depthWrite: false })); m.receiveShadow = false;
    scene.fog = new T.Fog(fog, near, far); }
  function key(color, intensity, x, y, z) {
    var l = new T.DirectionalLight(color, intensity); l.position.set(x, y, z); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0008; l.shadow.normalBias = 0.02; l.shadow.radius = 3;
    var s = R + 3, c = l.shadow.camera; c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 80; c.updateProjectionMatrix();
    envGroup.add(l); envGroup.add(l.target); keyLight = l; return l;
  }
  function light(l, x, y, z) { l.position.set(x, y, z); envGroup.add(l); return l; }
  function motes(n, color, size, place, opacity) { // slow drifting points: dust, fireflies, bubbles, snow
    var pos = new Float32Array(n * 3), seed = [], r = rng(n * 31 + size * 100 | 0);
    for (var i = 0; i < n; i++) { var p = place(r); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; seed.push([p[0], p[1], p[2], r() * 6.28, 0.4 + r() * 0.9]); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var m = new T.Points(g, new T.PointsMaterial({ color: color, size: size, map: texture('dot'), transparent: true, opacity: opacity || 0.8, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
    m.frustumCulled = false; envGroup.add(m); return { pos: pos, seed: seed, geo: g, n: n };
  }
  function ringPlace(rMin, rMax, yMin, yMax) { return function (r) { var a = r() * 6.283, d = rMin + r() * (rMax - rMin); return [Math.cos(a) * d, yMin + r() * (yMax - yMin), Math.sin(a) * d]; }; }
  function around(n, rMin, rMax, seed, fn) { var r = rng(seed); for (var i = 0; i < n; i++) { var a = (i + r() * 0.7) / n * 6.283, d = rMin + r() * (rMax - rMin); fn(Math.cos(a) * d, Math.sin(a) * d, r, i, a); } }

  var BUILD = {
    study: function () {
      sky([[0, '#0c0a12'], [0.5, '#1c182a'], [1, '#0a0810']], 0x110f18, 30, 120); renderer.toneMappingExposure = 0.84;
      reflections(0x2a2636, 0xffffff, 0xbfc8ff, 0xffd9b0);
      light(new T.HemisphereLight(0xdcd6ff, 0x2a2438, 0.28), 0, 10, 0);
      var top = eMesh(new T.CylinderGeometry(R + 2.2, R + 2.2, 0.5, 64), kit.mat('wood', 0x5b3a26), 0, -0.25, 0); top.material.map = texture('wood').clone(); top.material.map.repeat.set(3, 3); top.material.map.needsUpdate = true;
      eMesh(new T.CylinderGeometry(R + 2.0, R + 1.6, 0.35, 64), std(0x2a1c14), 0, -0.67, 0);
      eMesh(new T.CylinderGeometry(1.4, 2.2, 14, 24), std(0x1c130e), 0, -7.8, 0);
      eMesh(new T.CircleGeometry(60, 40).rotateX(-Math.PI / 2), std(0x0b0a10, { rough: 1 }), 0, -14.8, 0);
      var bk = rng(5), cols = [0x6b2d3a, 0x2d4a6b, 0x355a44, 0x7a5a2a];
      for (var i = 0; i < 3; i++) { var b = eMesh(roundBox(2.3 - i * 0.2, 0.42, 1.6, 0.05), std(cols[i], { rough: 0.6 }), -(R + 0.5), i * 0.43, -(R * 0.55), true); b.rotation.y = 0.5 + (bk() - 0.5) * 0.5; }
      var l = new T.SpotLight(0xffe2b0, 1.9, 0, 0.6, 0.6, 0); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.001; l.shadow.radius = 3; envGroup.add(l); envGroup.add(l.target); keyLight = l;
      var dust = motes(70, 0xffe6bd, 0.09, ringPlace(0, R + 3, 0.5, 9), 0.5);
      envTick = function (dt, t) { var a = 0.05 * Math.sin(t * 1.1), b = 0.03 * Math.sin(t * 0.83 + 1); l.position.set(a * 14, 15, 8 + b * 14); l.target.position.set(-a * 3, 0, -b * 3);
        for (var i = 0; i < dust.n; i++) { var s = dust.seed[i]; dust.pos[i * 3] = s[0] + Math.sin(t * 0.2 * s[4] + s[3]) * 0.6; dust.pos[i * 3 + 1] = s[1] + Math.sin(t * 0.13 * s[4] + s[3] * 2) * 0.5; } dust.geo.attributes.position.needsUpdate = true; };
    },
    forest: function () {
      sky([[0, '#06100f'], [0.42, '#0e2420'], [0.52, '#1d3a2c'], [0.6, '#0b1711'], [1, '#050a07']], 0x0d1c16, 22, 78); renderer.toneMappingExposure = 0.88;
      reflections(0x12241b, 0xcfe6ff, 0x6fa77a, 0xffdca0);
      light(new T.HemisphereLight(0x8fc0a4, 0x1a140c, 0.4), 0, 10, 0); key(0xcfe0ff, 1.1, 7, 16, 6); light(new T.PointLight(0xffc37a, 0.5, 26), -6, 3, 7);
      eMesh(new T.CircleGeometry(90, 48).rotateX(-Math.PI / 2), std(0x8a9a86, { map: texture('moss'), rough: 1 }), 0, -2.6, 0);
      var bark = std(0xffffff, { map: texture('bark'), rough: 1 }), stump = eMesh(new T.CylinderGeometry(R + 0.9, R + 1.5, 2.6, 28, 1, true), bark, 0, -1.3, 0, true); bark.map.repeat.set(6, 1);
      eMesh(new T.CircleGeometry(R + 0.9, 28).rotateX(-Math.PI / 2), std(0xffffff, { map: texture('rings'), rough: 0.85 }), 0, 0, 0);
      around(7, R + 1.2, R + 1.5, 3, function (x, z, r, i, a) { var c = eMesh(new T.ConeGeometry(0.9 + r() * 0.5, 3.6, 7), bark, x, -2.2, z, true); c.rotation.order = 'YXZ'; c.rotation.set(0, -a, -1.15); }); // roots
      var leaf = [std(0x13281b, { flat: true }), std(0x17301e, { flat: true }), std(0x0f2216, { flat: true })];
      around(22, R + 9, R + 34, 9, function (x, z, r) { var h = 20 + r() * 12, w = 0.7 + r() * 0.8; near(eMesh(new T.CylinderGeometry(w * 0.6, w, h, 8), bark, x, h / 2 - 2.6, z));
        for (var k = 0; k < 3; k++) near(eMesh(new T.ConeGeometry(5 - k * 0.9 + r(), 7 + r() * 2, 7), leaf[k], x, 15 + k * 4 + r() * 2, z)); });
      around(26, R + 2.5, R + 14, 14, function (x, z, r) { var f = eMesh(new T.ConeGeometry(0.5 + r() * 0.7, 0.9 + r() * 1.3, 5), leaf[Math.floor(r() * 3)], x, -2.1, z); f.scale.y = 0.9 + r(); f.rotation.y = r() * 3; });
      var cap = std(0x2f6f86, { emissive: 0x39d8c8, glow: 0.9, rough: 0.5 }), stem = std(0xd8d2bc);
      around(9, R + 1.7, R + 4.5, 21, function (x, z, r) { var s = 0.25 + r() * 0.35; eMesh(new T.CylinderGeometry(s * 0.25, s * 0.32, s * 1.6, 6), stem, x, -2.6 + s * 0.8, z); eMesh(new T.SphereGeometry(s, 10, 6, 0, 6.283, 0, 1.6), cap, x, -2.6 + s * 1.55, z); });
      var fly = motes(46, 0xd8ff7a, 0.34, ringPlace(R * 0.2, R + 16, -1.5, 8), 0.95);
      envTick = function (dt, t) { for (var i = 0; i < fly.n; i++) { var s = fly.seed[i]; fly.pos[i * 3] = s[0] + Math.sin(t * 0.35 * s[4] + s[3]) * 1.6; fly.pos[i * 3 + 1] = s[1] + Math.sin(t * 0.5 * s[4] + s[3] * 3) * 0.9; fly.pos[i * 3 + 2] = s[2] + Math.cos(t * 0.3 * s[4] + s[3]) * 1.6; }
        fly.geo.attributes.position.needsUpdate = true; };
    },
    neon: function () {
      sky([[0, '#03040c'], [0.44, '#0b1030'], [0.5, '#3a1558'], [0.56, '#0a0c22'], [1, '#02030a']], 0x080a1c, 30, 130); renderer.toneMappingExposure = 0.80;
      reflections(0x0a0d24, 0xe8f6ff, 0x2be4ff, 0xff4fd0);
      light(new T.HemisphereLight(0x8fa8ff, 0x10081c, 0.45), 0, 10, 0); key(0xe6f4ff, 1.1, 6, 15, 8);
      light(new T.PointLight(0xff4fd0, 1.1, 40), -R - 5, 4, 3); light(new T.PointLight(0x2be4ff, 1.1, 40), R + 5, 3, -4);
      eMesh(new T.CircleGeometry(120, 48).rotateX(-Math.PI / 2), std(0x0a0c1a, { rough: 0.32, metal: 0.7, emissive: 0xffffff, emap: texture('grid'), glow: 0.5, env: 0.8 }), 0, -1.4, 0);
      var dark = std(0x1a1d2e, { rough: 0.35, metal: 0.85, env: 1 });
      eMesh(new T.CylinderGeometry(R + 0.9, R + 1.2, 0.5, 6), dark, 0, -0.25, 0, true);
      var rim = eMesh(new T.CylinderGeometry(R + 1.25, R + 1.25, 0.09, 6, 1, true), std(0x000000, { emissive: 0x2be4ff, glow: 1.6, side: T.DoubleSide }), 0, -0.5, 0);
      eMesh(new T.CylinderGeometry(R * 0.45, R * 0.6, 0.9, 6), dark, 0, -0.95, 0);
      var glowC = std(0, { emissive: 0x2be4ff, glow: 1.5 }), glowM = std(0, { emissive: 0xff4fd0, glow: 1.5 });
      around(8, R + 12, R + 12.1, 4, function (x, z, r, i, a) { var p = near(eMesh(new T.BoxGeometry(0.9, 15, 0.9), dark, x, 6.1, z)); p.rotation.y = -a; var s = near(eMesh(new T.BoxGeometry(0.16, 13, 0.16), i % 2 ? glowC : glowM, x * 0.966, 6.1, z * 0.966)); s.rotation.y = -a; });
      var bw = std(0x0b0e1c, { rough: 0.6, emissive: 0xffffff, emap: texture('windows'), glow: 0.7 });
      around(34, 52, 86, 6, function (x, z, r) { var h = 10 + r() * 34, w = 5 + r() * 7; var b = eMesh(new T.BoxGeometry(w, h, w), bw, x, h / 2 - 1.4, z); b.rotation.y = r() * 3; });
      var rings = [0, 1, 2].map(function (i) { var t = eMesh(new T.TorusGeometry(R + 4 + i * 2.6, 0.03, 6, 90), i === 1 ? glowM : glowC, 0, -1.25 + i * 0.12, 0); t.rotation.x = Math.PI / 2; return t; });
      var holo = motes(60, 0x7af2ff, 0.16, ringPlace(R + 1.5, R + 14, -1, 12), 0.8);
      envTick = function (dt, t) { rings.forEach(function (m, i) { m.scale.setScalar(1 + Math.sin(t * 0.25 + i * 2.1) * 0.05); });
        rim.material.emissiveIntensity = 1.4 + Math.sin(t * 1.3) * 0.35;
        for (var i = 0; i < holo.n; i++) { var s = holo.seed[i]; holo.pos[i * 3 + 1] = -1 + ((s[1] + 1 + t * 0.35 * s[4]) % 13); } holo.geo.attributes.position.needsUpdate = true; };
    },
    temple: function () {
      sky([[0, '#0d0906'], [0.4, '#24170d'], [0.5, '#4a2e16'], [0.58, '#1a110a'], [1, '#090604']], 0x1c130b, 26, 95); renderer.toneMappingExposure = 0.88;
      reflections(0x2a1c10, 0xffe8c4, 0xffb86a, 0xc98a52);
      light(new T.HemisphereLight(0xc49a6a, 0x140b06, 0.32), 0, 10, 0); key(0xffdcaa, 1.0, -6, 18, 7);
      var st = std(0x6a5640, { map: texture('slabs'), rough: 1 }); eMesh(new T.CircleGeometry(100, 48).rotateX(-Math.PI / 2), st, 0, -1.8, 0);
      var block = kit.mat('stone', 0x94795a), dark = kit.mat('stone', 0x6e5a44);
      for (var i = 0; i < 3; i++) eMesh(new T.CylinderGeometry(R + 0.8 + i * 1.3, R + 0.9 + i * 1.3, 0.6, 8), i % 2 ? dark : block, 0, -0.3 - i * 0.6, 0, true).rotation.y = Math.PI / 8;
      var colGeo = new T.CylinderGeometry(1.05, 1.25, 1, 12);
      around(8, R + 10, R + 10.1, 2, function (x, z, r, i, a) { var broken = i === 2 || i === 5, h = broken ? 5 + r() * 4 : 17; var c = near(eMesh(colGeo, block, x, h / 2 - 1.8, z, true)); c.scale.y = h;
        near(eMesh(new T.BoxGeometry(3.2, 0.7, 3.2), dark, x, -1.45, z)).rotation.y = -a; if (!broken) near(eMesh(new T.BoxGeometry(3.4, 0.9, 3.4), dark, x, 15.6, z)).rotation.y = -a;
        else { var d = eMesh(new T.CylinderGeometry(1.1, 1.1, 2.6, 12), block, x * 1.18, -1.2, z * 1.18, true); d.rotation.set(Math.PI / 2, 0, r() * 3); } });
      var ringTop = eMesh(new T.TorusGeometry(R + 10, 0.9, 4, 8), dark, 0, 16.6, 0); ringTop.rotation.x = Math.PI / 2; ringTop.rotation.z = Math.PI / 8;
      var fire = [], ember = std(0x331405, { emissive: 0xff7a22, glow: 2.2 }), bronze = std(0x6b4a26, { rough: 0.45, metal: 0.9, env: 0.9 });
      around(4, R + 4.2, R + 4.3, 8, function (x, z, r, i) { eMesh(new T.CylinderGeometry(0.16, 0.45, 2.6, 8), bronze, x, -0.5, z, true); eMesh(new T.CylinderGeometry(0.95, 0.4, 0.6, 14), bronze, x, 1.05, z, true);
        var e = eMesh(new T.SphereGeometry(0.62, 12, 8), ember, x, 1.3, z); e.scale.y = 0.55; if (i % 2 === 0) fire.push(light(new T.PointLight(0xff8a3a, 1.2, 30), x, 2.4, z)); });
      var sparks = motes(40, 0xffa04a, 0.14, function (r) { var q = Math.floor(r() * 4) * Math.PI / 2 + 0.3, d = R + 4.25; return [Math.cos(q) * d + (r() - 0.5) * 0.6, 1.4 + r() * 5, Math.sin(q) * d + (r() - 0.5) * 0.6]; }, 0.9);
      var dust = motes(50, 0xffe0b0, 0.08, ringPlace(0, R + 6, 0, 10), 0.45);
      envTick = function (dt, t) { fire.forEach(function (f, i) { f.intensity = 1.1 + Math.sin(t * 9 + i * 2) * 0.16 + Math.sin(t * 23 + i) * 0.1; }); ember.emissiveIntensity = 2 + Math.sin(t * 7) * 0.4;
        for (var i = 0; i < sparks.n; i++) { var s = sparks.seed[i]; sparks.pos[i * 3 + 1] = 1.4 + ((s[1] + t * 0.9 * s[4]) % 5.5); sparks.pos[i * 3] = s[0] + Math.sin(t * 2 * s[4] + s[3]) * 0.25; } sparks.geo.attributes.position.needsUpdate = true;
        for (var j = 0; j < dust.n; j++) { var d = dust.seed[j]; dust.pos[j * 3 + 1] = d[1] + Math.sin(t * 0.15 * d[4] + d[3]) * 0.7; } dust.geo.attributes.position.needsUpdate = true; };
    },
    ocean: function () {
      sky([[0, '#5fc3d6'], [0.2, '#1f7f9e'], [0.48, '#0b4863'], [0.6, '#06283c'], [1, '#03131d']], 0x083246, 16, 72); renderer.toneMappingExposure = 0.88;
      reflections(0x0b4058, 0xdff8ff, 0x49c6d8, 0x2a8fb0);
      light(new T.HemisphereLight(0x6fc4d8, 0x06212e, 0.5), 0, 10, 0); var sun = key(0xd6f6ff, 1.0, 3, 18, 4);
      eMesh(new T.CircleGeometry(90, 48).rotateX(-Math.PI / 2), std(0x5f868e, { map: texture('sand'), rough: 1 }), 0, -2.4, 0);
      var rock = kit.mat('stone', 0x6f7f86), rock2 = kit.mat('stone', 0x55666e);
      eMesh(new T.CylinderGeometry(R + 0.7, R + 1.1, 0.7, 9), rock, 0, -0.35, 0, true);
      around(9, R + 0.1, R + 1.5, 12, function (x, z, r) { var m = eMesh(new T.DodecahedronGeometry(1.5 + r() * 1.1, 0), rock2, x, -2.1, z, true); m.scale.y = 0.7; m.rotation.y = r() * 3; }); // boulders round the foot of the rock, all below its top
      var weed = std(0x2f8f5a, { rough: 0.8, side: T.DoubleSide, emissive: 0x0d3d28, glow: 0.6 }), kelp = [];
      around(18, R + 4, R + 22, 17, function (x, z, r) { var h = 7 + r() * 9, g = new T.PlaneGeometry(0.5 + r() * 0.5, h, 1, 10); g.translate(0, h / 2, 0); var m = near(eMesh(g, weed, x, -2.4, z)); m.rotation.y = r() * 3; kelp.push({ g: g, base: g.attributes.position.array.slice(), ph: r() * 6, h: h }); });
      var cor = [std(0xff7a8a, { rough: 0.7 }), std(0xffa64d, { rough: 0.7 }), std(0xc86bd9, { rough: 0.7 })];
      around(10, R + 2, R + 9, 23, function (x, z, r) { var c = cor[Math.floor(r() * 3)]; for (var k = 0; k < 5; k++) { var b = eMesh(new T.CylinderGeometry(0.1, 0.22, 1 + r() * 1.6, 6), c, x + (r() - 0.5) * 0.7, -1.8, z + (r() - 0.5) * 0.7); b.rotation.set((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9); } });
      var fishMat = std(0xf2b441, { rough: 0.5, emissive: 0x402800, glow: 0.6 }), fish = [];
      for (var i = 0; i < 6; i++) { var f = new T.Group(), body = new T.Mesh(new T.ConeGeometry(0.28, 1.1, 6), fishMat); body.rotation.z = -Math.PI / 2; body.scale.z = 0.45; f.add(body);
        var tail = new T.Mesh(new T.ConeGeometry(0.26, 0.45, 4), fishMat); tail.rotation.z = Math.PI / 2; tail.position.x = -0.7; tail.scale.z = 0.2; f.add(tail); envGroup.add(f); fish.push({ g: f, r: R + 9 + i * 2.6, y: 2 + i * 1.3, sp: (0.07 + i * 0.012) * (i % 2 ? -1 : 1), ph: i * 1.1 }); }
      var bub = motes(55, 0xcff6ff, 0.2, ringPlace(R + 1, R + 15, -2, 13), 0.6);
      envTick = function (dt, t) { sun.intensity = 0.95 + Math.sin(t * 1.7) * 0.09 + Math.sin(t * 2.9) * 0.05;
        kelp.forEach(function (k) { var a = k.g.attributes.position.array; for (var i = 0; i < a.length; i += 3) { var y = k.base[i + 1] / k.h; a[i] = k.base[i] + Math.sin(t * 0.8 + k.ph + y * 3) * y * y * 1.1; a[i + 2] = Math.cos(t * 0.6 + k.ph + y * 2) * y * y * 0.5; } k.g.attributes.position.needsUpdate = true; });
        fish.forEach(function (f) { var a = t * f.sp + f.ph; f.g.position.set(Math.cos(a) * f.r, f.y + Math.sin(t * 0.4 + f.ph) * 0.5, Math.sin(a) * f.r); f.g.rotation.y = -a - (f.sp > 0 ? Math.PI / 2 : -Math.PI / 2); });
        for (var i = 0; i < bub.n; i++) { var s = bub.seed[i]; bub.pos[i * 3 + 1] = -2 + ((s[1] + 2 + t * 0.7 * s[4]) % 15); bub.pos[i * 3] = s[0] + Math.sin(t * 1.3 * s[4] + s[3]) * 0.3; } bub.geo.attributes.position.needsUpdate = true; };
    },
    ice: function () {
      sky([[0, '#040814'], [0.3, '#0a2a3e'], [0.42, '#1c6b6a'], [0.5, '#2a3f7a'], [0.6, '#0a1524'], [1, '#04070d']], 0x0c1c2a, 30, 120); renderer.toneMappingExposure = 0.84;
      reflections(0x12283a, 0xc8e4f2, 0x7fe9d9, 0x8fb4ff);
      light(new T.HemisphereLight(0x9fc8ee, 0x0c1420, 0.34), 0, 10, 0); key(0xdcecff, 0.68, -5, 17, 8); light(new T.PointLight(0x4ff0d0, 0.8, 40), R + 6, 5, -6); light(new T.PointLight(0x8f8cff, 0.6, 40), -R - 6, 4, 2);
      eMesh(new T.CircleGeometry(100, 48).rotateX(-Math.PI / 2), std(0x2c4462, { map: texture('snow'), rough: 0.85 }), 0, -1.5, 0);
      var ice = new T.MeshPhysicalMaterial({ color: 0x5fa8c8, roughness: 0.15, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.8, envMapIntensity: 0.9, emissive: 0x0a3c52, emissiveIntensity: 0.5 });
      var slabTop = new T.MeshPhysicalMaterial({ color: 0x35607e, roughness: 0.3, metalness: 0.05, clearcoat: 0.8, envMapIntensity: 0.7, emissive: 0x0c3446, emissiveIntensity: 0.35 });
      eMesh(new T.CylinderGeometry(R + 0.9, R + 1.3, 1.5, 7), slabTop, 0, -0.75, 0, true).rotation.y = 0.2;
      var crystal = new T.OctahedronGeometry(1, 0);
      around(14, R + 4, R + 20, 31, function (x, z, r) { for (var k = 0; k < 3; k++) { var c = near(eMesh(crystal, ice, x + (r() - 0.5) * 2.4, -1.5, z + (r() - 0.5) * 2.4)); var s = 0.6 + r() * 1.1; c.scale.set(s, s * (2.6 + r() * 3), s); c.position.y += c.scale.y * 0.55; c.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); } });
      around(20, R + 2, R + 26, 37, function (x, z, r) { var h = 3 + r() * 7, c = near(eMesh(new T.ConeGeometry(0.5 + r() * 0.9, h, 6), ice, x, 19 - h / 2, z)); c.rotation.x = Math.PI; });
      var aur = [], aTex = canvasTex(64, function (x, s) { var g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(80,255,200,0.9)'); g.addColorStop(0.75, 'rgba(120,120,255,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
      for (var i = 0; i < 3; i++) { var m = eMesh(new T.CylinderGeometry(70 + i * 12, 70 + i * 12, 34, 40, 1, true, i * 2, 1.9), new T.MeshBasicMaterial({ map: aTex, transparent: true, opacity: 0.3, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending, fog: false }), 0, 30 + i * 6, 0); m.receiveShadow = false; aur.push(m); }
      var snowP = motes(110, 0xffffff, 0.13, ringPlace(0, R + 16, -1, 15), 0.85);
      envTick = function (dt, t) { aur.forEach(function (m, i) { m.material.opacity = 0.22 + Math.sin(t * 0.3 + i * 2) * 0.12; m.rotation.y = t * 0.012 * (i + 1); });
        for (var i = 0; i < snowP.n; i++) { var s = snowP.seed[i]; snowP.pos[i * 3 + 1] = 15 - ((15 - s[1] + t * 0.8 * s[4]) % 16); snowP.pos[i * 3] = s[0] + Math.sin(t * 0.6 * s[4] + s[3]) * 0.5; } snowP.geo.attributes.position.needsUpdate = true; };
    }
  };
  var envNow = null;
  function setEnv(name) {
    if (envNow === name) return; envNow = name; kit.clear(envGroup); envTick = null; keyLight = null; scene.fog = null; nearList = [];
    BUILD[name](); kit.env = name; if (window.CPSound) CPSound.setEnv(name);
  }

  /* ----- camera you carry around the table ----- */
  var HOME = { yaw: view.yaw === undefined ? 0.5 : view.yaw, pitch: view.pitch === undefined ? 0.85 : view.pitch, dist: view.dist || 16, y: view.y || 0 };
  var cam = { yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist, target: new T.Vector3(0, HOME.y, 0), minPitch: view.minPitch === undefined ? 0.12 : view.minPitch, maxPitch: view.maxPitch === undefined ? 1.52 : view.maxPitch };
  kit.cam = cam;
  kit.recentre = function () { cam.yaw = HOME.yaw; cam.pitch = HOME.pitch; cam.dist = HOME.dist; cam.target.set(0, HOME.y, 0); };
  kit.setHome = function (o) { for (var k in o) HOME[k] = o[k]; kit.recentre(); };
  function spin(dx, dy) { cam.yaw -= dx * 0.008; cam.pitch = Math.min(cam.maxPitch, Math.max(cam.minPitch, cam.pitch + dy * 0.006)); }
  function pan(dx, dy) { var unit = cam.dist * 0.75 / canvas.clientHeight, s = Math.sin(cam.yaw), c = Math.cos(cam.yaw);
    cam.target.x += (-dx * c - dy * s) * unit; cam.target.z += (dx * s - dy * c) * unit; var r = Math.hypot(cam.target.x, cam.target.z); if (r > R) { cam.target.x *= R / r; cam.target.z *= R / r; } }
  function zoom(f) { cam.dist = Math.min(HOME.dist * 2.2, Math.max(HOME.dist * 0.3, cam.dist * f)); }

  /* ----- pointers: one finger on a piece moves the piece, one finger beside it looks around, two fingers zoom, twist and slide the view ----- */
  var ptrs = {}, gesture = null, raycaster = new T.Raycaster(), lastTap = 0, over = false, playing = false, tweens = [], t0 = 0, tEnd = 0;
  kit.raycaster = raycaster;
  function aim(ev) { var rect = canvas.getBoundingClientRect(); raycaster.setFromCamera({ x: (ev.clientX - rect.left) / rect.width * 2 - 1, y: -((ev.clientY - rect.top) / rect.height * 2 - 1) }, camera); return raycaster.ray; }
  kit.hitPlane = function (ray, normal, point) { var pl = new T.Plane().setFromNormalAndCoplanarPoint(normal, point), out = new T.Vector3(); return ray.intersectPlane(pl, out) ? out : null; };
  kit.hits = function (objects, deep) { return raycaster.intersectObjects(objects, !!deep); };
  /* how far one world unit along `dir` at `at` moves on screen, in pixels: used to turn a finger drag into a slide along an axis */
  kit.screenDir = function (at, dir) { var a = at.clone().project(camera), b = at.clone().add(dir).project(camera), w = canvas.clientWidth / 2, h = canvas.clientHeight / 2; return { x: (b.x - a.x) * w, y: -(b.y - a.y) * h }; };
  function two() { var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; return { d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
  canvas.addEventListener('pointerdown', function (ev) {
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var n = Object.keys(ptrs).length;
    if (n === 1) { gesture = { t0: Date.now(), moved: 0, tap: true, drag: null }; if (playing && !over && def.pick) gesture.drag = def.pick(aim(ev), ev) || null; }
    else { if (gesture && gesture.drag && gesture.drag.end) gesture.drag.end(false, true); gesture = { two: two(), tap: false }; }
  });
  canvas.addEventListener('pointermove', function (ev) {
    var p = ptrs[ev.pointerId]; if (!p || !gesture) return; var dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
    var n = Object.keys(ptrs).length;
    if (n === 1 && gesture.two === undefined) { gesture.moved += Math.abs(dx) + Math.abs(dy); if (gesture.moved > 10) gesture.tap = false;
      if (gesture.drag) { if (gesture.drag.move) gesture.drag.move(aim(ev), ev, dx, dy); } else if (!gesture.tap) spin(dx, dy); }
    else if (n >= 2) { var t = two(), o = gesture.two || t; zoom(o.d / Math.max(20, t.d));
      var da = t.ang - o.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; cam.yaw += da; pan(t.cx - o.cx, t.cy - o.cy); gesture = { two: t, tap: false }; }
  });
  function release(ev) {
    var g = gesture, had = ptrs[ev.pointerId]; delete ptrs[ev.pointerId];
    if (!Object.keys(ptrs).length) gesture = null; else if (g) g.tap = false;
    if (!had || !g) return;
    var tap = g.tap && ev.type === 'pointerup' && Date.now() - g.t0 < 500;
    if (g.drag && g.drag.end) g.drag.end(tap, ev.type !== 'pointerup');
    if (!tap || !playing) return;
    var used = !over && def.tap ? def.tap(aim(ev), ev) : false, now = Date.now();
    if (!used && !g.drag) { if (now - lastTap < 300) { kit.recentre(); lastTap = 0; } else lastTap = now; }
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', function (ev) { ev.preventDefault(); zoom(ev.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });
  canvas.addEventListener('keydown', function (ev) { var k = ev.key;
    if (k === 'ArrowLeft') spin(-12, 0); else if (k === 'ArrowRight') spin(12, 0); else if (k === 'ArrowUp') spin(0, -12); else if (k === 'ArrowDown') spin(0, 12); else if (k === '+' || k === '=') zoom(0.9); else if (k === '-') zoom(1.1); else { if (def.key && playing && !over && def.key(k)) ev.preventDefault(); return; } ev.preventDefault(); });

  /* ----- what a game can say and show ----- */
  kit.say = function (t) { $('status').textContent = t; };
  kit.stat = function (k, v) { var e = $('s-' + k); if (e) e.textContent = v; };
  kit.tween = function (dur, fn, done) { var t = { t: 0, dur: dur, fn: fn, done: done }; tweens.push(t); return t; };
  /* Piece sounds (ambience.js): a knock, one step of a slide, a named effect, a rolling marble. */
  ['hit', 'scrape', 'fx', 'roll'].forEach(function (k) { kit[k] = function (a, b, c) { if (window.CPSound) CPSound[k](a, b, c); }; });
  kit.buzz = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} };
  kit.elapsed = function () { return ((over ? tEnd : performance.now()) - t0) / 1000; };
  kit.isOver = function () { return over; };
  kit.button = function (id) { return $('b-' + id); };
  kit.pad = function (html) { $('pad').innerHTML = html; };
  kit.note = function (title, html) { $('note-title').textContent = title; $('note-body').innerHTML = html; $('note').hidden = false; };
  kit.best = function (key) { return bests[key || setup.tier]; };
  kit.tierName = function () { return tiers[setup.tier].name; };
  /* The end of a puzzle: {won, title, text, stars, stats: [[label, value]], best: {value, label, lower, show}} */
  kit.finish = function (res) {
    if (over) return; over = true; tEnd = performance.now(); app.classList.add('over');
    var rows = (res.stats || []).slice();
    if (res.won && res.best) { var b = res.best, key = b.key || setup.tier, old = bests[key], better = old === undefined || old === null || (b.lower ? b.value < old : b.value > old);
      if (better) { bests[key] = b.value; store('cp-' + def.id + '-best', bests); }
      rows.push([b.label, (b.show ? b.show(better ? b.value : old) : (better ? b.value : old)) + (better && old !== undefined && old !== null ? ' (new best)' : '')]); }
    $('end-title').textContent = res.title; $('end-stars').textContent = res.won ? '★★★'.slice(0, res.stars || 1) + '☆☆☆'.slice(0, 3 - (res.stars || 1)) : ''; $('end-stars').hidden = !res.won;
    $('end-text').textContent = res.text || '';
    $('end-stats').innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    $('again').textContent = $('endbar-again').textContent = res.won ? (def.nextLabel || 'Next puzzle') : 'Try again'; lastWon = res.won;
    setTimeout(function () { if (over && playing) $('end').hidden = false; }, res.delay === undefined ? 900 : res.delay);
    kit.buzz(res.won ? [20, 60, 20] : 30); kit.fx(res.won ? 'win' : 'lose');
  };
  var lastWon = true;

  /* ----- setup screen ----- */
  function label(list, v) { var f = list.filter(function (t) { return t[0] === v; })[0]; return f ? f[1] : ''; }
  function chips(id, list, key, after) {
    var box = $(id); box.innerHTML = '';
    list.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.textContent = it[1]; b.setAttribute('aria-pressed', String(setup[key] === it[0]));
      b.onclick = function () { setup[key] = it[0]; store('cp-' + def.id + '-setup', setup); chips(id, list, key, after); describe(); if (after) after(); }; box.appendChild(b); });
  }
  function describe() {
    $('d-tier').textContent = tiers[setup.tier].name; $('k-blurb').textContent = tiers[setup.tier].blurb;
    $('d-look').textContent = [label(mats, setup.mat)].concat(extras.filter(function (x) { return x.file !== 'tier'; }).map(function (x) { return label(x.list, setup[x.key]); })).join(', ');
    $('d-env').textContent = label(ENVS, setup.env) + (sound ? ', sound ' + CPSound.level() : ''); $('k-envblurb').textContent = ENV_BLURB[setup.env]; soundUI();
    extras.forEach(function (x) { if (x.hint) $('k-xh-' + x.key).textContent = typeof x.hint === 'function' ? x.hint(setup[x.key]) : x.hint; });
    var b = bests[setup.tier]; $('k-best').textContent = b === undefined || b === null || !def.bestText ? '' : def.bestText(b);
  }
  /* Sound: one choice for every game. The note button in play switches it off and back on. */
  var sound = window.CPSound && CPSound.supported, lastLevel = 'quiet';
  function soundUI() { if (!sound) return; var box = $('k-sound'), lv = CPSound.level(); box.innerHTML = ''; if (lv !== 'off') lastLevel = lv;
    CPSound.LEVELS.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.textContent = it[1]; b.setAttribute('aria-pressed', String(lv === it[0])); b.onclick = function () { CPSound.setLevel(it[0]); describe(); }; box.appendChild(b); });
    $('k-soundnote').textContent = lv === 'off' ? 'Sound is off.' : CPSound.NOTES[setup.env]; var h = $('snd'); h.setAttribute('aria-pressed', String(lv !== 'off')); h.style.opacity = lv === 'off' ? 0.5 : 1; h.title = lv === 'off' ? 'Sound is off' : 'Sound is on'; }
  if (sound) $('snd').onclick = function () { CPSound.setLevel(CPSound.level() === 'off' ? lastLevel : 'off'); soundUI(); kit.say(CPSound.level() === 'off' ? 'Sound off.' : 'Sound on.'); };
  function demo() { tweens.length = 0; kit.clear(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); kit.pad(''); setEnv(setup.env); def.newGame(kit, { demo: true }); }
  function toSetup() {
    playing = false; over = false; app.classList.remove('over'); app.dataset.screen = 'setup'; ['note', 'end', 'endbar'].forEach(function (id) { $(id).hidden = true; });
    chips('k-tiers', tierKeys.map(function (k) { return [k, tiers[k].name]; }), 'tier', demo); chips('k-mats', mats, 'mat', demo); chips('k-envs', ENVS, 'env', demo);
    extras.forEach(function (x) { chips('k-x-' + x.key, x.list, x.key, demo); });
    describe(); kit.recentre(); demo(); layout();
  }
  function play() {
    ['note', 'end', 'endbar'].forEach(function (id) { $(id).hidden = true; }); tweens.length = 0; kit.clear(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); kit.pad('');
    over = false; playing = true; app.classList.remove('over'); app.dataset.screen = 'play'; setEnv(setup.env); kit.say(''); t0 = performance.now(); kit.recentre(); layout();
    def.newGame(kit, { demo: false, retry: !lastWon }); lastWon = true;
  }
  kit.restartClock = function () { t0 = performance.now(); };
  kit.replay = function () { lastWon = false; play(); }; // the same puzzle again from the start
  $('start').onclick = play; $('again').onclick = play; $('endbar-again').onclick = play;
  $('to-setup').onclick = toSetup; $('end-setup').onclick = toSetup; $('recentre').onclick = function () { kit.recentre(); };
  $('close-note').onclick = function () { $('note').hidden = true; };
  $('end-look').onclick = function () { $('end').hidden = true; $('endbar').hidden = false; };
  $('show-results').onclick = function () { $('endbar').hidden = true; $('end').hidden = false; };
  (def.buttons || []).forEach(function (b) { $('b-' + b[0]).onclick = function () { if (playing && !over && def.button) def.button(b[0]); }; });
  $('pad').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-act]'); if (b && playing && !over && def.button) def.button(b.dataset.act); });
  window.CPBugContext = function () { var s = { game: def.id, screen: app.dataset.screen, setup: setup, over: over }; try { if (def.context) s.state = def.context(); } catch (e) { s.error = String(e); } return s; };

  /* ----- drawing ----- */
  function layout() { var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); }
  window.addEventListener('resize', layout);
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; envT += dt;
    for (var i = tweens.length - 1; i >= 0; i--) { var t = tweens[i]; t.t += dt; var k = Math.min(1, t.t / t.dur); t.fn(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, k); if (k >= 1) { var ix = tweens.indexOf(t); if (ix >= 0) tweens.splice(ix, 1); if (t.done) t.done(); } }
    if (envTick) envTick(dt, envT);
    if (def.frame) def.frame(dt, playing && !over);
    var w = canvas.clientWidth, h = canvas.clientHeight, vx = 0, vy = 0, vw = w, vh = h, inSetup = !playing;
    if (inSetup) { if (w >= 820) { vx = Math.round(w * 0.44); vw = w - vx; } else { vh = Math.min(h, 340); vy = h - vh; } cam.yaw += dt * 0.12; }
    if (inSetup) { renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.clear(); } // wipe the part of the page the setup scene does not cover
    renderer.setViewport(vx, vy, vw, vh); renderer.setScissor(vx, vy, vw, vh); renderer.setScissorTest(inSetup);
    camera.aspect = vw / Math.max(1, vh); if (inSetup && w < 820) camera.setViewOffset(vw, vh, 0, 70, vw, vh); else camera.clearViewOffset(); camera.updateProjectionMatrix();
    var d = cam.dist * (camera.aspect < 1 ? 0.8 / Math.max(0.5, camera.aspect) : 1) * (inSetup ? (w >= 820 ? 1.15 : 1.5) : 1), cp = Math.cos(cam.pitch);
    camera.position.set(cam.target.x + d * cp * Math.sin(cam.yaw), cam.target.y + d * Math.sin(cam.pitch), cam.target.z + d * cp * Math.cos(cam.yaw)); camera.lookAt(cam.target); fadeNear(d);
    if (playing && !over && def.clockStat) kit.stat(def.clockStat, clock(kit.elapsed()));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  if (def.init) def.init(kit);
  toSetup(); layout(); requestAnimationFrame(frame);
  kit.play = play; kit.toSetup = toSetup; window.__kit = kit;
  updates();
  return kit;
}

/* Case-file categories open one at a time. "Check for update" compares the published version
   with the one saved on this device, and installs the new one if there is one. */
function updates() {
  var files = [].slice.call(document.querySelectorAll('details.file'));
  var btn = $('upd-check'), out = $('upd-status'), ver = $('upd-version');
  function installed() {
    if (!window.caches) return Promise.resolve(0);
    return caches.keys().then(function (keys) { return keys.map(function (k) { var m = /^critical-puzzles-v(\d+)$/.exec(k); return m ? +m[1] : 0; }).reduce(function (a, b) { return Math.max(a, b); }, 0); });
  }
  function showVersion() { installed().then(function (n) { ver.textContent = n ? 'Installed version: ' + n : 'Not saved for offline use yet.'; }).catch(function () {}); }
  files.forEach(function (d) { d.addEventListener('toggle', function () {
    if (!d.open) return; files.forEach(function (o) { if (o !== d && o.parentNode === d.parentNode) o.open = false; });
    if (btn && d.contains(btn)) showVersion(); }); });
  if (!btn) return;
  showVersion();
  function fail() { out.textContent = 'Could not check. Make sure you are online, then try again.'; btn.disabled = false; }
  function forceReload() { // last resort: clear the saved copy and load everything fresh
    var jobs = [];
    if (window.caches) jobs.push(caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); }));
    if ('serviceWorker' in navigator) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  }
  btn.addEventListener('click', function () {
    btn.disabled = true; out.textContent = 'Checking…';
    fetch('sw.js?check=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (text) {
      var m = /critical-puzzles-v(\d+)/.exec(text); if (!m) throw 0; var latest = +m[1];
      return installed().then(function (have) {
        if (latest <= have) { out.textContent = 'You have the latest version (' + have + ').'; btn.disabled = false; return; }
        out.textContent = 'Version ' + latest + ' found. Installing…';
        if (!('serviceWorker' in navigator)) return forceReload();
        navigator.serviceWorker.getRegistration().then(function (reg) { return reg || navigator.serviceWorker.register('sw.js'); })
          .then(function (reg) { reg.update().catch(function () {}); }).catch(function () {});
        var tries = 0, timer = setInterval(function () {
          tries++;
          Promise.all([installed(), navigator.serviceWorker.getRegistration()]).then(function (v) {
            var reg = v[1], ready = v[0] >= latest && reg && reg.active && !reg.installing && !reg.waiting;
            if (!ready && tries < 24) return;
            clearInterval(timer); out.textContent = 'Updated. Reloading…';
            if (ready) setTimeout(function () { location.reload(); }, 500); else forceReload();
          }).catch(function () {});
        }, 500);
      });
    }).catch(fail);
  });
}
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });

window.CPKit = { start: start, rng: rng, shuffle: shuffle, MATS: MATS, ENVS: ENVS };
})();
