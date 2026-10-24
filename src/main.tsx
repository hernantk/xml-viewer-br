import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/styles/global.css";
import { restoreIfNeeded } from "@/utils/persistentStorage";

async function bootstrap() {
  const isPdfRenderer =
    new URLSearchParams(window.location.search).get("pdfRenderer") === "1";
  await restoreIfNeeded({ writeBack: !isPdfRenderer });

  if (import.meta.env.DEV && import.meta.env.VITE_SEED_LEGACY === "1" && !isPdfRenderer) {
    const { seedLegacyStorage } = await import("./dev/seedLegacyStorage");
    console.info(`[dev] ${seedLegacyStorage()} XML(s) antigo(s) semeado(s) no localStorage`);
  }

  const savedTheme = localStorage.getItem("xmlviewer-theme");
  document.documentElement.classList.toggle("dark", savedTheme === "dark");

  // App imports the Zustand store, so it must load only after storage restoration.
  const { default: App } = await import("./App");

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
