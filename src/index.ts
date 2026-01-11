// Main library exports
import Collection from "./core/Collection";
import Controller from "./core/Controller";
import Document from "./core/Document";
import ObjectStore, {
  createObjectStore,
  getDefaultObjectStore,
} from "./core/ObjectStore";
import { DefaultStorageManager, StorageManager } from "./core/StorageManager";

// React helpers
import ContextProvider, { useRegister } from "./react/Context";
import useController from "./react/useController";

// Export core classes / helpers
export {
  Collection,
  Controller,
  Document,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
  StorageManager,
  DefaultStorageManager,
  ContextProvider,
  useRegister,
  useController,
};

// Default export for UMD/browser usage
export default {
  Collection,
  Controller,
  Document,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
  StorageManager,
  DefaultStorageManager,
  ContextProvider,
  useRegister,
  useController,
};
