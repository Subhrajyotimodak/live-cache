# LiveCache

A lightweight, type-safe client-side database library for JavaScript written in TypeScript. Store and query data collections directly in the browser with MongoDB-like syntax.

## Features

- 📦 Written in TypeScript with full type definitions
- 🎯 Small bundle size with minimal dependencies
- 🔧 Works in both browser and module environments
- ⚡ Fast indexed queries using hash-based lookups
- 💾 Built-in serialization/deserialization for persistence
- 🔍 MongoDB-like query interface
- 🎨 Beautiful examples included

## Installation

```bash
npm install live-cache
```

Or use it directly in the browser via UMD build:

```html
<script src="path/to/dist/index.umd.js"></script>
<script>
  const { Collection } = LiveCache;
  const users = new Collection("users");
</script>
```

## Usage

### ES Modules (Recommended)

```javascript
import { Collection } from "live-cache";

// Create a collection
const users = new Collection("users");

// Insert documents
const user = users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  age: 30,
});

console.log(user._id); // Auto-generated MongoDB-style ID

// Insert multiple documents
const newUsers = users.insertMany([
  { name: "Jane Smith", email: "jane@example.com", age: 25 },
  { name: "Bob Johnson", email: "bob@example.com", age: 35 },
]);

// Find documents
const allUsers = users.find(); // Get all documents
const jane = users.findOne({ name: "Jane Smith" }); // Find by condition
const userById = users.findOne("507f1f77bcf86cd799439011"); // Find by _id

// Update documents
const updated = users.findOneAndUpdate({ name: "John Doe" }, { age: 31 });

// Delete documents
users.deleteOne({ name: "Bob Johnson" });
users.deleteOne("507f1f77bcf86cd799439011"); // Delete by _id
```

### Persistence with Serialization

```javascript
import { Collection } from "live-cache";

const todos = new Collection("todos");

// Add some data
todos.insertMany([
  { task: "Buy groceries", completed: false },
  { task: "Write code", completed: true },
]);

// Serialize to string for storage
const serialized = todos.serialize();
localStorage.setItem("todos", serialized);

// Later... deserialize and restore
const savedData = localStorage.getItem("todos");
const restoredTodos = Collection.deserialize("todos", savedData);

// Or hydrate an existing collection
todos.hydrate(savedData);
```

### Browser (UMD)

```html
<script src="node_modules/live-cache/dist/index.umd.js"></script>
<script>
  const { Collection } = LiveCache;

  const products = new Collection("products");
  products.insertOne({
    name: "Laptop",
    price: 999,
    inStock: true,
  });

  const laptop = products.findOne({ name: "Laptop" });
  console.log(laptop.toModel());
</script>
```

### Using ObjectStore (recommended with Controllers)

`ObjectStore` is a simple registry for controllers. It’s used by the React helpers, but you can use it in any framework.

```ts
import { createObjectStore } from "live-cache";

const store = createObjectStore();
// store.register(new UsersController(...))
// store.get("users")
```

## Controllers (recommended integration layer)

Use `Controller<T, Name>` for **server-backed** resources: it wraps a `Collection` and adds hydration, persistence, subscriptions, and invalidation hooks.

### Extending `Controller` + using `commit()`

`commit()` is the important part: it **publishes** the latest snapshot to subscribers and **persists** the snapshot using the configured `StorageManager`.

```ts
import { Controller } from "live-cache";

type User = { id: number; name: string };

class UsersController extends Controller<User, "users"> {
  async fetchAll(): Promise<[User[], number]> {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = (await res.json()) as User[];
    return [data, data.length];
  }

  /**
   * Example invalidation hook (you decide what invalidation means).
   * Common behavior is: abort in-flight fetch, clear/patch local cache, refetch, then commit.
   */
  invalidate(): () => void {
    this.abort();
    void this.refetch();
    return () => {};
  }

  async renameUser(id: number, name: string) {
    // Mutate the collection…
    this.collection.findOneAndUpdate({ id }, { name });
    // …then commit so subscribers + persistence stay in sync.
    await this.commit();
  }
}
```

### Persistence (`StorageManager`)

Controllers persist snapshots through a `StorageManager` (array-of-models, not a JSON string).

```ts
import { Controller, LocalStorageStorageManager } from "live-cache";

const users = new UsersController(
  "users",
  true,
  new LocalStorageStorageManager("my-app:")
);
```

## React integration

Use `ContextProvider` to provide an `ObjectStore`, `useRegister()` to register controllers, and `useController()` to subscribe to a controller.

```tsx
import React from "react";
import { ContextProvider, useRegister, useController } from "live-cache";

const usersController = new UsersController("users");

function App() {
  useRegister([usersController]);
  const { data, loading, error, controller } = useController(
    "users",
    undefined,
    {
      withInvalidation: true,
    }
  );

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Something went wrong</div>;

  return (
    <div>
      <button onClick={() => void controller.invalidate()}>Refresh</button>
      {data.map((u) => (
        <div key={u._id}>{u.name}</div>
      ))}
    </div>
  );
}

export default function Root() {
  return (
    <ContextProvider>
      <App />
    </ContextProvider>
  );
}
```

## Cache invalidation recipes

These show **framework-agnostic** controller patterns and a **React** wiring example for each.

### 1) Timeout-based cache invalidation (TTL)

#### Framework-agnostic

```ts
import { Controller } from "live-cache";

type Post = { id: number; title: string };

class PostsController extends Controller<Post, "posts"> {
  private ttlMs: number;
  private lastFetchedAt = 0;
  private cleanupInvalidation: (() => void) | null = null;

  constructor(name: "posts", ttlMs = 30_000) {
    super(name);
    this.ttlMs = ttlMs;
  }

  async fetchAll(): Promise<[Post[], number]> {
    const res = await fetch("/api/posts");
    const data = (await res.json()) as Post[];
    this.lastFetchedAt = Date.now();
    return [data, data.length];
  }

  /**
   * TTL invalidation lives here:
   * - first call wires up the interval
   * - subsequent calls perform the TTL check and revalidate if expired
   */
  invalidate(): () => void {
    if (!this.cleanupInvalidation) {
      const id = window.setInterval(() => void this.invalidate(), this.ttlMs);
      this.cleanupInvalidation = () => {
        window.clearInterval(id);
        this.cleanupInvalidation = null;
      };
    }

    const now = Date.now();
    const fresh = this.lastFetchedAt && now - this.lastFetchedAt < this.ttlMs;
    if (fresh) return this.cleanupInvalidation!;

    this.abort();
    void this.refetch();
    return this.cleanupInvalidation!;
  }
}

const posts = new PostsController("posts", 10_000);
posts.invalidate(); // starts the interval + performs initial TTL check
```

#### React

```tsx
function PostsPage() {
  useRegister([posts]);
  const { data } = useController("posts", undefined, {
    withInvalidation: true,
  });

  return data.map((p) => <div key={p._id}>{p.title}</div>);
}
```

### 2) SWR-style invalidation (stale-while-revalidate)

#### Framework-agnostic

```ts
import { Controller } from "live-cache";

type Todo = { id: number; title: string };

class TodosController extends Controller<Todo, "todos"> {
  private revalidateAfterMs = 30_000;
  private lastFetchedAt = 0;
  private cleanupInvalidation: (() => void) | null = null;

  async fetchAll(): Promise<[Todo[], number]> {
    const res = await fetch("/api/todos");
    const data = (await res.json()) as Todo[];
    this.lastFetchedAt = Date.now();
    return [data, data.length];
  }

  async initialise(): Promise<void> {
    // hydrate/publish cached snapshot first (super.initialise does this)
    await super.initialise();

    // then revalidate in background if stale
    const stale =
      !this.lastFetchedAt ||
      Date.now() - this.lastFetchedAt > this.revalidateAfterMs;
    if (stale) void this.refetch();
  }

  invalidate(): () => void {
    // SWR-style invalidation wiring lives here:
    // - first call wires up triggers (focus/online)
    // - every call can also trigger a revalidation
    if (!this.cleanupInvalidation) {
      const revalidate = () => {
        this.abort();
        void this.refetch();
      };
      window.addEventListener("focus", revalidate);
      window.addEventListener("online", revalidate);
      this.cleanupInvalidation = () => {
        window.removeEventListener("focus", revalidate);
        window.removeEventListener("online", revalidate);
        this.cleanupInvalidation = null;
      };
    }

    this.abort();
    void this.refetch();
    return this.cleanupInvalidation!;
  }
}
```

#### React

```tsx
function TodosPage() {
  useRegister([todos]);
  const { data, loading, controller } = useController("todos", undefined, {
    withInvalidation: true,
  });

  return (
    <div>
      {loading ? <div>Revalidating…</div> : null}
      <button onClick={() => void controller.invalidate()}>Revalidate</button>
      {data.map((t) => (
        <div key={t._id}>{t.title}</div>
      ))}
    </div>
  );
}
```

### 3) Websocket-based invalidation (push)

#### Framework-agnostic

```ts
type InvalidationMsg =
  | { type: "invalidate"; controller: "users" }
  | { type: "patch-user"; id: number; name: string };

class UsersController extends Controller<
  { id: number; name: string },
  "users"
> {
  private ws: WebSocket | null = null;
  private cleanupInvalidation: (() => void) | null = null;

  async fetchAll() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { id: number; name: string }[];
    return [data, data.length] as const;
  }

  /**
   * Websocket subscription lives here:
   * - first call attaches the socket + listeners
   * - incoming messages either trigger a refetch or apply a patch + commit
   */
  invalidate(): () => void {
    if (this.cleanupInvalidation) return this.cleanupInvalidation;

    const ws = new WebSocket("wss://example.com/ws");
    this.ws = ws;
    this.cleanupInvalidation = () => {
      this.ws?.close();
      this.ws = null;
      this.cleanupInvalidation = null;
    };

    ws.addEventListener("message", (evt) => {
      const msg = JSON.parse(String(evt.data)) as InvalidationMsg;

      if (msg.type === "invalidate" && msg.controller === "users") {
        this.abort();
        void this.refetch();
        return;
      }

      if (msg.type === "patch-user") {
        this.collection.findOneAndUpdate({ id: msg.id }, { name: msg.name });
        void this.commit();
      }
    });
    return this.cleanupInvalidation;
  }
}
```

#### React

```tsx
function UsersPage() {
  useRegister([usersController]);
  const { data, controller } = useController("users", undefined, {
    withInvalidation: true,
  });

  return data.map((u) => <div key={u._id}>{u.name}</div>);
}
```

## Joins (advanced)

Join data across controllers with `join(from, where, select)` or subscribe in React via `useJoinController`.

```ts
import { join } from "live-cache";

const result = join(
  [usersController, postsController] as const,
  {
    $and: {
      posts: { userId: { $ref: { controller: "users", field: "id" } } },
    },
  } as const,
  ["users.name", "posts.title"] as const
);
```

```tsx
import { useJoinController } from "live-cache";

const rows = useJoinController({
  from: [usersController, postsController] as const,
  where: {
    $and: {
      posts: { userId: { $ref: { controller: "users", field: "id" } } },
    },
  } as const,
  select: ["users.name", "posts.title"] as const,
});
```

## API Reference (high-level)

For full details, see the TSDoc on the exported APIs.

- **Core**: `Collection`, `Document`, `Controller`, `ObjectStore`, `StorageManager`, `DefaultStorageManager`, `join`
- **Storage managers**: `LocalStorageStorageManager`, `IndexDbStorageManager`
- **React**: `ContextProvider`, `useRegister`, `useController`, `useJoinController`

## Development

```bash
npm install
npm run build
npm run dev
```

## License

MIT
