import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const versionArg = args.find((arg) => !arg.startsWith("--"));
const version = versionArg?.replace(/^v/, "");

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Uso: npm run version:set -- <versão> [--dry-run]");
  console.error("Exemplo: npm run version:set -- 1.6.4");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const paths = {
  packageJson: resolve(root, "package.json"),
  packageLock: resolve(root, "package-lock.json"),
  cargoToml: resolve(root, "src-tauri/Cargo.toml"),
  cargoLock: resolve(root, "src-tauri/Cargo.lock"),
  tauriConfig: resolve(root, "src-tauri/tauri.conf.json"),
};

const [packageText, packageLockText, cargoTomlText, cargoLockText, tauriConfigText] =
  await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

const packageJson = JSON.parse(packageText);
const packageLock = JSON.parse(packageLockText);
const tauriConfig = JSON.parse(tauriConfigText);
const previousVersion = packageJson.version;

if (!packageLock.packages?.[""]) {
  throw new Error('package-lock.json não contém o pacote raiz em packages[""]');
}

const replaceVersion = (text, pattern, fileName) => {
  if (!pattern.test(text)) {
    throw new Error(`Não foi possível localizar a versão do aplicativo em ${fileName}`);
  }
  return text.replace(pattern, `$1${version}$2`);
};

const cargoToml = replaceVersion(
  cargoTomlText,
  /(^\[package\][\s\S]*?^version = ")[^"]+("$)/m,
  "src-tauri/Cargo.toml",
);
const cargoLock = replaceVersion(
  cargoLockText,
  /(\[\[package\]\]\s*\nname = "xml-viewer-br"\s*\nversion = ")[^"]+(".*)/,
  "src-tauri/Cargo.lock",
);

packageJson.version = version;
packageLock.version = version;
packageLock.packages[""].version = version;
if (typeof tauriConfig.version !== "string") {
  throw new Error("src-tauri/tauri.conf.json não contém uma versão válida");
}
const tauriConfigUpdated = tauriConfigText.replace(
  /(^\s*"version"\s*:\s*")[^"]+("\s*,)/m,
  `$1${version}$2`,
);

const updates = [
  [paths.packageJson, `${JSON.stringify(packageJson, null, 2)}\n`],
  [paths.packageLock, `${JSON.stringify(packageLock, null, 2)}\n`],
  [paths.cargoToml, cargoToml],
  [paths.cargoLock, cargoLock],
  [paths.tauriConfig, tauriConfigUpdated],
];

if (!dryRun) {
  await Promise.all(updates.map(([path, contents]) => writeFile(path, contents)));
}

console.log(`${dryRun ? "Simulação" : "Versão atualizada"}: ${previousVersion} -> ${version}`);
for (const [path] of updates) console.log(`- ${path.replace(`${root}/`, "")}`);
