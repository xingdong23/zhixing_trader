#!/usr/bin/env python3
"""Merge ETHUSDT 5m data for 2025-10 into a single CSV.

Input files:
  backtest/data/ETHUSDT-5m-2025-10-*.csv
Output file:
  backtest/data/ETHUSDT-5m-2025-10-all.csv
"""

import glob
import os
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]  # project_root/backtest
DATA_DIR = BASE_DIR / "data"
PATTERN = str(DATA_DIR / "ETHUSDT-5m-2025-10-*.csv")
OUTPUT = DATA_DIR / "ETHUSDT-5m-2025-10-all.csv"


def main() -> None:
    files = sorted(glob.glob(PATTERN))
    if not files:
        print(f"NO_FILES {PATTERN}")
        return

    print(f"FOUND {len(files)} FILES")
    dfs = []
    for f in files:
        print(f"LOAD {os.path.basename(f)}")
        df = pd.read_csv(f)
        dfs.append(df)

    merged = pd.concat(dfs, ignore_index=True)

    # Try to normalize and sort by open_time if present
    if "open_time" in merged.columns:
        merged = merged.sort_values("open_time").reset_index(drop=True)
        before = len(merged)
        merged = merged.drop_duplicates(subset=["open_time"], keep="first")
        after = len(merged)
        print(f"DEDUP {before}->{after}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(OUTPUT, index=False)
    print(f"WROTE {OUTPUT} rows={len(merged)}")


if __name__ == "__main__":
    main()
