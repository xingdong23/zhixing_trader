import pandas as pd
import numpy as np
from strategies.phoenix_gamble.config import PhoenixConfig

class PhoenixStrategy:
    """
    凤凰涅槃策略 (Phoenix Strategy)
    核心逻辑：
    1. 技术面：布林带突破 (Bollinger Band Breakout) - 捕捉短期爆发趋势
    2. 资金面：反马丁格尔 (Anti-Martingale / Paroli) - 赢了加注，输了缩手
    """
    def __init__(self):
        self.config = PhoenixConfig
        self.consecutive_wins = 0  # 当前连胜次数
        self.current_capital = self.config.TOTAL_CAPITAL # 当前总资金
        self.current_bet = self.config.BASE_BET # 当前下注金额 (筹码)
        self.position = None # 持仓状态: None, 'LONG', 'SHORT'
        self.entry_price = 0.0 # 入场价格

    def calculate_indicators(self, df: pd.DataFrame):
        """
        计算技术指标
        使用布林带 (Bollinger Bands) 来判断波动率突破
        """
        # 计算中轨 (20日均线)
        df['ma'] = df['close'].rolling(window=self.config.BOLLINGER_WINDOW).mean()
        # 计算标准差
        df['std'] = df['close'].rolling(window=self.config.BOLLINGER_WINDOW).std()
        # 上轨 = 中轨 + 2倍标准差
        df['upper_band'] = df['ma'] + (df['std'] * self.config.BOLLINGER_STD)
        # 下轨 = 中轨 - 2倍标准差
        df['lower_band'] = df['ma'] - (df['std'] * self.config.BOLLINGER_STD)
        
        # 带宽 (Band Width) - 可选，用于判断盘整压缩
        df['bandwidth'] = (df['upper_band'] - df['lower_band']) / df['ma']
        
        return df

    def get_signal(self, row, prev_row):
        """
        获取交易信号 (波动率突破)
        
        做多信号 (LONG): 收盘价突破上轨
        做空信号 (SHORT): 收盘价跌破下轨
        """
        if self.position is None:
            # 突破上轨 -> 做多
            if row['close'] > row['upper_band'] and prev_row['close'] <= prev_row['upper_band']:
                return 'LONG'
            # 跌破下轨 -> 做空
            elif row['close'] < row['lower_band'] and prev_row['close'] >= prev_row['lower_band']:
                return 'SHORT'
        return None

    def check_exit(self, current_price):
        """
        检查退出条件 (止盈/止损)
        """
        if self.position == 'LONG':
            # 止损 (Stop Loss): 价格跌破 (入场价 * (1 - 止损比例))
            if current_price <= self.entry_price * (1 - self.config.STOP_LOSS_PCT):
                return 'SL'
            # 止盈 (Take Profit): 价格涨破 (入场价 * (1 + 止盈比例))
            if current_price >= self.entry_price * (1 + self.config.TAKE_PROFIT_PCT):
                return 'TP'
                
        elif self.position == 'SHORT':
            # 止损 (Stop Loss): 价格涨破 (入场价 * (1 + 止损比例))
            if current_price >= self.entry_price * (1 + self.config.STOP_LOSS_PCT):
                return 'SL'
            # 止盈 (Take Profit): 价格跌破 (入场价 * (1 - 止盈比例))
            if current_price <= self.entry_price * (1 - self.config.TAKE_PROFIT_PCT):
                return 'TP'
        
        return None

    def update_position_sizing(self, result):
        """
        更新仓位管理 (核心赌博逻辑 - Paroli System)
        
        规则：
        1. 赢了 (WIN): 连本带利，全押下一把 (Double Down)。
        2. 输了 (LOSS): 重置回底注 (Base Bet)，保住本金。
        3. 连赢N把 (Jackpot): 达到目标连胜，落袋为安，重置回底注。
        """
        if result == 'WIN':
            self.consecutive_wins += 1
            print(f"WIN! 连胜次数: {self.consecutive_wins}")
            
            # 检查是否达成连胜目标 (Jackpot)
            if self.consecutive_wins >= self.config.MAX_CONSECUTIVE_WINS:
                print(f"🎰 JACKPOT! 止盈落袋。重置连胜。")
                self.consecutive_wins = 0
                self.current_bet = self.config.BASE_BET
            else:
                # 激进复利：将上一把的本金+利润全部投入下一把
                # 新下注额 = 旧下注额 * (1 + 止盈比例 * 杠杆)
                profit_multiplier = self.config.TAKE_PROFIT_PCT * self.config.LEVERAGE
                self.current_bet = self.current_bet * (1 + profit_multiplier)
                
        elif result == 'LOSS':
            print(f"LOSS. 连胜中断。重置回底注。")
            self.consecutive_wins = 0
            self.current_bet = self.config.BASE_BET

        # 风控：下注额不能超过当前总资金
        if self.current_bet > self.current_capital:
            self.current_bet = self.current_capital

    def run_backtest_step(self, row):
        """
        回测单步执行
        """
        # 1. 如果持有仓位，检查是否触发止盈/止损
        if self.position:
            exit_type = self.check_exit(row['close']) # 简化版：只用收盘价检查
            
            # 优化版：使用 High/Low 检查盘中是否触发
            if self.position == 'LONG':
                if row['low'] <= self.entry_price * (1 - self.config.STOP_LOSS_PCT):
                    exit_type = 'SL'
                elif row['high'] >= self.entry_price * (1 + self.config.TAKE_PROFIT_PCT):
                    exit_type = 'TP'
            elif self.position == 'SHORT':
                if row['high'] >= self.entry_price * (1 + self.config.STOP_LOSS_PCT):
                    exit_type = 'SL'
                elif row['low'] <= self.entry_price * (1 - self.config.TAKE_PROFIT_PCT):
                    exit_type = 'TP'

            if exit_type:
                pnl = 0
                if exit_type == 'TP':
                    # 盈利 = 下注额 * (止盈比例 * 杠杆)
                    pnl = self.current_bet * (self.config.TAKE_PROFIT_PCT * self.config.LEVERAGE)
                    self.current_capital += pnl
                    self.update_position_sizing('WIN')
                elif exit_type == 'SL':
                    # 亏损 = 下注额 * (止损比例 * 杠杆)
                    # 注意：如果是逐仓模式，最大亏损就是下注额 (爆仓)
                    loss_pct = self.config.STOP_LOSS_PCT * self.config.LEVERAGE
                    loss = self.current_bet * loss_pct
                    if loss > self.current_bet: loss = self.current_bet # 最大亏损限制为本金
                    
                    self.current_capital -= loss
                    self.update_position_sizing('LOSS')
                
                self.position = None
                return {'action': 'EXIT', 'type': exit_type, 'pnl': pnl if exit_type == 'TP' else -loss, 'capital': self.current_capital}

        # 2. 如果空仓且资金充足，检查入场信号
        if not self.position and self.current_capital >= self.config.BASE_BET:
            pass 
            
        return None
