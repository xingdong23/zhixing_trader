"""
特征适配器 - 桥接现有 FeatureFactory 到 FreqAI
"""
import sys
import os
import pandas as pd

# 添加项目根目录
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../'))
if project_root not in sys.path:
    sys.path.append(project_root)

from ai.mining.feature_factory import FeatureFactory

class FeatureAdapter:
    """
    将项目现有的 FeatureFactory 输出适配为 FreqAI 格式
    FreqAI 要求特征列以 '%' 为前缀
    """
    
    def __init__(self):
        self.factory = FeatureFactory()
    
    def generate_freqai_features(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        生成 FreqAI 兼容的特征
        """
        # 调用现有特征工厂
        features = self.factory.generate_features(dataframe)
        
        # 添加 % 前缀 (FreqAI 要求)
        renamed_features = {}
        for col in features.columns:
            renamed_features[f"%{col}"] = features[col]
        
        return pd.DataFrame(renamed_features)
