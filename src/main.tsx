import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/styles/global.css";
import { restoreIfNeeded } from "@/utils/persistentStorage";

async function bootstrap() {
  // Restore saved data from filesystem if localStorage was wiped by an update
  await restoreIfNeeded();

  // Sync dark mode class with persisted theme
  const savedTheme = localStorage.getItem("xmlviewer-theme");
  document.documentElement.classList.toggle("light", savedTheme === "light");

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
