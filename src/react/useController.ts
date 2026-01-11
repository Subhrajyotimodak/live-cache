import { useContext, useEffect, useMemo, useState } from "react";
import ObjectStore from "../core/ObjectStore";
import { context } from "./Context";
import { ModelType } from "../core/Document";
import Controller from "../core/Controller";

interface ControllerOptions {
  store?: ObjectStore;
  initialise?: boolean;
}

export interface UseControllerResult<TVariable, TName extends string> {
  controller: Controller<TVariable, TName>;
  data: ModelType<TVariable>[];
  loading: boolean;
  error: unknown;
}

export default function useController<TVariable, TName extends string>(
  name: TName,
  where?: string | Partial<TVariable>,
  options?: ControllerOptions,
): UseControllerResult<TVariable, TName> {
  const initialise = options?.initialise ?? false;
  const optionalStore = options?.store;

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
    if (initialise) {
      controller.initialise();
    }
    const callback = () => {
      setLoading(controller.loading);
      setError(controller.error ?? null);
      setData(controller.collection.find(where).map((item) => item.toModel()));
    };

    // Prime state immediately.
    callback();

    const cleanup = controller.publish(callback);

    return () => {
      cleanup();
    };
  }, [controller, where, initialise]);

  return { controller, data, loading, error };
}
