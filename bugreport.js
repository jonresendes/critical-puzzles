/* Critical Puzzles bug reporter, shared by every game page.
   A small ladybug sits tucked against the right edge. Tap it once to bring it out, tap again to report.
   It takes a snapshot of the screen as it is, lets the player mark the problem and add a note,
   then hands the report to the master account.

   MASTER ACCOUNT: set where reports go.
   - email: reports are addressed to this inbox when the player's device opens its mail or share sheet.
   - endpoint: optional web address that accepts a JSON POST. When set, reports are sent straight
     there with no extra step for the player. */
(function () {
'use strict';
if (window.CPBug) return;
var MASTER = { email: '', endpoint: '' };

var css = '' +
'#cpbug{position:fixed;right:0;top:62%;z-index:60;width:48px;height:48px;padding:0;border-radius:50%;border:1px solid rgba(239,236,247,.25);' +
'background:#1d1a28;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none;' +
'box-shadow:0 6px 18px rgba(0,0,0,.5);transition:transform .3s cubic-bezier(.3,1.4,.5,1),opacity .3s;transform:translateX(-10px) scale(1);opacity:1}' +
'#cpbug.tucked{transform:translateX(52%) scale(.58) rotate(-90deg);opacity:.6}' +
'#cpbug span{position:absolute;right:56px;white-space:nowrap;font:600 13px/1 "Hanken Grotesk",system-ui,sans-serif;color:#efecf7;background:#1d1a28;' +
'border:1px solid rgba(239,236,247,.25);border-radius:10px;padding:9px 11px;pointer-events:none;transition:opacity .2s}' +
'#cpbug.tucked span{opacity:0}' +
'#cpbug-sheet{position:fixed;inset:0;z-index:70;background:rgba(8,7,12,.72);display:flex;align-items:flex-end;justify-content:center;font:15px/1.4 "Hanken Grotesk",system-ui,sans-serif;color:#efecf7}' +
'#cpbug-sheet[hidden],#cpbug[hidden]{display:none!important}' +
'#cpbug-card{width:100%;max-width:520px;max-height:94%;overflow-y:auto;background:#1d1a28;border:1px solid rgba(239,236,247,.2);border-radius:20px 20px 0 0;' +
'padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px}' +
'#cpbug-card h2{margin:0;font:500 16px "Unbounded","Trebuchet MS",sans-serif}' +
'#cpbug-card p{margin:0;font-size:13px;color:#a8a2bd}' +
'#cpbug-shot{align-self:center;max-width:100%;max-height:38vh;border-radius:10px;border:1px solid rgba(239,236,247,.25);touch-action:none;cursor:crosshair;background:#110f18}' +
'#cpbug-note{width:100%;min-height:76px;resize:vertical;font:500 16px "Hanken Grotesk",system-ui,sans-serif;color:#efecf7;background:#110f18;' +
'border:1px solid rgba(239,236,247,.2);border-radius:12px;padding:11px 12px;-webkit-user-select:text;user-select:text}' +
'#cpbug-card .cprow{display:flex;flex-wrap:wrap;gap:8px}' +
'#cpbug-card button,#cpbug-card a.cpb{font:600 14px/1 "Hanken Grotesk",system-ui,sans-serif;color:#efecf7;background:rgba(239,236,247,.07);border:1px solid rgba(239,236,247,.2);' +
'border-radius:12px;padding:12px 16px;cursor:pointer;text-decoration:none;display:inline-block}' +
'#cpbug-card button.go{background:#ea4fae;color:#1b0b16;border-color:transparent}' +
'#cpbug-card button:disabled{opacity:.45}' +
'#cpbug-status{color:#f0b03a!important;min-height:1.4em}' +
'#cpbug-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:80;background:#1d1a28;color:#efecf7;border:1px solid rgba(239,236,247,.25);' +
'border-radius:12px;padding:10px 14px;font:600 13px "Hanken Grotesk",system-ui,sans-serif}' +
'@media (prefers-reduced-motion:reduce){#cpbug{transition:none}}';

function el(tag, attrs, text) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

var style = el('style'); style.textContent = css; document.head.appendChild(style);
var bug = el('button', { id: 'cpbug', type: 'button', 'class': 'tucked', 'aria-label': 'Report a bug', 'data-html2canvas-ignore': 'true' }, '🐞');
bug.appendChild(el('span', {}, 'Tap again to report a bug'));
var sheet = el('div', { id: 'cpbug-sheet', hidden: '', role: 'dialog', 'aria-labelledby': 'cpbug-title', 'data-html2canvas-ignore': 'true' });
var card = el('div', { id: 'cpbug-card' }); sheet.appendChild(card);
function mount() { document.body.appendChild(bug); document.body.appendChild(sheet); }
if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

/* ----- The ladybug: tucked away until tapped; drag it up or down to move it ----- */
var tuckTimer = null, savedTop = load('cp-bug-top');
if (typeof savedTop === 'number') bug.style.top = Math.max(8, Math.min(92, savedTop)) + '%';
function tuck() { clearTimeout(tuckTimer); bug.classList.add('tucked'); }
function untuck() { bug.classList.remove('tucked'); clearTimeout(tuckTimer); tuckTimer = setTimeout(tuck, 4500); }
var drag = null;
bug.addEventListener('pointerdown', function (e) { drag = { y: e.clientY, moved: false }; try { bug.setPointerCapture(e.pointerId); } catch (x) {} });
bug.addEventListener('pointermove', function (e) {
  if (!drag) return;
  if (!drag.moved && Math.abs(e.clientY - drag.y) < 10) return;
  drag.moved = true; untuck();
  var pct = Math.max(8, Math.min(92, (e.clientY - 24) / window.innerHeight * 100));
  bug.style.top = pct + '%'; drag.pct = pct;
});
bug.addEventListener('pointerup', function () { if (drag && drag.moved) { save('cp-bug-top', drag.pct); bug.dataset.dragged = '1'; } drag = null; });
bug.addEventListener('pointercancel', function () { drag = null; });
bug.addEventListener('click', function () {
  if (bug.dataset.dragged) { delete bug.dataset.dragged; return; }
  if (bug.classList.contains('tucked')) untuck(); else start();
});
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('[data-bug-open]') : null;
  if (t) { e.preventDefault(); start(); }
});

/* ----- Snapshot ----- */
var libPromise = null;
function lib() {
  if (window.html2canvas) return Promise.resolve();
  if (!libPromise) libPromise = new Promise(function (ok, fail) {
    var s = el('script', { src: 'html2canvas.min.js' }); s.onload = ok; s.onerror = function () { libPromise = null; fail(new Error('snapshot tool did not load')); };
    document.head.appendChild(s);
  });
  return libPromise;
}
function toast(text) { var t = el('div', { id: 'cpbug-toast', 'data-html2canvas-ignore': 'true' }, text); document.body.appendChild(t); return t; }
var busy = false;
function start() {
  if (busy || !sheet.hidden) return;
  busy = true; tuck(); bug.hidden = true;
  var t = toast('Taking a snapshot…'), context = null;
  try { context = window.CPBugContext ? window.CPBugContext() : null; } catch (e) { context = { error: String(e) }; }
  lib().then(function () {
    return window.html2canvas(document.body, { backgroundColor: '#15131d', scale: Math.min(2, window.devicePixelRatio || 1), logging: false, useCORS: true,
      width: window.innerWidth, height: window.innerHeight, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
  }).then(function (canvas) { return canvas; }, function () { return null; }).then(function (canvas) {
    t.remove(); busy = false; openSheet(canvas, context);
  });
}

/* ----- The report sheet ----- */
function version() {
  if (!window.caches) return Promise.resolve('not installed');
  return caches.keys().then(function (keys) {
    var n = keys.map(function (k) { var m = /^critical-puzzles-v(\d+)$/.exec(k); return m ? +m[1] : 0; }).reduce(function (a, b) { return Math.max(a, b); }, 0);
    return n ? 'v' + n : 'not installed';
  }).catch(function () { return 'unknown'; });
}
function openSheet(shot, context) {
  card.textContent = '';
  card.appendChild(el('h2', { id: 'cpbug-title' }, 'Report a bug'));
  var canvas = null, original = null;
  if (shot) {
    card.appendChild(el('p', {}, 'This is the screen as it was. Draw on it to circle the problem.'));
    canvas = shot; canvas.id = 'cpbug-shot'; canvas.removeAttribute('style'); card.appendChild(canvas);
    var ctx = canvas.getContext('2d'); original = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var last = null;
    var at = function (e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
    canvas.addEventListener('pointerdown', function (e) { last = at(e); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (!last) return; var p = at(e);
      ctx.strokeStyle = '#ff3b6b'; ctx.lineWidth = Math.max(4, canvas.width / 90); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
    });
    var end = function () { last = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  } else card.appendChild(el('p', {}, 'The snapshot could not be taken on this device. You can still send a description.'));
  var note = el('textarea', { id: 'cpbug-note', placeholder: 'What went wrong? What did you expect to happen?', 'aria-label': 'Describe the bug', maxlength: '1500' });
  card.appendChild(note);
  var details = el('p', {}, ''); card.appendChild(details);
  var row = el('div', { 'class': 'cprow' }), send = el('button', { type: 'button', 'class': 'go' }, 'Send report'), clear = el('button', { type: 'button' }, 'Clear marks'),
    cancel = el('button', { type: 'button' }, 'Cancel');
  row.appendChild(send); if (shot) row.appendChild(clear); row.appendChild(cancel); card.appendChild(row);
  var status = el('p', { id: 'cpbug-status', role: 'status', 'aria-live': 'polite' }, ''); card.appendChild(status);
  var extra = el('div', { 'class': 'cprow' }); card.appendChild(extra);

  var report = {
    id: Date.now().toString(36).toUpperCase(), when: new Date().toISOString(), page: location.pathname.split('/').pop() || 'index.html', title: document.title,
    version: '', screen: window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x',
    installed: !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches), device: navigator.userAgent, state: context
  };
  version().then(function (v) { report.version = v; details.textContent = 'Sent with your note: this snapshot, the page (' + report.title + '), app version ' + v + ', screen size and device type, and where you were in the game.'; });

  function close() { sheet.hidden = true; card.textContent = ''; bug.hidden = false; }
  cancel.addEventListener('click', close);
  clear.addEventListener('click', function () { if (original) canvas.getContext('2d').putImageData(original, 0, 0); });
  sheet.onclick = function (e) { if (e.target === sheet) close(); };

  function body() {
    return 'Critical Puzzles bug report ' + report.id + '\n' +
      'When: ' + report.when + '\nPage: ' + report.page + ' (' + report.title + ')\nVersion: ' + report.version +
      '\nScreen: ' + report.screen + (report.installed ? ', installed app' : ', in a browser') +
      '\nDevice: ' + report.device + '\nGame state: ' + JSON.stringify(report.state) + '\n\nWhat happened:\n' + (report.note || '(no description)');
  }
  function image(type, q) { try { return canvas ? canvas.toDataURL(type, q) : ''; } catch (e) { return ''; } }
  function file() {
    return new Promise(function (ok) {
      if (!canvas || !canvas.toBlob || typeof File === 'undefined') return ok(null);
      try { canvas.toBlob(function (b) { ok(b ? new File([b], 'critical-puzzles-bug-' + report.id + '.png', { type: 'image/png' }) : null); }, 'image/png'); } catch (e) { ok(null); }
    });
  }
  function keep() { // a copy stays on this device so nothing is lost if sending fails
    var box = load('cp-bug-outbox') || [], item = { id: report.id, when: report.when, text: body(), image: image('image/jpeg', 0.6) };
    box.push(item); box = box.slice(-3);
    if (!save('cp-bug-outbox', box)) { item.image = ''; save('cp-bug-outbox', box.slice(-1)); }
  }
  function manual(f) { // no direct route: offer email and a copy button
    extra.textContent = '';
    var subject = 'Critical Puzzles bug report ' + report.id;
    var mail = el('a', { 'class': 'cpb', href: 'mailto:' + MASTER.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body()) }, 'Open email');
    var copy = el('button', { type: 'button' }, 'Copy report text');
    copy.addEventListener('click', function () {
      var done = function () { status.textContent = 'Report text copied.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(body()).then(done, function () { status.textContent = 'Could not copy on this device.'; });
      else status.textContent = 'Could not copy on this device.';
    });
    extra.appendChild(mail); extra.appendChild(copy);
    if (f) { var dl = el('a', { 'class': 'cpb', href: URL.createObjectURL(f), download: f.name }, 'Save snapshot'); extra.appendChild(dl); }
    status.textContent = 'This device cannot attach the snapshot by itself. Open an email' + (MASTER.email ? ' to ' + MASTER.email : '') + ' and add the saved snapshot.';
  }
  send.addEventListener('click', function () {
    report.note = note.value.trim(); send.disabled = true; status.textContent = 'Sending…'; keep();
    var done = function (msg) { status.textContent = msg; send.hidden = true; clear.hidden = true; cancel.textContent = 'Close'; };
    if (MASTER.endpoint) {
      fetch(MASTER.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ subject: 'Critical Puzzles bug report ' + report.id, to: MASTER.email, message: body(), report: report, snapshot: image('image/jpeg', 0.7) }) })
        .then(function (r) { if (!r.ok) throw 0; done('Report ' + report.id + ' sent. Thank you.'); })
        .catch(function () { send.disabled = false; status.textContent = 'Could not send. Check your connection and try again. A copy is saved on this device.'; });
      return;
    }
    file().then(function (f) {
      var data = { title: 'Critical Puzzles bug report ' + report.id, text: body() };
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
      if (navigator.share && (data.files || !f)) {
        return navigator.share(data).then(function () { done('Report ' + report.id + ' handed to your phone to send. Thank you.'); },
          function (err) { send.disabled = false; if (err && err.name === 'AbortError') status.textContent = 'Not sent yet. Tap Send report to try again.'; else manual(f); });
      }
      send.disabled = false; manual(f);
    });
  });
  sheet.hidden = false;
}

window.CPBug = { open: start, master: MASTER };
})();
