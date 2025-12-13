from freqtrade.strategy import IStrategy
from pandas import DataFrame
import sys
import os

# 将项目根目录添加到 path 以便导入 ai 模块
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../../'))
if project_root not in sys.path:
    sys.path.append(project_root)

from ai.mining.feature_factory import FeatureFactory

class BaseFreqStrategy(IStrategy):
    """策略基类，集成项目特征工程"""
    
    INTERFACE_VERSION = 3
    timeframe = '15m'
    stoploss = -0.05
    
    startup_candle_count: int = 200  # 预热周期
    
    def __init__(self, config: dict) -> None:
        super().__init__(config)
        self.feature_factory = FeatureFactory()
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """使用项目现有特征工厂生成指标"""
        # 调用现有 FeatureFactory
        if not dataframe.empty:
            features = self.feature_factory.generate_features(dataframe)
            # 将生成的特征合并回 dataframe (确保索引对齐)
            # FeatureFactory 返回的 dataframe 可能索引被重置或与原始 dataframe 不一致
            # 我们假设 generate_features 保持了原始 dataframe 的长度和顺序
            # 更好的做法是 join，但为简单起见，如果 factory 返回的是增强后的 df，直接合并
            
            # 由于 FeatureFactory.generate_features 内部可能会 dropna，我们需要小心对齐
            # 这里我们假设 generate_features 返回包括所有原始列+新特征
            
            # 为了安全，我们只取新列，如果是基于 ta-lib 计算，通常长度一致（除了前面的 NaN）
            for col in features.columns:
                 # 避免重复列
                 if col not in dataframe.columns:
                     dataframe[col] = features[col]
        
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        基于趋势进入 - 子类覆盖
        """
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        基于趋势退出 - 子类覆盖
        """
        return dataframe
