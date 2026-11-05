/*!
 * HelpX Bot — raise TicketDesk tickets from inside any web application.
 *
 * Embed once in index.html (copy it from TicketDesk › Masters › Products › Script):
 *   <script src="https://YOUR-TICKETDESK/static/helpx-bot/helpx-bot.js?appClientId=KEY&productName=HRMS"></script>
 *
 * The host application passes the logged-in user (the form never asks for it):
 *   sessionStorage.setItem('ticketDeskUser', JSON.stringify({
 *     username: 'ravi.kumar', email: 'ravi@company.com', clientName: 'Sakku Group', product: 'HRMS'
 *   }));
 *   (localStorage works too; another key can be set with &userKey=myKey in the script URL)
 *   or window.HelpXBotUser = { ...same object }  or  window.HelpXBot.identify({ ...same object }).
 *
 * When a ticket is created the page receives:
 *   window.addEventListener('helpx:ticket-created', (e) => console.log(e.detail));
 */
(function () {
  'use strict';
  if (window.HelpXBot && window.HelpXBot.__loaded) return;

  // ---------- read the script tag ----------
  var script =
    document.currentScript ||
    Array.prototype.slice.call(document.getElementsByTagName('script')).filter(function (s) {
      return /helpx-bot\.js/.test(s.src);
    })[0];
  if (!script) return;

  var src = new URL(script.src, location.href);
  function param(name) {
    var wanted = name.toLowerCase();
    var value = '';
    src.searchParams.forEach(function (v, k) {
      if (k.toLowerCase() === wanted) value = v;
    });
    return value.trim().replace(/^['"]|['"]$/g, '').trim();
  }

  var APP_CLIENT_ID = param('appClientId');
  var APP_NAME = param('productName') || param('applicationName');
  var API = src.origin + '/api/widget';
  var MAX_FILES = 5;
  var MAX_BYTES = 10 * 1024 * 1024;
  // ticket types come from Masters › Ticket types through /widget/config
  var TYPES = [];
  var DEFAULT_TYPE = '';

  var USER_KEY = param('userKey') || 'ticketDeskUser';
  var identified = null; // set through HelpXBot.identify()

  /** Reads a field case-insensitively, accepting a few spellings (clientName / cilentname / client …). */
  function pick(obj, names) {
    if (!obj || typeof obj !== 'object') return '';
    var keys = Object.keys(obj);
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < keys.length; j++) {
        var v = obj[keys[j]];
        if (keys[j].toLowerCase() === names[i] && v != null && String(v).trim()) return String(v).trim();
      }
    }
    return '';
  }

  function fromStorage(name) {
    try {
      var raw = window[name] && window[name].getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** The logged-in user as the host application passed it: identify() › window.HelpXBotUser › sessionStorage › localStorage. */
  function currentUser() {
    var sources = [identified, window.HelpXBotUser, fromStorage('sessionStorage'), fromStorage('localStorage')];
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      var username = pick(src, ['username', 'user', 'loginname', 'userid']);
      if (!username) continue;
      return {
        username: username,
        email: pick(src, ['email', 'mail', 'emailid']),
        clientName: pick(src, ['clientname', 'cilentname', 'client', 'organization']),
        product: pick(src, ['product', 'productname', 'application']),
      };
    }
    return null;
  }

  if (!APP_CLIENT_ID) {
    console.warn('[HelpX] appClientId is missing from the script URL.');
    return;
  }

  // ---------- state ----------
  var state = {
    organization: APP_NAME,
    screenshots: [], // { file, url }
    files: [], // File[]
    includeScreenshot: true,
    type: '',
    busy: false,
  };

  // ---------- icons ----------
  var ICON = {
    ticket:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/></svg>',
    camera:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  // ---------- styles (inside a shadow root, so the host page is untouched) ----------
  var CSS =
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}' +
    '.fab{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;' +
    'background:linear-gradient(140deg,#2fd29b,#0b8565);color:#fff;box-shadow:0 10px 28px rgba(11,133,101,.45);display:grid;place-items:center;' +
    'font-weight:800;font-size:12px;letter-spacing:.02em;transition:transform .18s}' +
    '.fab:hover{transform:translateY(-2px) scale(1.04)}.fab svg{width:24px;height:24px}' +
    '.fab .lbl{position:absolute;right:66px;white-space:nowrap;background:#0a1613;color:#e4eee9;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;opacity:0;pointer-events:none;transition:opacity .15s}' +
    '.fab:hover .lbl{opacity:1}' +
    '.spin{width:22px;height:22px;border:3px solid rgba(255,255,255,.5);border-right-color:#fff;border-radius:50%;animation:sp .7s linear infinite}' +
    '@keyframes sp{to{transform:rotate(360deg)}}' +
    '.panel{position:fixed;right:22px;bottom:92px;z-index:2147483001;width:360px;max-width:calc(100vw - 24px);max-height:calc(100vh - 110px);' +
    'display:flex;flex-direction:column;background:#fff;color:#0d1916;border-radius:16px;box-shadow:0 24px 64px rgba(9,22,18,.28),0 2px 8px rgba(9,22,18,.1);overflow:hidden;animation:in .22s ease-out}' +
    '@keyframes in{from{opacity:0;transform:translateY(10px)}}' +
    '.head{display:flex;align-items:center;gap:6px;padding:12px 12px 10px 16px;border-bottom:1px solid #e0e7e3}' +
    '.head h2{margin:0;font-size:16px;font-weight:800;flex:1;line-height:1.2}.head small{display:block;font-size:11.5px;font-weight:600;color:#677873}' +
    '.tool{display:grid;justify-items:center;gap:1px;border:0;background:none;cursor:pointer;color:#34443f;font-size:10.5px;font-weight:600;padding:4px 6px;border-radius:8px}' +
    '.tool:hover{background:#f1f5f3}.tool svg{width:17px;height:17px}.tool:disabled{opacity:.4;cursor:default}' +
    '.x{border:0;background:none;cursor:pointer;color:#677873;padding:6px;border-radius:8px;display:grid}.x:hover{background:#f1f5f3;color:#0d1916}.x svg{width:17px;height:17px}' +
    '.body{padding:12px 16px;overflow-y:auto;display:grid;gap:10px}' +
    '.shots{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}' +
    '.shot{position:relative;flex:0 0 auto;width:150px;height:96px;border-radius:8px;border:1px solid #e0e7e3;overflow:hidden;background:#e8eeeb;cursor:zoom-in}' +
    '.shots .shot:only-child{width:100%;height:150px}' +
    '.shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}' +
    '.shot button{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(6,14,12,.7);color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}' +
    '.shot button svg{width:12px;height:12px}' +
    '.note{font-size:12px;color:#677873;background:#f4f7f5;border-radius:8px;padding:8px 10px}' +
    'label.f{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34443f}' +
    'input[type=text],input[type=email],textarea{width:100%;border:1px solid #cbd6d1;border-radius:8px;padding:8px 10px;font-size:13.5px;color:#0d1916;background:#fff;outline:none}' +
    'input:focus,textarea:focus{border-color:#0b8565;box-shadow:0 0 0 3px rgba(11,133,101,.2)}' +
    'textarea{min-height:84px;resize:vertical}' +
    '.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.as{font-size:12px;color:#677873}.as b{color:#0d1916}' +
    '.upload{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:700;color:#34443f}' +
    '.btn2{display:inline-flex;align-items:center;gap:5px;border:1px solid #cbd6d1;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;color:#0d1916}' +
    '.btn2:hover{border-color:#0b8565}.btn2 svg{width:14px;height:14px}' +
    '.files{list-style:none;margin:0;padding:0;display:grid;gap:4px}' +
    '.files li{display:flex;align-items:center;gap:6px;font-size:12px;background:#eef3f1;border-radius:6px;padding:4px 6px}' +
    '.files span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.files button{border:0;background:none;cursor:pointer;color:#677873;display:grid;padding:2px}.files button svg{width:12px;height:12px}' +
    '.check{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:#34443f;cursor:pointer}' +
    '.types{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;font-weight:700;color:#34443f}' +
    '.types label{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid #cbd6d1;border-radius:999px;font-weight:600;cursor:pointer}' +
    '.types input{margin:0;accent-color:#0b8565}.types label.on{border-color:#0b8565;background:#e0f3ec;color:#0a6e54}' +
    '.err{font-size:12px;font-weight:600;color:#d23f38;background:#fde8e6;border-radius:8px;padding:8px 10px}' +
    '.foot{padding:10px 16px 14px;border-top:1px solid #e0e7e3}' +
    '.submit{width:100%;height:40px;border:0;border-radius:9px;background:#0b8565;color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}' +
    '.submit:hover{background:#097156}.submit:disabled{opacity:.6;cursor:default}.submit .spin{width:16px;height:16px;border-width:2px}' +
    '.done{padding:20px 16px;display:grid;gap:10px;justify-items:center;text-align:center}' +
    '.done .ok{width:46px;height:46px;border-radius:50%;background:#dcf4e6;color:#12974c;display:grid;place-items:center}.done .ok svg{width:24px;height:24px}' +
    '.done h3{margin:0;font-size:16px}.done dl{margin:4px 0 0;width:100%;display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12.5px;text-align:left}' +
    '.done dt{color:#677873}.done dd{margin:0;font-weight:600;word-break:break-word}' +
    '.zoom{position:fixed;inset:0;z-index:2147483002;background:rgba(4,9,8,.82);display:grid;place-items:center;padding:20px;cursor:zoom-out}' +
    '.zoom img{max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)}';

  // ---------- mount ----------
  var host = document.createElement('div');
  host.id = 'helpx-bot';
  host.setAttribute('data-html2canvas-ignore', 'true');
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + CSS + '</style><button class="fab" type="button" aria-label="Raise a ticket">' + ICON.ticket + '<span class="lbl">Raise a ticket</span></button>';
  var fab = root.querySelector('.fab');
  var panel = null;

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- screenshot ----------
  var html2canvasLoading = null;
  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (html2canvasLoading) return html2canvasLoading;
    html2canvasLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = function () {
        resolve(window.html2canvas);
      };
      s.onerror = function () {
        html2canvasLoading = null;
        reject(new Error('Screenshot library could not load'));
      };
      document.head.appendChild(s);
    });
    return html2canvasLoading;
  }

  function stamp() {
    var d = new Date();
    function p(n) {
      return (n < 10 ? '0' : '') + n;
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function canvasToFile(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (png) {
        if (png && png.size <= MAX_BYTES) return resolve(new File([png], 'screenshot-' + stamp() + '.png', { type: 'image/png' }));
        canvas.toBlob(
          function (jpg) {
            resolve(jpg ? new File([jpg], 'screenshot-' + stamp() + '.jpg', { type: 'image/jpeg' }) : null);
          },
          'image/jpeg',
          0.8,
        );
      }, 'image/png');
    });
  }

  var EXPAND = 'data-helpx-expand';
  var MAX_CANVAS = 16000; // browsers refuse larger canvases

  /** Big scrolling areas (e.g. the main content pane next to a fixed sidebar) whose hidden part must be captured too. */
  function markScrollAreas() {
    var minWidth = window.innerWidth * 0.3;
    var marked = [];
    var all = document.body ? document.body.getElementsByTagName('*') : [];
    Array.prototype.forEach.call(all, function (el) {
      if (el === host || el.scrollHeight <= el.clientHeight + 4 || el.clientWidth < minWidth || el.clientHeight < 80) return;
      var oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return;
      el.setAttribute(EXPAND, '');
      marked.push(el);
    });
    var extra = 0;
    marked.forEach(function (el) {
      // only the outermost areas add height; nested ones grow inside their parent
      var p = el.parentElement;
      while (p && !p.hasAttribute(EXPAND)) p = p.parentElement;
      if (!p) extra += el.scrollHeight - el.clientHeight;
    });
    return { marked: marked, extra: extra };
  }

  /** In html2canvas's copy of the page: let every scroll area and its parents grow to full height. */
  function expandClone(doc) {
    var css = ';height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;';
    doc.documentElement.style.cssText += css;
    if (doc.body) doc.body.style.cssText += css;
    Array.prototype.forEach.call(doc.querySelectorAll('[' + EXPAND + ']'), function (el) {
      for (var n = el; n && n !== doc.body && n !== doc.documentElement; n = n.parentElement) n.style.cssText += css;
    });
  }

  /** Captures the whole page, including what is scrolled out of view (the widget itself is hidden first). */
  function captureScreen() {
    var shown = host.style.display;
    host.style.display = 'none';
    var areas = markScrollAreas();
    var de = document.documentElement;
    var fullHeight = Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0, window.innerHeight) + areas.extra;
    var fullWidth = Math.max(de.scrollWidth, de.clientWidth);
    var scale = Math.min(window.devicePixelRatio || 1, 1.5, MAX_CANVAS / fullHeight, MAX_CANVAS / fullWidth);
    var bg = getComputedStyle(document.body || de).backgroundColor;
    return loadHtml2Canvas()
      .then(function (h2c) {
        return h2c(de, {
          logging: false,
          useCORS: true,
          backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: de.clientWidth,
          windowHeight: window.innerHeight,
          scale: scale,
          onclone: expandClone,
        });
      })
      .then(canvasToFile)
      .finally(function () {
        areas.marked.forEach(function (el) {
          el.removeAttribute(EXPAND);
        });
        host.style.display = shown;
      });
  }

  function addScreenshot(replace) {
    var take = captureScreen()
      .then(function (file) {
        if (!file) throw new Error('empty');
        if (replace) clearScreenshots();
        state.screenshots.push({ file: file, url: URL.createObjectURL(file) });
        state.includeScreenshot = true;
      })
      .catch(function () {
        state.error = 'Could not take a screenshot of this page. You can still upload an image instead.';
      });
    return take.then(render);
  }

  function clearScreenshots() {
    state.screenshots.forEach(function (s) {
      URL.revokeObjectURL(s.url);
    });
    state.screenshots = [];
  }

  // ---------- panel ----------
  function open() {
    if (state.busy) return;
    state.busy = true;
    fab.innerHTML = '<span class="spin"></span>';
    state.error = null;
    state.result = null;
    var first = state.screenshots.length ? Promise.resolve() : addScreenshot(true);
    first.then(function () {
      state.busy = false;
      fab.innerHTML = ICON.close + '<span class="lbl">Close</span>';
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Raising Ticket');
        root.appendChild(panel);
        panel.addEventListener('paste', onPaste);
      }
      render();
    });
  }

  function close() {
    if (panel) panel.remove();
    panel = null;
    fab.innerHTML = ICON.ticket + '<span class="lbl">Raise a ticket</span>';
  }

  function reset() {
    clearScreenshots();
    state.files = [];
    state.type = DEFAULT_TYPE;
    state.includeScreenshot = true;
    state.error = null;
    state.result = null;
    state.draft = { subject: '', description: '' };
  }
  state.draft = { subject: '', description: '' };

  function remember() {
    if (!panel) return;
    var s = panel.querySelector('[name=subject]');
    var d = panel.querySelector('[name=description]');
    if (s) state.draft.subject = s.value;
    if (d) state.draft.description = d.value;
  }

  function render() {
    if (!panel) return;
    remember();

    if (state.result) {
      var r = state.result;
      panel.innerHTML =
        '<div class="head"><h2>Ticket raised</h2><button class="x" data-act="close" aria-label="Close">' + ICON.close + '</button></div>' +
        '<div class="done"><span class="ok">' + ICON.check + '</span><h3>' + esc(r.ticketId) + '</h3>' +
        '<dl><dt>Organization</dt><dd>' + esc(r.organization) + '</dd>' +
        '<dt>Ticket Id</dt><dd>' + esc(r.ticketId) + '</dd>' +
        '<dt>Create User</dt><dd>' + esc(r.createUser) + '</dd>' +
        '<dt>Created</dt><dd>' + esc(new Date(r.createdAt).toLocaleString()) + '</dd>' +
        '<dt>Application</dt><dd>' + esc(r.application) + '</dd>' +
        '<dt>Subject</dt><dd>' + esc(r.subject) + '</dd></dl></div>' +
        '<div class="foot"><button class="submit" data-act="again">Raise another ticket</button></div>';
      return;
    }

    var user = currentUser();
    var heading = user && (user.clientName || user.product) ? [user.clientName, user.product].filter(Boolean).join(' · ') : state.organization;
    var shots = state.screenshots
      .map(function (s, i) {
        return '<div class="shot" data-zoom="' + i + '"><img src="' + s.url + '" alt="Screenshot ' + (i + 1) + '"><button type="button" data-remove-shot="' + i + '" aria-label="Remove screenshot">' + ICON.close + '</button></div>';
      })
      .join('');

    panel.innerHTML =
      '<div class="head"><h2>Raising Ticket<small>' + esc(heading || 'Support') + '</small></h2>' +
      '<button class="tool" data-act="retake" title="Take the screenshot again">' + ICON.camera + 'Retake</button>' +
      '<button class="tool" data-act="add" title="Add another screenshot"' + (state.screenshots.length + state.files.length >= MAX_FILES ? ' disabled' : '') + '>' + ICON.plus + 'Add</button>' +
      '<button class="x" data-act="close" aria-label="Close">' + ICON.close + '</button></div>' +
      '<div class="body">' +
      (shots ? '<div class="shots">' + shots + '</div>' : '<div class="note">No screenshot yet. Use Retake, or paste an image with Ctrl+V.</div>') +
      (user
        ? '<div class="as">Reporting as <b>' + esc(user.username) + '</b>' + (user.email ? ' · ' + esc(user.email) : '') + '</div>'
        : '<div class="err">The logged-in user was not passed to HelpX, so a ticket cannot be raised. Please contact your administrator.</div>') +
      '<label class="f">Subject<input type="text" name="subject" placeholder="Enter Subject" maxlength="200" value="' + esc(state.draft.subject) + '"></label>' +
      '<label class="f">Description<textarea name="description" placeholder="Describe your issue…">' + esc(state.draft.description) + '</textarea></label>' +
      '<div class="upload">Upload <button type="button" class="btn2" data-act="browse">' + ICON.clip + 'Choose files</button><input type="file" multiple hidden></div>' +
      (state.files.length
        ? '<ul class="files">' + state.files.map(function (f, i) {
            return '<li><span>' + esc(f.name) + '</span><button type="button" data-remove-file="' + i + '" aria-label="Remove">' + ICON.close + '</button></li>';
          }).join('') + '</ul>'
        : '') +
      (state.screenshots.length
        ? '<label class="check"><input type="checkbox" name="include"' + (state.includeScreenshot ? ' checked' : '') + '> Include screenshot</label>'
        : '') +
      (TYPES.length ? '<div class="types">Type: ' + TYPES.map(function (t) {
        return '<label class="' + (state.type === t.value ? 'on' : '') + '"><input type="radio" name="type" value="' + t.value + '"' + (state.type === t.value ? ' checked' : '') + '>' + t.label + '</label>';
      }).join('') + '</div>' : '') +
      (state.error ? '<div class="err">' + esc(state.error) + '</div>' : '') +
      '</div>' +
      '<div class="foot"><button class="submit" data-act="submit"' + (state.sending ? ' disabled' : '') + '>' + (state.sending ? '<span class="spin"></span> Submitting…' : 'Submit Ticket') + '</button></div>';
  }

  function addFiles(list) {
    var room = MAX_FILES - state.files.length - (state.includeScreenshot ? state.screenshots.length : 0);
    var accepted = [];
    Array.prototype.forEach.call(list, function (f) {
      if (f.size > MAX_BYTES) state.error = f.name + ' is larger than 10 MB';
      else if (accepted.length < room) accepted.push(f);
      else state.error = 'You can attach up to ' + MAX_FILES + ' files';
    });
    state.files = state.files.concat(accepted);
    render();
  }

  function onPaste(e) {
    var files = e.clipboardData && e.clipboardData.files;
    if (!files || !files.length) return;
    e.preventDefault();
    var images = [];
    var others = [];
    Array.prototype.forEach.call(files, function (f) {
      if (/^image\//.test(f.type)) images.push(new File([f], 'screenshot-' + stamp() + '-' + (images.length + 1) + '.png', { type: f.type }));
      else others.push(f);
    });
    images.forEach(function (f) {
      state.screenshots.push({ file: f, url: URL.createObjectURL(f) });
    });
    state.includeScreenshot = true;
    if (others.length) addFiles(others);
    else render();
  }

  function submit() {
    remember();
    var user = currentUser();
    var subject = state.draft.subject.trim();
    var description = state.draft.description.trim();

    if (!user) state.error = 'The logged-in user was not passed to HelpX. Please contact your administrator.';
    else if (!subject) state.error = 'Enter a subject';
    else if (description.length < 5) state.error = 'Describe the issue in a few words';
    else state.error = null;
    if (state.error) return render();

    var form = new FormData();
    form.append('appClientId', APP_CLIENT_ID);
    if (APP_NAME) form.append('productName', APP_NAME);
    form.append('username', user.username);
    if (user.email) form.append('email', user.email);
    if (user.clientName) form.append('clientName', user.clientName);
    if (user.product) form.append('product', user.product);
    form.append('subject', subject);
    form.append('description', description);
    if (state.type) form.append('ticketTypeId', state.type);
    form.append('pageUrl', location.href.slice(0, 500));
    var attachments = (state.includeScreenshot ? state.screenshots.map(function (s) { return s.file; }) : []).concat(state.files);
    attachments.slice(0, MAX_FILES).forEach(function (f) {
      form.append('files', f, f.name);
    });

    state.sending = true;
    render();
    fetch(API + '/tickets', { method: 'POST', body: form })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || 'Could not raise the ticket');
          return body;
        });
      })
      .then(function (result) {
        state.sending = false;
        clearScreenshots();
        state.files = [];
        state.draft = { subject: '', description: '' };
        state.result = result;
        try {
          window.dispatchEvent(new CustomEvent('helpx:ticket-created', { detail: result }));
        } catch (e) {
          /* old browsers */
        }
        render();
      })
      .catch(function (err) {
        state.sending = false;
        state.error = err && err.message === 'Failed to fetch' ? 'Cannot reach the ticket server. Try again.' : err.message;
        render();
      });
  }

  // ---------- events ----------
  fab.addEventListener('click', function () {
    if (panel) close();
    else open();
  });

  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act],[data-remove-shot],[data-remove-file],[data-zoom],.zoom') : null;
    if (!t) return;
    if (t.classList.contains('zoom')) return t.remove();
    if (t.hasAttribute('data-remove-shot')) {
      e.stopPropagation();
      remember();
      var s = state.screenshots.splice(Number(t.getAttribute('data-remove-shot')), 1)[0];
      if (s) URL.revokeObjectURL(s.url);
      return render();
    }
    if (t.hasAttribute('data-remove-file')) {
      remember();
      state.files.splice(Number(t.getAttribute('data-remove-file')), 1);
      return render();
    }
    if (t.hasAttribute('data-zoom')) {
      var shot = state.screenshots[Number(t.getAttribute('data-zoom'))];
      if (!shot) return;
      var z = document.createElement('div');
      z.className = 'zoom';
      z.innerHTML = '<img src="' + shot.url + '" alt="Screenshot">';
      root.appendChild(z);
      return;
    }
    var act = t.getAttribute('data-act');
    if (act === 'close') close();
    else if (act === 'retake' || act === 'add') {
      remember();
      state.error = null;
      addScreenshot(act === 'retake');
    } else if (act === 'browse') panel.querySelector('input[type=file]').click();
    else if (act === 'submit') submit();
    else if (act === 'again') {
      reset();
      close();
      open();
    }
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'file') {
      remember();
      addFiles(t.files);
    } else if (t.name === 'include') {
      remember();
      state.includeScreenshot = t.checked;
    } else if (t.name === 'type') {
      remember();
      state.type = t.value;
      render();
    }
  });

  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var z = root.querySelector('.zoom');
      if (z) z.remove();
      else close();
    }
  });

  // ---------- public API ----------
  window.HelpXBot = {
    __loaded: true,
    /** identify({ username, email, clientName, product }); identify(null) on logout */
    identify: function (u) {
      identified = u || null;
      render();
    },
    open: function () {
      if (!panel) open();
    },
    close: close,
  };

  // only show the button when the key is valid
  fetch(API + '/config?appClientId=' + encodeURIComponent(APP_CLIENT_ID))
    .then(function (res) {
      if (!res.ok) throw new Error('not registered');
      return res.json();
    })
    .then(function (cfg) {
      state.organization = cfg.organization || APP_NAME;
      TYPES = (cfg.ticketTypes || []).map(function (t) {
        return { value: String(t.id), label: t.name };
      });
      var def = (cfg.ticketTypes || []).filter(function (t) { return t.isDefault; })[0] || (cfg.ticketTypes || [])[0];
      DEFAULT_TYPE = def ? String(def.id) : '';
      state.type = DEFAULT_TYPE;
      (document.body || document.documentElement).appendChild(host);
    })
    .catch(function () {
      console.warn('[HelpX] This application is not registered in the ticket tool (check appClientId).');
    });
})();
