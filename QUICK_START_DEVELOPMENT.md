# 🚀 核心功能开发快速启动指南

> **目标**: 在8-10周内实现8个核心功能  
> **开始日期**: 2025年10月18日

---

## 📋 功能优先级

```
优先级排序:
P0 → 1. 券商API自动同步
P0 → 2. 交易执行记录
P1 → 3. 复盘系统
P1 → 4. 策略管理增强
P1 → 5. 检查清单系统
P2 → 6. 心理分析
P2 → 7. 错误分析
P1 → 8. 数据透视表
```

---

## 🎯 第一步: 环境准备 (30分钟)

### 1. 安装Python依赖

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader

# 激活Python虚拟环境 (如果还没有)
python -m venv venv
source venv/bin/activate  # macOS/Linux

# 安装券商API依赖
pip install ib_insync>=0.9.86
pip install longbridge>=1.0.0
pip install cryptography
pip install asyncio

# 更新 requirements.txt
echo "ib_insync>=0.9.86" >> trading_journal/requirements.txt
echo "longbridge>=1.0.0" >> trading_journal/requirements.txt
echo "cryptography>=41.0.0" >> trading_journal/requirements.txt
```

### 2. 安装前端依赖

```bash
cd zhixing_fronted

# 安装必要的包
npm install react-pivottable
npm install plotly.js
npm install date-fns
npm install @tanstack/react-table  # 用于数据表格
npm install lucide-react  # 应该已安装

# 验证安装
npm list | grep -E "react-pivottable|plotly|date-fns"
```

### 3. 数据库迁移准备

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/trading_journal

# 创建新的数据库迁移文件目录
mkdir -p migrations/versions

# 创建迁移SQL文件
touch migrations/001_broker_connections.sql
touch migrations/002_trade_executions.sql
touch migrations/003_reviews.sql
touch migrations/004_psychology.sql
touch migrations/005_errors.sql
```

---

## 🔥 立即可以开始的任务

### Week 1 Day 1: 券商API - IBKR集成

#### 任务1.1: 创建后端服务 (2小时)

```bash
cd trading_journal/app/services
touch ibkr_sync.py
```

**ibkr_sync.py 初始代码**:
```python
"""盈透证券(IBKR)交易数据同步服务"""
from ib_insync import IB, util
import asyncio
from datetime import datetime, timedelta

class IBKRSyncService:
    def __init__(self, host='127.0.0.1', port=7497, client_id=1):
        self.ib = IB()
        self.host = host
        self.port = port
        self.client_id = client_id
        self.connected = False
    
    async def connect(self):
        """连接到IB Gateway"""
        try:
            await self.ib.connectAsync(self.host, self.port, self.client_id)
            self.connected = True
            return {"status": "connected", "message": "Successfully connected to IBKR"}
        except Exception as e:
            self.connected = False
            return {"status": "error", "message": str(e)}
    
    async def disconnect(self):
        """断开连接"""
        if self.connected:
            self.ib.disconnect()
            self.connected = False
    
    async def get_executions(self, days_back=7):
        """获取最近的交易执行记录"""
        if not self.connected:
            await self.connect()
        
        # 创建过滤器
        filter = ExecutionFilter()
        filter.time = (datetime.now() - timedelta(days=days_back)).strftime('%Y%m%d %H:%M:%S')
        
        # 获取执行记录
        executions = await self.ib.reqExecutionsAsync(filter)
        
        return self._parse_executions(executions)
    
    def _parse_executions(self, executions):
        """解析交易记录为标准格式"""
        trades = []
        for fill in executions:
            exec_detail = fill.execution
            contract = fill.contract
            commission = fill.commissionReport.commission if fill.commissionReport else 0
            
            trade = {
                'symbol': contract.symbol,
                'side': 'buy' if exec_detail.side == 'BOT' else 'sell',
                'quantity': exec_detail.shares,
                'price': exec_detail.price,
                'time': exec_detail.time,
                'amount': exec_detail.shares * exec_detail.price,
                'commission': commission,
                'order_id': exec_detail.orderId,
                'exec_id': exec_detail.execId,
                'exchange': contract.exchange,
                'currency': contract.currency,
                'source': 'ibkr'
            }
            trades.append(trade)
        
        return trades

# 测试代码
if __name__ == "__main__":
    async def test():
        service = IBKRSyncService()
        result = await service.connect()
        print(result)
        
        if result['status'] == 'connected':
            executions = await service.get_executions(days_back=1)
            print(f"Found {len(executions)} executions")
            for trade in executions[:3]:  # 打印前3条
                print(trade)
        
        await service.disconnect()
    
    asyncio.run(test())
```

#### 任务1.2: 创建API端点 (1小时)

```bash
cd trading_journal/app/api/v1
touch ibkr.py
```

**ibkr.py**:
```python
"""IBKR API路由"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ibkr_sync import IBKRSyncService
import asyncio

router = APIRouter(prefix="/api/v1/ibkr", tags=["IBKR Sync"])

class IBKRCredentials(BaseModel):
    host: str = "127.0.0.1"
    port: int = 7497
    client_id: int = 1

@router.post("/connect")
async def connect_ibkr(credentials: IBKRCredentials):
    """连接到IBKR账户"""
    service = IBKRSyncService(
        host=credentials.host,
        port=credentials.port,
        client_id=credentials.client_id
    )
    result = await service.connect()
    return result

@router.get("/sync/executions")
async def sync_executions(days: int = 7):
    """同步交易执行记录"""
    service = IBKRSyncService()
    try:
        executions = await service.get_executions(days_back=days)
        # TODO: 保存到数据库
        return {
            "status": "success",
            "trades": executions,
            "count": len(executions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await service.disconnect()

@router.get("/test")
async def test_connection():
    """测试IBKR连接"""
    service = IBKRSyncService()
    result = await service.connect()
    if result['status'] == 'connected':
        await service.disconnect()
    return result
```

#### 任务1.3: 创建前端设置页面 (3小时)

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_fronted
mkdir -p app/settings/brokers
touch app/settings/brokers/page.tsx
```

**page.tsx**:
```tsx
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BrokerSettingsPage() {
  const [ibkrConfig, setIbkrConfig] = useState({
    host: '127.0.0.1',
    port: 7497,
    clientId: 1
  });
  const [ibkrConnected, setIbkrConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ibkrConfig)
      });
      const result = await response.json();
      
      if (result.status === 'connected') {
        setIbkrConnected(true);
        toast.success('✅ 成功连接到IBKR');
      } else {
        toast.error('❌ 连接失败: ' + result.message);
      }
    } catch (error) {
      toast.error('连接错误: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/v1/ibkr/sync/executions?days=7');
      const result = await response.json();
      
      if (result.status === 'success') {
        toast.success(`✅ 成功同步 ${result.count} 条交易记录`);
      }
    } catch (error) {
      toast.error('同步失败: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">券商连接设置</h1>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          返回首页
        </Button>
      </div>

      {/* IBKR Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                IB
              </div>
              <div>
                <CardTitle>盈透证券 (IBKR)</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  自动同步交易记录、持仓和账户信息
                </p>
              </div>
            </div>
            {ibkrConnected ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                <XCircle className="w-3 h-3 mr-1" />
                未连接
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!ibkrConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                <p className="font-semibold mb-2">📘 连接说明:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>确保IB Gateway或TWS已启动</li>
                  <li>在IB Gateway中启用API连接</li>
                  <li>端口号通常为: 7497(纸盘) 或 7496(实盘)</li>
                </ol>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">主机地址</label>
                  <Input
                    value={ibkrConfig.host}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, host: e.target.value })}
                    placeholder="127.0.0.1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">端口</label>
                  <Input
                    type="number"
                    value={ibkrConfig.port}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, port: parseInt(e.target.value) })}
                    placeholder="7497"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Client ID</label>
                  <Input
                    type="number"
                    value={ibkrConfig.clientId}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, clientId: parseInt(e.target.value) })}
                    placeholder="1"
                  />
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    连接中...
                  </>
                ) : (
                  '连接 IBKR'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700 dark:text-green-300">
                ✅ 已成功连接到IBKR账户
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      同步交易记录
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIbkrConnected(false)}
                  className="w-full"
                >
                  断开连接
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 长桥证券 - 占位 */}
      <Card className="opacity-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              LB
            </div>
            <div>
              <CardTitle>长桥证券 (Longbridge)</CardTitle>
              <p className="text-sm text-gray-500 mt-1">即将支持...</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
```

#### 任务1.4: 添加导航菜单 (10分钟)

在 `zhixing_fronted/app/page.tsx` 的侧边栏添加设置入口:

```tsx
// 在导航列表中添加
{ id: "settings", label: "⚙️ 设置", icon: Settings },
```

---

## 📝 开发检查清单

### 第一周任务清单

- [ ] Day 1: IBKR后端服务基础框架
- [ ] Day 1-2: IBKR API端点实现
- [ ] Day 2-3: IBKR前端设置页面
- [ ] Day 4: 测试IBKR连接与同步
- [ ] Day 5: 数据库表设计与迁移
- [ ] Day 5: 交易执行记录数据模型

### 每日站会问题
1. 昨天完成了什么?
2. 今天计划做什么?
3. 遇到什么阻碍?

---

## 🧪 测试指南

### 测试IBKR连接

1. **启动IB Gateway**
   - 打开IB Gateway应用
   - 选择纸盘(Paper Trading)
   - 配置 → 设置 → API → 启用ActiveX和Socket客户端
   - 端口设置为 7497

2. **测试Python服务**
```bash
cd trading_journal/app/services
python ibkr_sync.py
```

3. **测试API端点**
```bash
# 启动后端服务
cd trading_journal
python run.py

# 在另一个终端测试
curl http://localhost:8000/api/v1/ibkr/test
```

4. **测试前端界面**
```bash
cd zhixing_fronted
npm run dev
# 访问 http://localhost:3000/settings/brokers
```

---

## 📚 参考文档

### IBKR API文档
- 官方文档: https://interactivebrokers.github.io/tws-api/
- ib_insync文档: https://ib-insync.readthedocs.io/

### Longbridge API文档
- 官方文档: https://open.longportapp.com/docs
- Python SDK: https://github.com/longportapp/openapi-sdk/tree/main/python

---

## 🎉 第一周预期成果

完成后你将拥有:
1. ✅ 可工作的IBKR连接
2. ✅ 自动同步交易记录功能
3. ✅ 美观的设置界面
4. ✅ 基础的错误处理

**下周预告**: Longbridge集成 + 交易执行记录详情页

---

## 💡 开发技巧

1. **先测试后开发** - 先确保IB Gateway能连接再写代码
2. **小步快跑** - 每个功能都先做最简单的版本
3. **及时提交** - 每完成一个小功能就git commit
4. **写TODO注释** - 暂时无法完成的功能标记TODO
5. **保持日志** - 记录每天的开发进度和问题

---

**祝开发顺利! 🚀**

如有问题,随时在项目文档中记录或寻求帮助。

