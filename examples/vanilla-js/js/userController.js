/**
 * userController.js
 *
 * UMD/browser-friendly UserController wiring that registers into the default
 * ObjectStore exactly once.
 *
 * Requirements:
 * - `../../dist/index.js` must be loaded first (UMD), exposing `window.ProjectSandwich`.
 *
 * What this file does:
 * - Defines `UserController` (extends core `Controller`)
 * - Ensures a single controller instance is registered into the default ObjectStore
 * - Exposes convenient globals for the rest of the vanilla example:
 *   - `window.App.getUserController()`
 *   - `window.App.controllers.user`
 */

(function () {
  "use strict";

  const Lib = window.ProjectSandwich;
  if (!Lib) {
    throw new Error(
      "ProjectSandwich global not found. Ensure ../../dist/index.js is loaded before js/userController.js",
    );
  }

  if (!Lib.Controller || !Lib.getDefaultObjectStore) {
    throw new Error(
      "Missing core exports on ProjectSandwich. Expected Controller + getDefaultObjectStore.",
    );
  }

  /**
   * @typedef {Object} User
   * @property {string} username
   * @property {"admin"|"member"|"guest"} role
   * @property {boolean} active
   */

  class UserController extends Lib.Controller {
    /**
     * @param {Object} [options]
     * @param {User[]} [options.seed]
     */
    constructor(options) {
      super("User");
      this._seed = Array.isArray(options && options.seed) ? options.seed : null;
    }

    /**
     * Called automatically by the base Controller constructor.
     * @returns {Promise<User[]>}
     */
    async initialise() {
      // Simulate an async fetch so loading/error behavior is realistic.
      await new Promise((r) => setTimeout(r, 50));

      if (this._seed) return this._seed;

      return [
        { username: "alice", role: "member", active: true },
        { username: "bob", role: "admin", active: true },
        { username: "carol", role: "guest", active: false },
      ];
    }

    /**
     * Map a "compound key" (here: `username`) to the underlying document `_id`.
     * Used by `Controller.invalidate(...)` to update existing documents.
     *
     * Demo-friendly behavior:
     * - If the user doesn't exist yet, insert it and return the new `_id`.
     *
     * @param {User} data
     * @returns {string}
     */
    compoundKeyToObjectId(data) {
      if (!data || !data.username) {
        throw new Error(
          "UserController.compoundKeyToObjectId: username required",
        );
      }

      const existing = this.collection.findOne({ username: data.username });
      if (existing) return existing._id;

      const inserted = this.collection.insertOne(data);
      return inserted._id;
    }

    /**
     * Convenience: return all users as plain models.
     * @returns {Array<{_id: string} & User>}
     */
    list() {
      return this.collection.find().map((d) => d.toModel());
    }

    /**
     * Convenience: upsert-like update by username using `invalidate(...)`.
     * This triggers subscribers via the base Controller's invalidate path.
     *
     * @param {Partial<User> & {username: string}} patch
     * @returns {{_id: string} & User}
     */
    upsertByUsername(patch) {
      if (!patch || !patch.username) {
        throw new Error("UserController.upsertByUsername: username required");
      }

      const currentDoc = this.collection.findOne({ username: patch.username });

      /** @type {User} */
      const next = currentDoc
        ? /** @type {any} */ (Object.assign({}, currentDoc.toModel(), patch))
        : {
            username: patch.username,
            role: patch.role || "member",
            active: typeof patch.active === "boolean" ? patch.active : true,
          };

      this.invalidate(next);

      const updated = this.collection.findOne({ username: patch.username });
      if (!updated) {
        throw new Error("Invariant: user should exist after upsert");
      }
      return updated.toModel();
    }
  }

  // --- Register into the default ObjectStore ONCE ---

  const store = Lib.getDefaultObjectStore();

  // Create a single global namespace for the example.
  const root = window;
  root.App = root.App || {};
  root.App.controllers = root.App.controllers || {};

  /**
   * Ensures a `UserController` is registered into the default ObjectStore exactly once.
   * @returns {UserController}
   */
  function ensureRegisteredUserController() {
    // 1) Prefer the ObjectStore as the source of truth if it already has "User"
    try {
      const existing = store.get("User");
      // Also mirror it into window.App for convenience.
      root.App.controllers.user = root.App.controllers.user || existing;
      return /** @type {UserController} */ (existing);
    } catch {
      // Not registered yet — continue to register.
    }

    // 2) If someone already created one on window.App, register that same instance.
    if (root.App.controllers.user) {
      store.register(root.App.controllers.user);
      return /** @type {UserController} */ (root.App.controllers.user);
    }

    // 3) Otherwise create a new instance, register, and expose it.
    const controller = new UserController();
    store.register(controller);
    root.App.controllers.user = controller;
    return controller;
  }

  // Register immediately on script load.
  ensureRegisteredUserController();

  // Expose helpers for other scripts.
  root.App.UserController = UserController;
  root.App.getUserController = function () {
    return ensureRegisteredUserController();
  };
})();
