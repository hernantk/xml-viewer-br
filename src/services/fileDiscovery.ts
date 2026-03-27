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

export async function discoverXmlFiles(directory: string): Promise<DiscoveredXmlFile[]> {
  const entries = await readDir(directory);
  const xmlEntries = entries
    .filter((entry) => entry.isFile && typeof entry.name === "string")
    .filter((entry) => entry.name.toLowerCase().endsWith(".xml"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  return Promise.all(
    xmlEntries.map(async (entry) => ({
      name: entry.name,
      path: await join(directory, entry.name),
    })),
  );
}
