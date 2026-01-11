/**
 * Vanilla JS example app script
 *
 * Goals:
 * - Use `LiveCache.getDefaultObjectStore()` as the global state container
 * - Use the registered `UserController` (registered by `js/userController.js`)
 * - Drive the UI using the controller's underlying `collection`
 *
 * Assumptions:
 * - `../../dist/index.js` is loaded first (UMD => `window.LiveCache`)
 * - `js/userController.js` is loaded before this file and registers "User"
 * - index.html contains the required element IDs referenced below
 */

(function () {
  "use strict";

  const Lib = /** @type {any} */ (window.LiveCache);

  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element with id="${id}"`);
    return el;
  }

  function parseBool(value) {
    return String(value).toLowerCase() === "true";
  }

  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function appendLog(entry) {
    const out = $("output");
    const stamp = new Date().toISOString();
    const text = typeof entry === "string" ? entry : pretty(entry);
    out.textContent = out.textContent
      ? `${out.textContent}\n\n[${stamp}]\n${text}`
      : `[${stamp}]\n${text}`;
  }

  function clearLog() {
    $("output").textContent = "";
  }

  function showLibStatus(kind, title, message) {
    const el = $("libStatus");
    el.className = "status" + (kind === "danger" ? " danger" : "");
    el.style.display = "block";

    // keep markup deterministic
    el.innerHTML = "<strong></strong><p></p>";
    const strong = el.querySelector("strong");
    const p = el.querySelector("p");
    if (strong) strong.textContent = title;
    if (p) p.textContent = message;
  }

  function ensureLib() {
    if (!Lib) {
      showLibStatus(
        "danger",
        "Library not found",
        "The UMD bundle did not load, so `window.LiveCache` is undefined. Build the project to generate `dist/index.js`, then reload this page.",
      );
      return null;
    }

    const missing = [];
    if (!Lib.getDefaultObjectStore) missing.push("getDefaultObjectStore");
    if (!Lib.Collection) missing.push("Collection");
    if (!Lib.Controller) missing.push("Controller");

    if (missing.length) {
      showLibStatus(
        "danger",
        "Core exports missing",
        `LiveCache loaded, but these exports are missing: ${missing.join(
          ", ",
        )}. Check src/index.ts exports and rebuild.`,
      );
      return null;
    }

    return Lib;
  }

  /**
   * Retrieves the registered UserController from the default ObjectStore.
   * `js/userController.js` is expected to have registered it under the name "User".
   */
  function getUserController() {
    const lib = ensureLib();
    if (!lib) return null;

    // Prefer the ObjectStore (requested global state mechanism)
    const store = lib.getDefaultObjectStore();
    if (!store || typeof store.get !== "function") {
      showLibStatus(
        "danger",
        "ObjectStore unavailable",
        "`getDefaultObjectStore()` did not return a usable store.",
      );
      return null;
    }

    try {
      return store.get("User");
    } catch (e) {
      // Fallback: if userController.js exposed a getter, try it.
      if (window.App && typeof window.App.getUserController === "function") {
        return window.App.getUserController();
      }

      showLibStatus(
        "danger",
        "UserController not registered",
        'No controller named "User" was found in the default ObjectStore. Ensure `js/userController.js` is loaded before `js/app.js`.',
      );
      appendLog({
        error: "UserController not registered",
        detail: String(e && e.message ? e.message : e),
      });
      return null;
    }
  }

  function getCollection(controller) {
    if (!controller || !controller.collection) {
      throw new Error("Invalid controller: missing collection");
    }
    return controller.collection;
  }

  function refreshSummary(controller) {
    const collection = getCollection(controller);
    $("collectionName").textContent = collection.name;
    $("docCount").textContent = String(collection.find().length);
  }

  function setIdInput(value) {
    $("idInput").value = value || "";
  }

  function buildWhereFromFindInputs() {
    const username = $("findUsername").value.trim();
    const role = $("findRole").value;

    /** @type {any} */
    const where = {};
    if (username) where.username = username;
    if (role) where.role = role;

    return where;
  }

  function dumpAll(controller) {
    const collection = getCollection(controller);
    const models = collection.find().map((doc) => doc.toModel());
    appendLog({ action: "dumpAll", count: models.length, models });
  }

  function insertOrUpsertFromForm(controller) {
    const username = $("usernameInput").value.trim();
    const role = $("roleInput").value;
    const active = parseBool($("activeInput").value);

    if (!username) {
      appendLog("username is required");
      return;
    }

    // Prefer controller path so subscribers get notified.
    if (typeof controller.upsertByUsername === "function") {
      const model = controller.upsertByUsername({ username, role, active });
      setIdInput(model._id);
      refreshSummary(controller);
      appendLog({ action: "upsertByUsername", model });
      return;
    }

    // Fallback: use base controller.invalidate() if available
    if (typeof controller.invalidate === "function") {
      controller.invalidate({ username, role, active });
      const doc = controller.collection.findOne({ username });
      if (doc) setIdInput(doc._id);
      refreshSummary(controller);
      appendLog({
        action: "invalidate",
        note: "Inserted/updated via Controller.invalidate(...)",
        username,
      });
      return;
    }

    // Last resort: write directly to collection (no publish)
    const doc = controller.collection.insertOne({ username, role, active });
    const model = doc.toModel();
    setIdInput(model._id);
    refreshSummary(controller);
    appendLog({
      action: "insertOne",
      warning: "Inserted directly into collection (no controller publish).",
      model,
    });
  }

  function seedUsers(controller) {
    const n = Math.max(0, Number($("seedCount").value || 0));
    const base = [
      { username: "alice", role: "member", active: true },
      { username: "bob", role: "admin", active: true },
      { username: "carol", role: "guest", active: false },
      { username: "dan", role: "member", active: true },
      { username: "eve", role: "member", active: false },
    ];

    const items = [];
    for (let i = 0; i < n; i++) {
      const u = base[i % base.length];
      items.push({
        username: u.username + (i >= base.length ? "-" + (i + 1) : ""),
        role: u.role,
        active: u.active,
      });
    }

    if (items.length === 0) {
      appendLog({ action: "seed", inserted: 0 });
      return;
    }

    // Use controller path so subscribers get notified.
    if (typeof controller.invalidate === "function") {
      controller.invalidate.apply(controller, items);
    } else {
      // Fallback: direct insert
      const collection = getCollection(controller);
      for (const u of items) collection.insertOne(u);
    }

    refreshSummary(controller);
    appendLog({ action: "seed", inserted: items.length });
  }

  function findById(controller) {
    const id = $("idInput").value.trim();
    if (!id) {
      appendLog("Provide an _id to find.");
      return;
    }

    const collection = getCollection(controller);
    const doc = collection.findOne(id);
    appendLog({
      action: "findOne",
      where: id,
      found: !!doc,
      model: doc ? doc.toModel() : null,
    });
  }

  function deleteById(controller) {
    const id = $("idInput").value.trim();
    if (!id) {
      appendLog("Provide an _id to delete.");
      return;
    }

    const collection = getCollection(controller);
    const ok = collection.deleteOne(id);

    refreshSummary(controller);
    appendLog({
      action: "deleteOne",
      where: id,
      deleted: ok,
      note: "Delete is performed on the Collection and does not publish via Controller.",
    });
  }

  function findMany(controller) {
    const where = buildWhereFromFindInputs();
    const collection = getCollection(controller);

    const docs = collection.find(where);
    const models = docs.map((d) => d.toModel());

    appendLog({
      action: "find",
      where,
      count: models.length,
      models,
    });
  }

  function updateById(controller) {
    const id = $("idInput").value.trim();
    if (!id) {
      appendLog("Provide an _id to update.");
      return;
    }

    const collection = getCollection(controller);
    const existing = collection.findOne(id);
    if (!existing) {
      appendLog({
        action: "updateById",
        where: id,
        updated: false,
        reason: "Not found",
      });
      return;
    }

    const username = $("usernameInput").value.trim();
    const role = $("roleInput").value;
    const active = parseBool($("activeInput").value);

    // Keep the existing username if the input is blank.
    const base = existing.toModel();
    const next = {
      username: username || base.username,
      role,
      active,
    };

    // Use controller path (publish) by mapping via username.
    if (typeof controller.upsertByUsername === "function") {
      const model = controller.upsertByUsername(next);
      setIdInput(model._id);
      refreshSummary(controller);
      appendLog({ action: "upsertByUsername", via: "updateById", model });
      return;
    }

    if (typeof controller.invalidate === "function") {
      controller.invalidate(next);
      const updated = collection.findOne({ username: next.username });
      setIdInput(updated ? updated._id : id);
      refreshSummary(controller);
      appendLog({
        action: "invalidate",
        via: "updateById",
        where: id,
        next,
        updated: !!updated,
        model: updated ? updated.toModel() : null,
      });
      return;
    }

    // Fallback: direct update (no publish)
    const doc = collection.findOneAndUpdate(id, next);
    refreshSummary(controller);
    appendLog({
      action: "findOneAndUpdate",
      where: id,
      updated: !!doc,
      warning: "Updated directly in collection (no controller publish).",
      model: doc ? doc.toModel() : null,
    });
  }

  function updateByConditions(controller) {
    const where = buildWhereFromFindInputs();
    if (Object.keys(where).length === 0) {
      appendLog(
        "Provide at least one condition (username and/or role) to update.",
      );
      return;
    }

    const collection = getCollection(controller);
    const docs = collection.find(where);

    if (!docs.length) {
      appendLog({
        action: "updateByConditions",
        where,
        updated: false,
        reason: "No matches",
      });
      return;
    }

    // Update only the first match (consistent with Collection.findOneAndUpdate semantics)
    const first = docs[0].toModel();

    const patch = {
      role: $("roleInput").value,
      active: parseBool($("activeInput").value),
    };

    const next = {
      username: first.username,
      role: patch.role,
      active: patch.active,
    };

    if (typeof controller.upsertByUsername === "function") {
      const model = controller.upsertByUsername(next);
      setIdInput(model._id);
      refreshSummary(controller);
      appendLog({
        action: "upsertByUsername",
        via: "updateByConditions",
        where,
        patch,
        model,
        note: "Only the first matching document is updated in this demo.",
      });
      return;
    }

    if (typeof controller.invalidate === "function") {
      controller.invalidate(next);
      const updated = collection.findOne({ username: next.username });
      setIdInput(updated ? updated._id : "");
      refreshSummary(controller);
      appendLog({
        action: "invalidate",
        via: "updateByConditions",
        where,
        patch,
        updated: !!updated,
        model: updated ? updated.toModel() : null,
        note: "Only the first matching document is updated in this demo.",
      });
      return;
    }

    // Fallback: direct update (no publish)
    const doc = collection.findOneAndUpdate(where, patch);
    refreshSummary(controller);
    appendLog({
      action: "findOneAndUpdate",
      where,
      patch,
      updated: !!doc,
      warning: "Updated directly in collection (no controller publish).",
      model: doc ? doc.toModel() : null,
    });
  }

  function serialize(controller) {
    const collection = getCollection(controller);
    const json = collection.serialize();
    $("hydrateInput").value = json;

    appendLog({
      action: "serialize",
      bytes: json.length,
      preview: json.slice(0, 160) + (json.length > 160 ? "…" : ""),
    });
  }

  function dehydrate(controller) {
    const collection = getCollection(controller);
    const json = collection.dehydrate();
    $("hydrateInput").value = json;

    appendLog({
      action: "dehydrate",
      bytes: json.length,
      note: "dehydrate() is an alias for serialize()",
    });
  }

  function hydrate(controller) {
    const json = $("hydrateInput").value.trim();
    if (!json) {
      appendLog("Paste serialized JSON to hydrate.");
      return;
    }

    const collection = getCollection(controller);
    collection.hydrate(json);

    refreshSummary(controller);
    appendLog({
      action: "hydrate",
      note: "Collection replaced with hydrated data",
      countAfter: collection.find().length,
    });
  }

  function bindUI(controller) {
    $("insertBtn").addEventListener("click", () =>
      insertOrUpsertFromForm(controller),
    );
    $("seedBtn").addEventListener("click", () => seedUsers(controller));

    $("findByIdBtn").addEventListener("click", () => findById(controller));
    $("deleteByIdBtn").addEventListener("click", () => deleteById(controller));

    $("findManyBtn").addEventListener("click", () => findMany(controller));

    $("updateByIdBtn").addEventListener("click", () => updateById(controller));
    $("updateByCondBtn").addEventListener("click", () =>
      updateByConditions(controller),
    );

    $("serializeBtn").addEventListener("click", () => serialize(controller));
    $("dehydrateBtn").addEventListener("click", () => dehydrate(controller));
    $("hydrateBtn").addEventListener("click", () => hydrate(controller));

    $("clearOutputBtn").addEventListener("click", () => clearLog());
    $("dumpAllBtn").addEventListener("click", () => dumpAll(controller));
  }

  function attachControllerSubscription(controller) {
    if (!controller || typeof controller.publish !== "function") return;

    // Avoid duplicate subscriptions if this script is reloaded
    const key = "__vanilla_example_subscribed__";
    if (controller[key]) return;
    controller[key] = true;

    controller.publish((model) => {
      appendLog({
        event: "controller.publish",
        controller: controller.name,
        model,
      });

      // Keep summary reasonably up to date when controller pushes changes
      try {
        refreshSummary(controller);
      } catch {
        // ignore
      }
    });
  }

  function waitForControllerReady(controller, cb) {
    // Controller does an async initialise() and toggles `.loading`.
    // We poll briefly so the initial dataset (if any) is present before we dump.
    const start = Date.now();
    const timeoutMs = 2000;

    const tick = () => {
      const loading = !!controller.loading;
      if (!loading) return cb();

      if (Date.now() - start > timeoutMs) {
        appendLog({
          warn: "Controller still loading after timeout; continuing anyway",
          controller: controller.name,
        });
        return cb();
      }

      setTimeout(tick, 30);
    };

    tick();
  }

  window.addEventListener("load", () => {
    const lib = ensureLib();
    if (!lib) return;

    const controller = getUserController();
    if (!controller) return;

    bindUI(controller);
    attachControllerSubscription(controller);

    showLibStatus(
      "ok",
      "Library loaded",
      "Using getDefaultObjectStore() for global state and the registered UserController for data operations.",
    );

    // initial render / dump
    waitForControllerReady(controller, () => {
      refreshSummary(controller);
      dumpAll(controller);
    });
  });
})();
