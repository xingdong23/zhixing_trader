"""
短线技术选股策略模块

基于"钓鱼板研"实战经验总结的6个稳赚战法
适合2-15天的短线交易
"""

from .strategy import ShortTermTechnicalStrategy
from .pattern_detectors import (
    MovingAverageMACDDetector,
    YearLineReboundDetector,
    DoubleBottomDetector,
    GapUpVolumeDetector,
    RoundTopDetector,
    ThreeSunsDetector,
)

__all__ = [
    'ShortTermTechnicalStrategy',
    'MovingAverageMACDDetector',
    'YearLineReboundDetector',
    'DoubleBottomDetector',
    'GapUpVolumeDetector',
    'RoundTopDetector',
    'ThreeSunsDetector',
]

