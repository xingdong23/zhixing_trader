-- ============================================================
-- 模拟盘数据库表结构
-- ============================================================

-- 1. 交易信号表
CREATE TABLE IF NOT EXISTS trading_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(20) NOT NULL COMMENT 'BUY, SELL, CLOSE',
    side VARCHAR(10) COMMENT 'LONG, SHORT',
    price DECIMAL(18, 8) NOT NULL,
    amount DECIMAL(18, 8),
    reason TEXT,
    daily_trend VARCHAR(20) COMMENT 'BULLISH, BEARISH, NULL',
    ema_fast DECIMAL(18, 8),
    ema_medium DECIMAL(18, 8),
    ema_slow DECIMAL(18, 8),
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_symbol (symbol),
    INDEX idx_executed (executed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易信号表';

-- 2. 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    signal_id INT,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL COMMENT 'LONG, SHORT',
    type VARCHAR(20) NOT NULL COMMENT 'ENTRY, STOP_LOSS, TAKE_PROFIT, TRAILING_STOP',
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    amount DECIMAL(18, 8) NOT NULL,
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    status VARCHAR(20) NOT NULL COMMENT 'OPEN, CLOSED',
    pnl_amount DECIMAL(18, 8),
    pnl_percent DECIMAL(10, 4),
    fees DECIMAL(18, 8) DEFAULT 0,
    entry_time DATETIME NOT NULL,
    exit_time DATETIME,
    exit_reason VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_symbol (symbol),
    INDEX idx_status (status),
    INDEX idx_entry_time (entry_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 3. 持仓表
CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    order_id VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL COMMENT 'LONG, SHORT',
    entry_price DECIMAL(18, 8) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    current_price DECIMAL(18, 8),
    unrealized_pnl DECIMAL(18, 8),
    unrealized_pnl_percent DECIMAL(10, 4),
    highest_price DECIMAL(18, 8),
    entry_time DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='持仓表';

-- 4. 账户余额表
CREATE TABLE IF NOT EXISTS account_balance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    balance DECIMAL(18, 8) NOT NULL,
    available_balance DECIMAL(18, 8) NOT NULL,
    margin_used DECIMAL(18, 8) DEFAULT 0,
    unrealized_pnl DECIMAL(18, 8) DEFAULT 0,
    total_equity DECIMAL(18, 8) NOT NULL,
    total_pnl DECIMAL(18, 8) DEFAULT 0,
    total_pnl_percent DECIMAL(10, 4) DEFAULT 0,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账户余额表';

-- 5. 每日汇总表
CREATE TABLE IF NOT EXISTS daily_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    start_balance DECIMAL(18, 8) NOT NULL,
    end_balance DECIMAL(18, 8) NOT NULL,
    daily_pnl DECIMAL(18, 8) NOT NULL,
    daily_pnl_percent DECIMAL(10, 4) NOT NULL,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    win_rate DECIMAL(10, 4),
    total_fees DECIMAL(18, 8) DEFAULT 0,
    max_drawdown DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日汇总表';

-- 6. 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(20) NOT NULL COMMENT 'INFO, WARNING, ERROR',
    module VARCHAR(50),
    message TEXT,
    details TEXT,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志表';
