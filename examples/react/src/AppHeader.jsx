import { useController } from "@live-cache/react";

export default function AppHeader({
  tab,
  setTab,
  disabled,
  controllerOptions,
}) {
  // Intentionally call the hook in multiple places to ensure
  // the same controller doesn't trigger duplicate network calls.
  const posts = useController("posts", undefined, controllerOptions);
  const todos = useController("todos", undefined, controllerOptions);

  return (
    <>
      <h1>JSONPlaceholder Cache Demo</h1>
      <p className="subtitle">
        Using <code>live-cache</code> Controllers as a cache manager
      </p>

      <div className="button-group" style={{ marginBottom: 10 }}>
        <button
          className={tab === "posts" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("posts")}
          disabled={disabled}
        >
          Posts ({posts.data.length})
        </button>
        <button
          className={tab === "todos" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("todos")}
          disabled={disabled}
        >
          Todos ({todos.data.length})
        </button>
        <button
          className="btn-danger"
          onClick={() => {
            posts.controller.reset();
            todos.controller.reset();
          }}
          disabled={disabled}
        >
          Clear All
        </button>
      </div>
    </>
  );
}
