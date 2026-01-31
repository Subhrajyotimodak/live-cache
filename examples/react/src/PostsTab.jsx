import { useState } from "react";
import { useController } from "@live-cache/react";
import Banner from "./Banner";
import { PostDTO } from "./sandwichControllers";

export default function PostsTab({ mutating, setMutating, setMessage }) {
  const posts = useController("posts");
  const [visible, setVisible] = useState(20);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const selected = posts.data.find((p) => p.id === selectedId) ?? null;

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const select = (p) => {
    setSelectedId(p.id);
    setEditTitle(p.title ?? "");
    setEditBody(p.body ?? "");
  };

  const onCreate = async () => {
    setMessage("");
    setMutating(true);
    try {
      await posts.controller.createPost({
        title: newTitle,
        body: newBody,
        userId: 1,
      });
      setNewTitle("");
      setNewBody("");
      setMessage("Created post (cache updated).");
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
      const draft = { title: editTitle, body: editBody };
      const patch = PostDTO.toPatchPayload(selected, draft);
      if (Object.keys(patch).length === 0) {
        setMessage("No changes to PATCH.");
        return;
      }
      await posts.controller.updatePostPatch(selected.id, patch, selected);
      setMessage("PATCHed post (cache updated).");
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
      const payload = PostDTO.toPutPayload(selected, {
        title: editTitle,
        body: editBody,
      });
      await posts.controller.updatePostPut(selected.id, payload);
      setMessage("PUT post (cache updated).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  return (
    <>
      {posts.error ? (
        <Banner variant="error">
          <p className="result-text" style={{ fontSize: 16 }}>
            {String(posts.error)}
          </p>
        </Banner>
      ) : null}

      <div className="form">
        <div className="input-group">
          <label htmlFor="newPostTitle">Create post: title</label>
          <input
            id="newPostTitle"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Post title"
          />
        </div>
        <div className="input-group">
          <label htmlFor="newPostBody">Create post: body</label>
          <input
            id="newPostBody"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Post body"
          />
        </div>
        <div className="button-group">
          <button
            className="btn-primary"
            onClick={onCreate}
            disabled={mutating || !newTitle.trim()}
          >
            POST /posts
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <strong style={{ color: "#333" }}>Posts</strong>
          <button
            className="btn-secondary"
            onClick={() => setVisible((n) => n + 20)}
            disabled={posts.data.length <= visible || mutating}
          >
            Load more
          </button>
        </div>

        <div style={{ marginTop: 8, maxHeight: 260, overflow: "auto" }}>
          {posts.data.slice(0, visible).map((p) => (
            <div
              key={p._id}
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
                  #{p.id}: {p.title}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => select(p)}
                  disabled={mutating}
                >
                  Edit
                </button>
              </div>
              <div style={{ marginTop: 6, color: "#666", fontSize: 14 }}>
                {(p.body ?? "").slice(0, 120)}
                {(p.body ?? "").length > 120 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <Banner style={{ padding: 16 }}>
          <p className="result-text" style={{ fontSize: 18, marginBottom: 10 }}>
            Edit Post #{selected.id}
          </p>

          <div className="input-group">
            <label htmlFor="editPostTitle">title</label>
            <input
              id="editPostTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="editPostBody">body</label>
            <input
              id="editPostBody"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
          </div>

          <div className="button-group">
            <button
              className="btn-secondary"
              onClick={onPatch}
              disabled={mutating}
            >
              PATCH /posts/{selected.id}
            </button>
            <button className="btn-primary" onClick={onPut} disabled={mutating}>
              PUT /posts/{selected.id}
            </button>
          </div>
        </Banner>
      ) : null}
    </>
  );
}
