from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta
import numpy as np
import logging

logger = logging.getLogger(__name__)

class FreqAIStrategy(IStrategy):
    """FreqAI 趋势捕捉策略 - 优化版"""
    
    INTERFACE_VERSION = 3
    timeframe = '1h'
    stoploss = -0.03  # 收紧止损到 3%
    
    # 移动止损：盈利 5% 后启用 2% 回撤止损 (更宽松)
    trailing_stop = True
    trailing_stop_positive = 0.02
    trailing_stop_positive_offset = 0.05
    trailing_only_offset_is_reached = True
    
    # FreqAI 必需配置
    process_only_new_candles = True
    startup_candle_count = 300  # 增加启动 K 线数量以计算更长周期指标
    
    def feature_engineering_expand_all(self, dataframe: DataFrame, period: int,
                                       metadata: dict, **kwargs) -> DataFrame:
        """
        高级特征工程 - FreqAI 自动扩展
        特征必须以 % 为前缀
        """
        # 动量指标
        dataframe["%rsi"] = ta.RSI(dataframe, timeperiod=period)
        dataframe["%mfi"] = ta.MFI(dataframe, timeperiod=period)
        dataframe["%adx"] = ta.ADX(dataframe, timeperiod=period)
        dataframe["%cci"] = ta.CCI(dataframe, timeperiod=period)
        dataframe["%mom"] = ta.MOM(dataframe, timeperiod=period)
        dataframe["%roc"] = ta.ROC(dataframe, timeperiod=period)
        
        # Bollinger Bands
        bollinger = ta.BBANDS(dataframe, timeperiod=period)
        dataframe["%bb_width"] = (bollinger['upperband'] - bollinger['lowerband']) / dataframe['close']
        dataframe["%bb_pct"] = (dataframe['close'] - bollinger['lowerband']) / \
                               (bollinger['upperband'] - bollinger['lowerband'] + 1e-10)
        
        # ATR 波动率
        dataframe["%atr"] = ta.ATR(dataframe, timeperiod=period) / dataframe['close']
        
        return dataframe
    
    def feature_engineering_standard(self, dataframe: DataFrame, **kwargs) -> DataFrame:
        """
        标准特征工程 - 趋势特征增强版
        """
        # ===== 趋势指标 =====
        # EMA 均线系统
        dataframe["%ema_12"] = ta.EMA(dataframe, timeperiod=12) / dataframe['close'] - 1
        dataframe["%ema_26"] = ta.EMA(dataframe, timeperiod=26) / dataframe['close'] - 1
        dataframe["%ema_50"] = ta.EMA(dataframe, timeperiod=50) / dataframe['close'] - 1
        dataframe["%ema_200"] = ta.EMA(dataframe, timeperiod=200) / dataframe['close'] - 1
        
        # EMA 交叉信号
        ema_12 = ta.EMA(dataframe, timeperiod=12)
        ema_26 = ta.EMA(dataframe, timeperiod=26)
        ema_50 = ta.EMA(dataframe, timeperiod=50)
        dataframe["%ema_12_26_cross"] = (ema_12 - ema_26) / dataframe['close']
        dataframe["%ema_26_50_cross"] = (ema_26 - ema_50) / dataframe['close']
        
        # ===== MACD =====
        macd = ta.MACD(dataframe)
        dataframe["%macd"] = macd["macd"] / dataframe['close']
        dataframe["%macdsignal"] = macd["macdsignal"] / dataframe['close']
        dataframe["%macdhist"] = macd["macdhist"] / dataframe['close']
        
        # ===== ADX 趋势强度 =====
        dataframe["%adx_14"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["%plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["%minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["%di_diff"] = (dataframe["%plus_di"] - dataframe["%minus_di"]) / 100
        
        # ===== RSI =====
        dataframe["%rsi_14"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["%rsi_7"] = ta.RSI(dataframe, timeperiod=7)
        
        # ===== 价格动量 =====
        dataframe["%return_1h"] = dataframe["close"].pct_change(1)
        dataframe["%return_4h"] = dataframe["close"].pct_change(4)
        dataframe["%return_12h"] = dataframe["close"].pct_change(12)
        dataframe["%return_24h"] = dataframe["close"].pct_change(24)
        
        # ===== 波动率 =====
        dataframe["%volatility_12h"] = dataframe["close"].pct_change().rolling(12).std()
        dataframe["%volatility_24h"] = dataframe["close"].pct_change().rolling(24).std()
        
        # ===== 成交量 =====
        dataframe["%volume_pct_change"] = dataframe["volume"].pct_change()
        dataframe["%volume_ma_ratio"] = dataframe["volume"] / dataframe["volume"].rolling(20).mean()
        
        # ===== 时间特征 =====
        dataframe["%day_of_week"] = dataframe["date"].dt.dayofweek
        dataframe["%hour_of_day"] = dataframe["date"].dt.hour
        
        # ===== 趋势状态 (用于回测辅助) =====
        # 保存 ADX 和 EMA 状态供入场过滤使用
        dataframe["adx_value"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["ema_bullish"] = (ema_12 > ema_26).astype(int)
        
        return dataframe
    
    def set_freqai_targets(self, dataframe: DataFrame, metadata: dict, **kwargs) -> DataFrame:
        """
        设置预测目标 - 延长到 12 小时 (12 个 1h K 线)
        """
        # 预测未来 12 个周期的收益率
        dataframe["&-s_return"] = (
            dataframe["close"].shift(-12) / dataframe["close"] - 1
        )
        return dataframe
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # FreqAI 启动入口
        dataframe = self.freqai.start(dataframe, metadata, self)
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 确保有预测结果
        if '&-s_return_mean' in dataframe.columns:
            # Debug: 打印预测值范围
            pred_mean = dataframe['&-s_return_mean'].dropna()
            pred_std = dataframe['&-s_return_std'].dropna() if '&-s_return_std' in dataframe.columns else None
            if len(pred_mean) > 0:
                logger.info(f"[DEBUG] Predictions for {metadata['pair']}: mean range [{pred_mean.min():.4f}, {pred_mean.max():.4f}], avg={pred_mean.mean():.4f}")
                if pred_std is not None and len(pred_std) > 0:
                    logger.info(f"[DEBUG] Prediction std range [{pred_std.min():.4f}, {pred_std.max():.4f}]")
            
            # ===== 纯趋势跟踪入场 =====
            # 条件：
            # 1. 预测为正 (任意正收益)
            # 2. ADX > 25 (趋势强劲)
            # 3. EMA 多头排列 (12 > 26)
            dataframe.loc[
                (
                    (dataframe['&-s_return_mean'] > 0) &       # 预测为正 (无阈值)
                    (dataframe['adx_value'] > 25) &            # 趋势强劲
                    (dataframe['ema_bullish'] == 1) &          # EMA 多头
                    (dataframe['volume'] > 0)
                ),
                'enter_long'] = 1
            
            # 移除激进入场 - 只保留趋势确认入场
                
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        if '&-s_return_mean' in dataframe.columns:
            # ===== 预测转空出场 =====
            dataframe.loc[
                (
                    (dataframe['&-s_return_mean'] < -0.003) |  # 预测下跌 > 0.3%
                    (
                        (dataframe['&-s_return_mean'] < 0) &   # 预测转负
                        (dataframe['ema_bullish'] == 0)         # 且 EMA 转空头
                    )
                ),
                'exit_long'] = 1
        return dataframe
