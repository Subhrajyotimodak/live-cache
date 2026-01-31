import Collection from "./Collection";
import { StorageManager } from "./StorageManager";

class TransactionsInstance<TVariable, TName extends string> {
    private storageManager: StorageManager<string>;

    constructor(storageManager: StorageManager<string>) {
        this.storageManager = storageManager;
    }

    public async add<TVariable, TName extends string>(collection: Collection<TVariable, TName>) {
        const transaction_name = `transaction::${collection.name}::${Date.now()}`
        await this.storageManager.set(transaction_name, collection.serialize());
        return transaction_name;
    }

    public async rollback(transaction_name: string, name: TName) {
        const collection = await this.get<TVariable, TName>(transaction_name, name);
        await this.storageManager.delete(transaction_name);
        return collection;
    }

    public async finish(name: TName) {
        const params = await this.storageManager.getParams();
        const _txn_name = `transaction::${name}::`;
        for (const param of params) {
            if (param.startsWith(_txn_name)) {
                await this.storageManager.delete(param);
            }
        }
    }

    public async get<TVariable, TName extends string>(transaction_name: string, name: TName): Promise<Collection<TVariable, TName>> {
        const serialized = await this.storageManager.get(transaction_name);
        if (!serialized) {
            throw new Error("Transaction not found");
        }
        return Collection.deserialize<TVariable, TName>(name, serialized);
    }




}


export default class Transactions {
    static instance: TransactionsInstance<any, any>;

    static createInstance(storageManager: StorageManager<string>) {
        if (Transactions.instance) {
            throw new Error("Transactions instance already initialized");
        }
        Transactions.instance = new TransactionsInstance<any, any>(storageManager);
    }

    static getInstance() {
        if (!Transactions.instance) {
            throw new Error("Transactions instance not initialized");
        }
        return Transactions.instance;
    }

    static async add<TVariable, TName extends string>(collection: Collection<TVariable, TName>) {
        const instance = Transactions.getInstance() as TransactionsInstance<TVariable, TName>;
        return instance.add(collection);
    }

    static async rollback<TVariable, TName extends string>(transaction_name: string, name: TName) {
        const instance = Transactions.getInstance() as TransactionsInstance<TVariable, TName>;
        return instance.rollback(transaction_name, name);
    }

    static async finish(name: string) {
        const instance = Transactions.getInstance() as TransactionsInstance<any, any>;
        return instance.finish(name);
    }

    static async get<TVariable, TName extends string>(transaction_name: string, name: TName) {
        const instance = Transactions.getInstance() as TransactionsInstance<TVariable, TName>;
        return instance.get<TVariable, TName>(transaction_name, name);
    }


}
