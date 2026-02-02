import Collection from "./Collection";
import Controller from "./Controller";
import Document from "./Document";
import join from "./join";
import ObjectStore, {
  createObjectStore,
  getDefaultObjectStore,
} from "./ObjectStore";
import Transactions from "./Transactions";
import { DefaultStorageManager, StorageManager } from "./StorageManager";
import { DefaultInvalidator, Invalidator } from "./Invalidator";
import { withMutation, type WithMutationState } from "./decorator";

export {
  Collection,
  Controller,
  Document,
  join,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
  Transactions,
  StorageManager,
  DefaultStorageManager,
  DefaultInvalidator,
  Invalidator,
  withMutation,
};
export type { WithMutationState };

export default {
  Collection,
  Controller,
  Document,
  join,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
  Transactions,
  StorageManager,
  DefaultStorageManager,
  DefaultInvalidator,
  Invalidator,
  withMutation,
};

export type { ModelType } from "./Document";
