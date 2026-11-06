// Automated crash-game signals for a Telegram group.
//
// Timing, daily limits, games and on/off are controlled from admin.html (Telegram Bot section).
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
    session: "299414bc54520564d91a381082d5e3c6442ad45ece6eaeb402bce0c7e46b4806538807964fb1b60154543333408d84032654af9234b2e78daa6bee258f212677160e35288ba0750f10b39e677b3469c046cbac6190fff1b30d51fb67d9ce70a60c116f6d2bea5b5f6b9e10b81cacacb15f14331973b3370fba551bf5f2c83a6166cc1ffa94bd70c108be3e88301d93cfa5c7af381e5c1342fc3c522b27eb6b4ecf6f95906127e898f9130805.ba36c97750e47ddf2487a16b550970dc.077dee8d-c923-4c02-9bee-757573662e69"
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
const SIGNAL_TZ = process.env.SIGNAL_TZ || "Africa/Douala";
const SIGNAL_OFFSET = process.env.SIGNAL_OFFSET || "+01:00";
const DRY = !BOT_TOKEN || !CHAT_ID;

// Settings are edited from admin.html (Firestore botConfig/settings); these are used until it is reachable.
const DEFAULTS = {
  enabled: true,
  brand: process.env.BRAND || "CHIKE1W",
  startTime: "00:00",
  endTime: "23:59",
  maxValides: 0,
  maxSignals: 0,
  leadMin: 2,
  leadMax: 4,
  checkBefore: 1,
  gapMin: Number(process.env.GAP_MIN_S || 10),
  gapMax: Number(process.env.GAP_MAX_S || 30),
  games: GAMES.map((g) => g.name)
};
let cfg = Object.assign({}, DEFAULTS);
let configOk = null;

const FIRESTORE = "https://firestore.googleapis.com/v1/projects/chike1w/databases/(default)/documents/botConfig/";
const FIREBASE_KEY = "AIzaSyCWOqTsV4Nhd6axIPyTWWI-PFo2HOd_KV0";

const today = { day: "", signals: 0, valid: 0, failed: 0, recent: [] };
let botState = "Starting";
let closedNotice = false;

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
  return { stringValue: String(x) };
}
function toFields(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => (out[k] = toValue(obj[k])));
  return out;
}

const num = (v, d) => (isFinite(Number(v)) ? Number(v) : d);
const hhmm = (v, d) => (/^\d{2}:\d{2}$/.test(v || "") ? v : d);

async function loadConfig() {
  try {
    const res = await fetch(FIRESTORE + "settings?key=" + FIREBASE_KEY);
    if (res.status === 404) { cfg = Object.assign({}, DEFAULTS); configOk = true; return; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    const f = fromFields((await res.json()).fields || {});
    const c = Object.assign({}, DEFAULTS, f);
    c.enabled = c.enabled !== false;
    c.brand = String(c.brand || DEFAULTS.brand).trim() || DEFAULTS.brand;
    c.startTime = hhmm(c.startTime, DEFAULTS.startTime);
    c.endTime = hhmm(c.endTime, DEFAULTS.endTime);
    c.maxValides = Math.max(0, Math.round(num(c.maxValides, 0)));
    c.maxSignals = Math.max(0, Math.round(num(c.maxSignals, 0)));
    c.checkBefore = Math.min(10, Math.max(0, Math.round(num(c.checkBefore, 1))));
    c.leadMin = Math.max(c.checkBefore + 1, Math.round(num(c.leadMin, 2)));
    c.leadMax = Math.max(c.leadMin, Math.round(num(c.leadMax, 4)));
    c.gapMin = Math.max(0, num(c.gapMin, 10));
    c.gapMax = Math.max(c.gapMin, num(c.gapMax, 30));
    c.games = Array.isArray(c.games) ? c.games.filter((n) => GAMES.some((g) => g.name === n)) : DEFAULTS.games;
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
        recent: today.recent
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
    }
  } catch (e) { /* start the day from zero */ }
}

function localDay() {
  return new Date(Date.now() + offsetMs()).toISOString().slice(0, 10);
}

function rollDay() {
  const d = localDay();
  if (today.day !== d) {
    Object.assign(today, { day: d, signals: 0, valid: 0, failed: 0, recent: [] });
    closedNotice = false;
  }
}

function inActiveHours() {
  const now = new Date(Date.now() + offsetMs());
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const a = toMin(cfg.startTime), b = toMin(cfg.endTime);
  return a <= b ? mins >= a && mins <= b : mins >= a || mins <= b;
}

function limitReason() {
  if (cfg.maxValides > 0 && today.valid >= cfg.maxValides) return "Daily target reached: " + today.valid + " valides";
  if (cfg.maxSignals > 0 && today.signals >= cfg.maxSignals) return "Daily signal limit reached: " + today.signals + " signals";
  return "";
}

function blockedReason() {
  if (!cfg.enabled) return "Paused from admin panel";
  if (!inActiveHours()) return "Outside active hours (" + cfg.startTime + " - " + cfg.endTime + ")";
  return limitReason();
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

function localCoefficients() {
  const r = Math.random();
  let left;
  if (r < 0.6) left = rand(2.21, 4.1);
  else if (r < 0.85) left = rand(3.51, 8.0);
  else left = rand(8.0, 10.0);
  return { assurance: left, coefficient: left + rand(0.2, 0.6) };
}

// Mirrors GET SIGNAL on the game pages: API first, then the same local fallback.
async function getSignal() {
  let sig = null, time = null, source = "local";
  try {
    const d = await signalApi();
    const left = parseFloat(d && d.manual_prediction && d.manual_prediction.coeff);
    const right = parseFloat(d && d.ai_prediction);
    time = parseClock(d && d.time_window);
    if (left > 1 && right > left) sig = { assurance: left, coefficient: right };
    else if (left > 1) sig = { assurance: left, coefficient: left + rand(0.2, 0.55) };
    if (sig) source = "api";
  } catch (e) {
    log("signal api failed:", e.message);
  }
  if (!sig) sig = localCoefficients();
  const before = cfg.checkBefore * 60000;
  const tooSoon = (t) => t.getTime() - before < Date.now() + 60000;
  if (!time || tooSoon(time) || time.getTime() > Date.now() + (cfg.leadMax + 1) * 60000) {
    time = new Date(Date.now() + rand(cfg.leadMin, cfg.leadMax + 1) * 60000);
  }
  time.setSeconds(0, 0);
  while (tooSoon(time)) time = new Date(time.getTime() + 60000);
  return Object.assign(sig, { time: time, source: source });
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
  const assurance = Math.round(sig.assurance * 100) / 100;
  const coefficient = Math.round(sig.coefficient * 100) / 100;
  // Window opens checkBefore minutes before the signal time and closes at hh:mm:59.
  const windowStart = sig.time.getTime() - cfg.checkBefore * 60000;
  const windowEnd = sig.time.getTime() + 60000;
  const at = clock(sig.time);
  log(game.name, "assurance", assurance, "coefficient", coefficient, "time", at, "(" + sig.source + ")");

  await post(
    "<b>" + cfg.brand + " SIGNAL</b> - Game: <b>" + game.name + "</b>\n\n" +
    "Time: <b>" + at + "</b>\n" +
    "Assurance: <b>" + fmt(assurance) + "x</b>\n" +
    "Coefficient: <b>" + fmt(coefficient) + "x</b>"
  );
  today.signals++;
  botState = "Waiting for " + at + " window - " + game.name + " " + fmt(assurance) + "x / " + fmt(coefficient) + "x";
  await writeStatus();

  const cancel = async () => {
    remember("CANCELLED - " + game.name + " " + at);
    await post("<b>SIGNAL CANCELLED</b>\n" + game.name + " - " + at);
  };

  while (Date.now() < windowStart) {
    if (await switchedOff()) return cancel();
    await sleep(Math.min(5000, windowStart - Date.now()));
  }
  botState = "Checking " + game.name + " rounds until " + at + ":59";
  await writeStatus();

  const seen = new Set();
  try { (await history(game)).forEach((r) => seen.add(r.id)); } catch (e) { /* first poll below fills it */ }

  while (Date.now() < windowEnd) {
    if (await switchedOff()) return cancel();
    await sleep(1500);
    let rounds;
    try { rounds = await history(game); } catch (e) { continue; }
    const fresh = rounds.filter((r) => !seen.has(r.id)).reverse();
    for (const r of fresh) {
      seen.add(r.id);
      log(game.name, "round", fmt(r.coef) + "x");
      if (r.coef >= assurance) {
        today.valid++;
        remember("VALIDE " + r.coef.toFixed(2) + "x - " + game.name + " " + at);
        await post("<b>VALIDE " + r.coef.toFixed(2) + "x</b>\n" + game.name + " - " + at);
        return;
      }
    }
  }

  today.failed++;
  remember("FAILED - " + game.name + " " + at + " (" + fmt(assurance) + "x)");
  await post("<b>FAILED</b>\n" + game.name + " - " + at + " (no round reached " + fmt(assurance) + "x)");
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
    const block = blockedReason();
    if (block) {
      if (block !== lastBlock) log(block);
      lastBlock = block;
      if (limitReason() && !closedNotice) {
        closedNotice = true;
        await post("<b>SESSION CLOSED</b>\nToday: " + today.valid + " valides / " + today.failed + " failed");
      }
      botState = block;
      await writeStatus();
      await sleep(10000);
      continue;
    }
    lastBlock = "";
    closedNotice = false;

    const game = pickGame(prev);
    prev = game;
    try {
      await runSignal(game);
    } catch (e) {
      log("signal error:", e.message);
    }
    botState = "Next signal soon";
    await writeStatus();
    await sleep(rand(cfg.gapMin, cfg.gapMax) * 1000);
  }
}

main();
