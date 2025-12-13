"""
MA-RSI 策略 - 基于均线和RSI指标的交易策略

策略逻辑:
- 买入: 快速EMA(10)上穿慢速EMA(30) + RSI未超买(<70)
- 卖出: 快速EMA下穿慢速EMA 或 RSI超买(>75)

这是一个简单易懂、可解释性强的趋势跟踪策略。
"""
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class MaRsiStrategy(IStrategy):
    """基于均线金叉/死叉 + RSI过滤的策略"""
    
    INTERFACE_VERSION = 3
    
    # 时间框架
    timeframe = '1h'
    
    # 风险管理
    stoploss = -0.05  # 5% 止损
    minimal_roi = {
        "0": 0.03,    # 立即: 3% 止盈
        "60": 0.02,   # 1小时后: 2% 止盈
        "120": 0.01   # 2小时后: 1% 止盈
    }
    
    # 预热周期 - 确保有足够数据计算指标
    startup_candle_count: int = 50
    
    # 策略参数 (便于后续优化)
    fast_ema_period = 10  # 快速均线周期
    slow_ema_period = 30  # 慢速均线周期
    rsi_period = 14       # RSI 周期
    rsi_buy_max = 70      # RSI买入上限 (避免追高)
    rsi_sell_threshold = 75  # RSI卖出阈值 (超买)
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """计算技术指标"""
        
        # 快速均线 (EMA-10)
        dataframe['ema_fast'] = ta.EMA(dataframe, timeperiod=self.fast_ema_period)
        
        # 慢速均线 (EMA-30)
        dataframe['ema_slow'] = ta.EMA(dataframe, timeperiod=self.slow_ema_period)
        
        # RSI (14)
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=self.rsi_period)
        
        # 辅助信号: 均线交叉检测
        dataframe['ema_cross_up'] = (
            (dataframe['ema_fast'] > dataframe['ema_slow']) & 
            (dataframe['ema_fast'].shift(1) <= dataframe['ema_slow'].shift(1))
        ).astype(int)
        
        dataframe['ema_cross_down'] = (
            (dataframe['ema_fast'] < dataframe['ema_slow']) & 
            (dataframe['ema_fast'].shift(1) >= dataframe['ema_slow'].shift(1))
        ).astype(int)
        
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        定义买入信号
        
        买入条件:
        1. 快速均线上穿慢速均线 (金叉)
        2. RSI < 70 (未超买，避免追高)
        3. 有成交量 (基本过滤)
        """
        dataframe.loc[
            (
                (dataframe['ema_cross_up'] == 1) &           # 金叉发生
                (dataframe['rsi'] < self.rsi_buy_max) &      # RSI 未超买
                (dataframe['ema_fast'] > dataframe['ema_slow']) &  # 确认趋势向上
                (dataframe['volume'] > 0)                    # 有成交量
            ),
            'enter_long'] = 1
        
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        定义卖出信号
        
        卖出条件:
        1. 快速均线下穿慢速均线 (死叉) 
        2. 或 RSI > 75 (超买区域)
        """
        dataframe.loc[
            (
                (dataframe['ema_cross_down'] == 1) |         # 死叉发生
                (dataframe['rsi'] > self.rsi_sell_threshold) # 或 RSI 超买
            ),
            'exit_long'] = 1
        
        return dataframe
