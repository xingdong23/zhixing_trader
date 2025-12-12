-- 初始化交易数据脚本 (MySQL)
-- 每次服务启动时自动执行

-- 清空现有数据（可选，首次运行时注释掉）
-- TRUNCATE TABLE trades;

-- 检查是否有数据，如果没有则插入初始数据
INSERT INTO trades (symbol, name, side, status, entry_price, exit_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'AAPL', '苹果公司', 'long', 'closed', 180.50, 195.20, 100, 1470.00, 8.14, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'AAPL' AND status = 'closed' LIMIT 1);

INSERT INTO trades (symbol, name, side, status, entry_price, exit_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'TSLA', '特斯拉', 'long', 'closed', 250.00, 275.50, 50, 1275.00, 10.20, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'TSLA' LIMIT 1);

INSERT INTO trades (symbol, name, side, status, entry_price, exit_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'NVDA', '英伟达', 'long', 'closed', 480.00, 520.00, 30, 1200.00, 8.33, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'NVDA' AND status = 'closed' LIMIT 1);

INSERT INTO trades (symbol, name, side, status, entry_price, exit_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'MSFT', '微软', 'long', 'closed', 380.00, 395.00, 40, 600.00, 3.95, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'MSFT' LIMIT 1);

INSERT INTO trades (symbol, name, side, status, entry_price, exit_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'META', 'Meta', 'long', 'closed', 350.00, 335.00, 50, -750.00, -4.29, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'META' LIMIT 1);

INSERT INTO trades (symbol, name, side, status, entry_price, quantity, net_pnl, pnl_percent, created_at, updated_at)
SELECT 'GOOGL', 'Google(持仓)', 'long', 'active', 140.00, 25, 0.00, 0.00, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM trades WHERE symbol = 'GOOGL' AND status = 'active' LIMIT 1);
