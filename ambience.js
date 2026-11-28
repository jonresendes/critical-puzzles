/* Critical Puzzles ambience: the sound of each environment, made in code (no audio files, so it works offline).
   Every setting is a few quiet layers: a steady bed (wind, water, room tone) and small events that come and go
   (an owl, a drip, a crack in the ice). Like the scenery, it stays in the background.

   window.CPSound.setEnv(name)   study | forest | neon | temple | ocean | ice
   window.CPSound.setLevel(l)    off | quiet | full   (remembered on this device, shared by every game)
   Browsers only allow sound after a touch or key press, so nothing plays until the first one. */
(function () {
'use strict';
var AC = window.AudioContext || window.webkitAudioContext, LEVELS = { off: 0, quiet: 0.4, full: 1 };
/* Each setting is trimmed to about the same loudness. Phone speakers play almost nothing below 300 Hz, so every bed has a layer above that. */
var TRIM = { study: 1.9, forest: 1.8, neon: 1.3, temple: 2.2, ocean: 0.95, ice: 1.3 }, PIECES = 1.9; // the setting sits well under the pieces
var LEAD = 0.012; // sounds are scheduled this far ahead, so their first instant is never already in the past
var ctx = null, master = null, meter = null, cur = null, wanted = null, level = 'quiet', buffers = {};
try { var saved = localStorage.getItem('cp-sound'); if (LEVELS[saved] !== undefined) level = saved; } catch (e) {}

function noise(kind) { // four seconds of looping noise: white (hiss), pink (rustle), brown (rumble)
  if (buffers[kind]) return buffers[kind];
  var n = ctx.sampleRate * 4, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } }
  for (var f = 0; f < 2000; f++) { var k = f / 2000; d[n - 2000 + f] = d[n - 2000 + f] * (1 - k) + d[f] * k; } // smooth the loop join
  return (buffers[kind] = buf);
}
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

/* One environment's sound: its own volume bus, an echo to send things into, and helpers that clean up after themselves. */
function Scene(trim) {
  var s = this; s.alive = true; s.nodes = []; s.timers = [];
  s.bus = ctx.createGain(); s.bus.gain.value = 0; s.bus.connect(master); s.bus.gain.linearRampToValueAtTime(trim, ctx.currentTime + 2);
  s.echo = ctx.createDelay(1.5); s.echo.delayTime.value = 0.36; s.fb = ctx.createGain(); s.fb.gain.value = 0.42; var damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
  s.echo.connect(damp); damp.connect(s.fb); s.fb.connect(s.echo); damp.connect(s.bus);
}
Scene.prototype.filter = function (type, f, q) { var n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
Scene.prototype.gain = function (v) { var g = ctx.createGain(); g.gain.value = v; return g; };
Scene.prototype.chain = function () { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; };
Scene.prototype.bed = function (kind) { var n = ctx.createBufferSource(); n.buffer = noise(kind); n.loop = true; n.start(0, Math.random() * 3); this.nodes.push(n); return n; }; // a steady layer of noise
Scene.prototype.tone = function (type, f) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); this.nodes.push(o); return o; };
Scene.prototype.sway = function (param, rate, depth) { var o = this.tone('sine', rate), g = this.gain(depth); o.connect(g); g.connect(param); }; // slowly move a volume or a filter
Scene.prototype.every = function (min, max, fn, first) { var s = this; (function next(wait) { s.timers.push(setTimeout(function () { if (!s.alive) return; if (!document.hidden && ctx.state === 'running') fn(); next(rand(min, max)); }, wait * 1000)); })(first === undefined ? rand(min, max) : first); };
/* A short pitched sound: a drip, a chirp, a bell, a hoot. `to` glides the pitch. */
Scene.prototype.ping = function (o) {
  var t = ctx.currentTime + LEAD + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain(), dur = o.dur || 0.2; osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * (o.glide || 1));
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.attack || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.out || this.bus); if (o.echo) { var send = this.gain(o.echo); g.connect(send); send.connect(this.echo); }
  osc.start(t); osc.stop(t + dur + 0.05);
};
/* A short burst of noise: a crackle, a tick, a rustle. */
Scene.prototype.burst = function (o) {
  var t = ctx.currentTime + LEAD + (o.at || 0), n = ctx.createBufferSource(), g = ctx.createGain(), f = this.filter(o.type || 'bandpass', o.f, o.q || 1), dur = o.dur || 0.03;
  n.buffer = noise(o.kind || 'white'); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.attack || 0.002)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f); f.connect(g); g.connect(this.bus); if (o.echo) { var send = this.gain(o.echo); g.connect(send); send.connect(this.echo); }
  n.start(t, Math.random() * 3, dur + 0.05);
};
Scene.prototype.stop = function () { var s = this; s.alive = false; s.timers.forEach(clearTimeout); var t = ctx.currentTime; s.bus.gain.cancelScheduledValues(t); s.bus.gain.setValueAtTime(s.bus.gain.value, t); s.bus.gain.linearRampToValueAtTime(0, t + 1.2);
  setTimeout(function () { s.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { s.bus.disconnect(); } catch (e) {} }, 1500); };

var SCENES = {
  /* A quiet room: the hush of still air, a clock, the lamp's faint hum, now and then a page turning. */
  study: function (s) {
    s.chain(s.bed('brown'), s.filter('lowpass', 420), s.gain(0.1), s.bus); s.chain(s.bed('pink'), s.filter('bandpass', 700, 0.5), s.gain(0.012), s.bus);
    s.chain(s.tone('sine', 100), s.gain(0.008), s.bus);
    var tock = false; s.every(1, 1, function () { tock = !tock; s.burst({ f: tock ? 1900 : 2600, q: 5, dur: 0.03, vol: 0.05 }); }, 0.5);
    s.every(16, 30, function () { s.burst({ kind: 'pink', type: 'highpass', f: 2600, dur: 0.45, attack: 0.18, vol: 0.035 }); });
    s.every(22, 40, function () { s.ping({ f: 190, to: 150, dur: 0.5, vol: 0.012, type: 'triangle' }); }); // the lamp chain settling
  },
  /* A clearing at night: wind in the leaves, two crickets, an owl some way off. */
  forest: function (s) {
    var wind = s.gain(0.09), f = s.filter('bandpass', 520, 0.6); s.chain(s.bed('pink'), f, wind, s.bus); s.sway(wind.gain, 0.07, 0.05); s.sway(f.frequency, 0.05, 180);
    s.chain(s.bed('brown'), s.filter('lowpass', 400), s.gain(0.08), s.bus);
    function cricket(freq, vol) { var n = 2 + Math.floor(Math.random() * 3); for (var i = 0; i < n; i++) s.ping({ f: freq, dur: 0.028, vol: vol, at: i * 0.045, attack: 0.004 }); }
    s.every(0.5, 0.85, function () { cricket(4300, 0.016); }); s.every(0.7, 1.3, function () { cricket(3650, 0.01); });
    s.every(14, 28, function () { s.ping({ f: 340, to: 310, dur: 0.38, vol: 0.05, attack: 0.05, echo: 0.5 }); s.ping({ f: 330, to: 290, dur: 0.6, vol: 0.05, attack: 0.06, at: 0.55, echo: 0.5 }); }, 6);
    s.every(9, 18, function () { s.burst({ kind: 'pink', type: 'highpass', f: 1800, dur: 0.9, attack: 0.4, vol: 0.03 }); }); // a gust through the ferns
  },
  /* A lab above a city: the hum of power, a slow chord of light, machines talking quietly. */
  neon: function (s) {
    s.chain(s.tone('sawtooth', 55), s.filter('lowpass', 210), s.gain(0.05), s.bus); s.chain(s.tone('sine', 110), s.gain(0.025), s.bus);
    var pad = s.filter('lowpass', 900); pad.connect(s.bus);
    [146.83, 220, 261.63, 329.63].forEach(function (f, i) { var g = s.gain(0.011); s.chain(s.tone('triangle', f * (1 + (i % 2 ? 0.003 : -0.002))), g, pad); s.sway(g.gain, 0.03 + i * 0.017, 0.008); });
    s.chain(s.bed('white'), s.filter('bandpass', 2400, 0.4), s.gain(0.012), s.bus);
    var notes = [880, 987.77, 1174.66, 1318.51, 1567.98];
    s.every(2.5, 6.5, function () { var n = 1 + Math.floor(Math.random() * 3); for (var i = 0; i < n; i++) s.ping({ f: pick(notes), dur: 0.09, vol: 0.016, at: i * 0.11, echo: 0.6 }); }, 2);
    s.every(12, 24, function () { s.ping({ f: 70, to: 140, dur: 2.2, vol: 0.03, attack: 0.9, type: 'triangle' }); }); // something powering up far below
  },
  /* A stone hall: air moving through it, the braziers burning, water dripping somewhere, a far-off gong. */
  temple: function (s) {
    var air = s.gain(0.16); s.chain(s.bed('brown'), s.filter('bandpass', 220, 1.2), air, s.bus); s.sway(air.gain, 0.06, 0.07);
    var moan = s.filter('bandpass', 480, 4), mg = s.gain(0.02); s.chain(s.bed('pink'), moan, mg, s.bus); s.sway(moan.frequency, 0.045, 90); s.sway(mg.gain, 0.08, 0.012);
    var fire = s.gain(0.035); s.chain(s.bed('pink'), s.filter('bandpass', 850, 0.5), fire, s.bus); s.sway(fire.gain, 6.3, 0.012); s.sway(fire.gain, 0.4, 0.012);
    s.every(0.07, 0.45, function () { s.burst({ type: 'highpass', f: rand(1500, 3200), dur: rand(0.008, 0.03), vol: rand(0.012, 0.05) }); });
    s.every(5, 11, function () { s.ping({ f: rand(1250, 1650), to: 900, dur: 0.09, vol: 0.035, echo: 0.9 }); }, 3);
    s.every(40, 75, function () { s.ping({ f: 98, dur: 6, vol: 0.05, attack: 0.02, echo: 0.3 }); s.ping({ f: 147.5, dur: 4.5, vol: 0.025, attack: 0.02 }); s.ping({ f: 263, dur: 2.5, vol: 0.012, attack: 0.02 }); }, 12);
  },
  /* Under the sea: the weight of water, currents passing, bubbles, a whale a long way off. */
  ocean: function (s) {
    var deep = s.gain(0.3); s.chain(s.bed('brown'), s.filter('lowpass', 420), deep, s.bus); s.sway(deep.gain, 0.09, 0.1);
    var flow = s.filter('bandpass', 520, 1), fg = s.gain(0.09); s.chain(s.bed('pink'), flow, fg, s.bus); s.sway(flow.frequency, 0.13, 200); s.sway(fg.gain, 0.17, 0.04);
    var muffle = s.filter('lowpass', 1500); muffle.connect(s.bus);
    s.every(0.8, 3, function () { var n = 2 + Math.floor(Math.random() * 5), base = rand(420, 900); for (var i = 0; i < n; i++) { var f = base * rand(0.8, 1.5); s.ping({ f: f, to: f * 1.7, dur: 0.07, vol: 0.03, at: i * rand(0.05, 0.11), out: muffle }); } });
    s.fb.gain.value = 0.55; s.echo.delayTime.value = 0.6;
    s.every(18, 36, function () { s.ping({ f: 170, to: 330, dur: 1.6, vol: 0.045, attack: 0.5, echo: 0.9, out: muffle }); s.ping({ f: 320, to: 210, dur: 1.9, vol: 0.04, attack: 0.4, at: 1.5, echo: 0.9, out: muffle }); }, 8);
  },
  /* An ice cavern: wind across the mouth of the cave, the ice shifting, high clear notes under the aurora. */
  ice: function (s) {
    var low = s.gain(0.14); s.chain(s.bed('brown'), s.filter('lowpass', 420), low, s.bus); s.sway(low.gain, 0.05, 0.06);
    var w1 = s.filter('bandpass', 700, 3), g1 = s.gain(0.05); s.chain(s.bed('white'), w1, g1, s.bus); s.sway(w1.frequency, 0.07, 330); s.sway(g1.gain, 0.11, 0.03);
    var w2 = s.filter('bandpass', 1500, 7), g2 = s.gain(0.014); s.chain(s.bed('white'), w2, g2, s.bus); s.sway(w2.frequency, 0.043, 500); s.sway(g2.gain, 0.09, 0.012);
    s.every(10, 22, function () { s.ping({ f: 75, to: 38, dur: 0.3, vol: 0.12, echo: 0.5 }); s.burst({ type: 'highpass', f: 2800, dur: 0.012, vol: 0.05, echo: 0.6 }); s.burst({ type: 'highpass', f: 3500, dur: 0.01, vol: 0.03, at: 0.07, echo: 0.6 }); }, 7);
    var bells = [1567.98, 1760, 2093, 2349.32, 2637.02];
    s.every(3, 7.5, function () { var f = pick(bells); s.ping({ f: f, dur: 2.4, vol: 0.011, attack: 0.01, echo: 0.7 }); s.ping({ f: f * 2.76, dur: 0.9, vol: 0.004, attack: 0.01 }); }, 2);
  }
};

/* ---------- The pieces ----------
   Short sounds for what the hands are doing: a knock when something lands, a scrape as it slides, a marble rolling.
   Each material has its own voice. They share the sound level, pick up a little echo from the setting, and are
   muffled under water. */
var MATERIAL = {
  wood: { f: 250, parts: [1, 2.45], ring: 0.09, nf: 1100, ntype: 'lowpass', scrape: 850, sq: 1.2 },
  plastic: { f: 640, parts: [1, 1.9], ring: 0.05, nf: 2600, ntype: 'bandpass', scrape: 1900, sq: 1.5 },
  metal: { f: 880, parts: [1, 2.32, 3.9, 5.4], ring: 0.5, nf: 4200, ntype: 'highpass', scrape: 3300, sq: 4 },
  stone: { f: 135, parts: [1, 1.55], ring: 0.07, nf: 700, ntype: 'bandpass', scrape: 480, sq: 0.8 },
  glass: { f: 1750, parts: [1, 2.7], ring: 0.14, nf: 5000, ntype: 'highpass', scrape: 3000, sq: 3 }
};
var bench = false;
var ROOM = { study: 0.03, forest: 0.06, neon: 0.14, temple: 0.32, ocean: 0.16, ice: 0.24 }, fxS = null, fxSend = null, lastScrape = 0, lastHit = 0, rollN = null;
function fx() { // where piece sounds go; null while sound is off or not yet allowed
  if (!ctx || (ctx.state !== 'running' && !bench) || level === 'off') return null;
  if (!fxS) { fxS = Object.create(Scene.prototype); fxS.bus = ctx.createBiquadFilter(); fxS.bus.type = 'lowpass'; var out = ctx.createGain(); out.gain.value = PIECES; fxS.bus.connect(out); out.connect(master);
    fxS.echo = ctx.createDelay(1); fxS.echo.delayTime.value = 0.17; var fb = ctx.createGain(); fb.gain.value = 0.36; var damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
    fxS.echo.connect(damp); damp.connect(fb); fb.connect(fxS.echo); damp.connect(out); fxSend = ctx.createGain(); fxS.bus.connect(fxSend); fxSend.connect(fxS.echo); room(); }
  return fxS;
}
function room() { if (!fxS) return; fxS.bus.frequency.value = wanted === 'ocean' ? 1500 : 18000; fxSend.gain.value = ROOM[wanted] === undefined ? 0.05 : ROOM[wanted]; }
function hit(mat, strength, pitch) { // one thing knocking against another
  var s = fx(), m = MATERIAL[mat] || MATERIAL.wood, now = performance.now(); if (!s || now - lastHit < 25) return; lastHit = now;
  var v = (0.03 + 0.21 * Math.max(0, Math.min(1, strength === undefined ? 0.5 : strength))) * (mat === 'metal' ? 0.75 : mat === 'stone' ? 1.25 : 1), p = (pitch || 1) * rand(0.96, 1.04);
  m.parts.forEach(function (k, i) { s.ping({ f: m.f * k * p, dur: m.ring / (1 + i * 0.5) + 0.03, vol: v / (1 + i * 1.3), attack: 0.002 }); });
  s.burst({ type: m.ntype, f: m.nf, q: 0.8, dur: mat === 'stone' ? 0.05 : 0.02, vol: v * 0.7 });
}
function scrape(mat, strength) { // one step of a slide
  var s = fx(), m = MATERIAL[mat] || MATERIAL.wood, now = performance.now(); if (!s || now - lastScrape < 45) return; lastScrape = now;
  s.burst({ kind: mat === 'stone' ? 'pink' : 'white', f: m.scrape * rand(0.9, 1.1), q: m.sq, dur: 0.09, attack: 0.025, vol: (0.3 + 0.45 * (strength === undefined ? 0.5 : strength)) * (mat === 'metal' || mat === 'glass' ? 1.5 : mat === 'wood' ? 1.5 : 1) });
}
var FX = {
  ratchet: function (s) { for (var i = 0; i < 7; i++) { s.burst({ type: 'highpass', f: 2600, dur: 0.012, vol: 0.2, at: i * 0.045 }); s.ping({ f: 1500 + i * 120, dur: 0.03, vol: 0.05, at: i * 0.045, type: 'square' }); } }, // a screw backing out
  whoosh: function (s) { s.burst({ kind: 'pink', f: 750, q: 0.7, dur: 0.32, attack: 0.13, vol: 0.4 }); },
  creak: function (s) { s.ping({ f: 310, to: 240, dur: 0.28, vol: 0.08, type: 'sawtooth', attack: 0.05 }); s.ping({ f: 470, to: 360, dur: 0.22, vol: 0.045, type: 'sawtooth', attack: 0.05, at: 0.05 }); },
  chime: function (s) { s.ping({ f: 1318.5, dur: 0.7, vol: 0.1 }); s.ping({ f: 1975.5, dur: 0.6, vol: 0.075, at: 0.09 }); },
  ding: function (s) { s.ping({ f: 1568, dur: 0.55, vol: 0.1 }); s.ping({ f: 3136, dur: 0.25, vol: 0.02 }); },
  deny: function (s) { s.ping({ f: 150, dur: 0.13, vol: 0.12, type: 'triangle' }); s.ping({ f: 118, dur: 0.16, vol: 0.12, type: 'triangle', at: 0.09 }); },
  gate: function (s) { for (var i = 0; i < 7; i++) s.burst({ kind: 'pink', f: 420, q: 0.8, dur: 0.12, attack: 0.03, vol: 0.45, at: i * 0.085 }); },
  drop: function (s) { s.ping({ f: 760, to: 130, dur: 0.42, vol: 0.09 }); s.ping({ f: 95, dur: 0.16, vol: 0.2, at: 0.43 }); s.burst({ f: 500, dur: 0.05, vol: 0.12, at: 0.43 }); }, // down a pit
  cup: function (s) { [0, 0.09, 0.16, 0.21].forEach(function (t, i) { s.ping({ f: 1250 * (1 + i * 0.04), dur: 0.05, vol: 0.1 / (1 + i), at: t }); s.burst({ type: 'highpass', f: 3000, dur: 0.012, vol: 0.06 / (1 + i), at: t }); }); },
  win: function (s) { [659.3, 784, 987.8, 1318.5].forEach(function (f, i) { s.ping({ f: f, dur: 0.6, vol: 0.07, at: 0.25 + i * 0.1 }); s.ping({ f: f * 2, dur: 0.3, vol: 0.02, at: 0.25 + i * 0.1 }); }); },
  lose: function (s) { [392, 329.6, 261.6].forEach(function (f, i) { s.ping({ f: f, dur: 0.4, vol: 0.08, type: 'triangle', at: 0.2 + i * 0.17 }); }); }
};
/* A marble rolling: a steady rumble that gets louder and brighter with speed. Call every frame; 0 stops it. */
function roll(speed, mat) {
  var s = fx(); if (!s) { if (rollN) rollN.g.gain.value = 0; return; }
  if (!rollN) { var n = ctx.createBufferSource(); n.buffer = noise('brown'); n.loop = true; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; var g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); g.connect(s.bus); n.start(); rollN = { f: f, g: g }; }
  var bright = mat === 'metal' || mat === 'glass' ? 1.7 : mat === 'stone' ? 0.8 : 1.1, t = ctx.currentTime;
  rollN.g.gain.setTargetAtTime(Math.min(0.5, speed * 0.085), t, 0.06); rollN.f.frequency.setTargetAtTime((260 + Math.min(8, speed) * 150) * bright, t, 0.08);
}

function begin() { // make the current scene match what is wanted
  if (!ctx || ctx.state !== 'running') return;
  if (cur && (cur.name !== wanted || level === 'off')) { cur.scene.stop(); cur = null; }
  if (!cur && wanted && SCENES[wanted] && level !== 'off') { var s = new Scene(TRIM[wanted] || 1); try { SCENES[wanted](s); } catch (e) {} cur = { name: wanted, scene: s }; }
}
function unlock() {
  if (!AC || level === 'off') return;
  if (!ctx) { try { ctx = new AC(); } catch (e) { ctx = null; return; } master = ctx.createGain(); master.gain.value = LEVELS[level]; meter = ctx.createAnalyser(); meter.fftSize = 2048;
    var limit = ctx.createDynamicsCompressor(); limit.threshold.value = -5; limit.ratio.value = 12; limit.attack.value = 0.005; limit.release.value = 0.2; // never lets a loud moment clip
    master.connect(limit); limit.connect(meter); meter.connect(ctx.destination); }
  if (ctx.state !== 'running' && !document.hidden) ctx.resume().then(begin).catch(function () {}); else begin();
}
['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.addEventListener(ev, unlock, true); });
document.addEventListener('visibilitychange', function () { if (!ctx) return; if (document.hidden) ctx.suspend().catch(function () {}); else if (level !== 'off') ctx.resume().then(begin).catch(function () {}); });

window.CPSound = {
  LEVELS: [['off', 'Off'], ['quiet', 'Quiet'], ['full', 'Full']],
  NOTES: { study: 'A ticking clock and a quiet room.', forest: 'Wind in the leaves, crickets and an owl.', neon: 'A low hum, a slow chord and soft machine tones.', temple: 'Crackling braziers, dripping water and a far-off gong.', ocean: 'Deep water, bubbles and a distant whale.', ice: 'Cave wind, cracking ice and high chimes.' },
  supported: !!AC,
  level: function () { return level; },
  setEnv: function (name) { wanted = name; room(); begin(); },
  hit: hit, scrape: scrape, roll: roll,
  fx: function (name) { var s = fx(); if (s && FX[name]) FX[name](s); },
  setLevel: function (l) { if (LEVELS[l] === undefined) return; level = l; try { localStorage.setItem('cp-sound', l); } catch (e) {}
    if (l !== 'off') unlock(); if (master) master.gain.setTargetAtTime(LEVELS[l], ctx.currentTime, 0.15); if (l === 'off' && cur) setTimeout(function () { if (level === 'off') begin(); }, 600); else begin(); },
  /* how loud the output is right now, 0 to 1: used by tests */
  loudness: function () { if (!meter) return 0; meter.fftSize = 2048; var d = new Float32Array(meter.fftSize), sum = 0; meter.getFloatTimeDomainData(d); for (var i = 0; i < d.length; i++) sum += d[i] * d[i]; return Math.sqrt(sum / d.length); },
  /* the loudest instant in the last two thirds of a second: catches short knocks that the average misses */
  peak: function () { if (!meter) return 0; meter.fftSize = 32768; var d = new Float32Array(32768), m = 0; meter.getFloatTimeDomainData(d); for (var i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return m; },
  playing: function () { return cur ? cur.name : null; },
  lead: function (v) { if (v !== undefined) LEAD = v; return LEAD; },
  /* For tests: play `fn` (which may call hit, scrape, fx, roll or scene) into a silent offline renderer and
     report how loud the result is. Nothing is heard, and it does not depend on how fast the machine is. */
  measure: function (seconds, fn) {
    var real = { ctx: ctx, master: master, fxS: fxS, rollN: rollN, level: level }, off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(44100 * seconds), 44100);
    ctx = off; master = off.createGain(); master.gain.value = 1; master.connect(off.destination); fxS = null; rollN = null; bench = true; if (level === 'off') level = 'full'; lastHit = lastScrape = 0; var scenes = [];
    try { fn({ scene: function (name) { var sc = new Scene(TRIM[name]); sc.every = function () {}; SCENES[name](sc); scenes.push(sc); } }); } finally { ctx = real.ctx; master = real.master; fxS = real.fxS; rollN = real.rollN; level = real.level; bench = false; }
    return off.startRendering().then(function (buf) { scenes.forEach(function (sc) { sc.alive = false; }); var d = buf.getChannelData(0), peak = 0, sum = 0; for (var i = 0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); sum += d[i] * d[i]; } return { peak: peak, rms: Math.sqrt(sum / d.length) }; });
  }
};
})();
