import { StorageManager } from "@live-cache/core";

type Key = string;

export interface IndexDbStorageManagerOptions {
    /**
     * IndexedDB database name.
     */
    dbName?: string;
    /**
     * IndexedDB object store name.
     */
    storeName?: string;
    /**
     * Prefix used to namespace keys within the object store.
     */
    prefix?: string;
    /**
     * Whether to use the same database for all controllers.
     */
    useSameDatabase?: boolean;
}

/**
 * IndexedDB-backed StorageManager.
 *
 * This is fully async (no in-memory cache needed).
 *
 * Stores snapshots as array-of-models under `${prefix}${name}`.
 */
export default class IndexDbStorageManager extends StorageManager<any> {
    private dbName: string;
    private storeName: string;
    private useSameDatabase: boolean;

    private dbPromise: Promise<IDBDatabase> | null = null;
    private dbPromises: Map<string, Promise<IDBDatabase>> = new Map();

    constructor(options: IndexDbStorageManagerOptions = {}) {
        super(options.prefix ?? "live-cache:");
        this.storeName = options.storeName ?? "collections";
        this.prefix = options.prefix ?? "live-cache:";
        this.useSameDatabase = options.useSameDatabase ?? false;
        this.dbName = options.dbName ?? "live-cache";
    }

    private key(name: string) {
        return `${this.prefix}${name}`;
    }

    private getDbName(name?: string): string {
        if (this.useSameDatabase) {
            return this.dbName;
        } else {
            // Create a separate database for each collection
            const collectionName = name ?? this.storeName;
            return `${this.dbName}-${collectionName}`;
        }
    }

    private openDb(name?: string): Promise<IDBDatabase> {
        if (this.useSameDatabase) {
            if (this.dbPromise) return this.dbPromise;

            this.dbPromise = new Promise((resolve, reject) => {
                if (typeof indexedDB === "undefined") {
                    reject(new Error("indexedDB is not available in this environment"));
                    return;
                }

                const dbName = this.getDbName();
                const request = indexedDB.open(dbName, 1);

                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
            });

            return this.dbPromise;
        } else {
            // Use separate database per collection
            if (!name) {
                throw new Error("Collection name is required when useSameDatabase is false");
            }

            const existing = this.dbPromises.get(name);
            if (existing) return existing;

            const promise = new Promise<IDBDatabase>((resolve, reject) => {
                if (typeof indexedDB === "undefined") {
                    reject(new Error("indexedDB is not available in this environment"));
                    return;
                }

                const dbName = this.getDbName(name);
                const request = indexedDB.open(dbName, 1);

                request.onupgradeneeded = () => {
                    const db = request.result;
                    // When using separate databases, use a single object store named "documents"
                    const storeName = "documents";
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
            });

            this.dbPromises.set(name, promise);
            return promise;
        }
    }

    private async idbGet(key: Key): Promise<any[] | null> {
        const db = await this.openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, "readonly");
            const store = tx.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => {
                const value = req.result;
                if (!value) return resolve(null);
                resolve(Array.isArray(value) ? value : null);
            };
            req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
        });
    }

    private async idbGetAll(name: string): Promise<any[]> {
        const db = await this.openDb(name);
        const storeName = this.useSameDatabase ? this.storeName : "documents";

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => {
                const values = req.result;
                resolve(Array.isArray(values) ? values : []);
            };
            req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll failed"));
        });
    }

    private async idbSet(key: Key, value: any[]): Promise<void> {
        const db = await this.openDb();

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.storeName, "readwrite");
            const store = tx.objectStore(this.storeName);
            store.put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("IndexedDB set failed"));
            tx.onabort = () => reject(tx.error ?? new Error("IndexedDB set aborted"));
        });
    }

    private async idbSetAll(name: string, models: any[]): Promise<void> {
        const db = await this.openDb(name);
        const storeName = this.useSameDatabase ? this.storeName : "documents";

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);

            // Clear existing documents first
            store.clear();

            // Store each document individually using _id as key
            for (const model of models) {
                if (model && model._id) {
                    store.put(model, model._id);
                }
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("IndexedDB setAll failed"));
            tx.onabort = () => reject(tx.error ?? new Error("IndexedDB setAll aborted"));
        });
    }

    private async idbDelete(key: Key): Promise<void> {
        const db = await this.openDb();

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.storeName, "readwrite");
            const store = tx.objectStore(this.storeName);
            store.delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
            tx.onabort = () => reject(tx.error ?? new Error("IndexedDB delete aborted"));
        });
    }

    private async idbDeleteAll(name: string): Promise<void> {
        const db = await this.openDb(name);
        const storeName = this.useSameDatabase ? this.storeName : "documents";

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("IndexedDB deleteAll failed"));
            tx.onabort = () => reject(tx.error ?? new Error("IndexedDB deleteAll aborted"));
        });
    }

    async get<T>(name: string): Promise<T[]> {
        if (this.useSameDatabase) {
            const k = this.key(name);
            try {
                const value = await this.idbGet(k);
                return (value ?? []) as T[];
            } catch {
                return [];
            }
        } else {
            // When using separate databases, get all documents from the collection's database
            try {
                const values = await this.idbGetAll(name);
                return values as T[];
            } catch {
                return [];
            }
        }
    }

    async set(name: string, models: any[]): Promise<void> {
        const value = Array.isArray(models) ? models : [];

        if (this.useSameDatabase) {
            const k = this.key(name);
            try {
                await this.idbSet(k, value);
            } catch {
                // ignore write errors
            }
        } else {
            // When using separate databases, store each document individually by _id
            try {
                await this.idbSetAll(name, value);
            } catch {
                // ignore write errors
            }
        }
    }

    async delete(name: string): Promise<void> {
        if (this.useSameDatabase) {
            const k = this.key(name);
            try {
                await this.idbDelete(k);
            } catch {
                // ignore delete errors
            }
        } else {
            // When using separate databases, clear all documents from the collection's database
            try {
                await this.idbDeleteAll(name);
            } catch {
                // ignore delete errors
            }
        }
    }

    async getParams(): Promise<string[]> {
        if (this.useSameDatabase) {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const req = db.transaction(this.storeName, "readonly").objectStore(this.storeName).getAllKeys();
                const keys = req.result.map(x => x.toString().replace(this.prefix, ""));
                req.onsuccess = () => resolve(keys);
                req.onerror = () => reject(req.error ?? new Error("IndexedDB get params failed"));
            });
        } else {
            // When using separate databases, return the list of database names (collections)
            // This is a simplified implementation - in practice, you might want to track collections differently
            return Array.from(this.dbPromises.keys());
        }
    }
}
