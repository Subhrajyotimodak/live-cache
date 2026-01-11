import { ModelType } from "./Document";

/**
 * Storage adapter used by `Controller` to persist and hydrate snapshots.
 *
 * A controller stores a **full snapshot** (array of models) keyed by `name`.
 * Implementations should be resilient: reads should return `[]` on failure.
 */
export abstract class StorageManager<TVariable> {

    /**
     * Get a previously persisted snapshot for a controller name.
     *
     * @returns Array of models (each model includes `_id`)
     */
    public abstract get<T>(name: string): Promise<ModelType<T>[]>;

    /**
     * Persist a snapshot for a controller name.
     *
     * Controllers call this from `commit()`.
     */
    public abstract set<T>(name: string, models: ModelType<T>[]): Promise<void>;

    /**
     * Delete the persisted snapshot for a controller name.
     */
    public abstract delete(name: string): Promise<void>;

}

/**
 * No-op storage manager.
 *
 * Useful in environments where you don’t want persistence (tests, ephemeral caches, etc).
 */
export class DefaultStorageManager<TVariable> implements StorageManager<TVariable> {

    public async get<T>(_name: string): Promise<ModelType<T>[]> {
        return Promise.resolve([]);
    }

    public async set<T>(_name: string, _models: ModelType<T>[]): Promise<void> {
        return Promise.resolve();
    }

    public async delete(_name: string): Promise<void> {
        return Promise.resolve();
    }
}
