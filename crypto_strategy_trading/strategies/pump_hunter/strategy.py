"""
Pump Hunter 策略 - 追涨猎手

核心逻辑:
- 全市场扫描，发现突然拉升的币种
- 快速跟进，吃一波涨幅
- 严格止盈止损，快进快出

参数:
- 本金: 300U
- 单次仓位: 50U
- 最多同时持仓: 5个
- 止盈: +3%
- 止损: -2%
- 超时: 5分钟内没涨1%就平仓

信号触发条件(满足任一):
- 1分钟涨幅 >= 2%
- 3分钟涨幅 >= 4%
- 量价齐飞: 成交量是前一根K线3倍 + 涨幅 > 0

过滤条件:
- 24h成交额 > 50万U
- 发现时已涨超过10%则不追
"""

from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """持仓信息"""
    symbol: str
    side: str  # 'long'
    entry_price: float
    amount: float
    entry_time: datetime
    bet_amount: float  # 投入的USDT金额
    
    def get_pnl_pct(self, current_price: float) -> float:
        """计算盈亏百分比"""
        if self.side == 'long':
            return (current_price - self.entry_price) / self.entry_price
        else:
            return (self.entry_price - current_price) / self.entry_price


class PumpHunterStrategy:
    """
    Pump Hunter 追涨猎手策略
    
    全市场扫描，追踪突然拉升的币种
    """
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Pump_Hunter"
        self.parameters = parameters
        
        # 资金管理
        self.total_capital = float(parameters.get('total_capital', 300.0))
        self.bet_per_trade = float(parameters.get('bet_per_trade', 50.0))
        self.max_positions = int(parameters.get('max_positions', 5))
        self.leverage = int(parameters.get('leverage', 10))
        
        # 止盈止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.03))  # 3%
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.02))      # 2%
        
        # 超时设置
        self.timeout_minutes = int(parameters.get('timeout_minutes', 5))
        self.timeout_min_gain_pct = float(parameters.get('timeout_min_gain_pct', 0.01))  # 1%
        
        # 信号阈值
        self.pump_1m_threshold = float(parameters.get('pump_1m_threshold', 0.02))  # 1分钟涨2%
        self.pump_3m_threshold = float(parameters.get('pump_3m_threshold', 0.04))  # 3分钟涨4%
        self.volume_spike_ratio = float(parameters.get('volume_spike_ratio', 3.0))  # 成交量是前一根3倍
        
        # 过滤条件
        self.min_volume_24h_usdt = float(parameters.get('min_volume_24h_usdt', 500000))  # 24h成交额>50万U
        self.max_already_pumped_pct = float(parameters.get('max_already_pumped_pct', 0.10))  # 已涨10%不追
        
        # 风控
        self.max_daily_loss_pct = float(parameters.get('max_daily_loss_pct', 0.30))  # 每日最大亏30%
        
        # 持仓管理
        self.positions: Dict[str, Position] = {}  # symbol -> Position
        
        # 状态追踪
        self.daily_pnl = 0.0
        self.total_pnl = 0.0
        self.last_trade_date = None
        self.trade_count = 0
        self.win_count = 0
        
        # 统计
        self.signals_detected = 0
        self.trades_executed = 0
        
        logger.info(f"{'='*60}")
        logger.info(f"🎯 {self.name} 初始化完成")
        logger.info(f"  总资金: {self.total_capital}U")
        logger.info(f"  单次下注: {self.bet_per_trade}U")
        logger.info(f"  最大持仓数: {self.max_positions}")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  止盈: +{self.take_profit_pct*100}%")
        logger.info(f"  止损: -{self.stop_loss_pct*100}%")
        logger.info(f"  超时: {self.timeout_minutes}分钟")
        logger.info(f"  信号阈值: 1m>{self.pump_1m_threshold*100}% | 3m>{self.pump_3m_threshold*100}%")
        logger.info(f"{'='*60}")
    
    def scan_market(self, market_data: Dict[str, pd.DataFrame], tickers: Dict[str, Dict]) -> List[Dict]:
        """
        扫描全市场，发现pump信号
        
        Args:
            market_data: {symbol: DataFrame} 每个币种的K线数据
            tickers: {symbol: ticker_info} 每个币种的ticker信息(含24h成交额)
        
        Returns:
            List[Dict]: 发现的信号列表
        """
        now = datetime.now()
        self._reset_daily_stats(now)
        
        # 检查每日亏损限制
        if self._is_daily_loss_exceeded():
            logger.warning(f"⛔ 今日已亏损 {self.daily_pnl:.2f}U ({abs(self.daily_pnl/self.total_capital)*100:.1f}%), 停止交易")
            return []
        
        signals = []
        
        for symbol, df in market_data.items():
            # 跳过已持仓的币
            if symbol in self.positions:
                continue
            
            # 检查持仓数量限制
            if len(self.positions) >= self.max_positions:
                break
            
            # 过滤低成交量
            ticker = tickers.get(symbol, {})
            volume_24h = ticker.get('quoteVolume', 0) or 0
            if volume_24h < self.min_volume_24h_usdt:
                continue
            
            # 检测pump信号
            signal = self._detect_pump_signal(symbol, df, ticker, now)
            if signal:
                signals.append(signal)
                self.signals_detected += 1
                logger.info(f"🔥 发现信号: {symbol} - {signal['reason']}")
        
        return signals
    
    def _detect_pump_signal(self, symbol: str, df: pd.DataFrame, ticker: Dict, now: datetime) -> Optional[Dict]:
        """检测单个币种的pump信号"""
        if len(df) < 5:
            return None
        
        current = df.iloc[-1]
        price = float(current['close'])
        
        # 计算涨幅
        if len(df) >= 2:
            prev_1m = df.iloc[-2]
            change_1m = (price - float(prev_1m['close'])) / float(prev_1m['close'])
        else:
            change_1m = 0
        
        if len(df) >= 4:
            prev_3m = df.iloc[-4]
            change_3m = (price - float(prev_3m['close'])) / float(prev_3m['close'])
        else:
            change_3m = 0
        
        # 计算24h涨幅 (从ticker获取)
        change_24h = ticker.get('percentage', 0) or 0
        change_24h = change_24h / 100 if abs(change_24h) > 1 else change_24h
        
        # 过滤已经涨太多的
        if change_24h > self.max_already_pumped_pct:
            return None
        
        # 计算成交量变化
        if len(df) >= 2:
            current_vol = float(current['volume'])
            prev_vol = float(df.iloc[-2]['volume'])
            vol_ratio = current_vol / prev_vol if prev_vol > 0 else 0
        else:
            vol_ratio = 0
        
        # 信号判断
        reason = None
        
        # 信号1: 1分钟涨幅 >= 2%
        if change_1m >= self.pump_1m_threshold:
            reason = f"⚡ 闪电涨 1m+{change_1m*100:.2f}%"
        
        # 信号2: 3分钟涨幅 >= 4%
        elif change_3m >= self.pump_3m_threshold:
            reason = f"🚀 快速涨 3m+{change_3m*100:.2f}%"
        
        # 信号3: 量价齐飞
        elif vol_ratio >= self.volume_spike_ratio and change_1m > 0.005:
            reason = f"📈 量价齐飞 Vol×{vol_ratio:.1f} +{change_1m*100:.2f}%"
        
        if reason is None:
            return None
        
        # 计算仓位
        amount = (self.bet_per_trade * self.leverage) / price
        
        return {
            'symbol': symbol,
            'signal': 'buy',
            'price': price,
            'amount': amount,
            'leverage': self.leverage,
            'timestamp': now,
            'reason': reason,
            'change_1m': change_1m,
            'change_3m': change_3m,
            'change_24h': change_24h,
            'vol_ratio': vol_ratio,
            'stop_loss': price * (1 - self.stop_loss_pct),
            'take_profit': price * (1 + self.take_profit_pct)
        }
    
    def check_positions(self, current_prices: Dict[str, float], now: datetime = None) -> List[Dict]:
        """
        检查所有持仓，返回需要平仓的信号
        
        Args:
            current_prices: {symbol: price} 当前价格
            now: 当前时间
        
        Returns:
            List[Dict]: 平仓信号列表
        """
        if now is None:
            now = datetime.now()
        
        close_signals = []
        
        for symbol, pos in list(self.positions.items()):
            price = current_prices.get(symbol)
            if price is None:
                continue
            
            pnl_pct = pos.get_pnl_pct(price)
            hold_minutes = (now - pos.entry_time).total_seconds() / 60
            
            close_reason = None
            is_win = False
            
            # 止盈: +3%
            if pnl_pct >= self.take_profit_pct:
                close_reason = f"🎉 止盈 +{pnl_pct*100:.2f}%"
                is_win = True
            
            # 止损: -2%
            elif pnl_pct <= -self.stop_loss_pct:
                close_reason = f"❌ 止损 {pnl_pct*100:.2f}%"
                is_win = False
            
            # 超时: 5分钟内没涨1%
            elif hold_minutes >= self.timeout_minutes and pnl_pct < self.timeout_min_gain_pct:
                close_reason = f"⏱️ 超时 {hold_minutes:.0f}分钟 {pnl_pct*100:+.2f}%"
                is_win = pnl_pct > 0
            
            if close_reason:
                close_signals.append({
                    'symbol': symbol,
                    'signal': 'close',
                    'price': price,
                    'timestamp': now,
                    'reason': close_reason,
                    'pnl_pct': pnl_pct,
                    'is_win': is_win,
                    'hold_minutes': hold_minutes
                })
        
        return close_signals
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓"""
        symbol = signal['symbol']
        
        if signal['signal'] == 'buy':
            # 开仓
            pos = Position(
                symbol=symbol,
                side='long',
                entry_price=signal['price'],
                amount=signal['amount'],
                entry_time=signal['timestamp'],
                bet_amount=self.bet_per_trade
            )
            self.positions[symbol] = pos
            self.trades_executed += 1
            self.trade_count += 1
            
            logger.info(f"{'='*50}")
            logger.info(f"🎯 开仓 {symbol}")
            logger.info(f"   价格: {signal['price']:.6f}")
            logger.info(f"   数量: {signal['amount']:.4f}")
            logger.info(f"   投入: {self.bet_per_trade}U × {self.leverage}x")
            logger.info(f"   原因: {signal['reason']}")
            logger.info(f"   止盈: {signal['take_profit']:.6f} (+{self.take_profit_pct*100}%)")
            logger.info(f"   止损: {signal['stop_loss']:.6f} (-{self.stop_loss_pct*100}%)")
            logger.info(f"   当前持仓: {len(self.positions)}/{self.max_positions}")
            logger.info(f"{'='*50}")
        
        elif signal['signal'] == 'close':
            # 平仓
            if symbol in self.positions:
                pos = self.positions[symbol]
                pnl_pct = signal['pnl_pct']
                pnl_amount = pos.bet_amount * pnl_pct * self.leverage
                
                # 更新统计
                self.daily_pnl += pnl_amount
                self.total_pnl += pnl_amount
                
                if signal['is_win']:
                    self.win_count += 1
                
                remaining = self.total_capital + self.total_pnl
                win_rate = self.win_count / self.trade_count * 100 if self.trade_count > 0 else 0
                
                logger.info(f"{'='*50}")
                logger.info(f"📤 平仓 {symbol}")
                logger.info(f"   {signal['reason']}")
                logger.info(f"   盈亏: {pnl_amount:+.2f}U ({pnl_pct*100:+.2f}%)")
                logger.info(f"   持仓时间: {signal['hold_minutes']:.1f}分钟")
                logger.info(f"   今日盈亏: {self.daily_pnl:+.2f}U")
                logger.info(f"   累计盈亏: {self.total_pnl:+.2f}U")
                logger.info(f"   剩余资金: {remaining:.2f}U")
                logger.info(f"   胜率: {self.win_count}/{self.trade_count} = {win_rate:.1f}%")
                logger.info(f"{'='*50}")
                
                del self.positions[symbol]
    
    def _reset_daily_stats(self, now: datetime):
        """重置每日统计"""
        current_date = now.date()
        
        if self.last_trade_date != current_date:
            if self.last_trade_date is not None:
                logger.info(f"\n{'='*60}")
                logger.info(f"📅 新的一天 {current_date}")
                logger.info(f"   昨日盈亏: {self.daily_pnl:+.2f}U")
                logger.info(f"{'='*60}\n")
            
            self.daily_pnl = 0.0
            self.last_trade_date = current_date
    
    def _is_daily_loss_exceeded(self) -> bool:
        """检查是否超过每日亏损限制"""
        max_loss = self.total_capital * self.max_daily_loss_pct
        return self.daily_pnl <= -max_loss
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        remaining = self.total_capital + self.total_pnl
        win_rate = self.win_count / self.trade_count * 100 if self.trade_count > 0 else 0
        
        return {
            "total_capital": self.total_capital,
            "total_pnl": self.total_pnl,
            "daily_pnl": self.daily_pnl,
            "remaining_capital": remaining,
            "trade_count": self.trade_count,
            "win_count": self.win_count,
            "win_rate": win_rate,
            "signals_detected": self.signals_detected,
            "trades_executed": self.trades_executed,
            "current_positions": len(self.positions),
            "positions": {s: {"entry": p.entry_price, "amount": p.amount} for s, p in self.positions.items()}
        }
    
    def get_position(self, symbol: str) -> Optional[Position]:
        """获取指定币种的持仓"""
        return self.positions.get(symbol)
    
    def has_position(self, symbol: str) -> bool:
        """检查是否持有指定币种"""
        return symbol in self.positions
