/*
 * A List Model stores a list of items.
 */

import Document from "./Document";

export default class Collection<TVariable, TName extends string> {
  // hash of conditions mapping to _id
  private dataMap: Record<string, Document<TVariable>> = {};
  private indexes: Record<string, string[]> = {};
  private counter: number = 0;

  constructor(public name: TName) { }

  public clear() {
    this.dataMap = {};
    this.indexes = {};
    this.counter = 0;
  }

  /**
   * Add a document to all relevant indexes
   */
  private addToIndexes(doc: Document<TVariable>): void {
    const model = doc.toModel();

    // Create index entries for each property
    for (const [key, value] of Object.entries(model)) {
      if (key === "_id") continue; // Skip _id as it's the primary key

      const indexKey = Collection.hash({ [key]: value });
      if (!this.indexes[indexKey]) {
        this.indexes[indexKey] = [];
      }

      // Add document _id to index if not already present
      if (!this.indexes[indexKey].includes(doc._id)) {
        this.indexes[indexKey].push(doc._id);
      }
    }

    // Also create a compound index for the full document conditions
    const fullIndexKey = Collection.hash(model);
    if (!this.indexes[fullIndexKey]) {
      this.indexes[fullIndexKey] = [];
    }
    if (!this.indexes[fullIndexKey].includes(doc._id)) {
      this.indexes[fullIndexKey].push(doc._id);
    }
  }

  /**
   * Remove a document from all indexes
   */
  private removeFromIndexes(doc: Document<TVariable>): void {
    const model = doc.toModel();

    // Remove from all property indexes
    for (const [key, value] of Object.entries(model)) {
      if (key === "_id") continue;

      const indexKey = Collection.hash({ [key]: value });
      if (this.indexes[indexKey]) {
        this.indexes[indexKey] = this.indexes[indexKey].filter(
          (id) => id !== doc._id,
        );

        // Clean up empty indexes
        if (this.indexes[indexKey].length === 0) {
          delete this.indexes[indexKey];
        }
      }
    }

    // Remove from compound index
    const fullIndexKey = Collection.hash(model);
    if (this.indexes[fullIndexKey]) {
      this.indexes[fullIndexKey] = this.indexes[fullIndexKey].filter(
        (id) => id !== doc._id,
      );
      if (this.indexes[fullIndexKey].length === 0) {
        delete this.indexes[fullIndexKey];
      }
    }
  }

  /**
   * Find a single document by _id or by matching conditions (optimized with indexes)
   */
  findOne(where: string | Partial<TVariable>): Document<TVariable> | null {
    if (typeof where === "string") {
      return this.dataMap[where] || null;
    }

    // Try to use index for faster lookup
    const indexKey = Collection.hash(where);
    if (this.indexes[indexKey] && this.indexes[indexKey].length > 0) {
      const docId = this.indexes[indexKey][0];
      const doc = this.dataMap[docId];

      // Verify the document still matches (in case of hash collision)
      if (doc && this.matchesConditions(doc, where)) {
        return doc;
      }
    }

    // Fallback to linear search if index lookup fails
    return (
      Object.values(this.dataMap).find((doc) =>
        this.matchesConditions(doc, where),
      ) ?? null
    );
  }

  /**
   * Find all documents matching the conditions (optimized with indexes)
   */
  find(where?: string | Partial<TVariable>): Document<TVariable>[] {
    // If no conditions, return all documents
    if (!where || Object.keys(where).length === 0) {
      return Object.values(this.dataMap);
    }

    if (typeof where === "string") {
      const doc = this.dataMap[where];
      return doc ? [doc] : [];
    }

    // Try to use index for faster lookup
    const indexKey = Collection.hash(where);
    if (this.indexes[indexKey]) {
      // Get candidate documents from index
      const candidateDocs = this.indexes[indexKey]
        .map((id) => this.dataMap[id])
        .filter((doc) => doc && this.matchesConditions(doc, where));

      if (candidateDocs.length > 0) {
        return candidateDocs;
      }
    }

    // Fallback to linear search
    return Object.values(this.dataMap).filter((doc) =>
      this.matchesConditions(doc, where),
    );
  }

  /**
   * Helper method to check if a document matches the conditions
   */
  private matchesConditions(
    doc: Document<TVariable>,
    where: Partial<TVariable>,
  ): boolean {
    const model = doc.toModel();
    return Object.entries(where).every(([key, value]) => {
      if (!(key in model)) return false;
      return (
        Collection.hash(model[key as keyof typeof model]) ===
        Collection.hash(value)
      );
    });
  }

  /**
   * Insert a new document into the collection
   */
  insertOne(data: TVariable): Document<TVariable> {
    const doc = new Document<TVariable>(data, this.counter++);
    this.dataMap[doc._id] = doc;

    // Add to indexes
    this.addToIndexes(doc);

    return doc;
  }

  /**
   * Delete a document by _id or by matching conditions
   */
  deleteOne(where: string | Partial<TVariable>): boolean {
    const doc = this.findOne(where);
    if (!doc) {
      return false;
    }

    // Remove from indexes first
    this.removeFromIndexes(doc);

    // Remove from dataMap
    delete this.dataMap[doc._id];

    return true;
  }

  /**
   * Find a document and update it with new data
   */
  findOneAndUpdate(
    where: string | Partial<TVariable>,
    update: Partial<TVariable>,
  ): Document<TVariable> | null {
    const doc = this.findOne(where);
    if (!update) return doc;
    if (!doc) {
      // If document not found, insert a new one with the provided update data
      const newDoc = this.insertOne(update as TVariable);
      this.addToIndexes(newDoc);
      return newDoc;
    }

    // Keep indexes consistent: remove old index entries, update, then re-index
    this.removeFromIndexes(doc);
    doc.updateData(update);
    this.addToIndexes(doc);

    return doc;
  }

  /**
   * Insert multiple documents into the collection at once
   * @param dataArray Array of data objects to insert
   * @returns Array of inserted documents
   */
  insertMany(dataArray: TVariable[]): Document<TVariable>[] {
    const insertedDocs: Document<TVariable>[] = [];

    for (const data of dataArray) {
      const doc = new Document<TVariable>(data, this.counter++);
      this.dataMap[doc._id] = doc;

      // Add to indexes
      this.addToIndexes(doc);

      insertedDocs.push(doc);
    }

    return insertedDocs;
  }

  /**
   * Serialize the collection to a plain object for storage
   * @returns A plain object representation of the collection
   */
  serialize(): string {
    const data = {
      counter: this.counter,
      documents: Object.values(this.dataMap).map((doc) => doc.toModel()),
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize and restore collection data from storage
   * @param serializedData The serialized collection data
   * @returns A new Collection instance with the restored data
   */
  static deserialize<T, N extends string>(
    name: N,
    serializedData: string,
  ): Collection<T, N> {
    const collection = new Collection<T, N>(name);

    try {
      const data = JSON.parse(serializedData);

      // Restore counter
      collection.counter = data.counter || 0;

      // Restore documents
      if (data.documents && Array.isArray(data.documents)) {
        for (let i = 0; i < data.documents.length; i++) {
          const docData = data.documents[i];
          const { _id, ...rest } = docData;

          // Create document without counter increment. Internal _id is generated.
          const doc = new Document<T>(rest as any, i);

          // Add to dataMap using the generated internal id
          collection.dataMap[doc._id] = doc;

          // Rebuild indexes for this document
          collection.addToIndexes(doc);
        }
      }

    } catch (error) {
      console.error("Failed to deserialize collection data:", error);
    }

    return collection;
  }

  /**
   * Hydrate the current collection instance with data from storage
   * This clears existing data and replaces it with the deserialized data
   * @param serializedData The serialized collection data
   */
  hydrate(serializedData: string): void {
    try {
      const data = JSON.parse(serializedData);

      // Clear existing data
      this.dataMap = {};
      this.indexes = {};
      this.counter = data.counter || 0;

      // Restore documents
      if (data.documents && Array.isArray(data.documents)) {
        for (let i = 0; i < data.documents.length; i++) {
          const docData = data.documents[i];
          const { _id, ...rest } = docData;

          // Create document without counter increment. Internal _id is generated.
          const doc = new Document<TVariable>(rest as any, i);

          // Add to dataMap using the generated internal id
          this.dataMap[_id] = doc;

          // Rebuild indexes for this document
          this.addToIndexes(doc);
        }
      }

    } catch (error) {
      console.error("Failed to hydrate collection:", error);
    }
  }

  /**
   * Dehydrate the collection to a format suitable for storage
   * This is an alias for serialize() for semantic clarity
   * @returns A serialized string representation of the collection
   */
  dehydrate(): string {
    return this.serialize();
  }

  static hash(data: any): string {
    // Browser-safe hashing: stable stringify + FNV-1a (32-bit)
    return Collection.fnv1a(Collection.stableStringify(data));
  }

  private static stableStringify(value: any): string {
    const type = typeof value;

    if (value === null) return "null";

    if (type === "string") return JSON.stringify(value);
    if (type === "number") {
      if (Number.isFinite(value)) return String(value);
      return JSON.stringify(String(value));
    }
    if (type === "boolean") return value ? "true" : "false";
    if (type === "undefined") return "undefined";
    if (type === "bigint") return JSON.stringify(`bigint:${value.toString()}`);
    if (type === "symbol") return JSON.stringify(`symbol:${String(value)}`);
    if (type === "function") return JSON.stringify("function");

    if (Array.isArray(value)) {
      return (
        "[" + value.map((v) => Collection.stableStringify(v)).join(",") + "]"
      );
    }

    if (value instanceof Date) {
      return '{"$date":' + JSON.stringify(value.toISOString()) + "}";
    }

    // Plain object: sort keys for determinism
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map(
          (k) => JSON.stringify(k) + ":" + Collection.stableStringify(value[k]),
        )
        .join(",") +
      "}"
    );
  }

  private static fnv1a(input: string): string {
    // FNV-1a 32-bit
    let hash = 0x811c9dc5;

    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    // Unsigned + fixed-width hex to keep index keys uniform
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}
