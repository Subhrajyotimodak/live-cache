import { StorageManager } from "../core/StorageManager";

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

    private dbPromise: Promise<IDBDatabase> | null = null;

    constructor(options: IndexDbStorageManagerOptions = {}) {
        super(options.prefix ?? "live-cache:");
        this.dbName = options.dbName ?? "live-cache";
        this.storeName = options.storeName ?? "collections";
        this.prefix = options.prefix ?? "live-cache:";
    }

    private key(name: string) {
        return `${this.prefix}${name}`;
    }

    private openDb(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === "undefined") {
                reject(new Error("indexedDB is not available in this environment"));
                return;
            }

            const request = indexedDB.open(this.dbName, 1);

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

    async get<T>(name: string): Promise<T[]> {
        const k = this.key(name);
        try {
            const value = await this.idbGet(k);
            return (value ?? []) as T[];
        } catch {
            return [];
        }
    }

    async set(name: string, models: any[]): Promise<void> {
        const k = this.key(name);
        const value = Array.isArray(models) ? models : [];
        try {
            await this.idbSet(k, value);
        } catch {
            // ignore write errors
        }
    }

    async delete(name: string): Promise<void> {
        const k = this.key(name);
        try {
            await this.idbDelete(k);
        } catch {
            // ignore delete errors
        }
    }

    async getParams(): Promise<string[]> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const req = db.transaction(this.storeName, "readonly").objectStore(this.storeName).getAllKeys();
            const keys = req.result.map(x => x.toString().replace(this.prefix, ""));
            req.onsuccess = () => resolve(keys);
            req.onerror = () => reject(req.error ?? new Error("IndexedDB get params failed"));
        });
    }
}

