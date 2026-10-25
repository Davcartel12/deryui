// Page guard: include after access-core.js on every page behind the access code.
// Sends the visitor to index.html when there is no valid session, and re-checks the code
// against the server so revoked codes or shortened durations take effect on the next open.
(function () {
  var A = window.AccessCodes;
  var RECHECK_MS = 2 * 60 * 1000;

  function kick(reason) {
    A.clearSession();
    location.replace("index.html" + (reason ? "?reason=" + encodeURIComponent(reason) : ""));
  }

  var session = A.readSession();
  if (!session || !session.code) { kick(); return; }
  if (session.expiresAt != null && Date.now() > session.expiresAt) { kick("expired"); return; }

  // Expire locally without a reload if the page stays open past the deadline.
  if (session.expiresAt != null) {
    setTimeout(function () { kick("expired"); }, Math.min(session.expiresAt - Date.now() + 500, 2147483647));
  }

  if (session.checkedAt && Date.now() - session.checkedAt < RECHECK_MS) return;

  A.firebase().then(function (ctx) {
    return ctx.fs.getDoc(ctx.fs.doc(ctx.db, "accessCodes", session.code));
  }).then(function (snap) {
    var result = A.evaluate(snap.exists() ? snap.data() : null, A.deviceId());
    if (!result.ok) { kick(result.reason); return; }
    session.expiresAt = result.expiresAt;
    session.checkedAt = Date.now();
    A.writeSession(session);
  }).catch(function () {
    // Offline or rules problem: keep the cached session until it expires on its own.
  });
})();
