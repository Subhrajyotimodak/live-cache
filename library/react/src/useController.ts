import { useContext, useEffect, useMemo, useState } from "react";
import { Collection, Controller, ModelType, ObjectStore } from "@live-cache/core";
import { context } from "./Context";

export interface UseControllerResult<TVariable, TName extends string, TController extends Controller<TVariable, TName>> {
  controller: TController;
  collection: Collection<TVariable, TName>;
  data: ModelType<TVariable>[];
  loading: boolean;
  error: unknown;
}

interface ControllerOptions {
  page?: number;
  limit?: number;
  store?: ObjectStore;
  withInvalidation?: boolean;
}


/**
 * React hook to subscribe to a registered controller.
 *
 * - Looks up the controller by name from the `ObjectStore` (context by default)
 * - Subscribes to `controller.publish()`
 * - Exposes `data`, `loading`, `error`, and the `controller` instance
 *
 * @param name - controller name
 * @param where - optional `Collection.find()` filter (string `_id` or partial)
 * @param options - store selection, initialise behavior, abort-on-unmount, and invalidation wiring
 *
 * When `options.withInvalidation` is true, this hook calls
 * `controller.invalidator.registerInvalidation()` on mount and
 * `controller.invalidator.unregisterInvalidation()` on unmount.
 *
 * @example
 * ```tsx
 * const { data, controller } = useController<User, "users">("users", undefined, {
 *   withInvalidation: true,
 * });
 * return (
 *   <button onClick={() => void controller.invalidate()}>Refresh</button>
 * );
 * ```
 */
type TVariable<TController extends Controller<any, any>> = TController extends Controller<infer U, infer V> ? U : never;
type TName<TController extends Controller<any, any>> = TController extends Controller<infer U, infer V> ? V : never;
export default function useController<TController extends Controller<any, any>>(
  name: TName<TController>,
  where?: string | Partial<TVariable<TController>>,
  options?: ControllerOptions,
): UseControllerResult<TVariable<TController>, TName<TController>, TController> {
  const optionalStore = options?.store;
  const withInvalidation = options?.withInvalidation ?? true;

  const [data, setData] = useState<ModelType<TVariable<TController>>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const defaultStore = useContext(context);
  const store = optionalStore ?? defaultStore ?? null;
  if (!store) {
    throw Error("Store is not defined");
  }

  const controller = useMemo<TController>(() => {
    if (!store.get(name)) {
      throw Error(`Controller with name ${name} is not registered`);

    }
    return store.get(name) as TController;
  }, [name, store])

  useEffect(() => {
    const callback = () => {
      setLoading(controller.loading);
      setError(controller.error ?? null);
      setData(controller.collection.find(where).map((item) => item.toModel()));
    };

    // Prime state immediately.
    callback();

    const cleanup = controller.subscribe(callback);

    if (withInvalidation) {
      controller.invalidator.registerInvalidation();
    }

    void store.initialiseOnce<TVariable<TController>, TName<TController>>(controller.name, where);

    return () => {
      controller.abort();
      cleanup();
      controller.invalidator.unregisterInvalidation();
    };
  }, [where, withInvalidation]);


  return { controller, collection: controller.collection, data, loading, error };
}
