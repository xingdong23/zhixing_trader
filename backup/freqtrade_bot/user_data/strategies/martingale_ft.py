from freqtrade.strategy import IStrategy, IntParameter, DecimalParameter
from pandas import DataFrame
import talib.abstract as ta
import logging
from .base_strategy import BaseFreqStrategy

class MartingaleFTStrategy(BaseFreqStrategy):
    """马丁狙击手策略 - Freqtrade 版本"""
    
    INTERFACE_VERSION = 3
    timeframe = '15m'
    
    # 策略参数
    stoploss = -0.10  # 宽止损，依靠马丁逻辑
    minimal_roi = {
        "0": 0.02,    # 2% 止盈
        "30": 0.01
    }
    
    # 可优化参数
    explosion_threshold = IntParameter(2, 5, default=3, space='buy', optimize=True)
    volume_multiplier = IntParameter(2, 5, default=3, space='buy', optimize=True)
    rsi_buy = IntParameter(30, 70, default=70, space='buy', optimize=True)
    
    # 马丁格尔配置
    position_adjustment_enable = True
    max_entry_position_adjustment = 4  # 最多加仓 4 次
    
    # 核心下注序列 (单位: 倍数) - 需要配合 custom_stake_amount
    # Freqtrade 的加仓逻辑通常通过 adjust_trade_position 实现
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 调用父类生成基础特征
        dataframe = super().populate_indicators(dataframe, metadata)
        
        # 确保所需指标存在 (如果 FeatureFactory 没生成，这里补充)
        if 'atr' not in dataframe.columns:
            dataframe['atr'] = ta.ATR(dataframe, timeperiod=14)
            
        dataframe['atr_pct'] = dataframe['atr'] / dataframe['close'] * 100
        
        # 成交量 MA
        if 'volume_mean_20' not in dataframe.columns:
             dataframe['volume_mean_20'] = dataframe['volume'].rolling(20).mean()
        
        dataframe['volume_ratio'] = dataframe['volume'] / dataframe['volume_mean_20']
        
        # RSI
        if 'rsi' not in dataframe.columns:
            dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
            
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['atr_pct'] > self.explosion_threshold.value) &
                (dataframe['volume_ratio'] > self.volume_multiplier.value) &
                (dataframe['rsi'] < self.rsi_buy.value) &  # 回调介入? 或者突破介入
                (dataframe['volume'] > 0)
            ),
            'enter_long'] = 1
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['rsi'] > 80)
            ),
            'exit_long'] = 1
        return dataframe
        
    def adjust_trade_position(self, trade, current_time, current_rate, current_profit, min_stake, max_stake, **kwargs):
        """
        管理马丁格尔加仓
        """
        if current_profit > -0.05: # 亏损小于 5% 不加仓
            return None
            
        count_of_entries = trade.nr_of_successful_entries
        
        if count_of_entries >= self.max_entry_position_adjustment + 1:
            return None
            
        # 简单倍投逻辑: 每次加倍
        # 第一次开仓是 1x, 这里决定随后的加仓
        try:
            stake_amount = trade.stake_amount # 当前总投入
            # 目标是加倍投入? 或者按序列?
            # 假设简单的 2 倍投
            return stake_amount # 加仓金额 = 当前持仓金额 (即翻倍)
        except Exception as e:
            return None
