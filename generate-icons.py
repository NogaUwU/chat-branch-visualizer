#!/usr/bin/env python3
"""Generate extension icons from logos/plugin-logo.png."""

from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "logos" / "plugin-logo.png"
OUTPUT_DIR = ROOT / "icons"
SIZES = (16, 32, 48, 128)


def main() -> int:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source logo: {SOURCE}")

    OUTPUT_DIR.mkdir(exist_ok=True)

    for size in SIZES:
        target = OUTPUT_DIR / f"icon{size}.png"
        shutil.copy2(SOURCE, target)
        subprocess.run(
            [
                "sips",
                "-z",
                str(size),
                str(size),
                str(target),
                "--out",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"Generated {target.relative_to(ROOT)} from {SOURCE.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
