# 数据处理脚本

本目录包含用于数据下载、合并和处理的工具脚本。

## 脚本说明

### download_binance_data.py

币安历史数据下载工具，支持下载U本位合约的K线数据。

**功能：**

- 下载指定交易对的历史K线数据
- 支持多种时间周期（1m, 5m, 15m, 1h等）
- 自动解压和整理数据

**使用示例：**

```python
from download_binance_data import BinanceDataDownloader

downloader = BinanceDataDownloader(symbol="ETHUSDT", interval="1h")
downloader.download_range(start_date="2024-01-01", end_date="2024-12-31")
```

### merge_data.py

通用数据合并脚本，按月份模式合并历史数据。

**功能：**

- 合并指定月份的数据文件
- 自动去重和排序
- 主要用于5分钟数据的合并

**使用示例：**

```bash
python merge_data.py
```

### merge_ethusdt_1h_all.py

ETHUSDT专用数据合并和聚合脚本。

**功能：**

- 合并所有ETHUSDT-1h数据文件
- 数据规范化和清洗
- 生成1小时和日线聚合数据

**使用示例：**

```bash
python merge_ethusdt_1h_all.py
```

### resample_data.py

数据重采样工具，将高频数据转换为低频数据。

**功能：**

- 5分钟数据重采样为1小时数据
- 5分钟数据重采样为日线数据
- 保持OHLCV数据完整性

**使用示例：**

```bash
python resample_data.py
```

## 数据目录结构

```text
backtest/
├── data/              # 存放原始和处理后的数据文件
├── scripts/           # 数据处理脚本（本目录）
└── ...
```
