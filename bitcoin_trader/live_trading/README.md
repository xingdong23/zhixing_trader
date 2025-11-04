# 实盘交易模块

## 概述

此目录包含实盘交易脚本，用于在真实市场环境中运行交易策略。

## 当前策略

### EMA Simple Trend（EMA简单趋势策略）

**策略文件**: `ema_simple_trend.py`

**核心逻辑**:
- 日线EMA21判断大趋势方向
- 1小时EMA5/13/21寻找入场时机
- 多时间框架协同，提高胜率

**特点**:
- ✅ 自动从OKX API获取实时数据
- ✅ 支持模拟盘和实盘模式
- ✅ 完整的日志记录
- ✅ 只读API权限（安全）

## 使用方法

### 1. 快速启动

```bash
# 模拟盘模式（推荐）
bash live_trading/start_ema_simple_trend.sh paper

# 实盘模式（谨慎使用）
bash live_trading/start_ema_simple_trend.sh live
```

### 2. 手动启动

```bash
cd /opt/zhixing_trader/bitcoin_trader
export PYTHONPATH=/opt/zhixing_trader/bitcoin_trader
source venv/bin/activate

# 模拟盘
python live_trading/ema_simple_trend.py --mode paper

# 实盘
python live_trading/ema_simple_trend.py --mode live
```

### 3. 查看日志

```bash
# 查看最新日志
tail -f logs/ema_simple_trend_*.log | tail -1

# 查看所有日志
ls -lt logs/ema_simple_trend_*.log
```

### 4. 停止策略

```bash
pkill -9 -f 'python.*ema_simple_trend'
```

## 配置文件

策略配置文件位于: `strategies/ema_simple_trend/config_multiframe.json`

主要参数:
- `total_capital`: 初始资金（USDT）
- `position_size`: 仓位比例（0-1）
- `leverage`: 杠杆倍数
- `stop_loss_pct`: 止损百分比
- `take_profit_pct`: 止盈百分比

## 环境要求

1. **Python环境**: Python 3.9+
2. **依赖包**: ccxt, pandas, numpy, requests, python-dotenv
3. **API配置**: `.env` 文件中配置OKX API密钥

## 安全提示

⚠️ **重要提示**:
1. 首次使用请先在模拟盘测试
2. 确保API密钥权限设置正确
3. 实盘模式需要二次确认
4. 定期检查日志和交易记录
5. 设置合理的止损止盈

## 监控建议

建议监控以下指标:
- 策略运行状态
- 交易信号触发
- 持仓情况
- 盈亏统计
- API调用状态

## 故障排查

### 常见问题

1. **策略无法启动**
   - 检查Python环境是否激活
   - 检查PYTHONPATH是否设置
   - 查看日志文件错误信息

2. **无法获取数据**
   - 检查网络连接
   - 验证API密钥配置
   - 确认OKX服务状态

3. **策略异常退出**
   - 查看日志文件
   - 检查系统资源
   - 验证配置文件格式

## 更新日志

- 2025-11-04: 优化策略适配性，实盘从API获取日线数据
- 2025-11-04: 清理无关文件，只保留EMA Simple Trend策略
