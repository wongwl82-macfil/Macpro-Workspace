/* Macpro Document Hub — js/main.js
   Starts the app. Runs last, after every other file has loaded.
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
pills(); sbName(); checkMonthRollover(); nav('dash');
checkSession(); // handles auth + cloud load
