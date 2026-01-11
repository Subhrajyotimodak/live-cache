import { Collection, Controller, Document, StorageManager } from "live-cache";

const API_BASE = "https://jsonplaceholder.typicode.com";
const JSON_HEADERS = { "Content-Type": "application/json; charset=UTF-8" };

export class LocalStorageStorageManager extends StorageManager<any> {
  prefix: string;

  constructor(prefix = "ps:") {
    super();
    this.prefix = prefix;
  }

  private key(name: string) {
    return `${this.prefix}${name}`;
  }

  get<T>(name: string): T[] {
    try {
      const raw = localStorage.getItem(this.key(name));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  set(name: string, models: any[]): void {
    try {
      localStorage.setItem(this.key(name), JSON.stringify(models));
    } catch {
      // ignore quota / private mode issues
    }
  }

  delete(name: string): void {
    try {
      localStorage.removeItem(this.key(name));
    } catch {
      // ignore
    }
  }
}

export interface Post {
  id: number;
  userId?: number;
  title: string;
  body: string;
}

export interface Todo {
  id: number;
  userId?: number;
  title: string;
  completed: boolean;
}

export class PostDTO extends Document<{ title: string; body: string; userId: number }> {
  constructor({ title = "", body = "", userId = 1 }: Partial<Post> = {}) {
    super({ title, body, userId });
  }

  toCreatePayload() {
    const { title, body, userId } = this.toData();
    return { title, body, userId };
  }

  static toPutPayload(existing: Post, draft: Partial<Post>) {
    return {
      id: existing.id,
      userId: existing.userId ?? 1,
      title: draft.title ?? "",
      body: draft.body ?? "",
    };
  }

  static toPatchPayload(existing: Post, draft: Partial<Post>) {
    const patch: Partial<Post> = {};
    if (draft.title !== existing.title) patch.title = draft.title ?? "";
    if (draft.body !== existing.body) patch.body = draft.body ?? "";
    return patch;
  }
}

export class TodoDTO extends Document<{ title: string; completed: boolean; userId: number }> {
  constructor({ title = "", completed = false, userId = 1 }: Partial<Todo> = {}) {
    super({ title, completed, userId });
  }

  toCreatePayload() {
    const { title, completed, userId } = this.toData();
    return { title, completed, userId };
  }

  static toPutPayload(existing: Todo, draft: Partial<Todo>) {
    return {
      id: existing.id,
      userId: existing.userId ?? 1,
      title: draft.title ?? "",
      completed: Boolean(draft.completed),
    };
  }

  static toPatchPayload(existing: Todo, draft: Partial<Todo>) {
    const patch: Partial<Todo> = {};
    if (draft.title !== existing.title) patch.title = draft.title ?? "";
    if (Boolean(draft.completed) !== Boolean(existing.completed)) {
      patch.completed = Boolean(draft.completed);
    }
    return patch;
  }
}

export class PostsController extends Controller<Post, "posts"> {
  compoundKeyToObjectId(data: Post) {
    // For compound keys, return Collection.hash({ ...fields }).
    return String(data.id);
  }

  async listPosts(): Promise<Post[]> {
    const res = await fetch(`${API_BASE}/posts`);
    if (!res.ok) throw new Error(`GET /posts failed (${res.status})`);
    return (await res.json()) as Post[];
  }

  async fetchAll(): Promise<[Post[], number]> {
    const data = await this.listPosts();
    return [data, data.length];
  }

  async createPost(input: Partial<Post>): Promise<Post> {
    const dto = new PostDTO(input);
    const payload = dto.toCreatePayload();

    // ---- Optimistic create ----
    // Use a temp external key and insert immediately. We then use the returned
    // Document instance to capture the internal `_id` for retroactive key updates.
    const optimistic: Post = {
      id: -Date.now(),
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
    };
    const optimisticDoc = this.collection.insertOne(optimistic);
    this.commit();

    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST /posts failed (${res.status})`);
    const created = (await res.json()) as Post;

    this.collection.findOneAndUpdate(optimisticDoc._id, created);
    this.commit();

    // Returning created allows the @mutation() decorator to apply the final value too.
    return created;
  }

  async updatePostPut(id: number, payload: Post): Promise<Post> {
    this.collection.findOneAndUpdate({
      id: id,
    }, payload);
    this.commit();

    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`PUT /posts/${id} failed (${res.status})`);
    const updated = (await res.json()) as Post;
    this.collection.findOneAndUpdate({
      id: id,
    }, updated);
    this.commit();
    return updated;
  }

  async updatePostPatch(id: number, patch: Partial<Post>, existing: Post): Promise<Post> {
    // optimistic update
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      patch,
    );
    this.commit();

    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`PATCH /posts/${id} failed (${res.status})`);
    const updated = (await res.json()) as Post;
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      updated,
    );
    this.commit();
    return updated;
  }
}

export class TodosController extends Controller<Todo, "todos"> {
  compoundKeyToObjectId(data: Todo) {
    return String(data.id);
  }

  async listTodos(): Promise<Todo[]> {
    const res = await fetch(`${API_BASE}/todos`);
    if (!res.ok) throw new Error(`GET /todos failed (${res.status})`);
    return (await res.json()) as Todo[];
  }

  async fetchAll(): Promise<[Todo[], number]> {
    const data = await this.listTodos();
    return [data, data.length];
  }

  async createTodo(input: Partial<Todo>): Promise<Todo> {
    const dto = new TodoDTO(input);
    const payload = dto.toCreatePayload();

    // ---- Optimistic create ----
    const optimistic: Todo = {
      id: -Date.now(),
      userId: payload.userId,
      title: payload.title,
      completed: payload.completed,
    };
    const optimisticDoc = this.collection.insertOne(optimistic);
    this.commit();

    const res = await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST /todos failed (${res.status})`);
    const created = (await res.json()) as Todo;

    this.collection.findOneAndUpdate(optimisticDoc._id, created);
    this.commit();

    return created;
  }

  async updateTodoPut(id: number, payload: Todo): Promise<Todo> {
    // optimistic update
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      payload,
    );
    this.commit();

    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`PUT /todos/${id} failed (${res.status})`);
    const updated = (await res.json()) as Todo;
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      updated,
    );
    this.commit();
    return updated;
  }

  async updateTodoPatch(id: number, patch: Partial<Todo>, existing: Todo): Promise<Todo> {
    // optimistic update
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      patch,
    );
    this.commit();

    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`PATCH /todos/${id} failed (${res.status})`);
    const updated = (await res.json()) as Todo;
    this.collection.findOneAndUpdate(
      {
        id: id,
      },
      updated,
    );
    this.commit();
    return updated;
  }
}

