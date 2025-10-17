"""
短线技术选股策略主类

整合6个稳赚战法 + 避坑规则
"""

from typing import Dict, List, Optional
import pandas as pd
from loguru import logger

from .pattern_detectors import (
    MovingAverageMACDDetector,
    YearLineReboundDetector,
    DoubleBottomDetector,
    GapUpVolumeDetector,
    RoundTopDetector,
    ThreeSunsDetector,
    SidewaysVolumeDetector,
)


class ShortTermTechnicalStrategy:
    """
    短线技术选股策略
    
    基于"钓鱼板研"的实战经验
    6个稳赚战法 + 避坑规则
    
    使用方法:
        strategy = ShortTermTechnicalStrategy()
        result = strategy.scan_stock(klines_data)
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        初始化策略
        
        Args:
            config: 配置参数（可选）
        """
        self.config = config or {}
        
        # 初始化所有检测器
        self.buy_detectors = [
            MovingAverageMACDDetector(),      # 战法1
            YearLineReboundDetector(),        # 战法2
            DoubleBottomDetector(),           # 战法3
            GapUpVolumeDetector(),            # 战法4
            ThreeSunsDetector(),              # 战法6
        ]
        
        self.sell_detectors = [
            RoundTopDetector(),               # 战法5（卖出信号）
        ]
        
        self.avoid_detectors = [
            SidewaysVolumeDetector(),         # 避坑规则10
        ]
        
        logger.info(f"短线技术策略初始化完成：{len(self.buy_detectors)}个买入战法，{len(self.sell_detectors)}个卖出战法")
    
    def scan_stock(self, code: str, klines: pd.DataFrame, **kwargs) -> Dict:
        """
        扫描单只股票
        
        Args:
            code: 股票代码
            klines: K线数据
            **kwargs: 其他参数
        
        Returns:
            扫描结果字典
        """
        result = {
            'code': code,
            'signals': [],
            'best_signal': None,
            'avoid': False,
        }
        
        # 1. 先检查避坑规则
        for detector in self.avoid_detectors:
            detection = detector.detect(klines)
            if detection.get('detected'):
                result['avoid'] = True
                result['avoid_reason'] = detection.get('reason')
                logger.warning(f"{code} 触发避坑规则：{detection.get('reason')}")
                return result
        
        # 2. 检查卖出信号
        for detector in self.sell_detectors:
            detection = detector.detect(klines)
            if detection.get('detected'):
                detection['pattern'] = detector.name
                result['signals'].append(detection)
        
        # 3. 检查买入信号
        for detector in self.buy_detectors:
            detection = detector.detect(klines)
            if detection.get('detected'):
                detection['pattern'] = detector.name
                result['signals'].append(detection)
        
        # 4. 选择最佳信号（置信度最高）
        if result['signals']:
            result['best_signal'] = max(result['signals'], key=lambda x: x.get('confidence', 0))
            logger.info(
                f"{code} 检测到{len(result['signals'])}个信号，"
                f"最佳：{result['best_signal']['pattern']} "
                f"({result['best_signal']['signal']}, "
                f"置信度{result['best_signal']['confidence']:.1%})"
            )
        
        return result
    
    def scan_stocks_batch(self, stocks_klines: Dict[str, pd.DataFrame]) -> List[Dict]:
        """
        批量扫描多只股票
        
        Args:
            stocks_klines: {股票代码: K线数据} 字典
        
        Returns:
            扫描结果列表，按置信度排序
        """
        results = []
        
        for code, klines in stocks_klines.items():
            try:
                result = self.scan_stock(code, klines)
                if result['best_signal'] or result['avoid']:
                    results.append(result)
            except Exception as e:
                logger.error(f"扫描{code}失败: {e}")
                continue
        
        # 按置信度排序（买入信号优先）
        buy_signals = [r for r in results if r.get('best_signal') and r['best_signal']['signal'] == 'BUY']
        sell_signals = [r for r in results if r.get('best_signal') and r['best_signal']['signal'] == 'SELL']
        avoid_stocks = [r for r in results if r.get('avoid')]
        
        buy_signals.sort(key=lambda x: x['best_signal']['confidence'], reverse=True)
        sell_signals.sort(key=lambda x: x['best_signal']['confidence'], reverse=True)
        
        logger.info(
            f"批量扫描完成：{len(stocks_klines)}只股票，"
            f"买入信号{len(buy_signals)}个，卖出信号{len(sell_signals)}个，避坑{len(avoid_stocks)}个"
        )
        
        return {
            'buy_signals': buy_signals,
            'sell_signals': sell_signals,
            'avoid_stocks': avoid_stocks,
            'summary': {
                'total_scanned': len(stocks_klines),
                'total_buy': len(buy_signals),
                'total_sell': len(sell_signals),
                'total_avoid': len(avoid_stocks),
            }
        }
    
    def get_top_picks(self, scan_result: Dict, top_n: int = 10) -> List[Dict]:
        """
        获取Top N推荐股票
        
        Args:
            scan_result: scan_stocks_batch的结果
            top_n: 返回前N个
        
        Returns:
            Top N股票列表
        """
        buy_signals = scan_result.get('buy_signals', [])
        return buy_signals[:top_n]
    
    def format_signal_report(self, result: Dict) -> str:
        """
        格式化信号报告
        
        Args:
            result: scan_stock的结果
        
        Returns:
            格式化的报告字符串
        """
        lines = []
        lines.append(f"\n{'='*60}")
        lines.append(f"股票: {result['code']}")
        lines.append(f"{'='*60}")
        
        if result.get('avoid'):
            lines.append(f"⚠️  避坑提示: {result['avoid_reason']}")
            lines.append(f"{'='*60}")
            return '\n'.join(lines)
        
        if not result.get('best_signal'):
            lines.append("未检测到交易信号")
            lines.append(f"{'='*60}")
            return '\n'.join(lines)
        
        signal = result['best_signal']
        
        # 信号类型
        signal_icon = {
            'BUY': '🟢',
            'SELL': '🔴',
            'HOLD': '🟡',
        }.get(signal['signal'], '⚪')
        
        lines.append(f"\n{signal_icon} 信号类型: {signal['signal']}")
        lines.append(f"📊 形态: {signal['pattern']}")
        lines.append(f"💪 置信度: {signal['confidence']:.1%}")
        lines.append(f"📝 原因: {signal['reason']}")
        
        lines.append(f"\n交易参数:")
        lines.append(f"  入场价: ${signal['entry_price']:.2f}")
        if signal.get('stop_loss'):
            lines.append(f"  止损价: ${signal['stop_loss']:.2f} ({(signal['stop_loss']/signal['entry_price']-1)*100:+.1f}%)")
        if signal.get('take_profit'):
            lines.append(f"  止盈价: ${signal['take_profit']:.2f} ({(signal['take_profit']/signal['entry_price']-1)*100:+.1f}%)")
        if signal.get('hold_days'):
            lines.append(f"  持有天数: {signal['hold_days']}天")
        
        if signal.get('details'):
            lines.append(f"\n详细数据:")
            for key, value in signal['details'].items():
                lines.append(f"  {key}: {value}")
        
        lines.append(f"{'='*60}\n")
        
        return '\n'.join(lines)

