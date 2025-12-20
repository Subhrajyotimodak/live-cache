/**
 * Tiny DOM helper utilities for the vanilla example.
 *
 * Classic browser script version:
 * - No ESM exports
 * - Attaches helpers to `window.App.dom`
 *
 * Usage:
 *   const { $, qs, qsa, show, toggleClass, parseBool, pretty, appendLog, clearLog } = window.App.dom;
 */
(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  /** @type {any} */
  const App = (root.App = root.App || {});
  App.dom = App.dom || {};

  /**
   * Get an element by id (throws if missing).
   * @param {string} id
   * @returns {HTMLElement}
   */
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element with id="${id}"`);
    return /** @type {HTMLElement} */ (el);
  }

  /**
   * Query selector (throws if missing).
   * @param {string} selector
   * @param {ParentNode} [rootNode]
   * @returns {Element}
   */
  function qs(selector, rootNode) {
    const scope = rootNode || document;
    const el = scope.querySelector(selector);
    if (!el) throw new Error(`Missing element for selector: ${selector}`);
    return el;
  }

  /**
   * Query selector all.
   * @param {string} selector
   * @param {ParentNode} [rootNode]
   * @returns {Element[]}
   */
  function qsa(selector, rootNode) {
    const scope = rootNode || document;
    return Array.from(scope.querySelectorAll(selector));
  }

  /**
   * Show/hide an element by setting inline display.
   * @param {HTMLElement} el
   * @param {boolean} [on]
   */
  function show(el, on) {
    el.style.display = on === false ? "none" : "";
  }

  /**
   * Toggle a class on an element.
   * @param {HTMLElement} el
   * @param {string} className
   * @param {boolean} on
   */
  function toggleClass(el, className, on) {
    el.classList.toggle(className, !!on);
  }

  /**
   * Parse "true"/"false" strings into booleans.
   * @param {string} value
   * @returns {boolean}
   */
  function parseBool(value) {
    return String(value).toLowerCase() === "true";
  }

  /**
   * Safe JSON pretty-printer.
   * @param {unknown} value
   * @returns {string}
   */
  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /**
   * Append a timestamped log entry to a <code> element (inside a <pre> typically).
   * @param {HTMLElement} codeEl
   * @param {unknown} entry
   */
  function appendLog(codeEl, entry) {
    const stamp = new Date().toISOString();
    const text = typeof entry === "string" ? entry : pretty(entry);

    codeEl.textContent = codeEl.textContent
      ? `${codeEl.textContent}\n\n[${stamp}]\n${text}`
      : `[${stamp}]\n${text}`;
  }

  /**
   * Clear the output <code> element.
   * @param {HTMLElement} codeEl
   */
  function clearLog(codeEl) {
    codeEl.textContent = "";
  }

  // Attach to global App namespace
  App.dom.$ = $;
  App.dom.qs = qs;
  App.dom.qsa = qsa;
  App.dom.show = show;
  App.dom.toggleClass = toggleClass;
  App.dom.parseBool = parseBool;
  App.dom.pretty = pretty;
  App.dom.appendLog = appendLog;
  App.dom.clearLog = clearLog;
})();
