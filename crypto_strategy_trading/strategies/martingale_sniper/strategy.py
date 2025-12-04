"""
Martingale Sniper 马丁狙击手策略

核心逻辑:
- 狙击真正的爆发行情（5分钟涨5%+）
- 马丁格尔加倍下注（亏了翻倍，赢一次回本）
- 高杠杆高风险高回报

下注序列: 10U → 20U → 40U → 80U → 150U
杠杆: 20倍
止盈: +15%（杠杆后实际+300%）
止损: -8%（杠杆后实际-160%，但最多亏本金）

目标: 短时间翻倍
风险: 可能归零（连亏5次概率约11%）
"""

from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """持仓信息"""
    symbol: str
    side: str
    entry_price: float
    amount: float
    entry_time: datetime
    bet_amount: float
    martingale_level: int


class MartingaleSniperStrategy:
    """
    马丁狙击手策略
    
    爆发狙击 + 马丁格尔
    """
    
    # 马丁格尔下注序列
    MARTINGALE_SEQUENCE = [10, 20, 40, 80, 150]  # 总计300U
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Martingale_Sniper"
        self.parameters = parameters
        
        # 资金管理
        self.total_capital = float(parameters.get('total_capital', 300.0))
        self.base_bet = float(parameters.get('base_bet', 10.0))
        self.max_martingale_level = int(parameters.get('max_martingale_level', 5))
        self.leverage = int(parameters.get('leverage', 20))
        
        # 止盈止损（价格变动百分比，非杠杆后）
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.15))  # 15%
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.08))      # 8%
        
        # 爆发信号阈值
        self.explosion_threshold_5m = float(parameters.get('explosion_threshold_5m', 0.05))  # 5分钟涨5%
        self.explosion_threshold_1m = float(parameters.get('explosion_threshold_1m', 0.03))  # 1分钟涨3%
        self.volume_spike_ratio = float(parameters.get('volume_spike_ratio', 5.0))  # 成交量5倍
        
        # 过滤条件
        self.min_volume_24h_usdt = float(parameters.get('min_volume_24h_usdt', 1000000))
        self.max_already_pumped_pct = float(parameters.get('max_already_pumped_pct', 0.15))
        
        # 风控
        self.cooldown_after_loss_minutes = int(parameters.get('cooldown_after_loss_minutes', 5))
        self.max_daily_rounds = int(parameters.get('max_daily_rounds', 10))
        
        # 状态
        self.current_position: Optional[Position] = None
        self.martingale_level = 0  # 当前马丁层级 0-4
        self.current_capital = self.total_capital
        
        # 冷却
        self.cooldown_until: Optional[datetime] = None
        self.last_trade_date: Optional[datetime] = None
        self.daily_rounds = 0
        
        # 统计
        self.total_rounds = 0  # 一轮 = 从level 0开始到赢或归零
        self.rounds_won = 0
        self.rounds_lost = 0
        self.total_trades = 0
        self.peak_capital = self.total_capital
        
        logger.info("=" * 60)
        logger.info(f"🎯 {self.name} 初始化")
        logger.info(f"   本金: {self.total_capital}U")
        logger.info(f"   下注序列: {self.MARTINGALE_SEQUENCE}")
        logger.info(f"   杠杆: {self.leverage}x")
        logger.info(f"   止盈: +{self.take_profit_pct*100}% (杠杆后 +{self.take_profit_pct*self.leverage*100}%)")
        logger.info(f"   止损: -{self.stop_loss_pct*100}% (杠杆后 -{self.stop_loss_pct*self.leverage*100}%)")
        logger.info(f"   爆发阈值: 5m>{self.explosion_threshold_5m*100}% | 1m>{self.explosion_threshold_1m*100}%")
        logger.info("=" * 60)
    
    def get_current_bet(self) -> float:
        """获取当前应该下注的金额"""
        if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
            return 0  # 已经爆仓
        return self.MARTINGALE_SEQUENCE[self.martingale_level]
    
    def get_total_invested(self) -> float:
        """获取当前轮次已投入的总金额"""
        return sum(self.MARTINGALE_SEQUENCE[:self.martingale_level])
    
    def scan_market(self, market_data: Dict[str, pd.DataFrame], tickers: Dict[str, Dict]) -> Optional[Dict]:
        """
        扫描市场，寻找爆发信号
        
        只返回一个最强信号（不同时开多个仓位）
        """
        now = datetime.now()
        
        # 检查是否有持仓
        if self.current_position is not None:
            return None
        
        # 检查冷却期
        if self.cooldown_until and now < self.cooldown_until:
            return None
        
        # 检查每日轮次限制
        self._check_daily_reset(now)
        if self.daily_rounds >= self.max_daily_rounds:
            logger.warning(f"⛔ 今日已交易 {self.daily_rounds} 轮，停止")
            return None
        
        # 检查剩余资金
        current_bet = self.get_current_bet()
        if current_bet == 0 or self.current_capital < current_bet:
            logger.warning(f"💀 资金不足: {self.current_capital:.2f}U < {current_bet}U")
            return None
        
        # 扫描所有币种，找最强信号
        best_signal = None
        best_score = 0
        
        for symbol, df in market_data.items():
            # 过滤低成交量
            ticker = tickers.get(symbol, {})
            volume_24h = ticker.get('quoteVolume', 0) or 0
            if volume_24h < self.min_volume_24h_usdt:
                continue
            
            # 检测爆发
            signal = self._detect_explosion(symbol, df, ticker, now)
            if signal and signal['score'] > best_score:
                best_signal = signal
                best_score = signal['score']
        
        return best_signal
    
    def _detect_explosion(self, symbol: str, df: pd.DataFrame, ticker: Dict, now: datetime) -> Optional[Dict]:
        """检测爆发信号"""
        if len(df) < 6:
            return None
        
        current = df.iloc[-1]
        price = float(current['close'])
        
        # 计算涨幅
        # 1分钟涨幅
        prev_1 = df.iloc[-2]
        change_1m = (price - float(prev_1['close'])) / float(prev_1['close'])
        
        # 5分钟涨幅（5根1分钟K线 或 1根5分钟K线）
        if len(df) >= 6:
            prev_5 = df.iloc[-6]
            change_5m = (price - float(prev_5['close'])) / float(prev_5['close'])
        else:
            change_5m = change_1m
        
        # 成交量变化
        vol_ratio = float(current['volume']) / float(prev_1['volume']) if float(prev_1['volume']) > 0 else 0
        
        # 24h涨幅检查
        change_24h = ticker.get('percentage', 0) or 0
        change_24h = change_24h / 100 if abs(change_24h) > 1 else change_24h
        if change_24h > self.max_already_pumped_pct:
            return None
        
        # 计算信号强度得分
        score = 0
        reasons = []
        
        # 5分钟爆发 (最重要)
        if change_5m >= self.explosion_threshold_5m:
            score += 50
            reasons.append(f"5m+{change_5m*100:.1f}%")
        
        # 1分钟闪涨
        if change_1m >= self.explosion_threshold_1m:
            score += 30
            reasons.append(f"1m+{change_1m*100:.1f}%")
        
        # 成交量暴增
        if vol_ratio >= self.volume_spike_ratio:
            score += 20
            reasons.append(f"Vol×{vol_ratio:.1f}")
        
        # 必须至少满足一个主要条件
        if score < 30:
            return None
        
        # 计算仓位
        bet = self.get_current_bet()
        amount = (bet * self.leverage) / price
        
        return {
            'symbol': symbol,
            'signal': 'buy',
            'price': price,
            'amount': amount,
            'bet_amount': bet,
            'leverage': self.leverage,
            'timestamp': now,
            'reason': ' | '.join(reasons),
            'score': score,
            'change_1m': change_1m,
            'change_5m': change_5m,
            'vol_ratio': vol_ratio,
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
            side='long',
            entry_price=signal['price'],
            amount=signal['amount'],
            entry_time=signal['timestamp'],
            bet_amount=signal['bet_amount'],
            martingale_level=self.martingale_level
        )
        self.total_trades += 1
        
        total_invested = self.get_total_invested() + signal['bet_amount']
        
        logger.info("=" * 60)
        logger.info(f"🎯 马丁第 {self.martingale_level + 1} 层开仓")
        logger.info(f"   币种: {signal['symbol']}")
        logger.info(f"   价格: {signal['price']:.6f}")
        logger.info(f"   下注: {signal['bet_amount']}U × {self.leverage}x = {signal['bet_amount']*self.leverage}U")
        logger.info(f"   信号: {signal['reason']}")
        logger.info(f"   止盈: {signal['take_profit']:.6f} (+{self.take_profit_pct*100}%)")
        logger.info(f"   止损: {signal['stop_loss']:.6f} (-{self.stop_loss_pct*100}%)")
        logger.info(f"   本轮已投入: {total_invested}U")
        logger.info("=" * 60)
    
    def _close_position(self, signal: Dict):
        """平仓"""
        pos = self.current_position
        pnl_pct = signal['pnl_pct']
        pnl_amount = pos.bet_amount * pnl_pct * self.leverage
        
        # 杠杆亏损最多亏完本金
        if pnl_amount < -pos.bet_amount:
            pnl_amount = -pos.bet_amount
        
        self.current_capital += pnl_amount
        self.peak_capital = max(self.peak_capital, self.current_capital)
        
        if signal['is_win']:
            # 赢了！本轮结束，重置马丁层级
            total_invested = self.get_total_invested() + pos.bet_amount
            round_profit = pnl_amount  # 本次盈利（已经包含之前的亏损因为是加倍下注）
            
            logger.info("=" * 60)
            logger.info(f"🎉🎉🎉 马丁第 {self.martingale_level + 1} 层止盈！")
            logger.info(f"   本次盈利: +{pnl_amount:.2f}U")
            logger.info(f"   本轮投入: {total_invested}U")
            logger.info(f"   当前资金: {self.current_capital:.2f}U")
            logger.info(f"   峰值资金: {self.peak_capital:.2f}U")
            logger.info("=" * 60)
            
            self.rounds_won += 1
            self.total_rounds += 1
            self.martingale_level = 0  # 重置
            self.daily_rounds += 1
            
        else:
            # 输了，进入下一层马丁
            logger.info("=" * 60)
            logger.info(f"❌ 马丁第 {self.martingale_level + 1} 层止损")
            logger.info(f"   亏损: {pnl_amount:.2f}U")
            logger.info(f"   剩余资金: {self.current_capital:.2f}U")
            
            self.martingale_level += 1
            
            if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
                # 马丁爆仓！
                logger.info(f"💀💀💀 马丁爆仓！本轮全部亏完")
                self.rounds_lost += 1
                self.total_rounds += 1
                self.martingale_level = 0  # 重置，从头开始（如果还有钱）
                self.daily_rounds += 1
            else:
                next_bet = self.get_current_bet()
                logger.info(f"   下一层下注: {next_bet}U")
                # 设置冷却期
                self.cooldown_until = signal['timestamp'] + timedelta(minutes=self.cooldown_after_loss_minutes)
                logger.info(f"   冷却至: {self.cooldown_until}")
            
            logger.info("=" * 60)
        
        self.current_position = None
    
    def _check_daily_reset(self, now: datetime):
        """检查是否需要重置每日统计"""
        current_date = now.date()
        if self.last_trade_date != current_date:
            if self.last_trade_date is not None:
                logger.info(f"\n📅 新的一天 {current_date}")
            self.last_trade_date = current_date
            self.daily_rounds = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            'total_capital': self.total_capital,
            'current_capital': self.current_capital,
            'peak_capital': self.peak_capital,
            'total_return_pct': (self.current_capital / self.total_capital - 1) * 100,
            'total_rounds': self.total_rounds,
            'rounds_won': self.rounds_won,
            'rounds_lost': self.rounds_lost,
            'round_win_rate': self.rounds_won / self.total_rounds * 100 if self.total_rounds > 0 else 0,
            'total_trades': self.total_trades,
            'martingale_level': self.martingale_level,
            'current_bet': self.get_current_bet(),
            'has_position': self.current_position is not None
        }
    
    def is_game_over(self) -> bool:
        """检查是否游戏结束（资金不足以继续）"""
        return self.current_capital < self.MARTINGALE_SEQUENCE[0]
