// Century in 75 · shared settings for quiz.html and leaderboard.html.
// After deploying the Apps Script web app (century75/web/SETUP.md in the AI Editor folder), paste its URL here:
var C75_API = 'PASTE_WEB_APP_URL_HERE';

(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (C75_API.indexOf('PASTE') === 0 && local) C75_API = '/api';  // local mock server (century75/web/test/mock_server.js)

  function call(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error('Server error ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j && j.ok === false) throw new Error(j.error || 'Something went wrong.');
      return j;
    });
  }

  window.C75 = {
    configured: C75_API.indexOf('PASTE') !== 0,
    get: function (params) {
      var qs = Object.keys(params || {}).filter(function (k) { return params[k] != null && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      return call(C75_API + (qs ? '?' + qs : ''), { method: 'GET' });
    },
    post: function (body) {  // text/plain = no CORS preflight (Apps Script can't answer one)
      return call(C75_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    },
    store: {
      get: function (k) { try { return JSON.parse(localStorage.getItem('c75_' + k)); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem('c75_' + k, JSON.stringify(v)); } catch (e) { } }
    },
    el: function (tag, attrs, kids) {
      var n = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'class') n.className = attrs[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
      (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      return n;
    },
    fmtDate: function (iso) {  // '2026-11-17' -> 'Tue 17 Nov'
      var d = new Date(iso + 'T12:00:00+05:30');
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    },
    fmtTime: function (ms) {
      return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    },
    pad: function (n) { return (n < 10 ? '0' : '') + n; }
  };
})();
