import Collection from "./Collection";
import Document, { ModelType } from "./Document";
import { DefaultStorageManager, StorageManager } from "./StorageManager";

export default class Controller<TVariable, TName extends string> {
  public name: TName;
  public collection: Collection<TVariable, TName>;
  protected subscribers: Set<(model: ModelType<TVariable>[]) => void> = new Set();
  protected storageManager: StorageManager<TVariable>;
  loading: boolean = false;
  error: unknown = null;
  public total: number = -1;
  public pageSize: number = -1;

  protected updateTotal(total: number) {
    this.total = total;
  }

  protected updatePageSize(pageSize: number) {
    this.pageSize = pageSize;
  }

  // fetches all the values of collection
  public async fetchAll(): Promise<[TVariable[], number]> {
    throw Error("Not Implemented");
  }

  // initialises the value of collection
  public async initialise(): Promise<void> {
    // If the collection is not empty, return.
    let data = this.collection.find().map((doc) => doc.toData());
    if (data.length !== 0) return;

    // If the collection is empty, check the storage manager.
    data = this.storageManager.get(this.name);

    if (data.length !== 0) {
      this.updateTotal(this.collection.find().length);
      this.collection.insertMany(data);
      this.commit();
      return;
    }

    // If the storage manager is empty, fetch the data from the server.
    try {
      this.loading = true;
      const [_data, total] = await this.fetchAll();
      this.collection.insertMany(_data);
      this.updateTotal(total);
    } catch (error) {
      this.error = error;
    }
    finally {
      this.loading = false;
    }

    this.commit();
  }


  // publishes the data to the subscribers
  public publish(onChange: (data: ModelType<TVariable>[]) => void) {
    this.subscribers.add(onChange);
    return () => this.subscribers.delete(onChange);
  }

  // subscribes to the data
  private subscribe(model: ModelType<TVariable>[]) {
    // Persist the full cache snapshot for hydration.
    this.storageManager.set(
      this.name,
      this.collection.find().map((doc) => doc.toModel()),
    );
    this.subscribers.forEach((sub) => {
      sub(model);
    });
  }

  public commit() {
    const models = this.collection.find().map((doc) => doc.toModel());
    this.subscribe(models);
  }

  // revalidates the data from the initializer
  protected refetch() {
    return this.initialise();
  }

  // invalidates the data
  public invalidate(...data: TVariable[]) {
    throw Error("Not Implemented");
  }

  public reset() {
    this.storageManager.delete(this.name);
    this.collection.clear();
    this.updateTotal(0);
    this.updatePageSize(-1);
    this.error = null;
    this.loading = false;
    this.subscribe([]);
  }

  constructor(name: TName, initialise = true, storageManager = new DefaultStorageManager<TVariable>(), pageSize = -1) {
    this.collection = new Collection(name);
    this.storageManager = storageManager;
    this.name = name;
    this.pageSize = pageSize;
    if (initialise) {
      this.initialise();
    }
  }
}

