"""
5分钟爆破猎手 (5-Minute Blow-Up Hunter)

核心逻辑:
- 只在高波动时段交易 (UTC 00:00-04:00, 14:00-18:00)
- 突破前20根K线最高点
- 成交量 > 50周期均量 * 1.8
- 10x杠杆，止盈1%，止损0.33%
- 5分钟K线收盘强制平仓

风险/收益 = 1:3，胜率25%即可盈亏平衡
"""
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta
import numpy as np


class BlowupHunterStrategy(IStrategy):
    """5分钟突破+放量高杠杆策略"""
    
    INTERFACE_VERSION = 3
    
    # 时间框架
    timeframe = '5m'
    
    # 风险管理 - 10x杠杆下的止损止盈 (优化后参数)
    stoploss = -0.003  # 0.3% 价格止损 → 3% 账户风险 (10x)
    
    # 止盈设置: 0.5% 价格 → 5% 账户收益 (10x)
    minimal_roi = {
        "0": 0.005,  # 0.5% 止盈
        "15": 0.003, # 15分钟后 0.3% 止盈
    }
    
    # 强制5分钟后平仓（通过ROI实现接近效果）
    # 实际实盘需要自定义逻辑
    
    # 预热周期
    startup_candle_count: int = 60
    
    # 策略参数
    breakout_period = 20      # 突破周期
    volume_ma_period = 50     # 成交量均线周期
    volume_multiplier = 1.8   # 成交量倍数阈值
    
    # 交易时段 (UTC小时)
    trading_hours_session1 = [0, 1, 2, 3]        # UTC 00:00-04:00
    trading_hours_session2 = [14, 15, 16, 17]    # UTC 14:00-18:00
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """计算技术指标"""
        
        # 前20根K线最高价（不含当前）
        dataframe['highest_20'] = dataframe['high'].shift(1).rolling(window=self.breakout_period).max()
        
        # 50周期成交量均线
        dataframe['volume_ma'] = ta.SMA(dataframe['volume'], timeperiod=self.volume_ma_period)
        
        # 成交量脉冲检测
        dataframe['volume_spike'] = dataframe['volume'] > (dataframe['volume_ma'] * self.volume_multiplier)
        
        # 突破检测
        dataframe['breakout'] = dataframe['close'] > dataframe['highest_20']
        
        # 提取UTC小时（假设数据时间戳已对齐UTC）
        dataframe['hour'] = dataframe['date'].dt.hour
        
        # 交易时段检测
        dataframe['in_session'] = dataframe['hour'].isin(
            self.trading_hours_session1 + self.trading_hours_session2
        )
        
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        做多信号 - 必须同时满足:
        1. 在交易时段内
        2. 收盘价突破前20根K线最高点  
        3. 成交量 > 50MA * 1.8
        """
        dataframe.loc[
            (
                (dataframe['in_session'] == True) &       # 交易时段
                (dataframe['breakout'] == True) &         # 突破
                (dataframe['volume_spike'] == True) &     # 放量
                (dataframe['volume'] > 0)                 # 有效K线
            ),
            'enter_long'] = 1
        
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        主动出场信号 - 止盈止损由 stoploss 和 minimal_roi 处理
        这里可以添加额外的出场逻辑（如超时强平）
        """
        # 暂时不设置主动出场，依赖ROI和止损
        # 实盘可添加：持仓超过1根K线强制平仓
        
        return dataframe
    
    def custom_stake_amount(self, pair: str, current_time, current_rate: float,
                           proposed_stake: float, min_stake: float, max_stake: float,
                           leverage: float, entry_tag: str, side: str, **kwargs) -> float:
        """
        自定义仓位计算
        单笔风险3%（9U），止损0.33% → 开仓约270U名义价值
        """
        # 账户余额 * 0.03 / 0.0033 = 开仓名义价值
        # 但这里freqtrade可能有限制，先用默认
        return proposed_stake
    
    def leverage(self, pair: str, current_time, current_rate: float,
                 proposed_leverage: float, max_leverage: float, entry_tag: str,
                 side: str, **kwargs) -> float:
        """返回10x杠杆"""
        return 10.0
