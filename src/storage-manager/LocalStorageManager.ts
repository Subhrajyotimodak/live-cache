import { StorageManager } from "../core/StorageManager";

/**
 * `localStorage`-backed `StorageManager`.
 *
 * Stores snapshots as JSON under `${prefix}${name}`.
 * Reads return `[]` on failure (private mode, JSON parse issues, etc).
 */
export default class LocalStorageStorageManager extends StorageManager<any> {

    constructor(prefix = "live-cache:") {
        super(prefix);
    }

    private key(name: string) {
        return `${this.prefix}${name}`;
    }

    async get<T>(name: string): Promise<T[]> {
        try {
            const raw = localStorage.getItem(this.key(name));
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async set(name: string, models: any[]): Promise<void> {
        try {
            localStorage.setItem(this.key(name), JSON.stringify(models));
        } catch {
            // ignore quota / private mode issues
        }
    }

    async delete(name: string): Promise<void> {
        try {
            localStorage.removeItem(this.key(name));
        } catch {
            // ignore
        }
    }

    async getParams(): Promise<string[]> {
        return Object.keys(localStorage).filter(key => key.startsWith(this.prefix)).map(key => key.replace(this.prefix, ""));
    }
}
