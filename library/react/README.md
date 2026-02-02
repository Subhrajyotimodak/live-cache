# @live-cache/react

React bindings for live-cache controllers and stores.

> **Disclaimer:** This project is under initial development. Breaking changes are made every week.

## Install

```bash
bun add @live-cache/react @live-cache/core
```

## What it includes

- `ContextProvider` and `useRegister`
- `useController` and `useJoinController`
- `useModify` – hook that wraps an async function and returns `{ mutate, loading, error }` for UI feedback (e.g. create/update mutations)

## Usage

```tsx
import { ContextProvider, useController, useModify } from "@live-cache/react";
```
