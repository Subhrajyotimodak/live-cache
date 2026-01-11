import join from "live-cache/core/join";
import { createObjectStore } from "live-cache";
import LocalStorageStorageManager from "live-cache/storage-manager/LocalStorageManager";
import { PostsController, TodosController } from "./sandwichControllers";

// Important: module-level singleton so React StrictMode doesn't
// accidentally create/register controllers twice.
const storage = new LocalStorageStorageManager("ps:");
const store = createObjectStore();

const post = new PostsController("posts", true, storage);
const todos = new TodosController("todos", true, storage);
store.register(post);
store.register(todos);

export default store;
