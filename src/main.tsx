import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/styles/global.css";

// Sync dark mode class with persisted theme
const savedTheme = localStorage.getItem("xmlviewer-theme");
document.documentElement.classList.toggle("light", savedTheme === "light");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
