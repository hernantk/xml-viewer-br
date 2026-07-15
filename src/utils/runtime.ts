export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown };
  };

  return (
    typeof tauriWindow.__TAURI_INTERNALS__ === "object" &&
    typeof tauriWindow.__TAURI_INTERNALS__.invoke === "function"
  );
}

export async function isNfeDownloadSupported(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("nfe_download_supported");
  } catch {
    return false;
  }
}
