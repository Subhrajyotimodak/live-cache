# LiveCache

A lightweight, type-safe client-side database library for JavaScript written in TypeScript. Store and query data collections directly in the browser with MongoDB-like syntax.

> **Disclaimer:** This project is under initial development. Breaking changes are made every week.

## Features

- 📦 Written in TypeScript with full type definitions
- 🎯 Small bundle size with minimal dependencies
- 🔧 Works in both browser and module environments
- ⚡ Fast indexed queries using hash-based lookups
- 💾 Built-in serialization/deserialization for persistence
- 🔍 MongoDB-like query interface
- 🧰 Optimistic transactions with rollback support
- ♻️ Pluggable invalidation strategies (timeouts, focus, websockets)
- 🎨 Beautiful examples included

## Examples

See the `examples/` folder for ready-to-run demos:

- `examples/react`: PokéAPI explorer built with controllers + `useController`
- `examples/vanilla-js`: Simple browser demo using the UMD build

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

The `fetch(where?)` method can fetch all data or query-specific data based on the `where` parameter:

```ts
import { Controller } from "live-cache";

type User = { id: number; name: string };

class UsersController extends Controller<User, "users"> {
  async fetch(where?: string | Partial<User>): Promise<[User[], number]> {
    // Fetch all users if no where clause
    if (!where) {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = (await res.json()) as User[];
      return [data, data.length];
    }

    // Fetch specific user by id or name
    const id = typeof where === "string" ? where : where.id;
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error("Failed to fetch user");
    const data = (await res.json()) as User;
    return [[data], 1];
  }

  /**
   * Example invalidation hook (you decide what invalidation means).
   * Common behavior is: abort in-flight fetch, clear/patch local cache, refetch, then commit.
   */
  invalidate() {
    this.abort();
    void this.update();
  }

  async renameUser(id: number, name: string) {
    // Mutate the collection…
    this.collection.findOneAndUpdate({ id }, { name });
    // …then commit so subscribers + persistence stay in sync.
    await this.commit();
  }
}
```

### Real-world example: PokéAPI integration

Here's a complete example from the `examples/react` demo showing how to build controllers for a public API:

```ts
import { Controller } from "live-cache";

const API_BASE = "https://pokeapi.co/api/v2";

// Controller for fetching the list of Pokémon
class PokemonListController extends Controller<
  { name: string; url: string },
  "pokemonList"
> {
  constructor(name, options) {
    super(name, options);
    this.limit = 24;
  }

  async fetch() {
    this.abort();
    const response = await fetch(`${API_BASE}/pokemon?limit=${this.limit}`, {
      signal: this.abortController?.signal,
    });
    if (!response.ok)
      throw new Error(`GET /pokemon failed (${response.status})`);
    const data = await response.json();
    return [data.results ?? [], data.count ?? 0];
  }

  invalidate() {
    this.abort();
    void this.update();
  }
}

// Controller for fetching individual Pokémon details
class PokemonDetailsController extends Controller<any, "pokemonDetails"> {
  resolveQuery(where) {
    if (!where) return null;
    if (typeof where === "string") return where;
    if (where.name) return String(where.name);
    if (where.id !== undefined) return String(where.id);
    return null;
  }

  async fetch(where) {
    const query = this.resolveQuery(where);
    if (!query) return [[], 0];

    this.abort();
    const response = await fetch(`${API_BASE}/pokemon/${query}`, {
      signal: this.abortController?.signal,
    });
    if (!response.ok)
      throw new Error(`GET /pokemon/${query} failed (${response.status})`);
    const data = await response.json();
    return [[data], 1];
  }

  invalidate() {
    this.abort();
    void this.update(this.lastQuery);
  }
}
```

### Persistence (`StorageManager`)

Controllers persist snapshots through a `StorageManager` (array-of-models, not a JSON string).

```ts
import { Controller, LocalStorageStorageManager } from "live-cache";

const users = new UsersController("users", {
  storageManager: new LocalStorageStorageManager("my-app:"),
});
// Other options: pageSize, invalidator, initialiseOnMount
```

### Transactions (optimistic updates)

Transactions store collection snapshots so you can rollback failed mutations.

```ts
import {
  Controller,
  Transactions,
  LocalStorageStorageManager,
} from "live-cache";

// Do this once at app startup.
Transactions.createInstance(new LocalStorageStorageManager("my-app:tx:"));

class UsersController extends Controller<User, "users"> {
  async updateUser(id: number, patch: Partial<User>) {
    const transaction = await Transactions.add(this.collection);
    try {
      this.collection.findOneAndUpdate({ id }, patch);
      await this.commit();

      // ...perform server request...

      await Transactions.finish(this.name);
    } catch (error) {
      const previous = await Transactions.rollback(transaction, this.name);
      this.collection.hydrate(previous.serialize());
      await this.commit();
      throw error;
    }
  }
}
```

## React integration

Use `ContextProvider` to provide an `ObjectStore`, `useRegister()` to register controllers, and `useController()` to subscribe to a controller.
`useController()` automatically wires invalidators by calling
`controller.invalidator.registerInvalidation()` on mount and
`controller.invalidator.unregisterInvalidation()` on unmount.

### Basic example

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

### Query-based fetching example

You can pass a `where` clause to `useController()` to fetch specific data:

```tsx
import { useController } from "live-cache";
import { useMemo } from "react";

function PokemonDetails({ query }) {
  // Convert query string to where clause
  const where = useMemo(() => ({ name: query }), [query]);

  const { data, loading, error } = useController("pokemonDetails", where, {
    initialise: !!where,
  });

  const pokemon = data[0];
  if (loading) return <div>Loading Pokémon…</div>;
  if (error) return <div>Error: {String(error)}</div>;
  if (!pokemon) return null;

  return (
    <div>
      <h2>{pokemon.name}</h2>
      <img src={pokemon.sprites.front_default} alt={pokemon.name} />
    </div>
  );
}
```

See `examples/react` for a complete PokéAPI explorer implementation with multiple components using controllers.

## Cache invalidation recipes

These show **framework-agnostic** controller patterns and a **React** wiring example for each.

### TODO: More invalidation strategies

- [ ] Manual trigger
- [ ] SWR on demand
- [ ] Polling with backoff
- [ ] ETag / If-Modified-Since
- [ ] Server-Sent Events (SSE)
- [ ] LRU-based invalidation
- [ ] Background sync

### 1) Timeout-based cache invalidation (TTL)

#### Framework-agnostic

```ts
import { Controller, TimeoutInvalidator } from "live-cache";

type Post = { id: number; title: string };

class PostsController extends Controller<Post, "posts"> {
  private ttlMs: number;
  private lastFetchedAt = 0;

  constructor(name: "posts", ttlMs = 30_000) {
    super(name, {
      invalidator: new TimeoutInvalidator<Post>(ttlMs, { immediate: true }),
    });
    this.ttlMs = ttlMs;
  }

  async fetchAll(): Promise<[Post[], number]> {
    const res = await fetch("/api/posts");
    const data = (await res.json()) as Post[];
    this.lastFetchedAt = Date.now();
    return [data, data.length];
  }

  /**
   * TTL invalidation logic lives here (TimeoutInvalidator triggers this).
   */
  invalidate() {
    const now = Date.now();
    const fresh = this.lastFetchedAt && now - this.lastFetchedAt < this.ttlMs;
    if (fresh) return;

    this.abort();
    void this.refetch();
  }
}

const posts = new PostsController("posts", 10_000);
posts.invalidator.registerInvalidation(); // starts interval + initial check
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
import { Controller, Invalidator } from "live-cache";

type Todo = { id: number; title: string };

class SwrInvalidator<T> extends Invalidator<T> {
  private revalidate = () => this.invalidator();

  registerInvalidation() {
    window.addEventListener("focus", this.revalidate);
    window.addEventListener("online", this.revalidate);
  }

  unregisterInvalidation() {
    window.removeEventListener("focus", this.revalidate);
    window.removeEventListener("online", this.revalidate);
  }
}

class TodosController extends Controller<Todo, "todos"> {
  private revalidateAfterMs = 30_000;
  private lastFetchedAt = 0;

  constructor(name: "todos") {
    super(name, {
      invalidator: new SwrInvalidator<Todo>(),
    });
  }

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

  invalidate() {
    this.abort();
    void this.refetch();
  }
}

const todos = new TodosController("todos");
todos.invalidator.registerInvalidation();
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
import { Controller, Invalidator } from "live-cache";

type InvalidationMsg =
  | { type: "invalidate"; controller: "users" }
  | { type: "patch-user"; id: number; name: string };

class UsersController extends Controller<
  { id: number; name: string },
  "users"
> {
  async fetchAll() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { id: number; name: string }[];
    return [data, data.length] as const;
  }

  /**
   * Websocket message handling lives here (wiring lives in an Invalidator).
   */
  invalidate(msg?: InvalidationMsg) {
    if (!msg) return;
    if (msg.type === "invalidate" && msg.controller === "users") {
      this.abort();
      void this.refetch();
      return;
    }

    if (msg.type === "patch-user") {
      this.collection.findOneAndUpdate({ id: msg.id }, { name: msg.name });
      void this.commit();
    }
  }
}

class WebsocketInvalidator extends Invalidator<InvalidationMsg> {
  private ws: WebSocket | null = null;

  registerInvalidation() {
    const ws = new WebSocket("wss://example.com/ws");
    this.ws = ws;

    ws.addEventListener("message", (evt) => {
      const msg = JSON.parse(String(evt.data)) as InvalidationMsg;
      this.invalidator(msg);
    });
  }

  unregisterInvalidation() {
    this.ws?.close();
    this.ws = null;
  }
}

const usersController = new UsersController("users", {
  invalidator: new WebsocketInvalidator(),
});
usersController.invalidator.registerInvalidation();
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

- **Core**: `Collection`, `Document`, `Controller`, `ObjectStore`, `StorageManager`, `DefaultStorageManager`, `join`, `Transactions`
- **Invalidation**: `Invalidator`, `DefaultInvalidator`, `TimeoutInvalidator`
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
