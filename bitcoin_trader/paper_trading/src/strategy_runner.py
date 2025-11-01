"""
策略执行器
"""
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
import pandas as pd
import numpy as np

# 添加app路径
app_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(app_path))

from app.strategies.ema_simple_trend import EMASimpleTrendMultiframeStrategy
from config import Config
from database import get_db
from okx_connector import get_okx
from paper_engine import get_engine
import logging

logger = logging.getLogger(__name__)


class StrategyRunner:
    """策略执行器"""
    
    def __init__(self):
        self.db = get_db()
        self.okx = get_okx()
        self.engine = get_engine()
        self.symbol = Config.SYMBOL
        
        # 加载策略配置
        self.strategy = self._load_strategy()
        
        logger.info("✅ 策略执行器初始化成功")
    
    def _load_strategy(self) -> EMASimpleTrendMultiframeStrategy:
        """加载策略"""
        try:
            config_path = Path(__file__).parent.parent.parent / Config.STRATEGY_CONFIG
            
            with open(config_path, 'r') as f:
                strategy_config = json.load(f)
            
            # 创建策略实例
            strategy = EMASimpleTrendMultiframeStrategy(
                strategy_config['capital_management']
            )
            
            logger.info(f"✅ 加载策略: {strategy.name}")
            return strategy
            
        except Exception as e:
            logger.error(f"❌ 加载策略失败: {e}")
            raise
    
    def _convert_okx_klines_to_strategy_format(self, klines: List[Dict]) -> List[Dict]:
        """将欧易K线转换为策略所需格式"""
        converted = []
        for k in klines:
            converted.append({
                'open_time': k['timestamp'],
                'open': k['open'],
                'high': k['high'],
                'low': k['low'],
                'close': k['close'],
                'volume': k['volume'],
                'timestamp': k['datetime']
            })
        return converted
    
    def run_strategy(self) -> Dict:
        """
        运行策略分析
        
        Returns:
            交易信号
        """
        try:
            logger.info("=" * 60)
            logger.info("开始策略分析")
            logger.info("=" * 60)
            
            # 1. 获取1小时K线数据
            klines_1h = self.okx.get_klines(self.symbol, '1H', 100)
            if not klines_1h:
                logger.error("❌ 获取1小时K线失败")
                return {'signal': 'hold', 'reason': '获取K线失败'}
            
            logger.info(f"✅ 获取1小时K线: {len(klines_1h)}条")
            
            # 2. 获取日线K线数据
            klines_1d = self.okx.get_klines(self.symbol, '1D', 50)
            if not klines_1d:
                logger.error("❌ 获取日线K线失败")
                return {'signal': 'hold', 'reason': '获取日线失败'}
            
            logger.info(f"✅ 获取日线K线: {len(klines_1d)}条")
            
            # 3. 转换格式
            klines_1h_converted = self._convert_okx_klines_to_strategy_format(klines_1h)
            
            # 4. 运行策略分析
            signal = self.strategy.analyze(klines_1h_converted)
            
            current_price = klines_1h[-1]['close']
            
            logger.info(f"策略分析结果: {signal['signal']} - {signal.get('reason', '')}")
            logger.info(f"当前价格: {current_price:.2f}")
            
            # 5. 保存信号到数据库
            if signal['signal'] != 'hold':
                signal_data = {
                    'timestamp': datetime.now(),
                    'symbol': self.symbol,
                    'signal_type': signal['signal'].upper(),
                    'side': signal.get('side'),
                    'price': current_price,
                    'amount': signal.get('amount'),
                    'reason': signal.get('reason'),
                    'daily_trend': None,  # 可以从策略中获取
                    'ema_fast': None,
                    'ema_medium': None,
                    'ema_slow': None,
                    'executed': False
                }
                
                signal_id = self.db.save_signal(signal_data)
                signal['signal_id'] = signal_id
                logger.info(f"✅ 信号已保存到数据库: ID={signal_id}")
            
            return signal
            
        except Exception as e:
            logger.error(f"❌ 运行策略失败: {e}", exc_info=True)
            return {'signal': 'hold', 'reason': f'策略运行失败: {e}'}
    
    def execute_signal(self, signal: Dict) -> bool:
        """
        执行信号
        
        Args:
            signal: 交易信号
        
        Returns:
            是否执行成功
        """
        try:
            # 获取当前价格
            current_price = self.okx.get_current_price(self.symbol)
            if not current_price:
                logger.error("❌ 获取当前价格失败")
                return False
            
            # 执行信号
            success = self.engine.execute_signal(signal, current_price)
            
            # 标记信号已执行
            if success and signal.get('signal_id'):
                self.db.update_signal_executed(signal['signal_id'])
            
            return success
            
        except Exception as e:
            logger.error(f"❌ 执行信号失败: {e}")
            return False
    
    def check_positions(self) -> bool:
        """
        检查持仓状态
        
        Returns:
            是否有平仓操作
        """
        try:
            # 获取当前价格
            current_price = self.okx.get_current_price(self.symbol)
            if not current_price:
                return False
            
            # 检查持仓
            close_signal = self.engine.check_position(current_price)
            
            if close_signal:
                # 执行平仓
                return self.engine.execute_signal(close_signal, current_price)
            
            return False
            
        except Exception as e:
            logger.error(f"❌ 检查持仓失败: {e}")
            return False


# 单例模式
_runner_instance = None

def get_runner() -> StrategyRunner:
    """获取策略执行器实例"""
    global _runner_instance
    if _runner_instance is None:
        _runner_instance = StrategyRunner()
    return _runner_instance
