/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { Controller, DefaultStorageManager } from "@live-cache/core";

type Item = { id: number; label: string };

class TestController extends Controller<Item, "items"> {
  async fetch(): Promise<[Item[], number]> {
    return [[{ id: 1, label: "one" }, { id: 2, label: "two" }], 2];
  }
}

describe("Controller", () => {
  it("creates with name and collection", () => {
    const ctrl = new TestController("items", {});
    expect(ctrl.name).toBe("items");
    expect(ctrl.collection).toBeDefined();
    expect(ctrl.collection.name).toBe("items");
    expect(ctrl.storageManager).toBeDefined();
    expect(ctrl.invalidator).toBeDefined();
  });

  it("initialise fetches and populates collection", async () => {
    const ctrl = new TestController("items", {
      storageManager: new DefaultStorageManager<Item[]>("test:"),
    });
    await ctrl.initialise();
    const docs = ctrl.collection.find();
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.toData())).toEqual([
      { id: 1, label: "one" },
      { id: 2, label: "two" },
    ]);
    expect(ctrl.total).toBe(2);
  });

  it("subscribe receives snapshot on commit", async () => {
    const ctrl = new TestController("items", {
      storageManager: new DefaultStorageManager<Item[]>("test:"),
    });
    await ctrl.initialise();
    let received: unknown = null;
    ctrl.subscribe((models) => {
      received = models;
    });
    ctrl.collection.insertOne({ id: 3, label: "three" });
    await ctrl.commit();
    expect(Array.isArray(received)).toBe(true);
    expect((received as { id: number; label: string }[]).length).toBe(3);
  });

  it("reset clears collection and storage", async () => {
    const ctrl = new TestController("items", {
      storageManager: new DefaultStorageManager<Item[]>("test:"),
    });
    await ctrl.initialise();
    expect(ctrl.collection.find()).toHaveLength(2);
    ctrl.reset();
    expect(ctrl.collection.find()).toHaveLength(0);
    expect(ctrl.total).toBe(0);
  });
});
