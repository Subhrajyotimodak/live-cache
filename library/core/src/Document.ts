/*
 * A Single Model stores the data for a single item.
 */

/**
 * A single stored record.
 *
 * `Document<T>` wraps raw data and adds:
 * - a generated `_id` (MongoDB-style ObjectId)
 * - `updatedAt` timestamp, refreshed on updates
 *
 * Use `toModel()` when you need a plain object including `_id`
 * (this is what `Controller` publishes and persists).
 *
 * @typeParam TVariable - data shape without `_id`
 */
export default class Document<TVariable> {
  public _id: string;
  private data: TVariable;
  public updatedAt: number;

  // Random value generated once per process (5 bytes)
  private static processId = Math.floor(Math.random() * 0xffffffffff);

  constructor(data: TVariable, counter = 0 * 0xffffff) {
    this._id = Document.generateId(counter);
    this.data = data;
    this.updatedAt = Date.now();
  }

  updateData(data: Partial<TVariable>) {
    this.data = {
      ...this.data,
      ...data,
    };
    this.updatedAt = Date.now();
  }

  /**
   * Convert to a plain model including `_id`.
   */
  toModel() {
    return {
      _id: this._id,
      ...this.data,
    };
  }

  /**
   * Convert to raw data (without `_id`).
   */
  toData() {
    return { ...this.data };
  }

  /**
   * Generate a MongoDB-style ObjectId (24 hex characters).
   *
   * Format: timestamp (4 bytes) + random process id (5 bytes) + counter (3 bytes)
   */
  static generateId(_counter: number): string {
    // MongoDB ObjectId structure (12 bytes = 24 hex chars):
    // - 4 bytes: timestamp (seconds since Unix epoch)
    // - 5 bytes: random process identifier
    // - 3 bytes: incrementing counter

    // 1. Timestamp (4 bytes) - seconds since Unix epoch
    const timestamp = Math.floor(Date.now() / 1000);

    // 2. Process identifier (5 bytes) - random value
    const processId = this.processId;

    // 3. Counter (3 bytes) - incrementing counter with wraparound
    const counter = (_counter + 1) % 0xffffff;

    // Convert to hexadecimal strings with proper padding
    const timestampHex = timestamp.toString(16).padStart(8, "0");
    const processIdHex = processId.toString(16).padStart(10, "0");
    const counterHex = counter.toString(16).padStart(6, "0");

    // Combine into 24-character hex string
    return timestampHex + processIdHex + counterHex;
  }
}

/**
 * Convenience type: the return type of `Document<T>["toModel"]`.
 */
export type ModelType<K> = ReturnType<Document<K>["toModel"]>;
