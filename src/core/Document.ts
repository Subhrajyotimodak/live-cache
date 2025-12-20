/*
 * A Single Model stores the data for a single item.
 */

type TVariable<K> = {
  [key in keyof K]: K[keyof K];
};

export default class Document<K> {
  public _id: string;
  private data: TVariable<K>;
  public updatedAt: number;

  // Random value generated once per process (5 bytes)
  private static processId = Math.floor(Math.random() * 0xffffffffff);

  constructor(data: TVariable<K>, counter = 0 * 0xffffff) {
    this._id = Document.generateId(counter);
    this.data = data;
    this.updatedAt = Date.now();
  }

  updateData(data: Partial<TVariable<K>>) {
    this.data = {
      ...this.data,
      ...data,
    };
    this.updatedAt = Date.now();
  }

  toModel() {
    return {
      _id: this._id,
      ...this.data,
    };
  }

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

export type ModelType<K> = ReturnType<Document<K>["toModel"]>;
