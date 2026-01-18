import {
  createObjectStore,
  LocalStorageStorageManager,
  Transactions,
  TimeoutInvalidator,
} from "live-cache";
import { PostsController, TodosController } from "./sandwichControllers";

// Important: module-level singleton so React StrictMode doesn't
// accidentally create/register controllers twice.
const storage = new LocalStorageStorageManager("ps:");

Transactions.createInstance(new LocalStorageStorageManager("ps:tx:"));
const store = createObjectStore();

const invalidator = new TimeoutInvalidator({
  timeoutMs: 1000,
  immediate: false,
});

const post = new PostsController("posts", {
  storageManager: storage,
  initialiseOnMount: false,
});
const todos = new TodosController("todos", {
  storageManager: storage,
  initialiseOnMount: false,
});
store.register(post);
store.register(todos);

export default store;
