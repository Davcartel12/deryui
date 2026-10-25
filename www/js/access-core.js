// Shared access-code logic used by index.html (activation), admin.html (management) and
// access-guard.js (per-page check). Plain script so it can run before the page's own code.
(function () {
  var SESSION_KEY = "apnaj_access";
  var DEVICE_KEY = "apnaj_device";

  var firebaseConfig = {
    apiKey: "AIzaSyCWOqTsV4Nhd6axIPyTWWI-PFo2HOd_KV0",
    authDomain: "chike1w.firebaseapp.com",
    projectId: "chike1w",
    storageBucket: "chike1w.firebasestorage.app",
    messagingSenderId: "276077991026",
    appId: "1:276077991026:web:235211079b963440051eeb",
    measurementId: "G-E2X3HD8ZWR"
  };

  var HOUR = 3600000;
  var DAY = 24 * HOUR;
  var UNITS = { hours: HOUR, days: DAY, weeks: 7 * DAY, months: 30 * DAY };

  function normalizeCode(raw) {
    return String(raw || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }

  function randomCode() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    var out = "";
    var bytes = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    for (var i = 0; i < 8; i++) {
      out += alphabet[bytes[i] % alphabet.length];
      if (i === 3) out += "-";
    }
    return out;
  }

  function toMillis(value) {
    if (value == null) return null;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value.seconds != null) return value.seconds * 1000;
    var t = Date.parse(value);
    return isFinite(t) ? t : null;
  }

  function deviceId() {
    var id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      var bytes = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      id = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  // Decide whether a code document grants access right now.
  // Returns { ok, reason, expiresAt, activated, data }.
  function evaluate(data, device, now) {
    now = now || Date.now();
    if (!data) return { ok: false, reason: "invalid" };
    if (data.active === false) return { ok: false, reason: "revoked" };
    var durationMs = Number(data.durationMs);
    if (!isFinite(durationMs) || durationMs <= 0) return { ok: false, reason: "invalid" };
    var activatedAt = toMillis(data.activatedAt);
    var expiresAt = activatedAt != null ? activatedAt + durationMs : null;
    if (expiresAt != null && now > expiresAt) return { ok: false, reason: "expired", expiresAt: expiresAt };
    if (data.lockDevice !== false && data.deviceId && device && data.deviceId !== device) {
      return { ok: false, reason: "device" };
    }
    return { ok: true, expiresAt: expiresAt, activated: activatedAt != null, data: data };
  }

  function formatDuration(ms) {
    ms = Number(ms) || 0;
    if (ms >= UNITS.months && ms % UNITS.months === 0) return plural(ms / UNITS.months, "month");
    if (ms >= UNITS.weeks && ms % UNITS.weeks === 0) return plural(ms / UNITS.weeks, "week");
    if (ms >= DAY && ms % DAY === 0) return plural(ms / DAY, "day");
    if (ms >= HOUR && ms % HOUR === 0) return plural(ms / HOUR, "hour");
    return plural(Math.max(1, Math.round(ms / 60000)), "minute");
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function formatRemaining(ms) {
    if (ms <= 0) return "expired";
    var d = Math.floor(ms / DAY);
    var h = Math.floor((ms % DAY) / HOUR);
    var m = Math.floor((ms % HOUR) / 60000);
    if (d > 0) return d + "d " + h + "h left";
    if (h > 0) return h + "h " + m + "m left";
    return m + "m left";
  }

  function formatDate(ms) {
    if (ms == null) return "";
    return new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; }
  }

  function writeSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  var modules = null;
  function firebase() {
    if (!modules) {
      modules = Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
      ]).then(function (mods) {
        var appMod = mods[0], fs = mods[1];
        var app;
        try { app = appMod.getApp("access"); } catch (e) { app = appMod.initializeApp(firebaseConfig, "access"); }
        return { fs: fs, db: fs.getFirestore(app) };
      });
    }
    return modules;
  }

  window.AccessCodes = {
    SESSION_KEY: SESSION_KEY,
    UNITS: UNITS,
    config: firebaseConfig,
    normalizeCode: normalizeCode,
    randomCode: randomCode,
    toMillis: toMillis,
    deviceId: deviceId,
    evaluate: evaluate,
    formatDuration: formatDuration,
    formatRemaining: formatRemaining,
    formatDate: formatDate,
    readSession: readSession,
    writeSession: writeSession,
    clearSession: clearSession,
    firebase: firebase
  };
})();
