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
<script src="path/to/dist/index.js"></script>
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
<script src="node_modules/live-cache/dist/index.js"></script>
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

### Using CollectionRegistry

```javascript
import { Collection, CollectionRegistry } from "live-cache";

const registry = CollectionRegistry.instance;

// Create and register collections
const users = new Collection("users");
const posts = new Collection("posts");

registry.registerCollection(users);
registry.registerCollection(posts);

// Access collections from registry
const userCollection = registry.getCollection("users");
```

## API Reference

### `Collection<T, N>` Class

#### Constructor

```typescript
new Collection<T, N extends string>(name: N)
```

Creates a new collection with the specified name.

**Type Parameters:**

- `T`: The type of documents stored in the collection
- `N`: The name of the collection (string literal type)

#### Methods

##### `insertOne(data: T): Document<T>`

Inserts a single document into the collection.

**Parameters:**

- `data`: The document data to insert

**Returns:** The created `Document` instance with auto-generated `_id`

##### `insertMany(dataArray: T[]): Document<T>[]`

Inserts multiple documents into the collection at once.

**Parameters:**

- `dataArray`: Array of document data to insert

**Returns:** Array of created `Document` instances

##### `findOne(where: string | Partial<T>): Document<T> | null`

Finds a single document by `_id` or by matching conditions.

**Parameters:**

- `where`: Either a document `_id` (string) or an object with conditions to match

**Returns:** The matching `Document` or `null` if not found

##### `find(where?: Partial<T>): Document<T>[]`

Finds all documents matching the conditions.

**Parameters:**

- `where` (optional): Conditions to match. If omitted, returns all documents

**Returns:** Array of matching `Document` instances

##### `findOneAndUpdate(where: string | Partial<T>, update: Partial<T>): Document<T> | null`

Finds a document and updates it with new data.

**Parameters:**

- `where`: Either a document `_id` (string) or conditions to match
- `update`: Object with fields to update

**Returns:** The updated `Document` or `null` if not found

##### `deleteOne(where: string | Partial<T>): boolean`

Deletes a single document by `_id` or by matching conditions.

**Parameters:**

- `where`: Either a document `_id` (string) or conditions to match

**Returns:** `true` if a document was deleted, `false` otherwise

##### `serialize(): string`

Serializes the collection to a JSON string for storage.

**Returns:** JSON string representation of the collection

##### `dehydrate(): string`

Alias for `serialize()` for semantic clarity.

**Returns:** JSON string representation of the collection

##### `hydrate(serializedData: string): void`

Restores collection data from a serialized string, replacing existing data.

**Parameters:**

- `serializedData`: JSON string from `serialize()` or `dehydrate()`

##### Static Methods

##### `Collection.deserialize<T, N>(name: N, serializedData: string): Collection<T, N>`

Creates a new collection instance from serialized data.

**Parameters:**

- `name`: Name for the new collection
- `serializedData`: JSON string from `serialize()`

**Returns:** New `Collection` instance with restored data

##### `Collection.hash(data: any): string`

Generates an MD5 hash of the provided data. Used internally for indexing.

**Parameters:**

- `data`: Data to hash

**Returns:** MD5 hash string

---

### `Document<T>` Class

Represents a single document in a collection.

#### Properties

- `_id: string` - Auto-generated MongoDB-style ID (24-character hex string)
- `updatedAt: number` - Timestamp of last update (milliseconds since epoch)

#### Methods

##### `toModel(): T & { _id: string }`

Returns a plain object representation of the document including its `_id`.

**Returns:** Object with all document data plus `_id`

##### `updateData(data: Partial<T>): void`

Updates the document's data and refreshes the `updatedAt` timestamp.

**Parameters:**

- `data`: Partial object with fields to update

##### Static Methods

##### `Document.generateId(counter: number): string`

Generates a MongoDB-style ObjectId (24-character hex string).

**Parameters:**

- `counter`: Incrementing counter value

**Returns:** 24-character hex ID string

---

### `CollectionRegistry` Class

Singleton registry for managing multiple collections.

#### Static Properties

##### `CollectionRegistry.instance`

Gets the singleton instance of the registry.

**Returns:** The `CollectionRegistry` instance

#### Methods

##### `registerCollection<T, N>(collection: Collection<T, N>): void`

Registers a collection in the registry.

**Parameters:**

- `collection`: The collection to register

##### `removeCollection(name: string): void`

Removes a collection from the registry.

**Parameters:**

- `name`: Name of the collection to remove

##### `getCollection<T, N>(name: string): Collection<T, N> | null`

Retrieves a collection by name.

**Parameters:**

- `name`: Name of the collection

**Returns:** The collection or `null` if not found

## Development

### Build the Library

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Watch mode for development
npm run dev
```

This will generate:

- `dist/index.js` - UMD build for browsers
- `dist/index.esm.js` - ES Module build
- `dist/index.d.ts` - TypeScript type definitions

### Project Structure

```
live-cache/
├── src/                    # Source code (TypeScript)
│   ├── core/              # Core library modules
│   │   ├── Collection.ts  # Collection class with indexing
│   │   ├── Document.ts    # Document class
│   │   └── CollectionRegistry.ts  # Registry singleton
│   └── index.ts           # Main entry point
├── dist/                  # Built files (generated)
├── examples/              # Example implementations
│   ├── vanilla-js/       # Plain JavaScript example
│   └── react/            # React example
├── package.json
├── tsconfig.json          # TypeScript configuration
├── rollup.config.js       # Build configuration
└── README.md
```

## Examples

The `examples/` folder contains working examples:

### Vanilla JavaScript Example

Located in `examples/vanilla-js/`, this demonstrates using the library in a plain HTML/JavaScript environment.

**To run:**

1. Build the library: `npm run build`
2. Open `examples/vanilla-js/index.html` in your browser

### React Example

Located in `examples/react/`, this shows how to use the library in a React application.

**To run:**

```bash
# From the root directory
npm run build

# Navigate to the React example
cd examples/react
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## TypeScript Support

This library is written in TypeScript and includes type definitions out of the box. No need for `@types` packages!

```typescript
import { Collection, Document } from "live-cache";

interface User {
  name: string;
  email: string;
  age: number;
}

const users = new Collection<User, "users">("users");

const user: Document<User> = users.insertOne({
  name: "Alice",
  email: "alice@example.com",
  age: 28,
});

// Type-safe queries
const alice = users.findOne({ name: "Alice" });
if (alice) {
  console.log(alice.toModel().email); // Type: string
}
```

## Performance

LiveCache uses hash-based indexing for fast lookups:

- **Indexed queries**: O(1) average case for exact matches
- **Linear fallback**: O(n) for partial matches or hash collisions
- **Automatic indexing**: All document properties are automatically indexed
- **Memory efficient**: Indexes only store document IDs

## Use Cases

- 🎮 Game state management
- 📝 Local todo/note applications
- 💬 Offline-first chat applications
- 🛒 Shopping cart state
- 📊 Local data caching
- 🔄 Syncing with backend databases

## Dependencies

- `object-hash` - For generating stable hashes from objects

## License

MIT

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.
