-- SQLite版本的数据库表结构

-- 1. 交易信号表
CREATE TABLE IF NOT EXISTS trading_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    side VARCHAR(10),
    price DECIMAL(18, 8) NOT NULL,
    amount DECIMAL(18, 8),
    reason TEXT,
    daily_trend VARCHAR(20),
    ema_fast DECIMAL(18, 8),
    ema_medium DECIMAL(18, 8),
    ema_slow DECIMAL(18, 8),
    executed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON trading_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_executed ON trading_signals(executed);

-- 2. 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    signal_id INTEGER,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    amount DECIMAL(18, 8) NOT NULL,
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    status VARCHAR(20) NOT NULL,
    pnl_amount DECIMAL(18, 8),
    pnl_percent DECIMAL(10, 4),
    fees DECIMAL(18, 8) DEFAULT 0,
    entry_time DATETIME NOT NULL,
    exit_time DATETIME,
    exit_reason VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_entry_time ON orders(entry_time);

-- 3. 持仓表
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    order_id VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price DECIMAL(18, 8) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    current_price DECIMAL(18, 8),
    unrealized_pnl DECIMAL(18, 8),
    unrealized_pnl_percent DECIMAL(10, 4),
    highest_price DECIMAL(18, 8),
    entry_time DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);

-- 4. 账户余额表
CREATE TABLE IF NOT EXISTS account_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance DECIMAL(18, 8) NOT NULL,
    available_balance DECIMAL(18, 8) NOT NULL,
    margin_used DECIMAL(18, 8) DEFAULT 0,
    unrealized_pnl DECIMAL(18, 8) DEFAULT 0,
    total_equity DECIMAL(18, 8) NOT NULL,
    total_pnl DECIMAL(18, 8) DEFAULT 0,
    total_pnl_percent DECIMAL(10, 4) DEFAULT 0,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_balance_timestamp ON account_balance(timestamp);

-- 5. 每日汇总表
CREATE TABLE IF NOT EXISTS daily_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    start_balance DECIMAL(18, 8) NOT NULL,
    end_balance DECIMAL(18, 8) NOT NULL,
    daily_pnl DECIMAL(18, 8) NOT NULL,
    daily_pnl_percent DECIMAL(10, 4) NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(10, 4),
    total_fees DECIMAL(18, 8) DEFAULT 0,
    max_drawdown DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_summary(date);

-- 6. 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(20) NOT NULL,
    module VARCHAR(50),
    message TEXT,
    details TEXT,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
