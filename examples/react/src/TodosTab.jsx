import { useState } from "react";
import { useController } from "live-cache";
import Banner from "./Banner";
import { TodoDTO } from "./sandwichControllers";

export default function TodosTab({ mutating, setMutating, setMessage }) {
  const todos = useController("todos");

  const [visible, setVisible] = useState(20);

  const [newTitle, setNewTitle] = useState("");
  const [newCompleted, setNewCompleted] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const selected = todos.data.find((t) => t.id === selectedId) ?? null;

  const [editTitle, setEditTitle] = useState("");
  const [editCompleted, setEditCompleted] = useState(false);

  const select = (t) => {
    setSelectedId(t.id);
    setEditTitle(t.title ?? "");
    setEditCompleted(Boolean(t.completed));
  };

  const onCreate = async () => {
    setMessage("");
    setMutating(true);
    try {
      await todos.controller.createTodo({
        title: newTitle,
        completed: newCompleted,
        userId: 1,
      });
      setNewTitle("");
      setNewCompleted(false);
      setMessage("Created todo (cache updated).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  const onPatch = async () => {
    if (!selected) return;
    setMessage("");
    setMutating(true);
    try {
      const draft = { title: editTitle, completed: editCompleted };
      const patch = TodoDTO.toPatchPayload(selected, draft);
      if (Object.keys(patch).length === 0) {
        setMessage("No changes to PATCH.");
        return;
      }
      await todos.controller.updateTodoPatch(selected.id, patch, selected);
      setMessage("PATCHed todo (cache updated).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  const onPut = async () => {
    if (!selected) return;
    setMessage("");
    setMutating(true);
    try {
      const payload = TodoDTO.toPutPayload(selected, {
        title: editTitle,
        completed: editCompleted,
      });
      await todos.controller.updateTodoPut(selected.id, payload);
      setMessage("PUT todo (cache updated).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  return (
    <>
      {todos.error ? (
        <Banner variant="error">
          <p className="result-text" style={{ fontSize: 16 }}>
            {String(todos.error)}
          </p>
        </Banner>
      ) : null}

      <div className="form">
        <div className="input-group">
          <label htmlFor="newTodoTitle">Create todo: title</label>
          <input
            id="newTodoTitle"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Todo title"
          />
        </div>
        <div className="input-group">
          <label htmlFor="newTodoCompleted">Create todo: completed</label>
          <select
            id="newTodoCompleted"
            value={newCompleted ? "true" : "false"}
            onChange={(e) => setNewCompleted(e.target.value === "true")}
          >
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
        </div>
        <div className="button-group">
          <button
            className="btn-primary"
            onClick={onCreate}
            disabled={mutating || !newTitle.trim()}
          >
            POST /todos
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <strong style={{ color: "#333" }}>Todos</strong>
          <button
            className="btn-secondary"
            onClick={() => setVisible((n) => n + 20)}
            disabled={todos.data.length <= visible || mutating}
          >
            Load more
          </button>
        </div>

        <div style={{ marginTop: 8, maxHeight: 260, overflow: "auto" }}>
          {todos.data.slice(0, visible).map((t) => (
            <div
              key={t._id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "#333" }}>
                  #{t.id}: {t.title}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => select(t)}
                  disabled={mutating}
                >
                  Edit
                </button>
              </div>
              <div style={{ marginTop: 6, color: "#666", fontSize: 14 }}>
                completed: <strong>{String(Boolean(t.completed))}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <Banner style={{ padding: 16 }}>
          <p className="result-text" style={{ fontSize: 18, marginBottom: 10 }}>
            Edit Todo #{selected.id}
          </p>

          <div className="input-group">
            <label htmlFor="editTodoTitle">title</label>
            <input
              id="editTodoTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="editTodoCompleted">completed</label>
            <select
              id="editTodoCompleted"
              value={editCompleted ? "true" : "false"}
              onChange={(e) => setEditCompleted(e.target.value === "true")}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>

          <div className="button-group">
            <button
              className="btn-secondary"
              onClick={onPatch}
              disabled={mutating}
            >
              PATCH /todos/{selected.id}
            </button>
            <button className="btn-primary" onClick={onPut} disabled={mutating}>
              PUT /todos/{selected.id}
            </button>
          </div>
        </Banner>
      ) : null}
    </>
  );
}
