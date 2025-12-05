"""
Martingale Sniper 马丁狙击手策略 - 单币种版本

专注单一币种（如DOGE），不扫描全市场，降低风险和延迟

核心逻辑:
- 监控指定币种的爆发行情
- 马丁格尔加倍下注（亏了翻倍，赢一次回本）
- 逐仓模式，强平只亏当次下注

下注序列: 10U → 20U → 40U → 80U → 150U (共300U)
"""

from typing import Dict, Any, Optional
import pandas as pd
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """持仓信息"""
    symbol: str
    entry_price: float
    amount: float
    entry_time: datetime
    bet_amount: float
    martingale_level: int


class MartingaleSniperSingleStrategy:
    """
    马丁狙击手策略 - 单币种版本
    """
    
    MARTINGALE_SEQUENCE = [10, 20, 40, 80, 150]
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Martingale_Sniper_Single"
        self.parameters = parameters
        
        # 指定交易币种
        self.symbol = parameters.get('symbol', 'DOGE/USDT:USDT')
        
        # 资金管理
        self.total_capital = float(parameters.get('total_capital', 300.0))
        self.leverage = int(parameters.get('leverage', 5))  # 默认5倍安全杠杆
        
        # 止盈止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.15))
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.10))
        
        # 爆发信号阈值
        self.explosion_threshold = float(parameters.get('z', 0.025))  # 2.5%
        self.volume_spike_ratio = float(parameters.get('volume_spike_ratio', 4.0))
        
        # 风控 (强制安全约束)
        self.cooldown_minutes = int(parameters.get('cooldown_minutes', 5))
        self.max_daily_rounds = int(parameters.get('max_daily_rounds', 10))
        
        # 仿真参数
        self.fee_rate = float(parameters.get('fee_rate', 0.0005)) # 0.05%
        self.slippage = float(parameters.get('slippage', 0.0005)) # 0.05%

        # 0. 允许自定义下注序列 (用于因子挖掘)
        self.MARTINGALE_SEQUENCE = parameters.get('martingale_sequence', [1, 2, 4, 8, 16])
        
        # 3. 记录初始本金
        self.initial_capital = self.total_capital
        
        # 状态
        self.current_position: Optional[Position] = None
        self.martingale_level = 0
        self.current_capital = self.total_capital
        
        # 冷却
        self.cooldown_until: Optional[datetime] = None
        self.last_trade_date = None
        self.daily_rounds = 0
        
        # 统计
        self.total_rounds = 0
        self.rounds_won = 0
        self.rounds_lost = 0
        self.total_trades = 0
        
        # 计算强平线
        self.liquidation_pct = (1 / self.leverage) * 0.95
        
        logger.info("=" * 60)
        logger.info(f"🎯 {self.name} 初始化")
        logger.info(f"   交易币种: {self.symbol}")
        logger.info(f"   本金: {self.total_capital}U")
        logger.info(f"   下注序列: {self.MARTINGALE_SEQUENCE}")
        logger.info(f"   杠杆: {self.leverage}x (强平线: {self.liquidation_pct*100:.1f}%)")
        logger.info(f"   止盈: +{self.take_profit_pct*100}%")
        logger.info(f"   止损: -{self.stop_loss_pct*100}%")
        logger.info(f"   爆发阈值: {self.explosion_threshold*100}%")
        logger.info("=" * 60)
    
    def get_current_bet(self) -> float:
        """获取当前应该下注的金额"""
        if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
            return 0
        return self.MARTINGALE_SEQUENCE[self.martingale_level]
    
    def analyze(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        分析K线数据，返回交易信号
        
        Args:
            df: K线数据，需要有 close, volume 列
        
        Returns:
            信号字典 或 None
        """
        now = datetime.now()
        
        # 如果有持仓，不开新仓
        if self.current_position is not None:
            return None
        
        # 检查冷却期
        if self.cooldown_until and now < self.cooldown_until:
            return None
        
        # 检查每日轮次
        self._check_daily_reset(now)
        if self.daily_rounds >= self.max_daily_rounds:
            return None
        
        # 检查资金
        bet = self.get_current_bet()
        if bet == 0 or self.current_capital < bet:
            # logger.warning(f"💀 资金不足: {self.current_capital:.2f}U < {bet}U")
            # For optimization, we can just return None, the runner handles bust detection
            return None
            
        # 检测爆发信号
        return self._detect_explosion(df, now)
    
    def _detect_explosion(self, df: pd.DataFrame, now: datetime) -> Optional[Dict]:
        """检测爆发信号"""
        if len(df) < 3:
            return None
        
        current = df.iloc[-1]
        prev = df.iloc[-2]
        price = float(current['close'])
        prev_price = float(prev['close'])
        
        # 计算涨幅
        change = (price - prev_price) / prev_price
        
        # 计算成交量变化
        vol_ratio = float(current['volume']) / float(prev['volume']) if float(prev['volume']) > 0 else 0
        
        # 信号判断
        is_explosion = False
        reason = ""
        
        # 条件1: 涨幅超过阈值
        if change >= self.explosion_threshold:
            is_explosion = True
            reason = f"涨幅+{change*100:.2f}%"
        
        # 条件2: 量价齐飞
        elif vol_ratio >= self.volume_spike_ratio and change > 0.015:
            is_explosion = True
            reason = f"量价齐飞 Vol×{vol_ratio:.1f} +{change*100:.2f}%"
        
        if not is_explosion:
            return None
        
        # 构建信号
        bet = self.get_current_bet()
        amount = (bet * self.leverage) / price
        
        return {
            'symbol': self.symbol,
            'signal': 'buy',
            'price': price,
            'amount': amount,
            'bet_amount': bet,
            'leverage': self.leverage,
            'timestamp': now,
            'reason': reason,
            'martingale_level': self.martingale_level,
            'stop_loss': price * (1 - self.stop_loss_pct),
            'take_profit': price * (1 + self.take_profit_pct)
        }
    
    def check_position(self, current_price: float, now: datetime = None) -> Optional[Dict]:
        """检查持仓，返回平仓信号"""
        if self.current_position is None:
            return None
        
        if now is None:
            now = datetime.now()
        
        pos = self.current_position
        pnl_pct = (current_price - pos.entry_price) / pos.entry_price
        
        # 止盈
        if pnl_pct >= self.take_profit_pct:
            return {
                'symbol': pos.symbol,
                'signal': 'close',
                'price': current_price,
                'timestamp': now,
                'reason': 'take_profit',
                'pnl_pct': pnl_pct,
                'is_win': True
            }
        
        # 止损
        if pnl_pct <= -self.stop_loss_pct:
            return {
                'symbol': pos.symbol,
                'signal': 'close',
                'price': current_price,
                'timestamp': now,
                'reason': 'stop_loss',
                'pnl_pct': pnl_pct,
                'is_win': False
            }
        
        # 强平检查（逐仓模式下只亏当次下注）
        if pnl_pct <= -self.liquidation_pct:
            return {
                'symbol': pos.symbol,
                'signal': 'close',
                'price': current_price,
                'timestamp': now,
                'reason': 'liquidation',
                'pnl_pct': -1.0,  # 强平亏100%本金
                'is_win': False
            }
        
        return None
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓"""
        if signal['signal'] == 'buy':
            self._open_position(signal)
        elif signal['signal'] == 'close':
            self._close_position(signal)
    
    def _open_position(self, signal: Dict):
        """开仓"""
        self.current_position = Position(
            symbol=signal['symbol'],
            entry_price=signal['price'],
            amount=signal['amount'],
            entry_time=signal['timestamp'],
            bet_amount=signal['bet_amount'],
            martingale_level=self.martingale_level
        )
        self.total_trades += 1
        
        logger.info("=" * 50)
        logger.info(f"🎯 马丁L{self.martingale_level + 1} 开仓 {self.symbol}")
        logger.info(f"   价格: {signal['price']:.6f}")
        logger.info(f"   下注: {signal['bet_amount']}U × {self.leverage}x")
        logger.info(f"   原因: {signal['reason']}")
        logger.info(f"   止盈: {signal['take_profit']:.6f} (+{self.take_profit_pct*100}%)")
        logger.info(f"   止损: {signal['stop_loss']:.6f} (-{self.stop_loss_pct*100}%)")
        logger.info("=" * 50)
    
    def _close_position(self, signal: Dict):
        """平仓"""
        pos = self.current_position
        pnl_pct = signal['pnl_pct']
        
        # 计算真实盈亏 (考虑滑点和手续费)
        # 进场成本: entry_price * (1 + slippage)
        # 出场价格: current_price * (1 - slippage)
        # 手续费: 开仓费 + 平仓费 (基于名义价值)
        
        entry_price_real = pos.entry_price * (1 + self.slippage)
        exit_price_real = signal['price'] * (1 - self.slippage)
        
        # 名义价值
        position_value = pos.amount * pos.entry_price # 约等于 bet_amount * leverage
        
        # 手续费 (开仓 + 平仓)
        total_fees = position_value * self.fee_rate + (pos.amount * exit_price_real) * self.fee_rate
        
        if signal['reason'] == 'liquidation':
            # 强平：亏损全部下注金额 (不扣手续费了，因为保证金没了)
            pnl_amount = -pos.bet_amount
        else:
            # 原始盈亏
            raw_pnl = (exit_price_real - entry_price_real) * pos.amount
            pnl_amount = raw_pnl - total_fees
            
            # 最多亏本金
            if pnl_amount < -pos.bet_amount:
                pnl_amount = -pos.bet_amount
        
        self.current_capital += pnl_amount
        
        # 更新 signal 中的 pnl 以便记录
        signal['realized_pnl'] = pnl_amount
        
        if pnl_amount > 0:
            # 赢了，重置马丁层级
            logger.info("=" * 50)
            logger.info(f"🎉 马丁L{self.martingale_level + 1} 止盈!")
            logger.info(f"   盈利: +{pnl_amount:.2f}U")
            logger.info(f"   资金: {self.current_capital:.2f}U")
            logger.info("=" * 50)
            
            self.rounds_won += 1
            self.total_rounds += 1
            self.martingale_level = 0
            self.daily_rounds += 1
        else:
            # 输了，进入下一层马丁
            logger.info("=" * 50)
            logger.info(f"❌ 马丁L{self.martingale_level + 1} {signal['reason']}")
            logger.info(f"   亏损: {pnl_amount:.2f}U")
            logger.info(f"   资金: {self.current_capital:.2f}U")
            
            self.martingale_level += 1
            
            if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
                logger.info(f"💀 马丁爆仓! 本轮结束")
                self.rounds_lost += 1
                self.total_rounds += 1
                self.martingale_level = 0
                self.daily_rounds += 1
            else:
                next_bet = self.get_current_bet()
                logger.info(f"   下一层: L{self.martingale_level + 1} 下注{next_bet}U")
                self.cooldown_until = signal['timestamp'] + timedelta(minutes=self.cooldown_minutes)
            
            logger.info("=" * 50)
        
        self.current_position = None
    
    def _check_daily_reset(self, now: datetime):
        """每日重置"""
        current_date = now.date()
        if self.last_trade_date != current_date:
            self.daily_rounds = 0
            self.last_trade_date = current_date
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计"""
        return {
            'symbol': self.symbol,
            'total_capital': self.total_capital,
            'current_capital': self.current_capital,
            'return_pct': (self.current_capital / self.total_capital - 1) * 100,
            'total_rounds': self.total_rounds,
            'rounds_won': self.rounds_won,
            'rounds_lost': self.rounds_lost,
            'win_rate': self.rounds_won / self.total_rounds * 100 if self.total_rounds > 0 else 0,
            'martingale_level': self.martingale_level,
            'current_bet': self.get_current_bet(),
            'has_position': self.current_position is not None
        }
    
    def is_game_over(self) -> bool:
        """检查游戏是否结束"""
        return self.current_capital < self.MARTINGALE_SEQUENCE[0]
