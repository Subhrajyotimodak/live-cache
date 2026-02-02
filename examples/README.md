# Examples

This folder contains example implementations of the LiveCache library.

> **Disclaimer:** This project is under initial development. Breaking changes are made every week.

## Available Examples

### 1. Vanilla JavaScript (`vanilla-js/`)

A simple HTML page demonstrating how to use the library with plain JavaScript.

**Features:**

- Uses the UMD build
- Interactive form to create and update data
- Beautiful, modern UI
- No build step required (just open in browser after building the library)

**How to run:**

```bash
# From project root
npm run build

# Then open examples/vanilla-js/index.html in your browser
```

### 2. React (`react/`)

A modern React application using Vite as the build tool.

**Features:**

- Uses the ES Module build
- React hooks for state management
- PokéAPI explorer (list + details)
- TypeScript support
- Hot module replacement in development

**How to run:**

```bash
# From project root
npm run build

# Navigate to React example
cd examples/react
npm install
npm run dev

# Open http://localhost:3000
```

## Creating Your Own Example

To use LiveCache in your own project:

1. Install the library:

   ```bash
   npm install live-cache
   ```

2. Import and use:

   ```javascript
   import { Collection } from "live-cache";

   const users = new Collection("users");
   users.insertOne({ name: "Ada Lovelace" });
   ```

See the individual example READMEs for more details!
