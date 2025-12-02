import os
import glob
import pandas as pd
import numpy as np


BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
PATTERN = os.path.join(BASE_DIR, "ETHUSDT-1h-*.csv")
OUT_1H = os.path.join(BASE_DIR, "ETHUSDT-1h-ALL.csv")
OUT_1D = os.path.join(BASE_DIR, "ETHUSDT-1d-ALL.csv")


def is_int_like(x: object) -> bool:
    """
    判断值是否为纯数字（避免 header 文本等污染 open_time 列）
    """
    s = str(x).strip()
    return s.isdigit()


def load_and_normalize_file(path: str) -> pd.DataFrame:
    """
    加载单个 ETHUSDT-1h CSV，并规范列名/字段。
    仅保留 [open_time, open, high, low, close, volume] 列。
    """
    df = pd.read_csv(path)

    # 有些导出脚本用 timestamp 列，这里统一到 open_time
    if "open_time" not in df.columns and "timestamp" in df.columns:
        df = df.rename(columns={"timestamp": "open_time"})

    if "open_time" not in df.columns:
        print(f"SKIP_NO_OPEN_TIME {os.path.basename(path)}")
        return pd.DataFrame()

    keep_cols = [c for c in df.columns if c in ["open_time", "open", "high", "low", "close", "volume"]]
    df = df[keep_cols]

    return df


def build_1h_all() -> pd.DataFrame:
    """
    合并所有 ETHUSDT-1h-*.csv，生成规范化的 ETHUSDT-1h-ALL.csv
    """
    files = sorted(glob.glob(PATTERN))
    print(f"FOUND_FILES {len(files)}")

    frames = []
    for f in files:
        try:
            df = load_and_normalize_file(f)
            if not df.empty:
                frames.append(df)
        except Exception as e:
            print(f"READ_ERROR {os.path.basename(f)} {e}")

    if not frames:
        raise SystemExit("NO_VALID_ETHUSDT_1H_FILES")

    all_df = pd.concat(frames, ignore_index=True)

    # 过滤掉 header 串、空值等非数字 open_time
    before = len(all_df)
    all_df = all_df[all_df["open_time"].apply(is_int_like)]
    print(f"FILTER_INVALID_OPEN_TIME {before} -> {len(all_df)}")

    # 转为 int64 毫秒时间戳
    all_df["open_time"] = all_df["open_time"].astype("int64")

    # 排序+按 open_time 去重
    all_df = all_df.sort_values("open_time").drop_duplicates(subset=["open_time"])

    # 写出 1h ALL
    all_df.to_csv(OUT_1H, index=False)
    print(f"WROTE_1H_ALL {OUT_1H} rows {len(all_df)}")

    return all_df


def build_1d_all(all_df: pd.DataFrame) -> pd.DataFrame:
    """
    从 1h ALL 聚合生成 ETHUSDT-1d-ALL.csv
    """
    if all_df.empty:
        raise SystemExit("EMPTY_1H_ALL_DF")

    # 基于 open_time 毫秒生成 datetime 索引，并确保数值列为浮点数
    all_df = all_df.copy()
    all_df["datetime"] = pd.to_datetime(all_df["open_time"], unit="ms")
    all_df = all_df.set_index("datetime")

    # 强制数值列为 float，避免字符串导致聚合报错
    for col in ["open", "high", "low", "close", "volume"]:
        if col in all_df.columns:
            all_df[col] = pd.to_numeric(all_df[col], errors="coerce")

    daily = pd.DataFrame()
    # open_time 统一为当日日线起始毫秒
    daily["open_time"] = (all_df.index.normalize().astype("int64") // 10**6)
    daily["open"] = all_df["open"].resample("1D").first()
    daily["high"] = all_df["high"].resample("1D").max()
    daily["low"] = all_df["low"].resample("1D").min()
    daily["close"] = all_df["close"].resample("1D").last()
    if "volume" in all_df.columns:
        daily["volume"] = all_df["volume"].resample("1D").sum()

    # 删除不完整日线
    daily = daily.dropna(subset=["open", "high", "low", "close"])

    daily.to_csv(OUT_1D, index=False)
    print(f"WROTE_1D_ALL {OUT_1D} rows {len(daily)}")

    return daily


def main():
    print("=== Merge ETHUSDT 1h CSV -> 1h-ALL & 1d-ALL ===")
    print(f"DATA DIR: {BASE_DIR}")
    all_df = build_1h_all()
    build_1d_all(all_df)
    print("=== DONE ===")


if __name__ == "__main__":
    main()
