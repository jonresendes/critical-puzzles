/* Riddle Maze collectables: totems, table scenery and badges.
   Everything a player has found is kept on the device under one storage key. */
window.CPCollect = function (THREE, woodTex) {
  'use strict';
  var KEY = 'cp-riddle-collection', H = 0.62; // every totem is the same height and the same footprint

  /* ---------- What can be found ---------- */
  var RARITY = ['Common', 'Uncommon', 'Rare', 'Golden'];
  var FINISHES = [
    { id: 'wood', name: 'Carved wood', rarity: 0 }, { id: 'stone', name: 'Grey stone', rarity: 0 }, { id: 'clay', name: 'Red clay', rarity: 0 },
    { id: 'glaze', name: 'Blue glaze', rarity: 1 }, { id: 'jade', name: 'Green jade', rarity: 1 },
    { id: 'bronze', name: 'Bronze', rarity: 2 }, { id: 'silver', name: 'Silver', rarity: 2 },
    { id: 'gold', name: 'Gold', rarity: 3 }];
  var DESIGNS = [['beaver-curled', 'Beaver, tail curled'], ['beaver-behind', 'Beaver, tail behind'], ['owl-folded', 'Owl, wings folded'], ['owl-spread', 'Owl, wings stretched'],
    ['tree', 'Tree'], ['water', 'Ball of water'], ['flame', 'Glowing flame'], ['key', 'Key'], ['lighthouse', 'Lighthouse'], ['sword', 'Sword'], ['shield', 'Shield'],
    ['fox', 'Fox'], ['turtle', 'Turtle'], ['frog', 'Frog'], ['bear', 'Bear'], ['moon', 'Crescent moon'], ['mushroom', 'Mushroom'], ['crown', 'Crown']];
  // chance of each rarity, per difficulty (percent): harder mazes hold rarer totems
  var ODDS = { E: [88, 12, 0, 0], M: [58, 30, 10, 2], H: [30, 38, 24, 8] };
  var TOTEMS_PER_MAZE = { E: [1, 0], M: [1, 0.5], H: [2, 0] }, SCENERY_PER_MAZE = { E: 2, M: 2, H: 3 }; // [certain, chance of one more]
  var GROUNDS = [['wood', 'Bare table'], ['grass', 'Grass'], ['moss', 'Moss'], ['sand', 'Sand'], ['gravel', 'Gravel'], ['snow', 'Snow']];
  var OBJECTS = [['stones', 'Pile of stones'], ['boulder', 'Boulder'], ['pine', 'Pine tree'], ['oak', 'Oak tree'], ['birch', 'Birch tree'], ['bush', 'Bush'],
    ['pathstones', 'Path stones'], ['stump', 'Tree stump'], ['mushrooms', 'Mushroom patch'], ['flowers', 'Flower patch'], ['lamppost', 'Lamp post'], ['well', 'Well'],
    ['fence', 'Fence'], ['signpost', 'Signpost'], ['bench', 'Bench'], ['campfire', 'Campfire'], ['pond', 'Pond'], ['crystal', 'Crystal']];
  var BADGES = [['first', 'First escape', 'Escape any maze'], ['clean', 'Clean run', 'Escape with no wrong answers'], ['unaided', 'Unaided', 'Escape without reading a clue tablet'],
    ['three', 'Three stars', 'Earn three stars'], ['medium', 'Second floor', 'Escape a Medium maze'], ['hard', 'Top floor', 'Escape a Hard maze'],
    ['quick', 'Quick wits', 'Escape in under two minutes'], ['oil', 'Oil to spare', 'Escape a Hard maze with 4 or more oil left'], ['wins10', 'Regular', 'Escape 10 mazes'],
    ['doors25', 'Locksmith', 'Open 25 doors in total'], ['solved50', 'Scholar', 'Solve 50 different riddles'], ['solved150', 'Riddle master', 'Solve all 150 riddles'],
    ['totem1', 'First find', 'Find a totem'], ['totem10', 'Collector', 'Find 10 different totems'], ['totem40', 'Curator', 'Find 40 different totems'],
    ['gold', 'Gold fever', 'Find a golden totem'], ['stack4', 'Full stack', 'Stack four totems'], ['decor10', 'Groundskeeper', 'Have 10 pieces of scenery on the table']];

  /* ---------- Saved collection ---------- */
  function load() {
    var d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    d = d && typeof d === 'object' ? d : {};
    d.totems = d.totems || {}; d.scenery = d.scenery || {}; d.badges = d.badges || []; d.stack = d.stack || []; d.decor = d.decor || [];
    d.ground = d.ground || 'wood'; d.life = d.life || {}; d.life.wins = d.life.wins || { E: 0, M: 0, H: 0 }; d.life.doors = d.life.doors || 0; d.life.solved = d.life.solved || [];
    return d;
  }
  var data = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function finishOf(key) { var id = key.split(':')[1]; return FINISHES.filter(function (f) { return f.id === id; })[0]; }
  function designName(key) { var id = key.split(':')[0]; return DESIGNS.filter(function (d) { return d[0] === id; })[0][1]; }
  function totemName(key) { return finishOf(key).name + ' · ' + designName(key); }
  function sceneryName(id) { return GROUNDS.concat(OBJECTS).filter(function (s) { return s[0] === id; })[0][1]; }
  function isGround(id) { return GROUNDS.some(function (g) { return g[0] === id; }); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function rollTotem(tier) {
    var key = '';
    for (var tries = 0; tries < 2; tries++) { // one re-roll if you already own it
      var r = Math.random() * 100, odds = ODDS[tier], rarity = 0;
      for (var i = 0; i < 4; i++) { if (r < odds[i]) { rarity = i; break; } r -= odds[i]; }
      key = pick(DESIGNS)[0] + ':' + pick(FINISHES.filter(function (f) { return f.rarity === rarity; })).id;
      if (!data.totems[key]) break;
    }
    return key;
  }
  function rollScenery() { // grounds are rarer than objects, and a ground you already own is not offered again
    var grounds = GROUNDS.slice(1).filter(function (g) { return !data.scenery[g[0]]; });
    return grounds.length && Math.random() < 0.2 ? pick(grounds)[0] : pick(OBJECTS)[0];
  }
  function placeFinds(maze, tier) { // hide this maze's finds in rooms away from the start and the exit
    var rooms = maze.rooms.filter(function (r) { return r.id !== maze.start && r.id !== maze.exit; });
    for (var i = rooms.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rooms[i]; rooms[i] = rooms[j]; rooms[j] = t; }
    var nT = TOTEMS_PER_MAZE[tier][0] + (Math.random() < TOTEMS_PER_MAZE[tier][1] ? 1 : 0), nS = SCENERY_PER_MAZE[tier];
    rooms.forEach(function (r) { r.find = null; if (nT > 0) { r.find = { type: 'totem', key: rollTotem(tier) }; nT--; } else if (nS > 0) { r.find = { type: 'scenery', id: rollScenery() }; nS--; } });
  }
  function award(id, fresh) { if (data.badges.indexOf(id) < 0) { data.badges.push(id); fresh.push(id); } }
  function sweep(fresh) { // badges that depend on totals
    var owned = Object.keys(data.totems).length;
    if (owned >= 1) award('totem1', fresh); if (owned >= 10) award('totem10', fresh); if (owned >= 40) award('totem40', fresh);
    if (Object.keys(data.totems).some(function (k) { return k.split(':')[1] === 'gold'; })) award('gold', fresh);
    if (data.stack.length >= 4) award('stack4', fresh);
    if (data.decor.length >= 10) award('decor10', fresh);
    if (data.life.doors >= 25) award('doors25', fresh);
    if (data.life.solved.length >= 50) award('solved50', fresh); if (data.life.solved.length >= 150) award('solved150', fresh);
    var wins = data.life.wins.E + data.life.wins.M + data.life.wins.H; if (wins >= 10) award('wins10', fresh);
    save(); return fresh;
  }
  function collect(find) {
    if (find.type === 'totem') data.totems[find.key] = (data.totems[find.key] || 0) + 1; else data.scenery[find.id] = (data.scenery[find.id] || 0) + 1;
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
  var mats = {};
  function std(o) { var m = new THREE.MeshStandardMaterial(o); if (o.color !== undefined) m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m; } // colours are written as they should look on screen
  function finishMat(id) {
    if (mats[id]) return mats[id];
    var m = id === 'wood' ? std({ color: 0xa9743f, map: woodTex, roughness: 0.75, envMapIntensity: 0.35 })
      : id === 'stone' ? std({ color: 0x8d8f96, roughness: 0.95, envMapIntensity: 0.2 })
      : id === 'clay' ? std({ color: 0xb5533c, roughness: 0.85, envMapIntensity: 0.2 })
      : id === 'glaze' ? std({ color: 0x2f6fd0, roughness: 0.12, envMapIntensity: 0.6 })
      : id === 'jade' ? std({ color: 0x3fae7a, roughness: 0.18, envMapIntensity: 0.6 })
      : id === 'bronze' ? std({ color: 0xb07a3a, roughness: 0.42, metalness: 1 })
      : id === 'silver' ? std({ color: 0xdfe3ea, roughness: 0.22, metalness: 1 })
      : std({ color: 0xffc83a, roughness: 0.18, metalness: 1, emissive: 0x3a2600 });
    mats[id] = m; var d = m.clone(); d.color.multiplyScalar(0.6); mats[id + '-dark'] = d; return m;
  }
  var flat = {};
  function col(hex, extra) { var k = hex + JSON.stringify(extra || ''); if (!flat[k]) { var o = { color: hex, roughness: 0.6, envMapIntensity: 0.3 }; for (var p in extra) o[p] = extra[p]; flat[k] = std(o); } return flat[k]; }
  function put(g, geo, mat, x, y, z, rot, scl) {
    var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    m.castShadow = m.receiveShadow = !mat.transparent; g.add(m); return m;
  }
  var sph = function (r) { return new THREE.SphereGeometry(r, 16, 12); }, cyl = function (a, b, h, s) { return new THREE.CylinderGeometry(a, b, h, s || 20); },
    box = function (x, y, z) { return new THREE.BoxGeometry(x, y, z); }, cone = function (r, h, s) { return new THREE.ConeGeometry(r, h, s || 12); },
    dome = function (r) { return new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); };

  /* ---------- Totems: squat, stackable, all 0.62 tall, standing on y = 0 and facing +z ---------- */
  function totemMesh(key) {
    var design = key.split(':')[0], fin = key.split(':')[1], g = new THREE.Group(), m = finishMat(fin), dk = mats[fin + '-dark'], gold = fin === 'gold';
    var a = function (hex, extra) { return gold ? m : col(hex, extra); }; // accents turn to gold on a golden totem
    var eye = col(0x15131d, { roughness: 0.2 });
    var body = function () { put(g, cyl(0.42, 0.46, H), m, 0, H / 2); };
    var eyes = function (y, dx, z, r) { put(g, sph(r || 0.05), eye, -dx, y, z); put(g, sph(r || 0.05), eye, dx, y, z); };
    var plinth = function () { put(g, cyl(0.44, 0.46, 0.12), dk, 0, 0.06); };
    var i, ang;
    if (design.indexOf('beaver') === 0) {
      body(); eyes(0.43, 0.15, 0.4); put(g, sph(0.07), dk, -0.28, 0.555, 0.1); put(g, sph(0.07), dk, 0.28, 0.555, 0.1);
      put(g, sph(0.05), eye, 0, 0.34, 0.45); put(g, box(0.13, 0.1, 0.04), a(0xf3ecd8), 0, 0.24, 0.44);
      if (design === 'beaver-curled') put(g, sph(0.3), dk, 0.34, 0.07, 0.36, [0, 0.8, 0], [1, 0.14, 0.62]);
      else put(g, sph(0.3), dk, 0, 0.07, -0.62, null, [0.75, 0.14, 1.1]);
    } else if (design.indexOf('owl') === 0) {
      body(); [-1, 1].forEach(function (s) { put(g, cyl(0.13, 0.13, 0.03, 18), a(0xf3ecd8), s * 0.17, 0.42, 0.405, [Math.PI / 2, 0, 0]); put(g, cone(0.07, 0.16, 6), dk, s * 0.26, 0.54, 0.1); });
      eyes(0.42, 0.17, 0.43); put(g, cone(0.05, 0.12, 8), a(0xf0a030), 0, 0.3, 0.47, [Math.PI / 2, 0, 0]);
      if (design === 'owl-folded') [-1, 1].forEach(function (s) { put(g, sph(0.26), dk, s * 0.43, 0.28, 0, null, [0.3, 0.9, 0.75]); });
      else [-1, 1].forEach(function (s) { put(g, box(0.44, 0.05, 0.28), dk, s * 0.66, 0.38, 0, [0, 0, s * 0.2]); put(g, box(0.16, 0.04, 0.2), dk, s * 0.9, 0.45, 0, [0, 0, s * 0.45]); });
    } else if (design === 'tree') {
      put(g, cyl(0.3, 0.44, H), m, 0, H / 2); put(g, sph(0.4), a(0x3f9a4f), 0, 0.52, 0, null, [1, 0.25, 1]);
      for (i = 0; i < 6; i++) { ang = i * Math.PI / 3; put(g, cyl(0.04, 0.055, 0.34, 8), dk, Math.sin(ang) * 0.48, 0.32, Math.cos(ang) * 0.48).quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(ang), 0.12, Math.cos(ang)).normalize());
        put(g, sph(0.13), a(0x3f9a4f), Math.sin(ang) * 0.7, 0.34, Math.cos(ang) * 0.7); }
    } else if (design === 'water') {
      put(g, cyl(0.32, 0.36, 0.06), dk, 0, 0.03); put(g, sph(0.44), a(0x3aa0e8, { roughness: 0.05, transparent: true, opacity: 0.82, envMapIntensity: 1 }), 0, 0.33, 0, null, [1, 0.66, 1]);
      for (i = 0; i < 3; i++) { ang = i * 2.1 + 0.5; put(g, sph(0.08), a(0x8fd0ff, { roughness: 0.05 }), Math.sin(ang) * 0.5, 0.16 + i * 0.1, Math.cos(ang) * 0.5); }
    } else if (design === 'flame') {
      put(g, cyl(0.44, 0.34, 0.2), m, 0, 0.1);
      put(g, cone(0.24, 0.42, 10), a(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1.3 }), 0, 0.41, 0);
      put(g, cone(0.14, 0.3, 10), a(0xffd24a, { emissive: 0xffb000, emissiveIntensity: 1.5 }), 0.12, 0.35, 0.09); put(g, cone(0.12, 0.26, 10), a(0xffd24a, { emissive: 0xffb000, emissiveIntensity: 1.5 }), -0.13, 0.33, -0.05);
    } else if (design === 'key') {
      plinth(); put(g, new THREE.TorusGeometry(0.11, 0.04, 10, 20), m, 0, 0.47, 0); put(g, box(0.07, 0.26, 0.05), m, 0, 0.25, 0); put(g, box(0.12, 0.05, 0.05), m, 0.08, 0.16, 0); put(g, box(0.1, 0.05, 0.05), m, 0.07, 0.25, 0);
    } else if (design === 'lighthouse') {
      put(g, cyl(0.3, 0.4, 0.14), m, 0, 0.07); put(g, cyl(0.26, 0.3, 0.14), a(0xf3ecd8), 0, 0.21); put(g, cyl(0.22, 0.26, 0.14), m, 0, 0.35); put(g, cyl(0.27, 0.27, 0.03), dk, 0, 0.435);
      put(g, cyl(0.15, 0.15, 0.1, 10), a(0xfff0a0, { emissive: 0xffd040, emissiveIntensity: 1.6 }), 0, 0.5); put(g, cone(0.2, 0.07), m, 0, 0.585);
    } else if (design === 'sword') {
      plinth(); put(g, box(0.09, 0.34, 0.03), a(0xdfe3ea, { metalness: 1, roughness: 0.2 }), 0, 0.29, 0); put(g, box(0.32, 0.045, 0.07), m, 0, 0.47, 0); put(g, cyl(0.03, 0.03, 0.09, 10), dk, 0, 0.535, 0); put(g, sph(0.04), m, 0, 0.58, 0);
    } else if (design === 'shield') {
      plinth(); put(g, cyl(0.24, 0.24, 0.07, 6), m, 0, 0.38, 0, [Math.PI / 2, 0, 0]); put(g, sph(0.07), dk, 0, 0.38, 0.05); put(g, box(0.04, 0.36, 0.02), dk, 0, 0.38, 0.04); put(g, box(0.36, 0.04, 0.02), dk, 0, 0.38, 0.04);
    } else if (design === 'fox') {
      body(); eyes(0.44, 0.15, 0.39); [-1, 1].forEach(function (s) { put(g, cone(0.09, 0.18, 4), dk, s * 0.24, 0.53, 0.05); });
      put(g, cone(0.13, 0.26, 10), a(0xf3ecd8), 0, 0.3, 0.5, [Math.PI / 2, 0, 0]); put(g, sph(0.04), eye, 0, 0.3, 0.63);
      put(g, sph(0.2), m, 0.2, 0.17, -0.5, null, [0.8, 0.8, 1.3]); put(g, sph(0.1), a(0xf3ecd8), 0.24, 0.2, -0.72);
    } else if (design === 'turtle') {
      put(g, cyl(0.44, 0.46, 0.16), m, 0, 0.08); put(g, dome(0.44), dk, 0, 0.16, 0, null, [1, 1.045, 1]); put(g, sph(0.13), m, 0, 0.2, 0.5);
      put(g, sph(0.035), eye, -0.06, 0.25, 0.6); put(g, sph(0.035), eye, 0.06, 0.25, 0.6);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s) { put(g, sph(0.1), m, s[0] * 0.38, 0.06, s[1] * 0.34, null, [1, 0.6, 1]); });
    } else if (design === 'frog') {
      body(); [-1, 1].forEach(function (s) { put(g, sph(0.1), m, s * 0.2, 0.52, 0.26); put(g, sph(0.045), eye, s * 0.2, 0.54, 0.34); put(g, sph(0.12), dk, s * 0.3, 0.05, 0.42, null, [1, 0.4, 1.3]); });
      put(g, box(0.5, 0.02, 0.03), eye, 0, 0.3, 0.44);
    } else if (design === 'bear') {
      body(); eyes(0.44, 0.15, 0.4); [-1, 1].forEach(function (s) { put(g, sph(0.09), dk, s * 0.27, 0.53, 0.05); });
      put(g, sph(0.14), a(0xe8d2b0), 0, 0.28, 0.42, null, [1, 0.8, 0.7]); put(g, sph(0.045), eye, 0, 0.32, 0.52);
    } else if (design === 'moon') {
      plinth(); put(g, new THREE.TorusGeometry(0.18, 0.06, 10, 24, Math.PI * 1.25), m, 0, 0.38, 0, [0, 0, 0.9]); put(g, sph(0.035), a(0xfff0a0, { emissive: 0xffd040, emissiveIntensity: 1 }), 0.1, 0.42, 0.02);
    } else if (design === 'mushroom') {
      put(g, cyl(0.18, 0.22, 0.3), a(0xf3ecd8), 0, 0.15); put(g, dome(0.46), m, 0, 0.28, 0, null, [1, 0.74, 1]);
      for (i = 0; i < 5; i++) { ang = i * 1.257; put(g, sph(0.05), a(0xffffff), Math.sin(ang) * 0.27, 0.53, Math.cos(ang) * 0.27); }
    } else { // crown
      put(g, cyl(0.42, 0.44, 0.3), m, 0, 0.15);
      for (i = 0; i < 6; i++) { ang = i * Math.PI / 3; put(g, cone(0.09, 0.3, 4), m, Math.sin(ang) * 0.33, 0.45, Math.cos(ang) * 0.33); put(g, sph(0.045), a(0xd0304a, { roughness: 0.15 }), Math.sin(ang) * 0.43, 0.17, Math.cos(ang) * 0.43); }
    }
    return g;
  }
  function stackMesh(keys) { var g = new THREE.Group(); keys.forEach(function (k, i) { var t = totemMesh(k); t.position.y = i * (H + 0.01); g.add(t); }); return g; }

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

  return { H: H, RARITY: RARITY, FINISHES: FINISHES, DESIGNS: DESIGNS, GROUNDS: GROUNDS, OBJECTS: OBJECTS, BADGES: BADGES, ODDS: ODDS,
    data: function () { return data; }, save: save, reload: function () { data = load(); return data; },
    totemName: totemName, sceneryName: sceneryName, isGround: isGround, finishOf: finishOf, badgeName: badgeName,
    rollTotem: rollTotem, placeFinds: placeFinds, collect: collect, doorOpened: doorOpened, runWon: runWon, sweep: sweep,
    totemMesh: totemMesh, stackMesh: stackMesh, sceneryMesh: sceneryMesh, crateMesh: crateMesh, groundTexture: groundTexture };
};
