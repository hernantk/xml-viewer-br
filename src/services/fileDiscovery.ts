import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";

export interface DiscoveredXmlFile {
  name: string;
  path: string;
}

export async function pickDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export async function discoverXmlFiles(directory: string, recursive = false): Promise<DiscoveredXmlFile[]> {
  const entries = await readDir(directory);
  const results: DiscoveredXmlFile[] = [];

  for (const entry of entries) {
    if (!entry.name) continue;

    if (entry.isFile && entry.name.toLowerCase().endsWith(".xml")) {
      results.push({
        name: entry.name,
        path: await join(directory, entry.name),
      });
    }

    if (recursive && entry.isDirectory && entry.name) {
      const subDir = await join(directory, entry.name);
      const subFiles = await discoverXmlFiles(subDir, true);
      results.push(...subFiles);
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  return results;
}
