import { ModelType } from "./Document";

/**
 * Storage adapter used by `Controller` to persist and hydrate snapshots.
 *
 * A controller stores a **full snapshot** (array of models) keyed by `name`.
 * Implementations should be resilient: reads should return `[]` on failure.
 */
export abstract class StorageManager<TVariable> {
    public prefix: string;
    constructor(prefix: string) {
        this.prefix = prefix;
    }

    /**
     * Get a previously persisted snapshot for a controller name.
     *
     * @returns Array of models (each model includes `_id`)
     */
    public abstract get(name: string): Promise<TVariable | null>;

    /**
     * Persist a snapshot for a controller name.
     *
     * Controllers call this from `commit()`.
     */
    public abstract set(name: string, models: TVariable): Promise<void>;

    /**
     * Delete the persisted snapshot for a controller name.
     */
    public abstract delete(name: string): Promise<void>;

    public abstract getParams(): Promise<string[]>;

}

/**
 * No-op storage manager.
 *
 * Useful in environments where you don’t want persistence (tests, ephemeral caches, etc).
 */
export class DefaultStorageManager<TVariable> extends StorageManager<TVariable> {
    constructor(prefix: string) {
        super(prefix);
    }
    public async get(name: string): Promise<TVariable | null> {
        return Promise.resolve(null);
    }

    public async set(name: string, models: TVariable): Promise<void> {
        return Promise.resolve();
    }

    public async delete(_name: string): Promise<void> {
        return Promise.resolve();
    }

    public async getParams(): Promise<string[]> {
        return Promise.resolve([]);
    }
}
