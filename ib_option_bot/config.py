"""
IB V11 Option Sniper - Configuration
"""

# --- 资金管理 ---
MAX_POSITIONS = 1           # 最大同时持仓数量。当已有 N 个持仓时，忽略新信号。
RISK_PER_TRADE = 500        # 每笔交易投入的最大权利金 (USD)。

# --- 期权选择 ---
EXPIRY_DAYS_MIN = 30        # 到期日最小天数
EXPIRY_DAYS_MAX = 45        # 到期日最大天数
OTM_PERCENT_MIN = 0.05      # OTM 最小百分比 (5%)
OTM_PERCENT_MAX = 0.10      # OTM 最大百分比 (10%)

# --- V11 策略参数 ---
STRATEGY_PARAMS = {
    'ema_period': 50,
    'bb_period': 20,
    'bb_std': 2.0,
    'kc_period': 20,
    'kc_mult': 2.5,         # V11 relaxed KC
    'adx_period': 14,
    'adx_threshold': 15,
    'adx_crazy_bull': 30,
}

# --- 扫描设置 ---
SCAN_DELAY_SECONDS = 0.5    # 每个标的之间的请求间隔 (防止 Pacing Violation)
HISTORICAL_DURATION = '1 Y' # 拉取历史数据的时长

# --- IB 连接 ---
IB_HOST = '127.0.0.1'
IB_PORT_PAPER = 7497        # TWS Paper Trading
IB_PORT_LIVE = 4002         # IB Gateway Live
