/* Riddle Maze collectables: table scenery and badges.
   Everything a player has found is kept on the device under one storage key. */
window.CPCollect = function (THREE, woodTex) {
  'use strict';
  var KEY = 'cp-riddle-collection';

  /* ---------- What can be found ---------- */
  var SCENERY_PER_MAZE = { E: 2, M: 2, H: 3 };
  var GROUNDS = [['wood', 'Bare table'], ['grass', 'Grass'], ['moss', 'Moss'], ['sand', 'Sand'], ['gravel', 'Gravel'], ['snow', 'Snow']];
  var OBJECTS = [['stones', 'Pile of stones'], ['boulder', 'Boulder'], ['pine', 'Pine tree'], ['oak', 'Oak tree'], ['birch', 'Birch tree'], ['bush', 'Bush'],
    ['pathstones', 'Path stones'], ['stump', 'Tree stump'], ['mushrooms', 'Mushroom patch'], ['flowers', 'Flower patch'], ['lamppost', 'Lamp post'], ['well', 'Well'],
    ['fence', 'Fence'], ['signpost', 'Signpost'], ['bench', 'Bench'], ['campfire', 'Campfire'], ['pond', 'Pond'], ['crystal', 'Crystal']];
  var BADGES = [['first', 'First escape', 'Escape any maze'], ['clean', 'Clean run', 'Escape with no wrong answers'], ['unaided', 'Unaided', 'Escape without reading a clue tablet'],
    ['three', 'Three stars', 'Earn three stars'], ['medium', 'Second floor', 'Escape a Medium maze'], ['hard', 'Top floor', 'Escape a Hard maze'],
    ['quick', 'Quick wits', 'Escape in under two minutes'], ['oil', 'Oil to spare', 'Escape a Hard maze with 4 or more oil left'], ['wins10', 'Regular', 'Escape 10 mazes'],
    ['doors25', 'Locksmith', 'Open 25 doors in total'], ['solved50', 'Scholar', 'Solve 50 different riddles'], ['solved150', 'Riddle master', 'Solve all 150 riddles'],
    ['decor10', 'Groundskeeper', 'Have 10 pieces of scenery on the table']];

  /* ---------- Saved collection ---------- */
  function load() {
    var d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    d = d && typeof d === 'object' ? d : {};
    d.scenery = d.scenery || {}; d.badges = d.badges || []; d.decor = d.decor || [];
    d.ground = d.ground || 'wood'; d.life = d.life || {}; d.life.wins = d.life.wins || { E: 0, M: 0, H: 0 }; d.life.doors = d.life.doors || 0; d.life.solved = d.life.solved || [];
    // Tidy saves from older versions: drop collectables and badges this version no longer has, so nothing unknown is drawn or listed.
    var known = function (id) { return GROUNDS.concat(OBJECTS).some(function (s) { return s[0] === id; }); };
    ['totems', 'stack'].forEach(function (k) { delete d[k]; });
    d.decor = d.decor.filter(function (it) { return it && known(it.id); });
    d.badges = d.badges.filter(function (b) { return BADGES.some(function (x) { return x[0] === b; }); });
    return d;
  }
  var data = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function sceneryName(id) { return GROUNDS.concat(OBJECTS).filter(function (s) { return s[0] === id; })[0][1]; }
  function isGround(id) { return GROUNDS.some(function (g) { return g[0] === id; }); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function rollScenery() { // grounds are rarer than objects, and a ground you already own is not offered again
    var grounds = GROUNDS.slice(1).filter(function (g) { return !data.scenery[g[0]]; });
    return grounds.length && Math.random() < 0.2 ? pick(grounds)[0] : pick(OBJECTS)[0];
  }
  function placeFinds(maze, tier) { // hide this maze's finds in rooms away from the start and the exit
    var rooms = maze.rooms.filter(function (r) { return r.id !== maze.start && r.id !== maze.exit; });
    for (var i = rooms.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rooms[i]; rooms[i] = rooms[j]; rooms[j] = t; }
    var nS = SCENERY_PER_MAZE[tier];
    rooms.forEach(function (r) { r.find = null; if (nS > 0) { r.find = { type: 'scenery', id: rollScenery() }; nS--; } });
  }
  function award(id, fresh) { if (data.badges.indexOf(id) < 0) { data.badges.push(id); fresh.push(id); } }
  function sweep(fresh) { // badges that depend on totals
    if (data.decor.length >= 10) award('decor10', fresh);
    if (data.life.doors >= 25) award('doors25', fresh);
    if (data.life.solved.length >= 50) award('solved50', fresh); if (data.life.solved.length >= 150) award('solved150', fresh);
    var wins = data.life.wins.E + data.life.wins.M + data.life.wins.H; if (wins >= 10) award('wins10', fresh);
    save(); return fresh;
  }
  function collect(find) {
    data.scenery[find.id] = (data.scenery[find.id] || 0) + 1;
    return sweep([]);
  }
  function doorOpened(riddleId) { data.life.doors++; if (riddleId && data.life.solved.indexOf(riddleId) < 0) data.life.solved.push(riddleId); return sweep([]); }
  function runWon(run) { // run: { tier, wrong, clues, stars, secs, oil }
    var fresh = []; data.life.wins[run.tier]++; award('first', fresh);
    if (run.wrong === 0) award('clean', fresh); if (run.clues === 0) award('unaided', fresh); if (run.stars === 3) award('three', fresh);
    if (run.tier === 'M') award('medium', fresh); if (run.tier === 'H') { award('hard', fresh); if (run.oil >= 4) award('oil', fresh); }
    if (run.secs < 120) award('quick', fresh);
    return sweep(fresh);
  }
  function badgeName(id) { return BADGES.filter(function (b) { return b[0] === id; })[0][1]; }

  /* ---------- Materials ---------- */
  function std(o) { var m = new THREE.MeshStandardMaterial(o); if (o.color !== undefined) m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m; } // colours are written as they should look on screen
  var flat = {};
  function col(hex, extra) { var k = hex + JSON.stringify(extra || ''); if (!flat[k]) { var o = { color: hex, roughness: 0.6, envMapIntensity: 0.3 }; for (var p in extra) o[p] = extra[p]; flat[k] = std(o); } return flat[k]; }
  function put(g, geo, mat, x, y, z, rot, scl) {
    var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    m.castShadow = m.receiveShadow = !mat.transparent; g.add(m); return m;
  }
  var sph = function (r) { return new THREE.SphereGeometry(r, 16, 12); }, cyl = function (a, b, h, s) { return new THREE.CylinderGeometry(a, b, h, s || 20); },
    box = function (x, y, z) { return new THREE.BoxGeometry(x, y, z); }, cone = function (r, h, s) { return new THREE.ConeGeometry(r, h, s || 12); },
    dome = function (r) { return new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); };

  /* ---------- Scenery for the table ---------- */
  var groundTex = {};
  function groundTexture(id) {
    if (groundTex[id]) return groundTex[id];
    var spec = { grass: ['#4f8f3a', ['#3d7a2e', '#69a84a', '#5a9a40']], moss: ['#3f6b3a', ['#2f5a33', '#557f45', '#6b8f4a']], sand: ['#d6c08a', ['#c9b078', '#e3d09c', '#bfa56c']],
      gravel: ['#8a8a8e', ['#6f6f74', '#a3a3a8', '#77757c']], snow: ['#eef2f8', ['#dfe6f0', '#ffffff', '#d6deea']] }[id];
    var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'); x.fillStyle = spec[0]; x.fillRect(0, 0, 128, 128);
    var seed = 5; var r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 700; i++) { x.fillStyle = spec[1][i % 3]; var s = id === 'gravel' ? 2 + r() * 4 : 1 + r() * 2.5; x.fillRect(r() * 128, r() * 128, s, id === 'grass' ? s * 2.2 : s); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; groundTex[id] = t; return t;
  }
  function sceneryMesh(id) { // each piece stands on y = 0 and fits in a footprint about 1.3 across
    var g = new THREE.Group(), i, ang, P = function (geo, mat, x, y, z, rot, scl) { return put(g, geo, mat, x, y, z, rot, scl); };
    var rock = col(0x8d8f96, { roughness: 0.95 }), rock2 = col(0x6f7178, { roughness: 0.95 }), bark = col(0x6a4a30, { roughness: 0.9 }), leaf = col(0x3f8f45, { roughness: 0.8 }), leaf2 = col(0x2f6f3a, { roughness: 0.8 }), plank = col(0x9b7650, { roughness: 0.8 });
    var stone = function (r) { return new THREE.DodecahedronGeometry(r, 0); };
    if (id === 'stones') { P(stone(0.3), rock, -0.15, 0.2, 0); P(stone(0.24), rock2, 0.25, 0.16, 0.1, [0.4, 1, 0]); P(stone(0.2), rock, 0.05, 0.14, -0.3, [1, 0.3, 0]); P(stone(0.18), rock2, 0, 0.42, 0, [0.7, 0.2, 0.5]); P(stone(0.13), rock, 0.3, 0.09, -0.25); }
    else if (id === 'boulder') { P(stone(0.55), rock, 0, 0.36, 0, [0.3, 0.6, 0.1], [1.1, 0.75, 0.95]); P(stone(0.2), rock2, 0.5, 0.12, 0.25); }
    else if (id === 'pine') { P(cyl(0.08, 0.1, 0.4, 8), bark, 0, 0.2, 0); P(cone(0.5, 0.7, 9), leaf2, 0, 0.65, 0); P(cone(0.4, 0.6, 9), leaf2, 0, 1.05, 0); P(cone(0.28, 0.5, 9), leaf2, 0, 1.42, 0); }
    else if (id === 'oak') { P(cyl(0.1, 0.14, 0.7, 8), bark, 0, 0.35, 0); P(sph(0.45), leaf, 0, 1.05, 0); P(sph(0.34), leaf, 0.32, 0.9, 0.1); P(sph(0.32), leaf, -0.3, 0.92, -0.12); P(sph(0.28), leaf, 0, 0.9, 0.34); }
    else if (id === 'birch') { P(cyl(0.06, 0.08, 1.1, 8), col(0xe9e6dc, { roughness: 0.8 }), 0, 0.55, 0); for (i = 0; i < 4; i++) P(box(0.13, 0.03, 0.13), col(0x2a2a2a), 0, 0.2 + i * 0.25, 0, [0, i, 0]);
      P(sph(0.34), col(0x9fbf4a, { roughness: 0.8 }), 0, 1.3, 0, null, [1, 1.2, 1]); P(sph(0.24), col(0xb5cf5a, { roughness: 0.8 }), 0.2, 1.1, 0.1); P(sph(0.22), col(0x9fbf4a, { roughness: 0.8 }), -0.2, 1.12, -0.05); }
    else if (id === 'bush') { P(sph(0.34), leaf, 0, 0.28, 0); P(sph(0.26), leaf2, 0.3, 0.22, 0.08); P(sph(0.24), leaf, -0.28, 0.2, -0.06); }
    else if (id === 'pathstones') { for (i = 0; i < 5; i++) P(cyl(0.2 - (i % 2) * 0.03, 0.22, 0.06, 7), i % 2 ? rock2 : rock, -0.55 + i * 0.28, 0.03, Math.sin(i * 1.3) * 0.16, [0, i, 0]); }
    else if (id === 'stump') { P(cyl(0.3, 0.36, 0.34, 12), bark, 0, 0.17, 0); P(cyl(0.27, 0.27, 0.02, 12), col(0xcfa978, { roughness: 0.8 }), 0, 0.35, 0); P(box(0.14, 0.1, 0.3), bark, 0.34, 0.05, 0.1, [0, 0.5, 0]); }
    else if (id === 'mushrooms') { [[0, 0, 1], [0.32, 0.1, 0.7], [-0.28, -0.14, 0.6], [0.1, -0.34, 0.5]].forEach(function (q) { P(cyl(0.05 * q[2], 0.07 * q[2], 0.26 * q[2], 8), col(0xf3ecd8), q[0], 0.13 * q[2], q[1]); P(dome(0.2 * q[2]), col(0xc8323a, { roughness: 0.4 }), q[0], 0.24 * q[2], q[1], null, [1, 0.7, 1]); }); }
    else if (id === 'flowers') { P(cyl(0.5, 0.52, 0.04, 14), leaf, 0, 0.02, 0); var cols = [0xea4fae, 0xf0b03a, 0xffffff, 0x6f8cff]; for (i = 0; i < 9; i++) { ang = i * 2.4; var rr = 0.12 + (i % 3) * 0.14; P(cyl(0.012, 0.012, 0.2, 5), leaf2, Math.sin(ang) * rr, 0.13, Math.cos(ang) * rr); P(sph(0.06), col(cols[i % 4], { roughness: 0.5 }), Math.sin(ang) * rr, 0.25, Math.cos(ang) * rr); } }
    else if (id === 'lamppost') { P(cyl(0.12, 0.16, 0.1, 10), rock2, 0, 0.05, 0); P(cyl(0.035, 0.045, 1.2, 8), col(0x2a2a30, { metalness: 0.8, roughness: 0.4 }), 0, 0.65, 0); P(box(0.2, 0.24, 0.2), col(0xfff0a0, { emissive: 0xffc850, emissiveIntensity: 1.6 }), 0, 1.36, 0); P(cone(0.2, 0.12, 4), col(0x2a2a30, { metalness: 0.8, roughness: 0.4 }), 0, 1.54, 0, [0, Math.PI / 4, 0]); }
    else if (id === 'well') { P(cyl(0.42, 0.45, 0.4, 14), rock, 0, 0.2, 0); P(cyl(0.33, 0.33, 0.02, 14), col(0x2a4f7a, { roughness: 0.1 }), 0, 0.4, 0); [-1, 1].forEach(function (s) { P(box(0.06, 0.7, 0.06), bark, s * 0.4, 0.72, 0); }); P(cone(0.6, 0.3, 4), col(0x7a3a2a, { roughness: 0.8 }), 0, 1.2, 0, [0, Math.PI / 4, 0]); P(cyl(0.03, 0.03, 0.84, 6), bark, 0, 0.95, 0, [0, 0, Math.PI / 2]); }
    else if (id === 'fence') { for (i = -1; i <= 1; i++) P(box(0.08, 0.5, 0.08), plank, i * 0.55, 0.25, 0); P(box(1.2, 0.07, 0.04), plank, 0, 0.36, 0); P(box(1.2, 0.07, 0.04), plank, 0, 0.18, 0); }
    else if (id === 'signpost') { P(cyl(0.04, 0.05, 0.9, 8), bark, 0, 0.45, 0); P(box(0.5, 0.16, 0.04), plank, 0.14, 0.75, 0, [0, 0, 0.06]); P(box(0.44, 0.14, 0.04), plank, -0.12, 0.52, 0.01, [0, 0, -0.05]); }
    else if (id === 'bench') { P(box(0.9, 0.06, 0.3), plank, 0, 0.3, 0); P(box(0.9, 0.26, 0.05), plank, 0, 0.52, -0.14, [-0.15, 0, 0]); [-1, 1].forEach(function (s) { P(box(0.07, 0.3, 0.28), bark, s * 0.36, 0.15, 0); }); }
    else if (id === 'campfire') { for (i = 0; i < 6; i++) { ang = i * Math.PI / 3; P(stone(0.1), i % 2 ? rock : rock2, Math.sin(ang) * 0.36, 0.07, Math.cos(ang) * 0.36); } for (i = 0; i < 3; i++) P(cyl(0.05, 0.05, 0.5, 6), bark, 0, 0.1, 0, [Math.PI / 2 - 0.3, i * 2.1, 0]);
      P(cone(0.16, 0.4, 8), col(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1.5 }), 0, 0.32, 0); P(cone(0.09, 0.26, 8), col(0xffd24a, { emissive: 0xffb000, emissiveIntensity: 1.6 }), 0.05, 0.28, 0.05); }
    else if (id === 'pond') { P(cyl(0.6, 0.62, 0.04, 20), rock2, 0, 0.02, 0, null, [1, 1, 0.8]); P(cyl(0.52, 0.52, 0.02, 20), col(0x2f7fc8, { roughness: 0.05, envMapIntensity: 1 }), 0, 0.045, 0, null, [1, 1, 0.8]); P(sph(0.12), leaf, 0.2, 0.06, 0.1, null, [1, 0.12, 1]); P(stone(0.12), rock, -0.5, 0.08, 0.25); }
    else if (id === 'crystal') { var cm = col(0x9a6bff, { emissive: 0x5a2fd0, emissiveIntensity: 0.9, roughness: 0.1 }); P(new THREE.OctahedronGeometry(0.26, 0), cm, 0, 0.42, 0, null, [0.7, 1.7, 0.7]); P(new THREE.OctahedronGeometry(0.16, 0), cm, 0.26, 0.24, 0.08, [0, 0, -0.4], [0.7, 1.6, 0.7]); P(new THREE.OctahedronGeometry(0.14, 0), cm, -0.22, 0.2, -0.08, [0, 0, 0.5], [0.7, 1.5, 0.7]); P(stone(0.2), rock2, 0, 0.08, 0, null, [1.4, 0.5, 1.2]); }
    else { // a ground overlay shown as a sample tile
      P(cyl(0.6, 0.6, 0.08, 28), id === 'wood' ? std({ color: 0x5a3d2b, map: woodTex, roughness: 0.6 }) : std({ map: groundTexture(id), roughness: 0.95 }), 0, 0.04, 0);
    }
    return g;
  }
  function crateMesh() { var g = new THREE.Group(), w = col(0x9b7650, { roughness: 0.8 }), b = col(0x4a3524, { roughness: 0.8 });
    put(g, box(0.4, 0.4, 0.4), w, 0, 0.2, 0); put(g, box(0.42, 0.06, 0.42), b, 0, 0.06, 0); put(g, box(0.42, 0.06, 0.42), b, 0, 0.34, 0); return g; }

  return { GROUNDS: GROUNDS, OBJECTS: OBJECTS, BADGES: BADGES,
    data: function () { return data; }, save: save, reload: function () { data = load(); return data; },
    sceneryName: sceneryName, isGround: isGround, badgeName: badgeName,
    placeFinds: placeFinds, collect: collect, doorOpened: doorOpened, runWon: runWon, sweep: sweep,
    sceneryMesh: sceneryMesh, crateMesh: crateMesh, groundTexture: groundTexture };
};
