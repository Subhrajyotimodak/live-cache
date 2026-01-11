import { useState } from "react";
import "./App.css";
import AppHeader from "./AppHeader";
import StatusBar from "./StatusBar";
import Banner from "./Banner";
import PostsTab from "./PostsTab";
import TodosTab from "./TodosTab";

function App() {
  const [tab, setTab] = useState("posts");

  const [mutating, setMutating] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="app">
      <div className="container">
        <AppHeader tab={tab} setTab={setTab} disabled={mutating} />

        <StatusBar controllerName={tab} mutating={mutating} />

        {message ? (
          <Banner>
            <p style={{ margin: 0, color: "#333" }}>{message}</p>
          </Banner>
        ) : null}

        {tab === "posts" ? (
          <PostsTab
            mutating={mutating}
            setMutating={setMutating}
            setMessage={setMessage}
          />
        ) : (
          <TodosTab
            mutating={mutating}
            setMutating={setMutating}
            setMessage={setMessage}
          />
        )}
      </div>
    </div>
  );
}

export default App;
