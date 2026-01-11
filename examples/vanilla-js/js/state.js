/**
 * ObjectStore-backed global state helpers for the vanilla example.
 *
 * This file is designed for the UMD/browser build where the library is exposed as:
 *   window.LiveCache
 *
 * It uses:
 *   LiveCache.getDefaultObjectStore()
 *
 * as the global registry for app state (and optionally controllers).
 *
 * Usage from other non-module scripts:
 *   const { getAppState, getUserCollection, getStore } = window.App.state;
 *
 * Notes:
 * - The core `ObjectStore` implementation stores values in a Map keyed by `name`.
 * - While it’s typed around Controllers in TS, at runtime it stores any object.
 *   For this vanilla example we register a plain "AppState" object in the store.
 */
(function (global) {
  "use strict";

  const APP_NAMESPACE = "App";
  const STATE_NAMESPACE = "state";
  const APP_STATE_NAME = "AppState";

  function getGlobalApp() {
    global[APP_NAMESPACE] = global[APP_NAMESPACE] || {};
    return global[APP_NAMESPACE];
  }

  /**
   * @returns {any} LiveCache UMD global
   */
  function requireLib() {
    const Lib = global.LiveCache;
    if (!Lib) {
      throw new Error(
        "LiveCache global not found. Ensure ../../dist/index.js is loaded before state.js",
      );
    }
    if (typeof Lib.getDefaultObjectStore !== "function") {
      throw new Error(
        "LiveCache.getDefaultObjectStore is missing. Ensure it is exported from src/index.ts and included in the UMD build.",
      );
    }
    if (typeof Lib.Collection !== "function") {
      throw new Error(
        "LiveCache.Collection is missing. Ensure it is exported from src/index.ts and included in the UMD build.",
      );
    }
    return Lib;
  }

  /**
   * @returns {any} ObjectStore (default singleton)
   */
  function getStore() {
    const Lib = requireLib();
    return Lib.getDefaultObjectStore();
  }

  /**
   * Idempotent: register a value by name if it doesn't exist.
   *
   * @template T
   * @param {string} name
   * @param {() => T} factory
   * @returns {T}
   */
  function getOrRegister(name, factory) {
    const store = getStore();

    // `ObjectStore` exposes its `store` Map publicly.
    if (store && store.store && typeof store.store.has === "function") {
      if (store.store.has(name)) {
        return store.get(name);
      }
    } else {
      // Fall back to get/try in case internals change.
      try {
        return store.get(name);
      } catch {
        // continue to register
      }
    }

    const value = factory();

    // ObjectStore.register expects { name: string } at runtime. Controllers satisfy this,
    // but plain objects can too.
    store.register(
      /** @type {any} */ ({
        name,
        ...(value && typeof value === "object" ? value : { value }),
      }),
    );

    return store.get(name);
  }

  /**
   * Creates the canonical app state object that lives in the default ObjectStore.
   * @returns {any}
   */
  function createAppState() {
    const Lib = requireLib();

    // Keep state minimal and framework-free.
    // Other scripts can freely attach additional fields.
    return {
      /**
       * IMPORTANT: ObjectStore uses `.name` as the key.
       */
      name: APP_STATE_NAME,

      /**
       * Single in-memory collection for the demo.
       * Stored here so every script sees the same instance.
       */
      users: new Lib.Collection("User"),

      /**
       * Get a plain snapshot of current users.
       * @returns {Array<any>}
       */
      listUsers() {
        return this.users.find().map((d) => d.toModel());
      },

      /**
       * Replace the current User collection with a new empty instance.
       * Helpful in demos and debugging.
       */
      resetUsers() {
        this.users = new Lib.Collection("User");
      },
    };
  }

  /**
   * @returns {any} AppState object stored in the default ObjectStore
   */
  function getAppState() {
    return getOrRegister(APP_STATE_NAME, createAppState);
  }

  /**
   * Convenience getter for the shared User collection (from AppState).
   * @returns {any}
   */
  function getUserCollection() {
    return getAppState().users;
  }

  /**
   * Optional convenience for controller-based demos:
   * If a Controller named `name` has been registered in the default ObjectStore,
   * this returns it; otherwise `null`.
   *
   * @param {string} name
   * @returns {any | null}
   */
  function tryGetController(name) {
    const store = getStore();
    try {
      return store.get(name);
    } catch {
      return null;
    }
  }

  /**
   * Register a controller (or any object with a `.name`) into the default store.
   * Idempotent if an entry with the same name already exists.
   *
   * @param {{ name: string }} controller
   * @returns {any} the stored controller
   */
  function registerController(controller) {
    if (!controller || typeof controller.name !== "string") {
      throw new Error(
        "registerController: expected an object with a string `.name`",
      );
    }

    const store = getStore();

    // Avoid replacing existing controllers.
    if (store.store && store.store.has(controller.name)) {
      return store.get(controller.name);
    }

    store.register(controller);
    return store.get(controller.name);
  }

  // Expose API on window.App.state (non-module friendly).
  const App = getGlobalApp();
  App[STATE_NAMESPACE] = {
    APP_STATE_NAME,

    // Core helpers
    getStore,
    getOrRegister,

    // State helpers
    getAppState,
    getUserCollection,

    // Optional controller helpers
    tryGetController,
    registerController,
  };

  // Ensure the state exists as soon as this file is loaded (safe/idempotent).
  // This makes dependent scripts simpler.
  getAppState();
})(typeof window !== "undefined" ? window : globalThis);
