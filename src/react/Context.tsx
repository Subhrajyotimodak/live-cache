import React, { createContext, ReactNode, useMemo } from "react";
import { getDefaultObjectStore } from "../core/ObjectStore";
import Controller from "../core/Controller";

interface Props {
  store?: ReturnType<typeof getDefaultObjectStore>;
  children: ReactNode;
}

export const context = createContext<ReturnType<
  typeof getDefaultObjectStore
> | null>(null);

/**
 * React context provider for an `ObjectStore`.
 *
 * `useController()` reads the store from this context by default.
 *
 * @example
 * ```tsx
 * <ContextProvider>
 *   <App />
 * </ContextProvider>
 * ```
 */
export default function ContextProvider({
  children,
  store = getDefaultObjectStore(),
}: Props) {
  return <context.Provider value={store}>{children}</context.Provider>;
}

/**
 * Register controllers in a store (defaults to the singleton store).
 *
 * This is usually called at component mount time.
 *
 * @example
 * ```tsx
 * useRegister([usersController, postsController]);
 * ```
 */
export function useRegister(
  controller: Controller<any, any>[],
  store = getDefaultObjectStore()
) {
  const stored = useMemo(() => {
    controller.forEach((c) => {
      store.register(c);
    });
    return store;
  }, [store, controller]);

  return stored;
}
