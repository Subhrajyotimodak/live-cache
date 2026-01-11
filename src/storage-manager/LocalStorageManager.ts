import { StorageManager } from "../core/StorageManager";

export default class LocalStorageStorageManager extends StorageManager<any> {
    prefix: string;

    constructor(prefix = "live-cache:") {
        super();
        this.prefix = prefix;
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
}
