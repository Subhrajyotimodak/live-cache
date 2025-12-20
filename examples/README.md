# Examples

This folder contains example implementations of the ProjectSandwich library.

## Available Examples

### 1. Vanilla JavaScript (`vanilla-js/`)

A simple HTML page demonstrating how to use the library with plain JavaScript.

**Features:**
- Uses the UMD build
- Interactive form to create and update sandwiches
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
- Interactive UI with animations
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

To use ProjectSandwich in your own project:

1. Install the library:
   ```bash
   npm install project-sandwich
   ```

2. Import and use:
   ```javascript
   import { createSandwich } from 'project-sandwich';
   
   const sandwich = createSandwich({
     bread: 'sourdough',
     filling: 'turkey'
   });
   
   console.log(sandwich.describe());
   ```

See the individual example READMEs for more details!

