/**
 * 中国国家统计站 —— make.fun 投稿入口（Node 22，只用标准库）。
 *
 * 做的事只有三件：把仓库里的 app/ 与 screenshots/ 原样拷到
 * 输出目录，再用 vendor/makefun-frontend.ts（kit 原样，未改动）
 * 里的 buildDossier 写出 dossier.json。输出里不含时间戳，
 * 所以跑两次写出的字节完全相同；全程不联网。
 *
 * 本地检查：MAKEFUN_OUTPUT_DIR=out node main.ts
 * 评分器里：node main.ts（写 /output）
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

/* 与 kit starter 相同的上限：dossier 正文 160 KiB，截图最多
 * 4 张、每张最多 256 KiB，app 最多 993 个文件、16 MiB。 */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

/* 一棵目录树里全部文件的字节数，用显式栈走，不用递归。 */
function treeBytes(root: string): number {
  let bytes = 0;
  const pending: string[] = [root];
  while (pending.length > 0) {
    const dir = pending.pop() as string;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) pending.push(p);
      else bytes += st.size;
    }
  }
  return bytes;
}

function run(): void {
  const appDir = join(here, "app");
  const shotsDir = join(here, "screenshots");
  for (const [dir, label] of [[appDir, "app/"], [shotsDir, "screenshots/"]] as const) {
    if (!existsSync(dir)) throw new Error(`${label} is missing from the repository`);
  }

  mkdirSync(outDir, { recursive: true });
  cpSync(appDir, join(outDir, "app"), { recursive: true });
  cpSync(shotsDir, join(outDir, "screenshots"), { recursive: true });

  const dossier: Uint8Array = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, "dossier.json"), dossier);

  const shotCount = readdirSync(shotsDir).filter((n) => !n.startsWith(".")).length;
  console.log(`copied app/: ${treeBytes(join(outDir, "app"))} bytes`);
  console.log(`copied screenshots/: ${shotCount} files, ${treeBytes(join(outDir, "screenshots"))} bytes`);
  console.log(`wrote dossier.json: ${dossier.byteLength} bytes`);
}

run();
