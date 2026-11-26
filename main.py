#!/usr/bin/env python3
"""China National Statistics site - make.fun entrypoint (stdlib only).

Copies app/ and screenshots/ from this repository to the output
directory, $MAKEFUN_OUTPUT_DIR (default /output), replacing any
previous copy of those two trees so a re-run writes exactly the
repository's files. The dossier, dossier.json, is written by
`node main.ts` with buildDossier from vendor/makefun-frontend.ts
(the kit's copy); when that file and node are present this script
runs it, otherwise it copies the site and says so.

  MAKEFUN_OUTPUT_DIR=out python3 main.py   # local check
  python3 main.py                          # writes /output

Runs twice and writes the same bytes both times. No network.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DIR = Path(os.environ.get("MAKEFUN_OUTPUT_DIR") or "/output")


def tree_bytes(path):
    files = [p for p in path.rglob("*") if p.is_file()]
    return len(files), sum(p.stat().st_size for p in files)


def replace_tree(src, dst):
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def main():
    app = HERE / "app"
    shots = HERE / "screenshots"
    if not app.is_dir():
        print("app/ is missing from the repository", file=sys.stderr)
        return 1
    if not shots.is_dir():
        print("screenshots/ is missing from the repository", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    replace_tree(app, OUT_DIR / "app")
    replace_tree(shots, OUT_DIR / "screenshots")
    n_app, b_app = tree_bytes(OUT_DIR / "app")
    n_shots, b_shots = tree_bytes(OUT_DIR / "screenshots")
    print(f"app/: {n_app} files, {b_app} bytes")
    print(f"screenshots/: {n_shots} files, {b_shots} bytes")

    vendor = HERE / "vendor" / "makefun-frontend.ts"
    main_ts = HERE / "main.ts"
    dossier = OUT_DIR / "dossier.json"
    if vendor.is_file() and main_ts.is_file() and shutil.which("node"):
        env = dict(os.environ, MAKEFUN_OUTPUT_DIR=str(OUT_DIR))
        result = subprocess.run(["node", "main.ts"], cwd=HERE, env=env)
        if result.returncode != 0:
            return result.returncode
        print(f"dossier.json: {dossier.stat().st_size} bytes")
    else:
        print("dossier.json: not written here; run `node main.ts` with "
              "the kit's vendor/makefun-frontend.ts to produce it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
