import { useContext, useEffect, useMemo, useRef, useState } from "react";
import ObjectStore from "../core/ObjectStore";
import { context } from "./Context";
import { ModelType } from "../core/Document";
import Controller from "../core/Controller";

interface ControllerOptions {
  page?: number;
  limit?: number;
  store?: ObjectStore;
  initialise?: boolean;
  abortOnUnmount?: boolean;
  withInvalidation?: boolean;
}

export interface UseControllerResult<TVariable, TName extends string> {
  controller: Controller<TVariable, TName>;
  data: ModelType<TVariable>[];
  loading: boolean;
  error: unknown;
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
export default function useController<TVariable, TName extends string>(
  name: TName,
  where?: string | Partial<TVariable>,
  options?: ControllerOptions,
): UseControllerResult<TVariable, TName> {
  const initialise = options?.initialise ?? true;
  const optionalStore = options?.store;
  const abortOnUnmount = options?.abortOnUnmount ?? true;
  const withInvalidation = options?.withInvalidation ?? true;

  const [data, setData] = useState<ModelType<TVariable>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const defaultStore = useContext(context);
  const store = optionalStore ?? defaultStore ?? null;
  if (!store) {
    throw Error("Store is not defined");
  }

  const controller = useMemo(() => store.get<TVariable, TName>(name), [store, name]);
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

    void store.initialiseOnce<TVariable, TName>(name, where);
    // controller.initialise(where);

    return () => {
      if (abortOnUnmount) {
        controller.abort();
      }
      cleanup();
      controller.invalidator.unregisterInvalidation();
    };
  }, [controller, where, abortOnUnmount, withInvalidation]);


  return { controller, data, loading, error };
}
