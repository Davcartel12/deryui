// Automated crash-game signals for a Telegram group.
//
// The weekly schedule, stickers, games and on/off are controlled from admin.html (Telegram Bot section).
//
// Setup:
//   1. Copy telegram-bot/.env.example to telegram-bot/.env and fill in BOT_TOKEN.
//   2. Add the bot to the group, send any message in the group, then run:
//        npm run bot:chatid
//      and put the printed id into CHAT_ID.
//   3. Start it:  npm run bot
//      Without BOT_TOKEN/CHAT_ID it runs in dry mode and only prints to the console.

const https = require("https");

const CUSTOMER_ID = "077dee8d-c923-4c02-9bee-757573662e69";

const GAMES = [
  {
    name: "Lucky Jet",
    gateway: "https://crash-gateway-grm-cr.gamedev-tech.cc",
    session: "d2ad6c42ff7ed33919d2e56ccfd0ea821751afb9567b8037de8e9b7b201c249c08752482a8967dbff1a80c4635bed9e6a514e79b88840a74cf57d82b12482f31d0fe2e2b07519b7eede43269046fcea133c444f7bf1422bc7043d0ff22627b222eb96a1c822b0746b5a85304299a1d9a3447627ffd3893945d192ee4a5819ac3b8a5e09e93e4cefb41b54fa9d34788f73039af4592a8093650313b1aaefb15b21234c21ab0f76b773d56a017.24fac8fda4ed9e52cfc8804b82cbaa48.077dee8d-c923-4c02-9bee-757573662e69"
  },
  {
    name: "Rocket X",
    gateway: "https://crash-gateway-grm-cr.gamedev-tech.cc",
    session: "957b434f52f1aa4e241df6ea9e1989dd34c1e9b3beb23afee29dc687c37b15c27f1f0c35277eb02213574377e1d47f668689ffb238196552149152da3e8ca1f245ef8c0eebc6c4aacb98e858b5f0dcb6be92815e31e6801cb712dac1530c2fdf9198ef70cf96949a216eb77db295760c0a3bf873ca1af963c30ead7d595735f6ba00efd09f9b3c06ac11933b988978aa7f1d47ad3d4884b06c85549bcdf1755ebaf34d835c4376081a6918fb.85ca52d6366cb1c98c448b1f1552c762.077dee8d-c923-4c02-9bee-757573662e69"
  },
  {
    name: "Crash",
    gateway: "https://crash-gateway-grm-cr.gamedev-tech.cc",
    session: "f7950cf2c5a2ea8b6033ff8b19659b2d763836767b230dc736d046f2ea91b82a2f80d807aee07428abd3fe86819f184af9710334040dbf58cd2cde83de671f23c9e96218b9e9d6be039605653a3ca4348b5fefbac323a07a4b48aa9cce4b5ac8c46ab509334bb4bdf3cddad6612c1899ee459fd4f170a17a862558dcde37865d2d5e0233e3cf050ea0e3e24ca99e30323a3dac6088ec54a5844c7604ff6f60900916c8c508b413d338b2fdd3.a221b405c909b9d0d716bbf36d632599.077dee8d-c923-4c02-9bee-757573662e69"
  },
  {
    name: "Rocket Queen",
    gateway: "https://crash-gateway-grm-cr.gamedev-tech.cc",
    session: "6e54a31882064d171bf4328877d40654dc076e7819375636c307d31539977b212dbcfbf18785833e14cffdac4b444c51e83893eb1d5b3fd036acdd410e49289b8a345572c5df048f91c1cd763a35ed7840f5679e6495e961c0cc19e8acb24fbd0a905c77c82fcf54026429db2132faeda5310fcaef9e626bc7c32c5eee3b32c4bcc532f9b4bfbecc6a02fc4bef99f4703b9db903d233c307a8a6351b7bfad0e56fd344c97923888438e9b5be.2f24e63dbccdd635f6b3a171d3113cb7.077dee8d-c923-4c02-9bee-757573662e69"
  },
  {
    name: "Meta Crash",
    gateway: "https://crash-gateway-grm-cr.100hp.app",
    session: "8c37f18b4fa983bbbac9bd3014afd0ae72e4412077a5aef91fe3118763b741ceb3182fd9e23d5abd6cc9b9c527077014a9fd2cdf4b813f01316de4e5fd2ea063e85833e2e091e2e16e67d2d63c6e8b336f947f7db90b3ded274b00e48b4c60ce0a9dd87b1586baebbd1d1e14dbf915952e3ff9603d2785958a887824411bc09ea1ca68e32e25db557abcc56d0fe8265bcd708836de79492de7c87d324392ee85300dfdf2e1a941c9c664fd77.021e4d2438c4ca9a7f768f9f45e3c72d.077dee8d-c923-4c02-9bee-757573662e69"
  }
];

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.CHAT_ID || "";
const SIGNAL_TZ = process.env.SIGNAL_TZ || "Africa/Lome";
const SIGNAL_OFFSET = process.env.SIGNAL_OFFSET || "+00:00";
const DRY = !BOT_TOKEN || !CHAT_ID;

// Settings are edited from admin.html (Firestore botConfig/settings); these are used until it is reachable.
const DEFAULTS = {
  enabled: true,
  brand: process.env.BRAND || "CHIKE1W",
  checkBeforeSec: 15,
  gapMin: Number(process.env.GAP_MIN_S || 10),
  gapMax: Number(process.env.GAP_MAX_S || 30),
  games: GAMES.map((g) => g.name),
  schedule: [],
  stickerPack: "",
  startSticker: "",
  winStickers: "",
  closeSticker: "",
  signalMedia: {},
  mediaVersion: 0
};
const DAY_CODES = ["all", "weekdays", "weekend", "sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES = { all: "Every day", weekdays: "Mon-Fri", weekend: "Sat-Sun", sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };
let cfg = Object.assign({}, DEFAULTS);
let configOk = null;

const FIRESTORE = "https://firestore.googleapis.com/v1/projects/chike1w/databases/(default)/documents/botConfig/";
const FIREBASE_KEY = "AIzaSyCWOqTsV4Nhd6axIPyTWWI-PFo2HOd_KV0";

const today = { day: "", signals: 0, valid: 0, failed: 0, recent: [], sessions: {} };
let botState = "Starting";
let openKey = "";
let stickerInfo = "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.random() * (max - min) + min;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function telegram(method, body) {
  const res = await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error("Telegram " + method + ": " + data.description);
  return data.result;
}

async function post(text) {
  log("POST\n" + text);
  if (DRY) return;
  try {
    await telegram("sendMessage", { chat_id: CHAT_ID, text: text, parse_mode: "HTML", disable_web_page_preview: true });
  } catch (e) {
    log("send failed:", e.message);
  }
}

async function gameState(game) {
  const res = await fetch(game.gateway + "/state", {
    headers: { accept: "application/json", "session-id": game.session, "customer-id": CUSTOMER_ID }
  });
  if (!res.ok) throw new Error(game.name + " state " + res.status);
  const d = await res.json();
  return {
    id: d.roundConfig && d.roundConfig.id != null ? d.roundConfig.id : null,
    phase: d.currentState || "",
    stop: Array.isArray(d.stopCoefficients) ? d.stopCoefficients[0] : null
  };
}

async function roundCoef(game, id) {
  try {
    const r = (await history(game)).find((x) => x.id === id);
    return r ? r.coef : null;
  } catch (e) {
    return null;
  }
}

function fromValue(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields || {});
  return null;
}
function fromFields(fields) {
  const out = {};
  Object.keys(fields).forEach((k) => (out[k] = fromValue(fields[k])));
  return out;
}
function toValue(x) {
  if (x == null) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === "boolean") return { booleanValue: x };
  if (typeof x === "number") return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(toValue) } };
  if (typeof x === "object") return { mapValue: { fields: toFields(x) } };
  return { stringValue: String(x) };
}
function toFields(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => (out[k] = toValue(obj[k])));
  return out;
}

const num = (v, d) => (isFinite(Number(v)) ? Number(v) : d);
const hhmm = (v, d) => (/^\d{2}:\d{2}$/.test(v || "") ? v : d);
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

async function loadConfig() {
  try {
    const res = await fetch(FIRESTORE + "settings?key=" + FIREBASE_KEY);
    if (res.status === 404) { cfg = Object.assign({}, DEFAULTS); configOk = true; return; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    const f = fromFields((await res.json()).fields || {});
    const c = Object.assign({}, DEFAULTS, f);
    c.enabled = c.enabled !== false;
    c.brand = String(c.brand || DEFAULTS.brand).trim() || DEFAULTS.brand;
    c.checkBeforeSec = Math.min(120, Math.max(0, Math.round(num(c.checkBeforeSec, 15))));
    c.gapMin = Math.max(0, num(c.gapMin, 10));
    c.gapMax = Math.max(c.gapMin, num(c.gapMax, 30));
    c.games = Array.isArray(c.games) ? c.games.filter((n) => GAMES.some((g) => g.name === n)) : DEFAULTS.games;
    c.schedule = (Array.isArray(c.schedule) ? c.schedule : []).map((s) => ({
      day: DAY_CODES.includes(s && s.day) ? s.day : "all",
      start: hhmm(s && s.start, "00:00"),
      end: hhmm(s && s.end, "23:59"),
      game: GAMES.some((g) => g.name === (s && s.game)) ? s.game : "any",
      maxValides: Math.max(0, Math.round(num(s && s.maxValides, 0))),
      maxSignals: Math.max(0, Math.round(num(s && s.maxSignals, 0)))
    })).filter((s) => toMin(s.start) < toMin(s.end));
    c.stickerPack = String(c.stickerPack || "").trim();
    c.startSticker = String(c.startSticker || "").trim();
    c.winStickers = String(c.winStickers || "").trim();
    c.closeSticker = String(c.closeSticker || "").trim();
    const sm = c.signalMedia && typeof c.signalMedia === "object" ? c.signalMedia : {};
    c.signalMedia = {};
    Object.keys(sm).forEach((k) => { if (typeof sm[k] === "string" && sm[k].trim()) c.signalMedia[k] = sm[k].trim(); });
    c.mediaVersion = num(c.mediaVersion, 0);
    if (!configOk) log("admin settings loaded");
    cfg = c;
    configOk = true;
  } catch (e) {
    if (configOk !== false) log("admin settings unavailable (" + e.message + "), using defaults");
    configOk = false;
  }
}

async function writeStatus() {
  try {
    await fetch(FIRESTORE + "status?key=" + FIREBASE_KEY, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: toFields({
        heartbeat: new Date(),
        day: today.day,
        signals: today.signals,
        valid: today.valid,
        failed: today.failed,
        state: botState,
        recent: today.recent,
        sessions: today.sessions,
        openKey: openKey,
        stickerInfo: stickerInfo
      }) })
    });
  } catch (e) { /* admin panel just shows the bot as offline */ }
}

async function restoreStatus() {
  try {
    const res = await fetch(FIRESTORE + "status?key=" + FIREBASE_KEY);
    if (!res.ok) return;
    const s = fromFields((await res.json()).fields || {});
    if (s.day === localDay()) {
      today.day = s.day;
      today.signals = num(s.signals, 0);
      today.valid = num(s.valid, 0);
      today.failed = num(s.failed, 0);
      today.recent = Array.isArray(s.recent) ? s.recent.slice(0, 10) : [];
      today.sessions = s.sessions && typeof s.sessions === "object" ? s.sessions : {};
      openKey = typeof s.openKey === "string" ? s.openKey : "";
    }
  } catch (e) { /* start the day from zero */ }
}

function localDay() {
  return new Date(Date.now() + offsetMs()).toISOString().slice(0, 10);
}

function rollDay() {
  const d = localDay();
  if (today.day !== d) {
    Object.assign(today, { day: d, signals: 0, valid: 0, failed: 0, recent: [], sessions: {} });
  }
}

function localMinutes() {
  const now = new Date(Date.now() + offsetMs());
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function dayMatches(code, dow) {
  if (code === "all") return true;
  if (code === "weekdays") return dow >= 1 && dow <= 5;
  if (code === "weekend") return dow === 0 || dow === 6;
  return DOW[dow] === code;
}

function sessionLabel(s) {
  return (s.game === "any" ? "All games" : s.game) + " " + s.start + "-" + s.end;
}

// The scheduled session running now; closed sessions are skipped so a later overlapping one can run.
function activeSession() {
  const dow = new Date(Date.now() + offsetMs()).getUTCDay();
  const mins = localMinutes();
  let finished = null;
  for (let i = 0; i < cfg.schedule.length; i++) {
    const s = cfg.schedule[i];
    if (!dayMatches(s.day, dow) || mins < toMin(s.start) || mins > toMin(s.end)) continue;
    const key = today.day + "_" + i + "_" + s.start.replace(":", "");
    const sess = Object.assign({}, s, { key: key, label: sessionLabel(s) });
    if (today.sessions[key] && today.sessions[key].closed) { finished = finished || sess; continue; }
    return sess;
  }
  return finished ? Object.assign(finished, { finished: true }) : null;
}

function nextSessionText() {
  const now = new Date(Date.now() + offsetMs());
  const mins = localMinutes();
  for (let ahead = 0; ahead < 8; ahead++) {
    const dow = (now.getUTCDay() + ahead) % 7;
    const options = cfg.schedule
      .filter((s) => dayMatches(s.day, dow) && (ahead > 0 || toMin(s.start) > mins))
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    if (options.length) {
      const s = options[0];
      return " - next: " + (ahead === 0 ? "today" : DAY_NAMES[DOW[dow]]) + " " + s.start + " " + (s.game === "any" ? "All games" : s.game);
    }
  }
  return "";
}

let packCache = { name: "", at: 0, stickers: null, error: "" };
function packName(v) {
  const m = /addstickers\/([A-Za-z0-9_]+)/.exec(v || "");
  if (m) return m[1];
  return /^[A-Za-z0-9_]+$/.test(v || "") ? v : "";
}

async function packStickers() {
  const name = packName(cfg.stickerPack);
  if (!name) return null;
  if (packCache.name === name && Date.now() - packCache.at < 10 * 60000) {
    if (packCache.error) throw new Error(packCache.error);
    return packCache.stickers;
  }
  packCache = { name: name, at: Date.now(), stickers: null, error: "" };
  try {
    if (!BOT_TOKEN) throw new Error("no bot token");
    const set = await telegram("getStickerSet", { name: name });
    packCache.stickers = set.stickers.map((s) => s.file_id);
    return packCache.stickers;
  } catch (e) {
    packCache.error = e.message;
    throw e;
  }
}

async function refreshStickerInfo() {
  if (!cfg.stickerPack) { stickerInfo = ""; return; }
  try {
    const list = await packStickers();
    stickerInfo = list ? "Sticker pack " + packName(cfg.stickerPack) + ": " + list.length + " stickers" : "Sticker pack link not recognised";
  } catch (e) {
    stickerInfo = "Sticker pack problem: " + e.message;
  }
}

// spec: "3" or "2,5,9" (positions in the pack, one picked at random), or a sticker file_id / .webp URL.
async function sendSticker(spec) {
  const items = String(spec || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!items.length) return;
  const pick = items[Math.floor(Math.random() * items.length)];
  let sticker = pick;
  if (/^\d+$/.test(pick)) {
    let list = null;
    try { list = await packStickers(); } catch (e) { log("sticker pack failed:", e.message); return; }
    sticker = list && list[Number(pick) - 1];
    if (!sticker) { log("sticker #" + pick + " is not in the pack"); return; }
  }
  log("STICKER", pick);
  if (DRY) return;
  try {
    if (/^https?:\/\/\S+\.(jpe?g|png)(\?\S*)?$/i.test(sticker)) await telegram("sendPhoto", { chat_id: CHAT_ID, photo: sticker });
    else if (/^https?:\/\/\S+\.(gif|mp4)(\?\S*)?$/i.test(sticker)) await telegram("sendAnimation", { chat_id: CHAT_ID, animation: sticker });
    else await telegram("sendSticker", { chat_id: CHAT_ID, sticker: sticker });
  } catch (e) {
    log("sticker failed:", e.message);
  }
}

// Images uploaded in the admin panel live in botConfig/media and are only re-read when mediaVersion changes.
let media = { version: -1, images: {} };
async function loadMedia() {
  if (media.version === cfg.mediaVersion) return;
  try {
    const res = await fetch(FIRESTORE + "media?key=" + FIREBASE_KEY);
    const f = res.ok ? fromFields((await res.json()).fields || {}) : {};
    const images = {};
    Object.keys(f).forEach((k) => {
      const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(f[k] || "");
      if (m) images[k] = { type: m[1], buf: Buffer.from(m[2], "base64") };
    });
    media = { version: cfg.mediaVersion, images: images };
  } catch (e) {
    log("media load failed:", e.message);
  }
}

async function sendImage(img) {
  log("IMAGE", img.type, img.buf.length + " bytes");
  if (DRY) return;
  try {
    const fd = new FormData();
    fd.append("chat_id", CHAT_ID);
    fd.append("photo", new Blob([img.buf], { type: img.type }), "image." + img.type.split("/")[1]);
    const res = await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendPhoto", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
  } catch (e) {
    log("image failed:", e.message);
  }
}

// Game image or sticker first, then the "All games" one.
async function sendGameMedia(game) {
  await loadMedia();
  for (const key of [game.name, "default"]) {
    if (media.images[key]) return sendImage(media.images[key]);
    if (cfg.signalMedia[key]) return sendSticker(cfg.signalMedia[key]);
  }
}

async function closeSession(key) {
  const st = today.sessions[key];
  if (!st || st.closed) return;
  st.closed = true;
  await post("<b>SESSION CLOSED</b>\n" + st.label + "\nResult: " + st.valid + " valides / " + st.failed + " failed");
  await sendSticker(cfg.closeSticker);
}

function blockedReason() {
  if (!cfg.enabled) return "Paused from admin panel";
  if (!cfg.schedule.length) return "No sessions in the weekly schedule";
  return "";
}

let lastCfgCheck = 0;
async function switchedOff() {
  if (Date.now() - lastCfgCheck >= 10000) {
    lastCfgCheck = Date.now();
    await loadConfig();
  }
  return !cfg.enabled;
}

function remember(line) {
  today.recent.unshift(clock(new Date()) + "  " + line);
  today.recent = today.recent.slice(0, 10);
}

async function history(game) {
  const res = await fetch(game.gateway + "/history", {
    headers: { accept: "application/json", "session-id": game.session, "customer-id": CUSTOMER_ID }
  });
  if (!res.ok) throw new Error(game.name + " history " + res.status);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  return list.map((r) => {
    const first = Array.isArray(r.finalValues) ? r.finalValues[0] : undefined;
    return { id: r.id, coef: parseFloat(r.topCoefficient ?? first ?? 0) };
  }).filter((r) => r.id != null && r.coef > 0);
}

function offsetMs() {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(SIGNAL_OFFSET);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60000;
}

function clock(date) {
  const d = new Date(date.getTime() + offsetMs());
  return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
}

function parseClock(str) {
  const m = /^(\d{1,2}):(\d{2})/.exec(str || "");
  if (!m) return null;
  const local = new Date(Date.now() + offsetMs());
  local.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
  let t = local.getTime() - offsetMs();
  if (t < Date.now() - 2 * 60000) t += 24 * 3600000;
  return new Date(t);
}

// trd.cc.nf currently serves an expired certificate; the response is a public signal, not credentials.
function signalApi() {
  const url = "https://trd.cc.nf/bot.php?t=" + encodeURIComponent(SIGNAL_TZ) + "&offset=" + encodeURIComponent(SIGNAL_OFFSET);
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

// generateCoefficients() from the game pages, limited to its main 2.21x - 4.10x band.
function generateCoefficients() {
  const left = rand(2.21, 4.10);
  const right = left + rand(0.20, 0.60);
  return { leftCoeff: left.toFixed(2), rightCoeff: right.toFixed(2) };
}

// Same steps as generateNewSignal() (GET SIGNAL) on the game pages.
async function getSignal() {
  let prediction = null, targetTime = null;
  try {
    const apiData = await signalApi();
    const twStr = apiData && apiData.time_window;
    const leftRaw = parseFloat(apiData && apiData.manual_prediction && apiData.manual_prediction.coeff);
    const rightRaw = parseFloat(apiData && apiData.ai_prediction);
    targetTime = parseClock(twStr);
    if (!isNaN(leftRaw) && !isNaN(rightRaw) && leftRaw > 0 && rightRaw > leftRaw) {
      prediction = { leftCoeff: leftRaw.toFixed(2), rightCoeff: rightRaw.toFixed(2), source: "api" };
    } else if (!isNaN(leftRaw) && leftRaw > 0) {
      const spread = rand(0.20, 0.55);
      prediction = { leftCoeff: leftRaw.toFixed(2), rightCoeff: (leftRaw + spread).toFixed(2), source: "api-partial" };
    } else { throw new Error("No valid coeff"); }
  } catch (err) {
    log("signal api failed:", err.message);
    prediction = Object.assign(generateCoefficients(), { source: "local" });
  }
  const now = new Date();
  let nextSignalTime;
  if (targetTime) {
    nextSignalTime = targetTime;
    if (nextSignalTime.getTime() <= now.getTime() + 5000) nextSignalTime = new Date(now.getTime() + 30000);
  } else {
    nextSignalTime = new Date(now.getTime() + Math.floor(rand(90, 210)) * 1000);
  }
  return { leftCoeff: prediction.leftCoeff, rightCoeff: prediction.rightCoeff, time: nextSignalTime, source: prediction.source };
}

function pickGame(prev) {
  let pool = GAMES.filter((g) => cfg.games.includes(g.name));
  if (!pool.length) pool = GAMES;
  if (pool.length > 1) pool = pool.filter((g) => g !== prev);
  return pool[Math.floor(Math.random() * pool.length)];
}

const fmt = (v) => (Math.round(v * 100) / 100).toString();

async function runSignal(game) {
  const sig = await getSignal();
  const assurance = parseFloat(sig.leftCoeff);
  // Rounds that take off from checkBeforeSec seconds before the shown hh:mm until hh:mm:59 are counted.
  const minute = new Date(sig.time);
  minute.setSeconds(0, 0);
  const windowStart = minute.getTime() - cfg.checkBeforeSec * 1000;
  const windowEnd = minute.getTime() + 60000;
  const at = clock(sig.time);
  log(game.name, "assurance", sig.leftCoeff, "coefficient", sig.rightCoeff, "time", at, "(" + sig.source + ")");

  await sendGameMedia(game);
  await post(
    "<b>" + cfg.brand + " SIGNAL</b> - Game: <b>" + game.name + "</b>\n\n" +
    "Time: <b>" + at + "</b>\n" +
    "Assurance: <b>" + sig.leftCoeff + "x</b>\n" +
    "Coefficient: <b>" + sig.rightCoeff + "x</b>"
  );
  today.signals++;
  botState = "Waiting for " + at + " window - " + game.name + " " + sig.leftCoeff + "x / " + sig.rightCoeff + "x";
  await writeStatus();

  const cancel = async () => {
    remember("CANCELLED - " + game.name + " " + at);
    await post("<b>SIGNAL CANCELLED</b>\n" + game.name + " - " + at);
    return "cancelled";
  };

  while (Date.now() < windowStart) {
    if (await switchedOff()) return cancel();
    await sleep(Math.min(5000, windowStart - Date.now()));
  }
  botState = "Checking " + game.name + " rounds starting until " + at + ":59";
  await writeStatus();

  const STARTED = ["flying", "ending", "ended"];
  const pending = [];
  const known = new Set();
  let skipId = null;
  let first = true;
  const hardEnd = windowEnd + 3 * 60000;

  while (Date.now() < hardEnd) {
    if (await switchedOff()) return cancel();
    let s = null;
    try { s = await gameState(game); } catch (e) { /* transient network error */ }
    if (s && s.id != null) {
      // A round already in the air when the window opens started too early to count.
      if (first) { first = false; if (STARTED.includes(s.phase)) skipId = s.id; }
      if (STARTED.includes(s.phase) && s.id !== skipId && !known.has(s.id) && Date.now() <= windowEnd) {
        known.add(s.id);
        pending.push(s.id);
        log(game.name, "round started", s.id.slice(0, 8));
      }
      for (const id of pending.slice()) {
        if (id === s.id) continue;
        const coef = await roundCoef(game, id);
        if (coef == null) break;
        pending.splice(pending.indexOf(id), 1);
        if (await judge(coef)) return "valid";
      }
      if (pending[0] === s.id && s.stop != null) {
        pending.shift();
        if (await judge(Number(s.stop))) return "valid";
      }
    }
    if (Date.now() > windowEnd && !pending.length) break;
    await sleep(800);
  }

  async function judge(coef) {
    log(game.name, "round", fmt(coef) + "x");
    if (coef < assurance) return false;
    today.valid++;
    remember("VALIDE " + coef.toFixed(2) + "x - " + game.name + " " + at);
    await post("<b>VALIDE " + coef.toFixed(2) + "x</b>\n" + game.name + " - " + at);
    await sendSticker(cfg.winStickers);
    return true;
  }

  today.failed++;
  remember("FAILED - " + game.name + " " + at + " (" + sig.leftCoeff + "x)");
  await post("<b>FAILED</b>\n" + game.name + " - " + at + " (no round reached " + sig.leftCoeff + "x)");
  return "failed";
}

async function printChatIds() {
  if (!BOT_TOKEN) { console.log("Set BOT_TOKEN in telegram-bot/.env first."); return; }
  const updates = await telegram("getUpdates", {});
  const seen = new Map();
  updates.forEach((u) => {
    const chat = (u.message || u.my_chat_member || u.channel_post || {}).chat;
    if (chat) seen.set(chat.id, chat.title || chat.username || chat.first_name || "");
  });
  if (!seen.size) console.log("No chats yet. Add the bot to the group, send a message there, then run this again.");
  seen.forEach((title, id) => console.log(id, "-", title));
}

async function main() {
  if (process.argv.includes("--chat-id")) return printChatIds();
  log(DRY ? "Dry mode: BOT_TOKEN or CHAT_ID missing, messages are only printed." : "Posting to chat " + CHAT_ID);

  await restoreStatus();
  setInterval(writeStatus, 60000);

  let prev = null;
  let lastBlock = "";
  for (;;) {
    await loadConfig();
    rollDay();
    await refreshStickerInfo();

    let block = blockedReason();
    let sess = null;
    if (!block) {
      sess = activeSession();
      if (!sess) block = "No session scheduled now" + nextSessionText();
      else if (sess.finished) block = "Session finished: " + sess.label + nextSessionText();
    }
    const key = block ? "" : sess.key;

    // A session that ran out of time is closed with its result; pausing does not post anything.
    if (openKey && openKey !== key) {
      if (cfg.enabled) await closeSession(openKey);
      openKey = "";
    }

    if (block) {
      if (block !== lastBlock) log(block);
      lastBlock = block;
      botState = block;
      await writeStatus();
      await sleep(10000);
      continue;
    }
    lastBlock = "";

    if (!today.sessions[key]) {
      today.sessions[key] = { label: sess.label, valid: 0, failed: 0, signals: 0, closed: false };
    }
    const st = today.sessions[key];
    if (openKey !== key) {
      openKey = key;
      log("session start", st.label);
      await sendSticker(cfg.startSticker);
      await post("<b>SESSION STARTED</b>\n" + st.label + (sess.maxValides ? "\nTarget: " + sess.maxValides + " valides" : ""));
    }

    const game = sess.game !== "any" ? GAMES.find((g) => g.name === sess.game) : pickGame(prev);
    prev = game;
    let result = null;
    try {
      result = await runSignal(game);
    } catch (e) {
      log("signal error:", e.message);
    }
    if (result === "valid" || result === "failed") {
      st.signals++;
      if (result === "valid") st.valid++; else st.failed++;
    }
    if (((sess.maxValides > 0 && st.valid >= sess.maxValides) || (sess.maxSignals > 0 && st.signals >= sess.maxSignals))) {
      await closeSession(key);
    }
    botState = st.closed ? "Session finished: " + st.label : "Next signal soon";
    await writeStatus();
    if (!st.closed) await sleep(rand(cfg.gapMin, cfg.gapMax) * 1000);
  }
}

main();
