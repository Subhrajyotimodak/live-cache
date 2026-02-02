import Collection from "./Collection";
import Document, { ModelType } from "./Document";
import { DefaultInvalidator, Invalidator } from "./Invalidator";
import { DefaultStorageManager, StorageManager } from "./StorageManager";

/**
 * Controller is the recommended integration layer for server-backed resources.
 *
 * It wraps a `Collection` with:
 * - hydration (`initialise()`)
 * - persistence (`commit()` writes a full snapshot using the configured `StorageManager`)
 * - subscriptions (`publish()`)
 * - invalidation hooks (`invalidate()`, `refetch()`)
 *
 * The intended mutation pattern is:
 * 1) mutate `this.collection` (insert/update/delete)
 * 2) call `await this.commit()` so subscribers update and storage persists
 *
 * @typeParam TVariable - the “data” shape stored in the collection (without `_id`)
 * @typeParam TName - a stable, string-literal name for this controller/collection
 *
 * @example
 * ```ts
 * type User = { id: number; name: string };
 *
 * class UsersController extends Controller<User, "users"> {
 *   async fetchAll(): Promise<[User[], number]> {
 *     const res = await fetch("/api/users");
 *     const data = (await res.json()) as User[];
 *     return [data, data.length];
 *   }
 *
 *   invalidate(): () => void {
 *     this.abort();
 *     void this.refetch();
 *     return () => {};
 *   }
 *
 *   async renameUser(id: number, name: string) {
 *     this.collection.findOneAndUpdate({ id }, { name });
 *     await this.commit();
 *   }
 * }
 * ```
 */
export interface ControllerOptions<TVariable, TName extends string> {
  storageManager?: StorageManager<TVariable[]>;
  pageSize?: number;
  invalidator?: Invalidator<TVariable>;
}
export default class Controller<TVariable, TName extends string> {
  public name: TName;
  public collection: Collection<TVariable, TName>;
  protected subscribers: Set<(model: ModelType<TVariable>[]) => void> = new Set();
  public storageManager: StorageManager<TVariable[]>;
  loading: boolean = false;
  error: unknown = null;
  public total: number = -1;
  public page: number = 0;
  public limit: number = 10;
  public abortController: AbortController | null = null;
  public invalidator: Invalidator<TVariable>;
  public initialised: boolean = false;
  /**
   * Abort any in-flight work owned by this controller (typically network fetches).
   *
   * This method also installs a new `AbortController` so subclasses can safely
   * pass `this.abortController.signal` to the next request.
   */
  public abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public updateTotal(total: number) {
    this.total = total;
  }

  public updatePage(page: number) {
    this.page = page;
  }

  public updateLimit(limit: number) {
    this.limit = limit;
  }

  /**
   * Fetch the complete dataset for this controller.
   *
   * Subclasses must implement this. Return `[rows, total]` where `total` is the
   * total number of rows available on the backend (useful for pagination).
   */
  public async fetch(where?: string | Partial<TVariable>): Promise<TVariable | [TVariable[], number]> {
    throw Error("Not Implemented");
  }

  public async nextPage(where?: string | Partial<TVariable>): Promise<void> {
    this.updatePage(this.page + 1);
    await this.update(where);
  }

  public async previousPage(where?: string | Partial<TVariable>): Promise<void> {
    this.updatePage(this.page - 1);
    await this.update(where);
  }

  /**
   * Initialise (hydrate) the controller's collection.
   *
   * Resolution order:
   * 1) If the in-memory collection is already non-empty: do nothing.
   * 2) Else, try `storageManager.get(name)` and hydrate from persisted snapshot.
   * 3) Else, call `fetchAll()` and populate from the backend.
   *
   * A successful initialise ends with `commit()` so subscribers receive the latest snapshot.
   */
  public async initialise(where?: string | Partial<TVariable>): Promise<void> {
    this.abortController = new AbortController();
    // If the collection is not empty, return.
    let data = this.collection.find(where).map((doc) => doc.toData());
    if (data.length !== 0) {
      this.updateTotal(data.length);
      await this.commit();
      return;
    }

    const fromStorage = await this.storageManager.get(this.name);
    if (fromStorage && fromStorage.length !== 0) {
      const __collection = new Collection<TVariable, TName>(this.name);
      __collection.insertMany(fromStorage);
      const __data = __collection.find(where).map(x => x.toData());

      if (__data.length !== 0) {
        this.collection.insertMany(__data);
        this.updateTotal(__data.length);
        await this.commit();
        return;
      }
    }

    // If the storage manager is empty, fetch the data from the server.
    try {
      this.loading = true;
      const data = await this.fetch(where);
      if (Array.isArray(data)) {
        const [_data, total] = data;
        this.collection.insertMany(_data);
        this.updateTotal(total);
      } else {
        this.collection.insertOne(data);
        this.updateTotal(1);
      }
    } catch (error) {
      this.error = error;
    }
    finally {
      this.loading = false;
      await this.commit();

    }
  }

  /**
   * Subscribe to controller updates.
   *
   * The callback receives the full snapshot (`ModelType<TVariable>[]`) each time `commit()` runs.
   * Returns an unsubscribe function.
   *
   * @example
   * ```ts
   * const unsubscribe = controller.publish((rows) => console.log(rows.length));
   * // later...
   * unsubscribe();
   * ```
   */
  public subscribe(onChange: (models: ModelType<TVariable>[]) => void) {
    this.subscribers.add(onChange);
    return () => this.subscribers.delete(onChange);
  }

  /**
   * Persist the latest snapshot and notify all subscribers.
   *
   * This is intentionally private: consumers should use `commit()` which computes the snapshot.
   */
  private async publish(models: ModelType<TVariable>[]) {
    // Persist the full cache snapshot for hydration.
    await this.storageManager.set(
      this.name,
      this.collection.find().map((doc) => doc.toModel()),
    );
    this.subscribers.forEach((sub) => {
      sub(models);
    });
  }

  /**
   * Publish + persist the current snapshot.
   *
   * Call this after any local mutation of `this.collection` so:
   * - subscribers are updated (UI refresh)
   * - the `StorageManager` has the latest snapshot for future hydration
   */
  public async commit() {
    const models = this.collection.find().map((doc) => doc.toModel());
    await this.publish(models);
  }

  /**
   * Refetch data using the controller's initialise flow.
   *
   * Subclasses typically use this inside `invalidate()`.
   */
  public async update(where?: string | Partial<TVariable>) {
    const data = await this.fetch(where);
    if (Array.isArray(data)) {
      const [response, total] = data;
      this.collection.insertMany(response);
      this.updateTotal(total);
    } else {
      this.collection.insertOne(data);
      this.updateTotal(1);
    }
    await this.commit();
  }

  /**
   * Invalidate the cache for this controller.
   *
   * Subclasses must implement this. Common patterns:
   * - TTL based: refetch when expired
   * - SWR: revalidate in background
   * - push: refetch or patch based on websocket messages
   *
   * This method should return a cleanup function that unregisters any timers/listeners/sockets
   * created as part of invalidation wiring.
   */
  public invalidate(...data: TVariable[]): void {
    throw Error("Not Implemented");
  }

  /**
   * Clear in-memory cache and delete persisted snapshot.
   * Publishes an empty snapshot to subscribers.
   */
  public reset() {
    void this.storageManager.delete(this.name);
    this.collection.clear();
    this.updateTotal(0);
    this.updatePage(0);
    this.updateLimit(10);
    this.error = null;
    this.loading = false;
    void this.publish([]);
  }

  /**
   * Create a controller.
   *
   * @param name - stable controller/collection name
   * @param storageManager - where snapshots are persisted (defaults to no-op)
   * @param pageSize - optional pagination hint (userland)
   */
  constructor(name: TName, options?: ControllerOptions<TVariable, TName>) {
    const { storageManager = new DefaultStorageManager<TVariable[]>("live-cache:"), pageSize = 10, invalidator = new DefaultInvalidator<TVariable>() } = options ?? {};
    this.name = name;
    this.collection = new Collection(name);
    this.storageManager = storageManager;
    this.page = 0;
    this.limit = pageSize;
    this.invalidator = invalidator;
    this.invalidator.bind(this.invalidate.bind(this));
  }
}

