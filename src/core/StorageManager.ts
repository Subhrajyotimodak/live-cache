import { ModelType } from "./Document";

export abstract class StorageManager<TVariable> {

    public abstract get<T>(name: string): Promise<ModelType<T>[]>;
    public abstract set<T>(name: string, models: ModelType<T>[]): Promise<void>;
    public abstract delete(name: string): Promise<void>;

}

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
