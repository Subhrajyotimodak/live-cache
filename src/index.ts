// Main library exports
import Collection from "./core/Collection";
import Controller from "./core/Controller";
import Document from "./core/Document";
import join from "./core/join";
import ObjectStore, {
  createObjectStore,
  getDefaultObjectStore,
} from "./core/ObjectStore";
import Transactions from "./core/Transactions";
import { DefaultStorageManager, StorageManager } from "./core/StorageManager";
import IndexDbStorageManager from "./storage-manager/IndexDbStorageManager";
import LocalStorageStorageManager from "./storage-manager/LocalStorageManager";

// React helpers
import ContextProvider, { useRegister } from "./react/Context";
import useController from "./react/useController";
import useJoinController from "./react/useJoinController";

// Invalidators
import { DefaultInvalidator, Invalidator } from "./core/Invalidator";
import TimeoutInvalidator from "./invalidator/TimeoutInvalidator";

// Export core classes / helpers
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
  IndexDbStorageManager,
  LocalStorageStorageManager,
  ContextProvider,
  useRegister,
  useController,
  useJoinController,
  DefaultInvalidator,
  Invalidator,
  TimeoutInvalidator,
};

// Default export for UMD/browser usage
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
  IndexDbStorageManager,
  LocalStorageStorageManager,
  ContextProvider,
  useRegister,
  useController,
  useJoinController,
  DefaultInvalidator,
  Invalidator,
  TimeoutInvalidator,
};
