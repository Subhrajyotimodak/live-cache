import { createObjectStore } from "live-cache";
import {
  LocalStorageStorageManager,
  PostsController,
  TodosController,
} from "./sandwichControllers";

// Important: module-level singleton so React StrictMode doesn't
// accidentally create/register controllers twice.
const storage = new LocalStorageStorageManager("ps:");
const store = createObjectStore();

store.register(new PostsController("posts", true, storage));
store.register(new TodosController("todos", true, storage));

export default store;
