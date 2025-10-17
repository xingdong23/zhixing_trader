# 自定义策略开发指南

本文档介绍如何在比特币交易系统中开发自定义交易策略。

## 策略基础

### 策略基类

所有策略都需要继承 `BaseStrategy` 类：

```python
from app.core.strategies import BaseStrategy
from typing import List, Dict, Any

class MyCustomStrategy(BaseStrategy):
    def __init__(self, **parameters):
        super().__init__(
            name="我的策略",
            parameters=parameters
        )
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析K线数据，生成交易信号"""
        pass
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """处理实时行情tick"""
        pass
```

### 必须实现的方法

1. **`analyze(klines)`**: 分析K线数据
   - 输入: K线数据列表
   - 输出: 交易信号字典

2. **`on_tick(ticker)`**: 处理实时行情
   - 输入: 实时行情数据
   - 输出: 交易信号字典

### 交易信号格式

```python
{
    "signal": "buy" | "sell" | "hold",
    "price": float,           # 建议价格(可选)
    "amount": float,          # 建议数量(可选)
    "reason": str,           # 信号原因
    "confidence": float,      # 置信度 0-1(可选)
    "metadata": dict         # 其他元数据(可选)
}
```

## 策略示例

### 1. 简单移动平均策略 (SMA)

```python
import pandas as pd
from app.core.strategies import BaseStrategy

class SMACrossoverStrategy(BaseStrategy):
    """
    双均线交叉策略
    """
    
    def __init__(self, short_period: int = 10, long_period: int = 30):
        super().__init__(
            name="SMA Crossover",
            parameters={
                "short_period": short_period,
                "long_period": long_period
            }
        )
        self.short_period = short_period
        self.long_period = long_period
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        if len(klines) < self.long_period:
            return {"signal": "hold", "reason": "数据不足"}
        
        df = pd.DataFrame(klines)
        df['sma_short'] = df['close'].rolling(self.short_period).mean()
        df['sma_long'] = df['close'].rolling(self.long_period).mean()
        
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        # 金叉
        if (previous['sma_short'] <= previous['sma_long'] and 
            current['sma_short'] > current['sma_long']):
            return {
                "signal": "buy",
                "price": current['close'],
                "reason": "金叉买入信号"
            }
        
        # 死叉
        elif (previous['sma_short'] >= previous['sma_long'] and 
              current['sma_short'] < current['sma_long']):
            return {
                "signal": "sell",
                "price": current['close'],
                "reason": "死叉卖出信号"
            }
        
        return {"signal": "hold", "reason": "等待信号"}
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        return {"signal": "hold", "reason": "等待K线完成"}
```

### 2. RSI策略

```python
import pandas as pd
import numpy as np

class RSIStrategy(BaseStrategy):
    """
    RSI相对强弱指标策略
    """
    
    def __init__(self, period: int = 14, oversold: int = 30, overbought: int = 70):
        super().__init__(
            name="RSI Strategy",
            parameters={
                "period": period,
                "oversold": oversold,
                "overbought": overbought
            }
        )
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
    
    def calculate_rsi(self, prices: pd.Series) -> pd.Series:
        """计算RSI指标"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        if len(klines) < self.period + 1:
            return {"signal": "hold", "reason": "数据不足"}
        
        df = pd.DataFrame(klines)
        df['rsi'] = self.calculate_rsi(df['close'])
        
        current_rsi = df['rsi'].iloc[-1]
        
        if current_rsi < self.oversold:
            return {
                "signal": "buy",
                "price": df['close'].iloc[-1],
                "reason": f"RSI超卖({current_rsi:.2f})",
                "metadata": {"rsi": current_rsi}
            }
        
        elif current_rsi > self.overbought:
            return {
                "signal": "sell",
                "price": df['close'].iloc[-1],
                "reason": f"RSI超买({current_rsi:.2f})",
                "metadata": {"rsi": current_rsi}
            }
        
        return {
            "signal": "hold",
            "reason": f"RSI正常({current_rsi:.2f})"
        }
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        return {"signal": "hold", "reason": "等待K线完成"}
```

### 3. MACD策略

```python
class MACDStrategy(BaseStrategy):
    """
    MACD指标策略
    """
    
    def __init__(self, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9):
        super().__init__(
            name="MACD Strategy",
            parameters={
                "fast_period": fast_period,
                "slow_period": slow_period,
                "signal_period": signal_period
            }
        )
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.signal_period = signal_period
    
    def calculate_macd(self, prices: pd.Series):
        """计算MACD指标"""
        ema_fast = prices.ewm(span=self.fast_period).mean()
        ema_slow = prices.ewm(span=self.slow_period).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=self.signal_period).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        if len(klines) < self.slow_period + self.signal_period:
            return {"signal": "hold", "reason": "数据不足"}
        
        df = pd.DataFrame(klines)
        macd, signal, histogram = self.calculate_macd(df['close'])
        
        current_hist = histogram.iloc[-1]
        previous_hist = histogram.iloc[-2]
        
        # MACD金叉
        if previous_hist <= 0 and current_hist > 0:
            return {
                "signal": "buy",
                "price": df['close'].iloc[-1],
                "reason": "MACD金叉"
            }
        
        # MACD死叉
        elif previous_hist >= 0 and current_hist < 0:
            return {
                "signal": "sell",
                "price": df['close'].iloc[-1],
                "reason": "MACD死叉"
            }
        
        return {"signal": "hold", "reason": "等待信号"}
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        return {"signal": "hold", "reason": "等待K线完成"}
```

## 策略注册

### 1. 将策略文件放入策略目录

```
app/core/strategies/
├── __init__.py
├── sma_crossover.py     # 内置策略
├── rsi_strategy.py      # 你的策略
└── macd_strategy.py     # 你的策略
```

### 2. 在 `__init__.py` 中导出

```python
from .sma_crossover import SMACrossoverStrategy
from .rsi_strategy import RSIStrategy
from .macd_strategy import MACDStrategy

__all__ = [
    'BaseStrategy',
    'SMACrossoverStrategy',
    'RSIStrategy',
    'MACDStrategy',
]
```

### 3. 通过API创建策略实例

```bash
curl -X POST "http://localhost:8001/api/v1/strategy/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的RSI策略",
    "code": "my_rsi_strategy",
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "interval": "1h",
    "parameters": {
      "period": 14,
      "oversold": 30,
      "overbought": 70
    }
  }'
```

## 高级功能

### 1. 组合策略

```python
class ComboStrategy(BaseStrategy):
    """组合多个策略的信号"""
    
    def __init__(self, strategies: List[BaseStrategy], voting_method: str = "majority"):
        super().__init__(name="Combo Strategy")
        self.strategies = strategies
        self.voting_method = voting_method
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        signals = []
        for strategy in self.strategies:
            signal = strategy.analyze(klines)
            signals.append(signal['signal'])
        
        if self.voting_method == "majority":
            # 多数投票
            buy_votes = signals.count("buy")
            sell_votes = signals.count("sell")
            
            if buy_votes > len(signals) / 2:
                return {"signal": "buy", "reason": "多数策略看多"}
            elif sell_votes > len(signals) / 2:
                return {"signal": "sell", "reason": "多数策略看空"}
        
        elif self.voting_method == "unanimous":
            # 一致同意
            if all(s == "buy" for s in signals):
                return {"signal": "buy", "reason": "所有策略看多"}
            elif all(s == "sell" for s in signals):
                return {"signal": "sell", "reason": "所有策略看空"}
        
        return {"signal": "hold", "reason": "信号不一致"}
```

### 2. 带止损止盈的策略

```python
class StopLossStrategy(BaseStrategy):
    """带止损止盈的策略包装器"""
    
    def __init__(self, base_strategy: BaseStrategy, 
                 stop_loss_pct: float = 2.0,
                 take_profit_pct: float = 5.0):
        super().__init__(name=f"{base_strategy.name} with SL/TP")
        self.base_strategy = base_strategy
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.entry_price = None
        self.position = None
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        current_price = klines[-1]['close']
        
        # 如果有持仓，检查止损止盈
        if self.position == "long" and self.entry_price:
            pnl_pct = (current_price - self.entry_price) / self.entry_price * 100
            
            if pnl_pct <= -self.stop_loss_pct:
                self.position = None
                return {"signal": "sell", "reason": "触发止损"}
            
            elif pnl_pct >= self.take_profit_pct:
                self.position = None
                return {"signal": "sell", "reason": "触发止盈"}
        
        # 获取基础策略信号
        signal = self.base_strategy.analyze(klines)
        
        if signal['signal'] == "buy":
            self.entry_price = current_price
            self.position = "long"
        
        elif signal['signal'] == "sell":
            self.position = None
        
        return signal
```

## 策略回测

使用回测API测试你的策略：

```python
import httpx

async def backtest_strategy():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8001/api/v1/backtest/run",
            json={
                "strategy_id": 1,
                "symbol": "BTC/USDT",
                "interval": "1h",
                "start_time": "2024-01-01T00:00:00",
                "end_time": "2024-03-01T00:00:00",
                "initial_capital": 10000,
                "parameters": {
                    "period": 14,
                    "oversold": 30,
                    "overbought": 70
                }
            }
        )
        return response.json()
```

## 最佳实践

1. **参数化**: 所有配置都应该是可配置的参数
2. **数据验证**: 检查输入数据的完整性
3. **错误处理**: 捕获和处理异常
4. **日志记录**: 记录关键决策点
5. **回测验证**: 在实盘前充分回测
6. **风险管理**: 实现止损止盈机制
7. **性能优化**: 避免重复计算

## 注意事项

⚠️ **风险提示**:
- 策略性能不代表未来收益
- 充分回测后再用于实盘
- 控制仓位，设置止损
- 监控策略运行状态

## 下一步

- 学习 [回测系统](BACKTEST.md)
- 了解 [风险管理](RISK_MANAGEMENT.md)
- 查看 [API文档](http://localhost:8001/docs)

