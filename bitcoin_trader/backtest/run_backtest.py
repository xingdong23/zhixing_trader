"""
回测主程序 - 基于配置文件运行回测

使用方法:
    python backtest/run_backtest.py
    python backtest/run_backtest.py --config backtest/configs/backtest_config.json
"""

import os
import sys
import argparse
import logging
import json
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from backtest.core import DataLoader, BacktestEngine, PerformanceAnalyzer
from app.strategies import HighFrequencyScalpingStrategy, IntradayScalpingStrategy, TrendMomentumStrategy
from app.strategies.grid_trading import GridTradingStrategy
from app.strategies.trend_following import TrendFollowingStrategy
from app.strategies.trend_breakout import TrendBreakoutStrategy
from app.strategies.ema_crossover import EMACrossoverStrategy
from app.strategies.bollinger_bands import BollingerBandsStrategy
from app.strategies.ema144_trend import EMA144TrendStrategy
from app.strategies.probability_profit import ProbabilityProfitStrategy
from app.strategies.ema_rsi_volume import EMARSIVolumeStrategy
from app.strategies.compression_expansion import CompressionExpansionStrategy
from app.strategies.ema_simple_trend import EMASimpleTrendStrategy

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/backtest_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class BacktestRunner:
    """回测运行器"""
    
    def __init__(self, config_path: str):
        """
        初始化回测运行器
        
        Args:
            config_path: 回测配置文件路径
        """
        self.config_path = config_path
        self.backtest_dir = Path(__file__).parent
        self.config = self._load_config()
        
    def _load_config(self) -> dict:
        """加载回测配置"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _load_strategy_config(self) -> dict:
        """加载策略配置"""
        strategy_config_path = self.backtest_dir / self.config['strategy']['config_file']
        with open(strategy_config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _prepare_strategy_params(self, strategy_config: dict) -> dict:
        """准备策略参数"""
        params = {}
        
        # 新格式：使用 risk_management 字段（如 ema144_trend）
        if 'risk_management' in strategy_config:
            params.update(strategy_config['risk_management'])
        # 旧格式：使用 trading 字段
        elif 'trading' in strategy_config:
            params.update({
                "total_capital": strategy_config['trading']['capital'],
                "leverage": strategy_config['trading']['leverage'],
            })
        
        # 如果有 parameters 字段，直接使用（新策略格式）
        if 'parameters' in strategy_config:
            params.update(strategy_config['parameters'])
        
        # 合并所有配置组（支持不同策略的不同配置节）
        for section in ['capital_management', 'indicators', 'entry_conditions', 
                       'exit_conditions', 'risk_control', 'special_conditions',
                       'grid_settings', 'trend_indicators', 'stop_loss_take_profit',
                       'daily_risk_controls']:
            if section in strategy_config:
                params.update(strategy_config[section])
        
        # 处理时段过滤
        if 'session_filter' in strategy_config:
            params['session_filter_enabled'] = strategy_config['session_filter'].get('enabled', False)
            params['allowed_sessions'] = strategy_config['session_filter'].get('allowed_sessions', [])
        
        # 处理顺势持有
        if 'trend_following' in strategy_config:
            params['trend_follow_enabled'] = strategy_config['trend_following'].get('enabled', True)
            params['trend_follow_min_profit'] = strategy_config['trend_following'].get('min_profit_to_activate', 0.01)
            params['trailing_atr_multiplier'] = strategy_config['trend_following'].get('trailing_atr_multiplier', 1.2)
            params['use_ema_trailing'] = strategy_config['trend_following'].get('use_ema_trailing', True)
            params['extend_holding_time_on_trend'] = strategy_config['trend_following'].get('extend_holding_time', True)
            params['max_holding_time_trend'] = strategy_config['trend_following'].get('max_holding_time_on_trend', 240)
        
        # 处理保守模式
        if 'conservative_mode' in strategy_config:
            params['conservative_mode'] = strategy_config['conservative_mode'].get('enabled', False)
        
        return params
    
    def _get_output_path(self, template: str) -> str:
        """获取输出文件路径"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = template.replace('{timestamp}', timestamp)
        return str(self.backtest_dir / filename)
    
    def run(self):
        """运行回测"""
        logger.info("="*80)
        logger.info("🚀 回测系统启动")
        logger.info("="*80)
        logger.info(f"回测名称: {self.config['backtest_name']}")
        logger.info(f"描述: {self.config['description']}")
        logger.info(f"配置文件: {self.config_path}")
        logger.info("="*80)
        
        try:
            # 1. 加载策略配置
            logger.info("\n📋 步骤 1/4: 加载策略配置")
            strategy_config = self._load_strategy_config()
            strategy_params = self._prepare_strategy_params(strategy_config)
            
            logger.info(f"✓ 策略配置加载完成")
            logger.info(f"  - 策略: {self.config['strategy']['name']}")
            logger.info(f"  - 初始资金: {self.config['backtest_settings']['initial_capital']} USDT")
            
            # 获取杠杆倍数（兼容新旧格式）
            leverage = strategy_params.get('leverage', 
                       strategy_config.get('trading', {}).get('leverage', 1))
            logger.info(f"  - 杠杆倍数: {leverage}x")
            logger.info(f"  - 保守模式: {'开启' if strategy_params.get('conservative_mode') else '关闭'}")
            logger.info(f"  - 时段过滤: {'开启' if strategy_params.get('session_filter_enabled') else '关闭'}")
            logger.info(f"  - 顺势持有: {'开启' if strategy_params.get('trend_follow_enabled') else '关闭'}")
            
            # 2. 加载历史数据
            logger.info("\n📊 步骤 2/4: 加载历史数据")
            # 数据路径相对于项目根目录
            data_path = self.backtest_dir.parent / self.config['data']['source']
            
            if not data_path.exists():
                raise FileNotFoundError(f"数据文件不存在: {data_path}")
            
            data_loader = DataLoader(str(data_path))
            df_raw = data_loader.load()
            
            # 时间过滤（在重采样之前进行，因为重采样后DataFrame结构会变化）
            if 'start_timestamp' in self.config['data'] or 'end_timestamp' in self.config['data']:
                start_ts = self.config['data'].get('start_timestamp')
                end_ts = self.config['data'].get('end_timestamp')
                
                if start_ts or end_ts:
                    original_count = len(df_raw)
                    if start_ts:
                        df_raw = df_raw[df_raw['open_time'] >= start_ts]
                    if end_ts:
                        df_raw = df_raw[df_raw['open_time'] <= end_ts]
                    filtered_count = len(df_raw)
                    logger.info(f"✓ 时间过滤: {original_count} -> {filtered_count} 根原始K线")
                    # 更新data_loader的df，以便后续重采样使用过滤后的数据
                    data_loader.df = df_raw
            
            # 根据配置重采样
            resample_from = self.config['data']['resample_from']
            timeframe = self.config['data']['timeframe']
            
            if resample_from == timeframe:
                # 不需要重采样
                df_resampled = df_raw
            elif resample_from == '1m' and timeframe == '5m':
                df_resampled = data_loader.resample_to_5m()
            elif resample_from == '5m' and timeframe == '15m':
                df_resampled = data_loader.resample_to_15m()
            elif resample_from == '5m' and timeframe == '30m':
                df_resampled = data_loader.resample_to_30m()
            elif resample_from == '5m' and timeframe == '1h':
                df_resampled = data_loader.resample_to_1h()
            elif resample_from == '5m' and timeframe == '4h':
                df_resampled = data_loader.resample_to_4h()
            elif resample_from == '1h' and timeframe == '1d':
                df_resampled = data_loader.resample_to_1d()
            else:
                logger.warning(f"未知的重采样组合: {resample_from} -> {timeframe}，使用原始数据")
                df_resampled = df_raw
            
            klines = data_loader.to_klines(df_resampled)
            
            start_date, end_date = data_loader.get_date_range()
            logger.info(f"✓ 数据加载完成")
            logger.info(f"  - 数据文件: {data_path.name}")
            logger.info(f"  - 时间范围: {start_date} ~ {end_date}")
            logger.info(f"  - 原始K线: {len(df_raw)} 根 ({self.config['data']['resample_from']})")
            logger.info(f"  - 回测K线: {len(klines)} 根 ({self.config['data']['timeframe']})")
            
            # 3. 初始化策略
            logger.info("\n⚙️  步骤 3/4: 初始化策略")
            
            # 根据策略名称选择对应的策略类
            strategy_name = self.config['strategy']['name']
            strategy_map = {
                'high_frequency': HighFrequencyScalpingStrategy,
                'grid_trading': GridTradingStrategy,
                'trend_following': TrendFollowingStrategy,
                'intraday_scalping': IntradayScalpingStrategy,
                'trend_breakout': TrendBreakoutStrategy,
                'trend_momentum': TrendMomentumStrategy,
                'ema_crossover': EMACrossoverStrategy,
                'bollinger_bands': BollingerBandsStrategy,
                'ema144_trend': EMA144TrendStrategy,
                'probability_profit': ProbabilityProfitStrategy,
                'ema_rsi_volume': EMARSIVolumeStrategy,
                'compression_expansion': CompressionExpansionStrategy,
                'ema_simple_trend': EMASimpleTrendStrategy
            }
            
            if strategy_name not in strategy_map:
                raise ValueError(f"未知的策略名称: {strategy_name}")
            
            StrategyClass = strategy_map[strategy_name]
            strategy = StrategyClass(strategy_params)
            logger.info(f"✓ 策略初始化完成: {strategy.name}")
            
            # 4. 运行回测
            logger.info("\n🔄 步骤 4/4: 运行回测")
            backtest_settings = self.config['backtest_settings']
            engine = BacktestEngine(
                strategy, 
                initial_capital=backtest_settings['initial_capital'],
                taker_fee_rate=backtest_settings.get('taker_fee_rate', 0.0005),
                maker_fee_rate=backtest_settings.get('maker_fee_rate', 0.0002)
            )
            
            result = engine.run(
                klines, 
                window_size=self.config['backtest_settings']['window_size']
            )
            
            # 5. 生成报告
            logger.info("\n📈 生成回测报告")
            PerformanceAnalyzer.print_report(result)
            
            # 6. 保存结果
            if self.config['output']['save_trades']:
                result_path = self._get_output_path(self.config['output']['result_file'])
                PerformanceAnalyzer.save_to_file(result, result_path)
                logger.info(f"✓ 回测结果已保存: {result_path}")
            
            if self.config['output']['save_equity_curve']:
                # 可以在这里添加权益曲线图表生成
                pass
            
            logger.info("\n✅ 回测完成！")
            
            return result
            
        except FileNotFoundError as e:
            logger.error(f"❌ 文件未找到: {e}")
            logger.error("请检查配置文件中的路径设置")
            sys.exit(1)
            
        except Exception as e:
            logger.error(f"❌ 回测失败: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='回测系统 - 基于配置文件运行')
    parser.add_argument(
        '--config', 
        type=str, 
        default='backtest/configs/backtest_config.json',
        help='回测配置文件路径'
    )
    
    args = parser.parse_args()
    
    # 创建必要的目录
    os.makedirs('logs', exist_ok=True)
    os.makedirs('backtest/results', exist_ok=True)
    
    # 运行回测
    runner = BacktestRunner(args.config)
    runner.run()


if __name__ == "__main__":
    main()
