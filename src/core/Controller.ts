import Collection from "./Collection";
import Document, { ModelType } from "./Document";
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
export default class Controller<TVariable, TName extends string> {
  public name: TName;
  public collection: Collection<TVariable, TName>;
  protected subscribers: Set<(model: ModelType<TVariable>[]) => void> = new Set();
  protected storageManager: StorageManager<TVariable>;
  loading: boolean = false;
  error: unknown = null;
  public total: number = -1;
  public pageSize: number = -1;
  public abortController: AbortController | null = null;

  /**
   * Abort any in-flight work owned by this controller (typically network fetches).
   *
   * This method also installs a new `AbortController` so subclasses can safely
   * pass `this.abortController.signal` to the next request.
   */
  public abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
  }

  protected updateTotal(total: number) {
    this.total = total;
  }

  protected updatePageSize(pageSize: number) {
    this.pageSize = pageSize;
  }

  /**
   * Fetch the complete dataset for this controller.
   *
   * Subclasses must implement this. Return `[rows, total]` where `total` is the
   * total number of rows available on the backend (useful for pagination).
   */
  public async fetchAll(): Promise<[TVariable[], number]> {
    throw Error("Not Implemented");
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
  public async initialise(): Promise<void> {
    // If the collection is not empty, return.
    let data = this.collection.find().map((doc) => doc.toData());
    if (data.length !== 0) return;

    // If the collection is empty, check the storage manager.
    data = await this.storageManager.get(this.name);

    if (data.length !== 0) {
      this.updateTotal(this.collection.find().length);
      this.collection.insertMany(data);
      await this.commit();
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

    await this.commit();
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
  public publish(onChange: (data: ModelType<TVariable>[]) => void) {
    this.subscribers.add(onChange);
    return () => this.subscribers.delete(onChange);
  }

  /**
   * Persist the latest snapshot and notify all subscribers.
   *
   * This is intentionally private: consumers should use `commit()` which computes the snapshot.
   */
  private async subscribe(model: ModelType<TVariable>[]) {
    // Persist the full cache snapshot for hydration.
    await this.storageManager.set(
      this.name,
      this.collection.find().map((doc) => doc.toModel()),
    );
    this.subscribers.forEach((sub) => {
      sub(model);
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
    await this.subscribe(models);
  }

  /**
   * Refetch data using the controller's initialise flow.
   *
   * Subclasses typically use this inside `invalidate()`.
   */
  protected refetch() {
    return this.initialise();
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
  public invalidate(...data: TVariable[]): () => void {
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
    this.updatePageSize(-1);
    this.error = null;
    this.loading = false;
    void this.subscribe([]);
  }

  /**
   * Create a controller.
   *
   * @param name - stable controller/collection name
   * @param initialise - whether to run `initialise()` immediately
   * @param storageManager - where snapshots are persisted (defaults to no-op)
   * @param pageSize - optional pagination hint (userland)
   */
  constructor(name: TName, initialise = true, storageManager = new DefaultStorageManager<TVariable>(), pageSize = -1) {
    this.collection = new Collection(name);
    this.storageManager = storageManager;
    this.name = name;
    this.pageSize = pageSize;
    if (initialise) {
      void this.initialise();
    }

  }
}

