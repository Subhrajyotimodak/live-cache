/**
 * project-sandwich/examples/vanilla-js/js/logger.js
 *
 * Classic browser logger utilities (no ES modules).
 * Attaches to `window.App.logger`.
 *
 * Expected markup (by convention in this example):
 * - <code id="output"></code> (inside a <pre>)
 * - <div id="libStatus" class="status" style="display:none"></div>
 */
(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window : globalThis;

  // Ensure a single global namespace for the example.
  if (!root.App) root.App = {};

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_err) {
      return String(value);
    }
  }

  /**
   * @returns {string}
   */
  function nowIso() {
    return new Date().toISOString();
  }

  /**
   * @param {HTMLElement|string} outputElOrId
   * @returns {HTMLElement|null}
   */
  function resolveEl(outputElOrId) {
    if (!outputElOrId) return null;
    if (typeof outputElOrId === "string") {
      return /** @type {HTMLElement|null} */ (
        document.getElementById(outputElOrId)
      );
    }
    return /** @type {HTMLElement} */ (outputElOrId);
  }

  /**
   * Append a log entry to an output element.
   *
   * @param {HTMLElement|string} outputElOrId - Element or its id.
   * @param {unknown} payload - String or object to log.
   * @param {{ stamp?: string, title?: string }} [opts]
   */
  function log(outputElOrId, payload, opts) {
    var el = resolveEl(outputElOrId);
    if (!el) return;

    var options = opts || {};
    var stamp = options.stamp || nowIso();
    var header = options.title ? String(options.title) + "\n" : "";
    var body = typeof payload === "string" ? payload : pretty(payload);

    var entry = "[" + stamp + "]\n" + header + body;
    el.textContent = el.textContent ? el.textContent + "\n\n" + entry : entry;
  }

  /**
   * Clear the output element.
   *
   * @param {HTMLElement|string} outputElOrId
   */
  function clear(outputElOrId) {
    var el = resolveEl(outputElOrId);
    if (!el) return;
    el.textContent = "";
  }

  /**
   * Display a library status message in a "status" panel.
   *
   * Expected markup:
   *   <div id="libStatus" class="status" style="display:none"></div>
   *
   * @param {HTMLElement|string} statusElOrId
   * @param {"ok"|"danger"} kind
   * @param {string} title
   * @param {string} message
   */
  function showStatus(statusElOrId, kind, title, message) {
    var el = resolveEl(statusElOrId);
    if (!el) return;

    var isDanger = kind === "danger";
    el.className = "status" + (isDanger ? " danger" : "");
    el.style.display = "block";

    // Keep predictable DOM structure
    el.innerHTML = "<strong></strong><p></p>";

    var strong = el.querySelector("strong");
    var p = el.querySelector("p");

    if (strong) strong.textContent = title;
    if (p) p.textContent = message;
  }

  /**
   * Convenience: log into the default output element (#output).
   * @param {unknown} payload
   * @param {{ stamp?: string, title?: string }} [opts]
   */
  function logToDefault(payload, opts) {
    log("output", payload, opts);
  }

  /**
   * Convenience: clear default output element (#output).
   */
  function clearDefault() {
    clear("output");
  }

  root.App.logger = {
    pretty: pretty,
    nowIso: nowIso,
    log: log,
    clear: clear,
    showStatus: showStatus,

    // convenience for this example
    logToDefault: logToDefault,
    clearDefault: clearDefault,
  };
})();
