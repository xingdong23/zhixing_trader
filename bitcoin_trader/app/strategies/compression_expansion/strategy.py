"""
压缩→扩张突破策略 (Compression → Expansion Breakout Strategy)

核心理念：Compression → Expansion
"当波动率收缩、价格收紧、EMA对齐、成交量确认时，
这就是下一波动量浪潮通常开始的地方。"

策略要素：
1. 强势上涨（Strong Move Up）：需要明显的成交量和强势突破
2. 盘整阶段（Basing Phase）：在9/21/50 EMA附近形成低成交量整理
   - 50-100天的横盘
   - 成交量收缩（干涸）
   - 价格形成更高的高点和更高的低点（HH/HL）
   - 价格在右侧收紧
   - 买家守住50日均线
3. 从21/50 EMA反弹：强势股在触及21/50日均线后立即反弹
4. 整理阶段的紧密区间：区间越紧，潜力越大
5. 突破 + 跟进：
   - 突破应该是决定性的，有强劲成交量
   - 突破后关注价格是否守住9日均线
   - 首次回调通常是最佳买入机会

EMA含义：
- 9日 = 动量（Momentum）
- 21日 = 动量/结构（Momentum/Structure）
- 50日 = 趋势确认（Trend Confirmation）

当三条EMA都在上升且对齐时，表明趋势健康，可以加仓。
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class CompressionExpansionStrategy:
    """压缩→扩张突破策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "压缩→扩张突破策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.position_size = float(parameters.get('position_size', 0.5))
        
        # EMA参数
        self.ema_fast = int(parameters.get('ema_fast', 9))     # 动量
        self.ema_medium = int(parameters.get('ema_medium', 21))  # 结构
        self.ema_slow = int(parameters.get('ema_slow', 50))    # 趋势
        
        # 盘整识别参数
        self.basing_min_periods = int(parameters.get('basing_min_periods', 20))  # 最少20个周期
        self.basing_max_periods = int(parameters.get('basing_max_periods', 50)) # 最多50个周期
        
        # 成交量参数
        self.volume_dry_up_ratio = float(parameters.get('volume_dry_up_ratio', 0.7))  # 成交量缩小至70%以下
        self.breakout_volume_multiplier = float(parameters.get('breakout_volume_multiplier', 1.5))  # 突破时成交量放大1.5倍
        
        # 波动率压缩参数
        self.compression_threshold = float(parameters.get('compression_threshold', 0.02))  # 2%的波动率
        self.tight_range_periods = int(parameters.get('tight_range_periods', 10))  # 最近10个周期
        
        # 止盈止损
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.03))  # 3%止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.10))  # 10%止盈
        self.partial_take_profit_pct = float(parameters.get('partial_take_profit_pct', 0.05))  # 5%部分止盈
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.partial_closed = False
        self.total_trades = 0
        self.winning_trades = 0
        
        # 市场状态追踪
        self.in_basing_phase = False
        self.basing_start_time = None
        self.base_high = None
        self.base_low = None
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  仓位: {self.position_size * 100}%")
        logger.info(f"  EMA: {self.ema_fast}/{self.ema_medium}/{self.ema_slow}")
        logger.info(f"  盘整期: {self.basing_min_periods}-{self.basing_max_periods}周期")
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        if len(klines) < self.ema_slow + self.basing_max_periods:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]['close']
        
        # 如果有持仓，检查止盈止损
        if self.current_position:
            exit_signal = self._check_exit_conditions(current_price, klines)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中"}
        
        # 如果没有持仓，寻找入场机会
        entry_signal = self._check_entry_conditions(current_price, klines)
        if entry_signal:
            return entry_signal
        
        return {"signal": "hold", "reason": "等待压缩→扩张信号"}
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _check_strong_move_up(self, klines: List[Dict], lookback: int = 50) -> bool:
        """
        检查历史是否有过强势上涨（用于确认这是一个有潜力的标的）
        条件：
        1. 过去一段时间内价格上涨幅度显著（15%+）
        2. 成交量放大
        3. EMA多头排列
        
        注意：我们不在强势上涨时入场，而是等待回调整理后的突破
        """
        if len(klines) < lookback + self.ema_slow:
            return False
        
        # 检查历史数据，不包括最近10个周期（避免在涨势末期入场）
        historical_lookback = lookback + 20  # 向前多看20个周期
        closes = np.array([k['close'] for k in klines[-(historical_lookback + self.ema_slow):-10]])
        volumes = np.array([k['volume'] for k in klines[-(historical_lookback + self.ema_slow):-10]])
        
        # 计算历史涨幅（排除最近10个周期）
        price_change = (closes[-1] - closes[-(lookback+1)]) / closes[-(lookback+1)]
        
        # 计算平均成交量
        recent_volume = np.mean(volumes[-lookback:])
        earlier_volume = np.mean(volumes[-(lookback*2):-lookback])
        volume_ratio = recent_volume / earlier_volume if earlier_volume > 0 else 1.0
        
        # 计算EMA（使用包含最新数据）
        current_closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        ema9 = self._calculate_ema(current_closes, self.ema_fast)
        ema21 = self._calculate_ema(current_closes, self.ema_medium)
        ema50 = self._calculate_ema(current_closes, self.ema_slow)
        
        # 检查EMA多头排列
        ema_aligned = ema9[-1] > ema21[-1] > ema50[-1]
        
        # 强势上涨判定
        has_strong_move = price_change > 0.10 and volume_ratio > 1.1 and ema_aligned
        
        if has_strong_move:
            logger.debug(f"历史强势上涨: 涨幅={price_change:.2%}, 成交量比={volume_ratio:.2f}, EMA多头排列={ema_aligned}")
        
        return has_strong_move
    
    def _check_basing_phase(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        检查是否处于盘整阶段
        返回：{
            'in_basing': bool,
            'basing_days': int,
            'volume_dried_up': bool,
            'higher_highs_higher_lows': bool,
            'holding_50ema': bool,
            'compression_score': float
        }
        """
        if len(klines) < self.basing_max_periods + self.ema_slow:
            return {'in_basing': False, 'reason': '数据不足'}
        
        # 取最近的盘整期数据
        lookback = self.basing_max_periods
        recent_klines = klines[-lookback:]
        closes = np.array([k['close'] for k in recent_klines])
        highs = np.array([k['high'] for k in recent_klines])
        lows = np.array([k['low'] for k in recent_klines])
        volumes = np.array([k['volume'] for k in recent_klines])
        
        # 1. 检查横盘（价格波动范围小）
        price_range = (np.max(highs) - np.min(lows)) / np.min(lows)
        is_sideways = price_range < 0.25  # 波动小于25%（放宽条件）
        
        # 2. 检查成交量干涸
        recent_volume = np.mean(volumes[-20:])
        earlier_volume = np.mean(volumes[-lookback:-20])
        volume_dried_up = recent_volume < earlier_volume * self.volume_dry_up_ratio
        
        # 3. 检查HH/HL模式（更高的高点和更高的低点）
        # 将数据分成4段，检查是否呈现上升趋势
        segment_size = lookback // 4
        segments_highs = []
        segments_lows = []
        
        for i in range(4):
            start = i * segment_size
            end = (i + 1) * segment_size
            segments_highs.append(np.max(highs[start:end]))
            segments_lows.append(np.min(lows[start:end]))
        
        # 检查是否形成更高的低点
        higher_lows = all(segments_lows[i] <= segments_lows[i+1] for i in range(3))
        
        # 4. 检查是否守住50 EMA
        all_closes = np.array([k['close'] for k in klines[-(lookback + self.ema_slow):]])
        ema50 = self._calculate_ema(all_closes, self.ema_slow)
        ema50_current = ema50[-1]
        
        # 统计价格在50 EMA上方的比例
        above_50ema_count = np.sum(closes > ema50[-lookback:])
        holding_50ema = above_50ema_count / lookback > 0.5  # 50%时间在50 EMA上方（放宽条件）
        
        # 5. 检查价格收紧（右侧压缩）
        # 计算最近10个周期的波动率
        recent_volatility = np.std(closes[-self.tight_range_periods:]) / np.mean(closes[-self.tight_range_periods:])
        earlier_volatility = np.std(closes[-lookback:-self.tight_range_periods]) / np.mean(closes[-lookback:-self.tight_range_periods])
        compression_ratio = recent_volatility / earlier_volatility if earlier_volatility > 0 else 1.0
        is_compressed = compression_ratio < 0.7  # 波动率缩小至70%以下
        
        # 综合评分
        in_basing = is_sideways and volume_dried_up and higher_lows and holding_50ema
        
        result = {
            'in_basing': in_basing,
            'is_sideways': is_sideways,
            'price_range': price_range,
            'volume_dried_up': volume_dried_up,
            'volume_ratio': recent_volume / earlier_volume if earlier_volume > 0 else 1.0,
            'higher_lows': higher_lows,
            'holding_50ema': holding_50ema,
            'above_50ema_pct': above_50ema_count / lookback,
            'is_compressed': is_compressed,
            'compression_ratio': compression_ratio,
            'ema50': ema50_current
        }
        
        if in_basing:
            logger.info(f"✓ 盘整阶段确认:")
            logger.info(f"  横盘: {is_sideways} (波动={price_range:.2%})")
            logger.info(f"  成交量干涸: {volume_dried_up} (比例={result['volume_ratio']:.2f})")
            logger.info(f"  更高低点: {higher_lows}")
            logger.info(f"  守住50EMA: {holding_50ema} ({result['above_50ema_pct']:.1%})")
            logger.info(f"  价格压缩: {is_compressed} (比例={compression_ratio:.2f})")
        
        return result
    
    def _check_tight_range(self, klines: List[Dict]) -> bool:
        """
        检查是否形成紧密区间
        "区间越紧，潜力越大"
        """
        if len(klines) < self.tight_range_periods:
            return False
        
        recent_klines = klines[-self.tight_range_periods:]
        closes = np.array([k['close'] for k in recent_klines])
        highs = np.array([k['high'] for k in recent_klines])
        lows = np.array([k['low'] for k in recent_klines])
        
        # 计算价格区间
        price_range = (np.max(highs) - np.min(lows)) / np.mean(closes)
        
        # 紧密区间：波动小于2%
        is_tight = price_range < self.compression_threshold
        
        if is_tight:
            logger.info(f"✓ 紧密区间形成: 波动={price_range:.2%} < {self.compression_threshold:.2%}")
        
        return is_tight
    
    def _check_ema_alignment(self, klines: List[Dict]) -> bool:
        """
        检查EMA对齐（多头排列）
        9 EMA > 21 EMA > 50 EMA，且都在上升
        """
        if len(klines) < self.ema_slow + 5:
            return False
        
        closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        
        ema9 = self._calculate_ema(closes, self.ema_fast)
        ema21 = self._calculate_ema(closes, self.ema_medium)
        ema50 = self._calculate_ema(closes, self.ema_slow)
        
        # 检查排列
        aligned = ema9[-1] > ema21[-1] > ema50[-1]
        
        # 检查上升
        ema9_rising = ema9[-1] > ema9[-3]
        ema21_rising = ema21[-1] > ema21[-3]
        ema50_rising = ema50[-1] > ema50[-5]
        
        all_rising = ema9_rising and ema21_rising and ema50_rising
        
        if aligned and all_rising:
            logger.info(f"✓ EMA多头排列且上升:")
            logger.info(f"  9EMA={ema9[-1]:.2f} > 21EMA={ema21[-1]:.2f} > 50EMA={ema50[-1]:.2f}")
            logger.info(f"  上升趋势: 9={ema9_rising}, 21={ema21_rising}, 50={ema50_rising}")
        
        return aligned and all_rising
    
    def _check_breakout(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        检查是否突破
        条件：
        1. 价格突破盘整区间的高点
        2. 成交量显著放大
        3. 收盘价接近最高价（强势）
        4. 价格在9 EMA之上
        """
        if len(klines) < self.basing_max_periods + self.ema_slow:
            return {'breakout': False}
        
        current_kline = klines[-1]
        current_price = current_kline['close']
        current_volume = current_kline['volume']
        
        # 获取盘整区间的高点
        lookback = self.basing_max_periods
        recent_klines = klines[-lookback:-1]  # 不包括当前K线
        highs = np.array([k['high'] for k in recent_klines])
        resistance = np.max(highs)
        
        # 1. 价格突破
        price_breakout = current_price > resistance
        breakout_strength = (current_price - resistance) / resistance if price_breakout else 0
        
        # 2. 成交量放大
        volumes = np.array([k['volume'] for k in recent_klines])
        avg_volume = np.mean(volumes[-20:])
        volume_surge = current_volume > avg_volume * self.breakout_volume_multiplier
        
        # 3. 收盘价接近最高价（强势突破）
        close_near_high = (current_kline['high'] - current_price) / current_price < 0.005  # 0.5%以内
        
        # 4. 价格在9 EMA之上
        closes = np.array([k['close'] for k in klines[-(self.ema_fast + 5):]])
        ema9 = self._calculate_ema(closes, self.ema_fast)
        above_ema9 = current_price > ema9[-1]
        
        is_breakout = price_breakout and volume_surge and close_near_high and above_ema9
        
        result = {
            'breakout': is_breakout,
            'price_breakout': price_breakout,
            'breakout_strength': breakout_strength,
            'volume_surge': volume_surge,
            'volume_ratio': current_volume / avg_volume if avg_volume > 0 else 1.0,
            'close_near_high': close_near_high,
            'above_ema9': above_ema9,
            'resistance': resistance,
            'ema9': ema9[-1]
        }
        
        if is_breakout:
            logger.info(f"🚀 突破确认:")
            logger.info(f"  价格突破: {price_breakout} ({current_price:.2f} > {resistance:.2f}, 强度={breakout_strength:.2%})")
            logger.info(f"  成交量放大: {volume_surge} (比例={result['volume_ratio']:.2f})")
            logger.info(f"  收盘接近最高: {close_near_high}")
            logger.info(f"  在9EMA上方: {above_ema9} ({current_price:.2f} > {ema9[-1]:.2f})")
        
        return result
    
    def _check_entry_conditions(self, current_price: float, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查入场条件 - 使用评分机制
        采用灵活的评分系统，不要求所有条件同时满足
        """
        
        score = 0
        max_score = 5
        
        # Step 1: 检查是否有强势上涨 (必需条件，+1分)
        if not self._check_strong_move_up(klines):
            return None
        score += 1
        
        # Step 2: 检查盘整阶段 (可选，+1分)
        basing_info = self._check_basing_phase(klines)
        if basing_info['in_basing']:
            score += 1
            logger.info(f"✓ 盘整阶段得分 (当前分数: {score}/{max_score})")
        
        # Step 3: 检查紧密区间 (可选，+1分)
        if self._check_tight_range(klines):
            score += 1
            logger.info(f"✓ 紧密区间得分 (当前分数: {score}/{max_score})")
        
        # Step 4: 检查EMA对齐 (重要，+1分)
        if self._check_ema_alignment(klines):
            score += 1
            logger.info(f"✓ EMA对齐得分 (当前分数: {score}/{max_score})")
        
        # Step 5: 检查突破 (最重要，+1分)
        breakout_info = self._check_breakout(klines)
        if breakout_info['breakout']:
            score += 1
            logger.info(f"✓ 突破确认得分 (当前分数: {score}/{max_score})")
        
        # 判断是否入场：至少需要2分（强势上涨+至少1个其他条件，或EMA对齐+突破）
        min_score = 2
        if score < min_score:
            logger.debug(f"评分不足: {score}/{max_score}，需要至少{min_score}分")
            return None
        
        logger.info(f"✅ 评分达标: {score}/{max_score}，准备入场")
        
        # 所有条件满足，生成买入信号
        logger.info("="*60)
        logger.info("💎 压缩→扩张突破信号确认！")
        logger.info("="*60)
        
        # 计算仓位
        amount = (self.capital * self.position_size) / current_price
        
        # 计算止损位（使用21 EMA或50 EMA作为支撑）
        closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        ema21 = self._calculate_ema(closes, self.ema_medium)
        ema50 = self._calculate_ema(closes, self.ema_slow)
        
        # 止损设在21 EMA下方，但不超过3%
        stop_loss = min(ema21[-1] * 0.98, current_price * (1 - self.stop_loss_pct))
        
        return {
            "signal": "buy",
            "type": "entry",
            "price": current_price,
            "amount": amount,
            "stop_loss": stop_loss,
            "leverage": self.parameters.get("leverage", 1.0),
            "reason": f"压缩→扩张突破 @ {current_price:.2f}",
            "details": {
                "basing": basing_info,
                "breakout": breakout_info
            }
        }
    
    def _check_exit_conditions(self, current_price: float, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        优先级：
        1. 硬止损（3%）
        2. 止盈（10%全部平仓，5%部分平仓）
        3. 跌破9 EMA（首次回调机会）
        4. 趋势反转（跌破21 EMA）
        """
        if not self.entry_price:
            return None
        
        profit_ratio = (current_price - self.entry_price) / self.entry_price
        
        # 1. 硬止损
        if profit_ratio <= -self.stop_loss_pct:
            logger.warning(f"⛔ 触发止损: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "stop_loss", "硬止损", 1.0)
        
        # 2. 第二次止盈（10%）- 全部平仓
        if profit_ratio >= self.take_profit_pct:
            logger.info(f"💰💰 第二次止盈: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "take_profit", "第二次止盈", 1.0)
        
        # 3. 第一次止盈（5%）- 部分平仓50%
        if not self.partial_closed and profit_ratio >= self.partial_take_profit_pct:
            logger.info(f"💰 第一次止盈: {profit_ratio*100:.2f}%")
            self.partial_closed = True
            return self._create_exit_signal(current_price, "partial_take_profit", "第一次部分止盈", 0.5)
        
        # 4. 首次回调机会 - 跌破9 EMA（只在盈利时考虑）
        if profit_ratio > 0:
            closes = np.array([k['close'] for k in klines[-(self.ema_fast + 5):]])
            ema9 = self._calculate_ema(closes, self.ema_fast)
            
            if current_price < ema9[-1]:
                logger.info(f"📉 跌破9 EMA: 价格={current_price:.2f}, 9EMA={ema9[-1]:.2f}")
                # 如果已经部分止盈，跌破9 EMA则全部平仓
                if self.partial_closed:
                    return self._create_exit_signal(current_price, "ema9_break", "跌破9 EMA", 1.0)
        
        # 5. 趋势反转 - 跌破21 EMA（保护利润）
        if self.partial_closed or profit_ratio > 0.02:
            closes = np.array([k['close'] for k in klines[-(self.ema_medium + 5):]])
            ema21 = self._calculate_ema(closes, self.ema_medium)
            
            if current_price < ema21[-1]:
                logger.info(f"📉 跌破21 EMA: 价格={current_price:.2f}, 21EMA={ema21[-1]:.2f}")
                return self._create_exit_signal(current_price, "ema21_break", "跌破21 EMA趋势反转", 1.0)
        
        return None
    
    def _create_exit_signal(self, current_price: float, exit_type: str, reason: str, exit_ratio: float) -> Dict[str, Any]:
        """
        创建出场信号
        
        Args:
            current_price: 当前价格
            exit_type: 出场类型
            reason: 出场原因
            exit_ratio: 平仓比例（0.5=50%, 1.0=100%）
        """
        amount = self.current_position.get("amount", 0) * exit_ratio if self.current_position else 0
        
        profit_ratio = 0
        if self.entry_price:
            profit_ratio = (current_price - self.entry_price) / self.entry_price
        
        return {
            "signal": "sell",
            "type": exit_type,
            "price": current_price,
            "amount": amount,
            "exit_ratio": exit_ratio,
            "reason": f"{reason} @ {current_price:.2f} ({profit_ratio*100:+.2f}%)"
        }
    
    def update_position(self, position: Optional[Dict[str, Any]], current_time: int = None):
        """更新持仓信息"""
        if position:
            signal_type = position.get('type', 'entry')
            exit_types = ['stop_loss', 'take_profit', 'ema9_break', 'ema21_break', 'partial_take_profit']
            
            if signal_type in exit_types or position.get('signal') == 'close':
                # 平仓信号
                self.current_position = None
                self.entry_price = None
                self.partial_closed = False
            elif not self.current_position:
                # 新建仓位，确保包含所有必要字段
                side = 'long' if position.get('signal') == 'buy' else 'short'
                self.current_position = {
                    'side': side,
                    'price': position.get('price'),
                    'entry_price': position.get('price') or position.get('entry_price'),
                    'amount': position.get('amount'),
                    'stop_loss': position.get('stop_loss'),
                    'take_profit': position.get('take_profit'),
                }
                self.entry_price = self.current_position['entry_price']
                self.partial_closed = False
                logger.info(f"📊 建仓 {side.upper()}: {self.entry_price:.2f}")
        else:
            # 清空仓位（外部调用，position=None）
            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
    
    def record_trade(self, trade: Dict[str, Any]):
        """记录交易"""
        self.total_trades += 1
        if trade.get("pnl_amount", 0) > 0:
            self.winning_trades += 1
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "win_rate": win_rate,
            "has_position": self.current_position is not None
        }

