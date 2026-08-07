import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

function markdownContentWatcher(): Plugin {
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  let rebuilding = false;
  let rebuildAgain = false;

  const rebuildContent = () => {
    if (rebuilding) {
      rebuildAgain = true;
      return;
    }

    rebuilding = true;
    const bundledPython = path.join(
      homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "python",
      "python.exe",
    );
    const python =
      process.env.WIKI_PYTHON ??
      (process.platform === "win32" && existsSync(bundledPython)
        ? bundledPython
        : process.platform === "win32"
          ? "python"
          : "python3");
    const child = spawn(python, ["scripts/build_site_content.py"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("[content] Markdown 内容生成失败：", error.message);
    });
    child.on("close", () => {
      rebuilding = false;
      if (rebuildAgain) {
        rebuildAgain = false;
        rebuildContent();
      }
    });
  };

  return {
    name: "markdown-content-watcher",
    configureServer(server) {
      const contentRoot = path.resolve(process.cwd(), "content");
      server.watcher.add(path.join(contentRoot, "commodities", "**/*.md"));
      server.watcher.on("change", (changedPath) => {
        const absolutePath = path.resolve(changedPath);
        if (
          !absolutePath.startsWith(`${contentRoot}${path.sep}`) ||
          path.extname(absolutePath).toLowerCase() !== ".md"
        ) {
          return;
        }

        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(rebuildContent, 120);
      });
    },
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      markdownContentWatcher(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
