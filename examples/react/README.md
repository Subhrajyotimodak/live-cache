# React Example (PokéAPI Explorer)

This example demonstrates how to use LiveCache controllers in a React app by
building a small PokéAPI explorer.

> **Disclaimer:** This project is under initial development. Breaking changes are made every week.

## How to Run

1. First, build the library from the root directory:

   ```bash
   cd ../..
   npm install
   npm run build
   ```

2. Install dependencies and run the React example:

   ```bash
   cd examples/react
   npm install
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## What It Does

This example shows:

- How to register controllers in an ObjectStore and wire them into React
- How to subscribe to controllers with `useController`
- Separating UI into components (search, list, details, stats)
- Fetching remote data and persisting snapshots

## Features

- Search by Pokémon name or id
- Browse a curated list of Pokémon
- View artwork, quick facts, and base stats
- Controller-driven updates with cached snapshots
