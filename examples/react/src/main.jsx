import React from "react";
import ReactDOM from "react-dom/client";
import { ContextProvider } from "@live-cache/react";
import App from "./App";
import store from "./sandwichStore";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ContextProvider store={store}>
      <App />
    </ContextProvider>
  </React.StrictMode>
);
