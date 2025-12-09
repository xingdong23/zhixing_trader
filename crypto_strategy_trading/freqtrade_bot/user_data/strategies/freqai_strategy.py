from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta
import logging
# FreqaiExtrasMixin removed - using standard IStrategy for compatibility

logger = logging.getLogger(__name__)

class FreqAIStrategy(IStrategy):
    """FreqAI 机器学习策略"""
    
    INTERFACE_VERSION = 3
    timeframe = '15m'
    stoploss = -0.05
    
    # FreqAI 必需配置
    process_only_new_candles = True
    startup_candle_count = 200
    
    def feature_engineering_expand_all(self, dataframe: DataFrame, period: int,
                                       metadata: dict, **kwargs) -> DataFrame:
        """
        高级特征工程 - FreqAI 自动扩展
        特征必须以 % 为前缀
        """
        dataframe["%rsi"] = ta.RSI(dataframe, timeperiod=period)
        dataframe["%mfi"] = ta.MFI(dataframe, timeperiod=period)
        dataframe["%adx"] = ta.ADX(dataframe, timeperiod=period)
        
        # Bollinger Bands
        bollinger = ta.BBANDS(dataframe, timeperiod=period)
        dataframe["%bb_width"] = (bollinger['upperband'] - bollinger['lowerband']) / dataframe['close']
        dataframe["%bb_pct"] = (dataframe['close'] - bollinger['lowerband']) / \
                               (bollinger['upperband'] - bollinger['lowerband'])
        
        return dataframe
    
    def feature_engineering_standard(self, dataframe: DataFrame, **kwargs) -> DataFrame:
        """
        标准特征工程 (不随 period 扩展)
        使用内置 TA-Lib 指标
        """
        # MACD
        macd = ta.MACD(dataframe)
        dataframe["%macd"] = macd["macd"]
        dataframe["%macdsignal"] = macd["macdsignal"]
        dataframe["%macdhist"] = macd["macdhist"]
        
        # RSI
        dataframe["%rsi_14"] = ta.RSI(dataframe, timeperiod=14)
        
        # 成交量变化
        dataframe["%volume_pct_change"] = dataframe["volume"].pct_change()
                
        # 补充时间特征
        dataframe["%day_of_week"] = dataframe["date"].dt.dayofweek
        dataframe["%hour_of_day"] = dataframe["date"].dt.hour
        
        return dataframe
    
    def set_freqai_targets(self, dataframe: DataFrame, metadata: dict, **kwargs) -> DataFrame:
        """
        设置预测目标 - 标签必须以 & 为前缀
        """
        # 预测未来 4 个周期的收益率
        dataframe["&-s_return"] = (
            dataframe["close"].shift(-4) / dataframe["close"] - 1
        )
        return dataframe
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # FreqAI 启动入口
        dataframe = self.freqai.start(dataframe, metadata, self)
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 确保有预测结果
        if '&-s_return_mean' in dataframe.columns:
            dataframe.loc[
                (
                    (dataframe['&-s_return_mean'] > 0.01) &  # 预测收益 > 1%
                    (dataframe['&-s_return_std'] < 0.02) &   # 不确定性低
                    (dataframe['volume'] > 0)
                ),
                'enter_long'] = 1
                
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        if '&-s_return_mean' in dataframe.columns:
            dataframe.loc[
                (
                    dataframe['&-s_return_mean'] < -0.005 # 预测下跌
                ),
                'exit_long'] = 1
        return dataframe
