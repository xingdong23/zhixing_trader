class PhoenixConfig:
    # --- 赌博核心参数 (Gambling Core) ---
    LEVERAGE = 20            # 杠杆倍数 (20x) - 放大收益的核心
    TOTAL_CAPITAL = 300      # 总本金 (300U)
    BASE_BET = 50            # "High Roller" 底注: 单把下注 50U (1/6 本金)
    
    # --- 连赢机制 (Anti-Martingale) ---
    # 目标：连赢3把就收手 (Jackpot)
    # 逻辑：50U -> 80U -> 130U -> 200U+ (翻4倍)
    MAX_CONSECUTIVE_WINS = 3 
    
    # --- 风控参数 (Risk Management) ---
    # 针对 5分钟级别 (5m) 优化的参数
    TAKE_PROFIT_PCT = 0.03   # 止盈: 3% 波动 * 20倍杠杆 = 60% 收益
    STOP_LOSS_PCT = 0.015    # 止损: 1.5% 波动 * 20倍杠杆 = 30% 亏损 (保本金)
    
    # --- 技术指标 (Indicators) ---
    BOLLINGER_WINDOW = 20    # 布林带周期
    BOLLINGER_STD = 2.0      # 布林带标准差 (2.0倍)
    
    # --- 资产设置 ---
    SYMBOL = "SOL/USDT"
    TIMEFRAME = "5m"
