# 🚀 富途API快速开始指南

## 📝 总结

**富途OpenAPI是目前最佳选择！**

✅ **优势**：
- 免费、无限制
- 完整的Sector/Industry分类
- 数据质量高、稳定
- 5-10分钟完成257只股票

❌ **唯一要求**：
- 需要下载FutuOpenD客户端（约100MB）
- 需要富途牛牛账号（免费注册）

---

## 🎯 三步完成初始化

### 步骤1：安装和配置（15分钟）

#### 1.1 安装富途SDK

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
pip install futu-api
```

#### 1.2 下载FutuOpenD客户端

**下载地址**：https://www.futunn.com/download/OpenAPI

选择macOS版本（你的系统）

#### 1.3 启动FutuOpenD

- 双击启动FutuOpenD
- 默认监听端口：`11111`
- 无需登录账号即可使用行情数据

#### 1.4 注册富途牛牛账号（如果没有）

https://www.futunn.com/

---

### 步骤2：测试连接（2分钟）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
python scripts/test_futu_connection.py
```

**预期输出**：
```
✅ 成功连接到FutuOpenD!
✅ 成功获取 3 只股票的基本信息
✅ 成功获取 50+ 个行业板块
✅ 成功建立映射: 1000+ 只股票
```

---

### 步骤3：初始化股票池（5-10分钟）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
python scripts/init_stock_universe_with_futu.py
```

**完成后**：
- ✅ `stocks` 表：257只股票（根据市值筛选）
- ✅ `categories` 表：50+个Sector板块
- ✅ `category_stock_relations` 表：完整关联关系

---

## 🔍 验证结果

```bash
python scripts/verify_stock_data.py
```

---

## 📊 对比所有方案

| 方案 | 可用性 | 速度 | 难度 | 推荐度 |
|------|--------|------|------|--------|
| **富途API** | ✅ | 5-10分钟 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Alpha Vantage | ❌ 已用完 | 4天 | ⭐⭐⭐⭐⭐ | ⭐ |
| IEX Cloud | ✅ | 30分钟 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 测试数据 | ✅ | 1分钟 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## ❓ 常见问题

### Q1: FutuOpenD客户端必须一直运行吗？

**A**: 只在运行脚本时需要运行。初始化完成后可以关闭。

---

### Q2: 需要富途证券开户吗？

**A**: 不需要！行情数据免费，无需开户。

---

### Q3: 如果连接失败？

**A**: 检查：
1. FutuOpenD客户端是否启动
2. 端口是否为 `11111`
3. 防火墙是否允许本地连接

---

### Q4: 能获取哪些信息？

**A**: 
- ✅ 股票名称
- ✅ 行业板块（Sector）
- ✅ 实时价格
- ✅ 市值
- ✅ 成交量
- ❌ 更细的Industry（富途只有Sector级别）

**解决方案**：Sector已经足够，可以将Sector同时作为Industry使用。

---

### Q5: 如果我没有macOS怎么办？

**A**: FutuOpenD支持：
- macOS ✅
- Windows ✅
- Linux ✅

所有平台都能用！

---

## 🎉 立即开始

```bash
# 1. 安装SDK
pip install futu-api

# 2. 下载并启动FutuOpenD
# https://www.futunn.com/download/OpenAPI

# 3. 测试连接
python scripts/test_futu_connection.py

# 4. 初始化股票池
python scripts/init_stock_universe_with_futu.py

# 5. 验证结果
python scripts/verify_stock_data.py
```

**总耗时**：20-30分钟（包括下载和安装）

---

## 📚 相关文档

- 📖 详细指南：`FUTU_API_GUIDE.md`
- 🧪 测试脚本：`scripts/test_futu_connection.py`
- 🚀 初始化脚本：`scripts/init_stock_universe_with_futu.py`
- ✅ 验证脚本：`scripts/verify_stock_data.py`

---

## 💡 如果不想用富途？

**备选方案**：

### 方案A：测试数据（立即可用）
```bash
python scripts/create_test_stock_data.py
```
包含15-20只知名股票，用于快速验证功能。

### 方案B：等Alpha Vantage恢复（明天）
每天75只，4天完成。

### 方案C：注册IEX Cloud（需要信用卡）
50,000 credits/月，足够所有257只股票。

---

**推荐：先用富途API！** 🎯


