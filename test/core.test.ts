/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  Collection,
  Document,
  createObjectStore,
  getDefaultObjectStore,
  DefaultStorageManager,
  DefaultInvalidator,
} from "@live-cache/core";

describe("Document", () => {
  it("creates with _id and data", () => {
    const doc = new Document({ name: "a", count: 1 }, 0);
    expect(doc._id).toBeDefined();
    expect(doc._id).toHaveLength(24);
    expect(/^[0-9a-f]+$/.test(doc._id)).toBe(true);
    expect(doc.toData()).toEqual({ name: "a", count: 1 });
    expect(doc.toModel()).toMatchObject({ name: "a", count: 1 });
    expect(doc.toModel()._id).toBe(doc._id);
  });

  it("updateData merges partial data", () => {
    const doc = new Document({ name: "a", count: 1 }, 0);
    doc.updateData({ count: 2 });
    expect(doc.toData()).toEqual({ name: "a", count: 2 });
  });
});

describe("Collection", () => {
  it("insertOne adds document and find returns it", () => {
    const col = new Collection<{ name: string }, "test">("test");
    const doc = col.insertOne({ name: "alice" });
    expect(doc._id).toBeDefined();
    expect(col.find()).toHaveLength(1);
    expect(col.findOne({ name: "alice" })?.toData()).toEqual({ name: "alice" });
    expect(col.findOne(doc._id)?.toData()).toEqual({ name: "alice" });
  });

  it("insertMany adds multiple documents", () => {
    const col = new Collection<{ id: number }, "test">("test");
    col.insertMany([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(col.find()).toHaveLength(3);
    expect(col.find({ id: 2 })).toHaveLength(1);
    expect(col.findOne({ id: 2 })?.toData()).toEqual({ id: 2 });
  });

  it("findOneAndUpdate updates existing document", () => {
    const col = new Collection<{ name: string; age: number }, "test">("test");
    col.insertOne({ name: "alice", age: 30 });
    const updated = col.findOneAndUpdate({ name: "alice" }, { age: 31 });
    expect(updated?.toData()).toMatchObject({ name: "alice", age: 31 });
  });

  it("deleteOne removes document", () => {
    const col = new Collection<{ name: string }, "test">("test");
    const doc = col.insertOne({ name: "bob" });
    expect(col.find()).toHaveLength(1);
    const ok = col.deleteOne(doc._id);
    expect(ok).toBe(true);
    expect(col.find()).toHaveLength(0);
    expect(col.deleteOne("nonexistent")).toBe(false);
  });

  it("clear removes all documents", () => {
    const col = new Collection<{ x: number }, "test">("test");
    col.insertMany([{ x: 1 }, { x: 2 }]);
    col.clear();
    expect(col.find()).toHaveLength(0);
  });

  it("hash is deterministic for same input", () => {
    const a = Collection.hash({ foo: 1, bar: "b" });
    const b = Collection.hash({ bar: "b", foo: 1 });
    expect(a).toBe(b);
  });
});

describe("ObjectStore", () => {
  it("createObjectStore returns new instance", () => {
    const a = createObjectStore();
    const b = createObjectStore();
    expect(a).not.toBe(b);
  });

  it("getDefaultObjectStore returns same singleton", () => {
    const a = getDefaultObjectStore();
    const b = getDefaultObjectStore();
    expect(a).toBe(b);
  });
});

describe("DefaultStorageManager", () => {
  it("get returns null", async () => {
    const sm = new DefaultStorageManager<string>("prefix:");
    expect(await sm.get("any")).toBe(null);
  });

  it("set and delete are no-ops", async () => {
    const sm = new DefaultStorageManager<number[]>("p:");
    await sm.set("k", [1, 2, 3]);
    await sm.delete("k");
    expect(await sm.getParams()).toEqual([]);
  });

  it("getParams returns empty array", async () => {
    const sm = new DefaultStorageManager<string>("p:");
    expect(await sm.getParams()).toEqual([]);
  });
});

describe("DefaultInvalidator", () => {
  it("registerInvalidation and unregisterInvalidation are no-ops", () => {
    const inv = new DefaultInvalidator<unknown>();
    expect(() => inv.registerInvalidation()).not.toThrow();
    expect(() => inv.unregisterInvalidation()).not.toThrow();
  });
});
