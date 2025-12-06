
import os
import sys
import time
import joblib
import pandas as pd
import numpy as np
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from dataclasses import dataclass

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from alpha.mining.feature_factory import FeatureFactory

logger = logging.getLogger(__name__)



class AiGamblerStrategy:
    """
    [AI-Gambler] 智能赌博策略 (Standardized)
    --------------------------------------
    适配用于 BacktestRunner 和 LiveRunner 的统一接口策略。
    
    核心逻辑：
    1. 信号源：基于 Random Forest 挖掘出的 Top 3 因子 (NATR, Count, QuoteVol)。
    2. 触发器：AI 预测未来大波动概率 > 60%。
    3. 资金管理：三发子弹·极限滚仓 (3-Bullet Rollover)。
    """

    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Ai_Gambler_Strategy"
        self.parameters = parameters
        
        self.symbol = parameters.get('symbol', 'DOGEUSDT')
        self.total_capital = float(parameters.get('total_capital', 280.0))
        self.leverage = int(parameters.get('leverage', 20))
        
        # 3发子弹配置
        self.bullets = 3
        self.bullet_size = self.total_capital / 3
        
        # 止盈止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.50)) # +50% ROI
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.20))     # -20% stop
        
        # AI Config
        self.ai_threshold = float(parameters.get('ai_threshold', 0.60))
        
        # 路径配置 (优先使用 parameters 传入的配置，支持相对路径解析)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 模型路径 processing
        model_path_param = parameters.get('model_path', '../../ai/model/volatility_model_DOGEUSDT.joblib')
        if not os.path.isabs(model_path_param):
            self.model_path = os.path.normpath(os.path.join(base_dir, model_path_param))
        else:
            self.model_path = model_path_param

        # 因子文件路径 processing
        feature_path_param = parameters.get('feature_path', '../../ai/model/best_features_DOGEUSDT.json')
        if not os.path.isabs(feature_path_param):
            self.feature_path = os.path.normpath(os.path.join(base_dir, feature_path_param))
        else:
            self.feature_path = feature_path_param
            
        # self.model_dir 不是必须的，可以移除或作为辅助
        self.model_dir = os.path.dirname(self.model_path)
        
        self.feature_factory = FeatureFactory()
        self.model = None
        self.best_features = []
        
        # 状态管理
        self.current_position: Optional[Position] = None
        self.current_capital = self.total_capital
        self.current_life = 1
        
        # 统计
        self.total_trades = 0
        self.rounds_won = 0
        self.rounds_lost = 0
        
        self.initialize_ai()

    def initialize_ai(self):
        """加载 AI 模型和因子列表"""
        logger.info(f"Loading AI Model from {self.model_path}...")
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                with open(self.feature_path, 'r') as f:
                    self.best_features = json.load(f)
                logger.info(f"Loaded {len(self.best_features)} Top Alpha Factors")
            else:
                logger.warning("AI Model not found. Strategy will not trigger signals.")
        except Exception as e:
            logger.error(f"Failed to load AI components: {e}")

    def analyze(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        标准接口：分析 K 线，返回信号字典
        """
        # 1. 基础检查
        if self.model is None or not df:
            return None

        # 2. 预处理数据 (Move this up to be available for check_position)
        # 兼容回测引擎传入的 List[Dict]
        try:
            if isinstance(df, list):
                df_slice = pd.DataFrame(df)
            else:
                df_slice = df.copy()
            
            if df_slice.empty: return None
            
            # 标准化列名
            if 'vol' in df_slice.columns and 'volume' not in df_slice.columns:
                df_slice = df_slice.rename(columns={'vol': 'volume'})
                
            # 确保数值类型
            numeric_cols = ['open', 'high', 'low', 'close', 'volume']
            for col in numeric_cols:
                if col in df_slice.columns:
                    df_slice[col] = pd.to_numeric(df_slice[col], errors='coerce')
        except Exception as e:
            logger.error(f"Data preparation error: {e}")
            return None

        # 3. 检查持仓 (Before creating features)
        if self.current_position is not None:
            # 必须检查止盈止损!
            current_price = float(df_slice.iloc[-1]['close'])
            now = df_slice.iloc[-1].get('open_time', datetime.now())
            if isinstance(now, str): now = datetime.now()
            
            return self.check_position(current_price, now)
            
        if self.current_life > self.bullets:
            return None # 也就是 Game Over
            
        # 4. 生成特征
        try:
            # (df_slice is already prepared)
            
            all_features = self.feature_factory.generate_features(df_slice)
            
            if all_features.empty: return None
            
            # 3. 提取 AI 因子 (匹配模型训练时的特征)
            required_features = self.model.feature_names_in_
            
            # 确保所有特征都存在 (缺少的填充为0，例如 'ignore' 列)
            for f in required_features:
                if f not in all_features.columns:
                    all_features[f] = 0.0
                 
            current_features = all_features.iloc[[-1]][required_features]
            
            # 4. AI 预测 (Multi-class: 0=Neutral, 1=Long, 2=Short)
            probs = self.model.predict_proba(current_features)[0]
            
            # 安全检查：确保模型确实输出了3类概率
            # 如果训练数据里全是 Neutral，可能只输出 1 个概率
            if len(probs) < 3:
                # Fallback or strict check
                prob_long = probs[1] if len(probs) >= 2 else 0.0
                prob_short = 0.0
            else:
                prob_long = probs[1]
                prob_short = probs[2]
            
            # 5. 生成信号
            now = df_slice.iloc[-1].get('open_time', datetime.now())
            if isinstance(now, str):
                 now = datetime.now()
            
            price = float(df_slice.iloc[-1]['close'])
            bet_amount = self.bullet_size
            
            # 优先检查大概率方向
            if prob_long > self.ai_threshold:
                return {
                    'symbol': self.symbol,
                    'signal': 'buy', # Open Long
                    'price': price,
                    'amount': (bet_amount * self.leverage) / price,
                    'bet_amount': bet_amount,
                    'leverage': self.leverage,
                    'timestamp': now,
                    'reason': f"AI_Long:{prob_long:.2f}",
                    'stop_loss': price * (1 - self.stop_loss_pct),
                    'take_profit': price * (1 + self.take_profit_pct)
                }
            elif prob_short > self.ai_threshold:
                 return {
                    'symbol': self.symbol,
                    'signal': 'sell', # Open Short
                    'price': price,
                    'amount': (bet_amount * self.leverage) / price, # Short amount logic might need verification in engine
                    'bet_amount': bet_amount,
                    'leverage': self.leverage,
                    'timestamp': now,
                    'reason': f"AI_Short:{prob_short:.2f}",
                    'stop_loss': price * (1 + self.stop_loss_pct), # Short SL is higher
                    'take_profit': price * (1 - self.take_profit_pct) # Short TP is lower
                }
                
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            return None
            
        return None

    def check_position(self, current_price: float, now: datetime = None) -> Optional[Dict]:
        """检查持仓止盈止损"""
        if self.current_position is None:
            return None
            
        pos = self.current_position
        # Use dict access
        entry_price = pos['entry_price']
        side = pos.get('side', 'long')
        
        # 计算盈亏率
        if side == 'long':
            pnl_pct = (current_price - entry_price) / entry_price
        else:
            pnl_pct = (entry_price - current_price) / entry_price
        
        # 止盈
        if pnl_pct >= self.take_profit_pct:
            return {
                'symbol': pos['symbol'],
                'signal': 'close',
                'type': 'take_profit',
                'price': current_price,
                'timestamp': now if now else datetime.now(),
                'reason': 'take_profit',
                'pnl_pct': pnl_pct,
                'is_win': True
            }
            
        # --- 强平检查 (Liquidation Check) ---
        # 逐仓模式下，跌幅超过 1/杠杆 即爆仓
        # 例如 20x 杠杆，跌幅 > 5% 即爆仓
        liquidation_threshold = 0.98 * (1.0 / self.leverage) # 留一点点缓冲
        
        if pnl_pct <= -liquidation_threshold:
             return {
                'symbol': pos['symbol'],
                'signal': 'close',
                'type': 'liquidation',
                'price': current_price, # 实际上是以强平价成交，这里简化为当前价
                'timestamp': now if now else datetime.now(),
                'reason': 'liquidation',
                'pnl_pct': pnl_pct,
                'is_win': False
            }
            
        # 止损 (依然保留作为额外风控，虽然有了强平逻辑后通常很难触发)
        if pnl_pct <= -self.stop_loss_pct:
             return {
                'symbol': pos['symbol'],
                'signal': 'close',
                'type': 'stop_loss',
                'price': current_price,
                'timestamp': now if now else datetime.now(),
                'reason': 'stop_loss',
                'pnl_pct': pnl_pct,
                'is_win': False
            }
            
        return None

    def update_position(self, signal: Dict):
        """更新仓位状态"""
        if signal['signal'] == 'buy' or signal['signal'] == 'sell':
            # Fix: Use dict instead of Position object to be compatible with BacktestEngine
            self.current_position = {
                'symbol': signal.get('symbol', self.symbol),
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'entry_time': signal['timestamp'],
                'bet_amount': signal.get('bet_amount', 0),
                'martingale_level': 0
            }
            self.total_trades += 1
            
        elif signal['signal'] == 'close':
            pos = self.current_position
            if pos is None: return
            
            # 真实 PnL = (Exit - Entry) * Amount for Long
            # 真实 PnL = (Entry - Exit) * Amount for Short
            if pos['side'] == 'long':
                raw_pnl = (signal['price'] - pos['entry_price']) * pos['amount']
            else:
                raw_pnl = (pos['entry_price'] - signal['price']) * pos['amount']
            
            # --- Isolated Margin Logic (逐仓模式) ---
            # 亏损不能超过本金 (Bet Amount)
            bet_amount = pos.get('bet_amount', 0)
            if raw_pnl < 0 and bet_amount > 0:
                # 如果亏损超过了投入的本金，则视为爆仓，亏损额锁定为本金
                if raw_pnl < -bet_amount:
                    logger.info(f"💥 触发逐仓强平/止损: 原始亏损 {raw_pnl:.2f} > 本金 {bet_amount:.2f}. 实际亏损锁定为 {bet_amount:.2f}")
                    pnl = -bet_amount
                else:
                    pnl = raw_pnl
            else:
                pnl = raw_pnl
                
            self.current_capital += pnl
            
            if signal.get('is_win', pnl > 0):
                self.rounds_won += 1
                # 赢了: 
                # 方案A: 利润滚入下一轮 (Compound) -> self.bullet_size 更新?
                # 方案B: 利润留着，下一轮还是用初始 bullet_size (Fixed fractional)
                # 当前代码是混用的，先保持简单
            else:
                self.rounds_lost += 1
                self.current_life += 1 # 输了，掉一条命
                
            self.current_position = None

    def record_trade(self, signal: Dict):
        """记录交易 (BacktestEngine callback)"""
        pass
        
    def get_stats(self) -> Dict[str, Any]:
        """获取状态"""
        return {
            'symbol': self.symbol,
            'total_capital': self.total_capital,
            'current_capital': self.current_capital,
            'lives_left': self.bullets - self.current_life + 1,
            'win_rate': self.rounds_won / max(1, self.total_trades)
        }
