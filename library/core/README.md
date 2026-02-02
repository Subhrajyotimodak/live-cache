# @live-cache/core

Core data structures and controller APIs for live-cache.

> **Disclaimer:** This project is under initial development. Breaking changes are made every week.

## Install

```bash
bun add @live-cache/core
```

## What it includes

- `Collection`, `Document`, and `Controller`
- `ObjectStore` utilities
- `join()` helper
- `StorageManager` and `Invalidator` base types
- `Transactions` utilities
- `withMutation` – method decorator for Controller async methods; adds `.loading` and `.error` on the method (TC39 decorator)
- `WithMutationState` – type for the decorated method shape

## Usage

```ts
import { Controller, createObjectStore, withMutation } from "@live-cache/core";
```
