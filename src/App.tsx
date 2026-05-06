import { AppShell } from "./components/layout/AppShell";
import { HiddenPdfRenderer } from "./components/viewers/HiddenPdfRenderer";

function App() {
  if (new URLSearchParams(window.location.search).get("pdfRenderer") === "1") {
    return <HiddenPdfRenderer />;
  }

  return <AppShell />;
}

export default App;
