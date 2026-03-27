import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DocumentViewer } from "../viewers/DocumentViewer";
import { EmptyState } from "../common/EmptyState";
import { FileDropZone } from "../common/FileDropZone";
import { useDocumentStore } from "@/store/documentStore";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentDocument = useDocumentStore((s) => s.currentDocument);

  return (
    <FileDropZone>
      <div className="flex h-screen overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
            {currentDocument ? <DocumentViewer /> : <EmptyState />}
          </main>
        </div>
      </div>
    </FileDropZone>
  );
}
