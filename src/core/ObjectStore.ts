import Controller from "./Controller";

/**
 * Registry for controllers, keyed by `controller.name`.
 *
 * Used by React helpers (`ContextProvider`, `useController`, `useRegister`), but
 * can be used in any framework.
 *
 * @example
 * ```ts
 * const store = createObjectStore();
 * store.register(new UsersController("users"));
 * const users = store.get("users");
 * ```
 */
export default class ObjectStore {
  public store = new Map<string, Controller<any, any>>();
  private initialisePromises = new WeakMap<Controller<any, any>, Promise<void>>();

  /**
   * Register a controller instance in this store.
   */
  register<TVariable, TName extends string>(
    controller: Controller<TVariable, TName>,
  ) {
    this.store.set(controller.name, controller);
  }

  /**
   * Get a controller by name.
   *
   * Throws if not found. Register controllers up front via `register()`.
   */
  get<TVariable, TName extends string>(name: TName) {
    const controller = this.store.get(name);

    if (!controller) {
      throw Error(`Controller with name ${name} is not registered`);
    }

    return controller as Controller<TVariable, TName>;
  }

  /**
   * Remove a controller from the store.
   */
  remove<TVariable, TName extends string>(name: TName) {
    this.store.delete(name);
  }

  /**
   * Initialise all registered controllers.
   *
   * This is equivalent to calling `controller.initialise()` for each controller.
   */
  initialise() {
    this.store.forEach((controller) => {
      controller.initialise();
    });
  }

  /**
   * Initialise a controller once per store, even if multiple callers request it.
   */
  initialiseOnce<TVariable, TName extends string>(name: TName) {
    const controller = this.get<TVariable, TName>(name);
    const existing = this.initialisePromises.get(controller);
    if (existing) return existing;

    const promise = controller.initialise().finally(() => {
      if (this.initialisePromises.get(controller) === promise) {
        this.initialisePromises.delete(controller);
      }
    });

    this.initialisePromises.set(controller, promise);
    return promise;
  }
}

const _objectStore = new ObjectStore();

/**
 * Returns a singleton store instance.
 *
 * `ContextProvider` uses this by default.
 */
export function getDefaultObjectStore() {
  return _objectStore;
}

/**
 * Create a new store instance (non-singleton).
 */
export function createObjectStore() {
  return new ObjectStore();
}
