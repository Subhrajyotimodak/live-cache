import { ModelType } from "./Document";

export abstract class StorageManager<TVariable> {

    public abstract get<TVariable>(name: string): ModelType<TVariable>[];
    public abstract set(name: string, models: ModelType<TVariable>[]): void;
    public abstract delete(name: string): void;

}

export class DefaultStorageManager<TVariable> implements StorageManager<TVariable> {

    public get<TVariable>(name: string): ModelType<TVariable>[] {
        return [];
    }

    public set(name: string, models: ModelType<TVariable>[]): void {
        // do nothing
    }

    public delete(name: string): void {
        // do nothing
    }
}
