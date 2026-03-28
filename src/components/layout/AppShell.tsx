import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DocumentViewer } from "../viewers/DocumentViewer";
import { EmptyState } from "../common/EmptyState";
import { FileDropZone } from "../common/FileDropZone";
import { UpdaterModal } from "../common/UpdaterModal";
import { useAssociatedFileOpen } from "@/hooks/useAssociatedFileOpen";
import { useUpdater } from "@/hooks/useUpdater";
import { useDocumentStore } from "@/store/documentStore";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const loading = useDocumentStore((s) => s.loading);
  const error = useDocumentStore((s) => s.error);
  const initializeDownloadDir = useDocumentStore((s) => s.initializeDownloadDir);

  useAssociatedFileOpen();
  const updater = useUpdater();

  useEffect(() => {
    void initializeDownloadDir();
  }, [initializeDownloadDir]);

  return (
    <FileDropZone>
      <div className="flex h-screen overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            hasUpdate={updater.status === "available" || updater.status === "ready"}
            updateStatus={updater.status}
            updateVersion={updater.updateInfo?.version}
            onShowUpdate={updater.openModal}
          />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
            {currentDocument || loading || error ? (
              <DocumentViewer />
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>
      <UpdaterModal
        visible={updater.modalVisible}
        status={updater.status}
        updateInfo={updater.updateInfo}
        downloadProgress={updater.downloadProgress}
        errorMessage={updater.errorMessage}
        onDownload={updater.downloadAndInstall}
        onRelaunch={updater.relaunch}
        onDismiss={updater.dismiss}
      />
    </FileDropZone>
  );
}
