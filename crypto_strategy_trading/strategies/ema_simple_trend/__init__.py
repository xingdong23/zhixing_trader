"""
EMA简单趋势策略 - 多时间框架版本
"""

from .strategy import EMASimpleTrendMultiframeStrategy

# 兼容旧名称
EMASimpleTrendStrategy = EMASimpleTrendMultiframeStrategy

__all__ = ['EMASimpleTrendMultiframeStrategy', 'EMASimpleTrendStrategy']



