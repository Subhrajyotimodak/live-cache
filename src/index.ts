// Main library exports
import Collection from "./core/Collection";
import Controller from "./core/Controller";
import Document from "./core/Document";
import ObjectStore, {
  createObjectStore,
  getDefaultObjectStore,
} from "./core/ObjectStore";

// Export core classes / helpers
export {
  Collection,
  Controller,
  Document,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
};

// Default export for UMD/browser usage
export default {
  Collection,
  Controller,
  Document,
  ObjectStore,
  createObjectStore,
  getDefaultObjectStore,
};
