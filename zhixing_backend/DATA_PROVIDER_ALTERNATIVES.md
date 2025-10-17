# 📊 数据服务商对比与选择

## 当前状态（2025-10-17）

| 服务商 | K线数据 | Sector/Industry | 今日可用 | 免费额度 |
|--------|---------|-----------------|----------|---------|
| Alpha Vantage | ✅ | ✅ | ❌ 0/25 | 25次/天/账户 |
| Twelve Data | ✅ | ❌ | ✅ 800 | 800次/天 |
| Yahoo Finance | ✅ | ✅ | ❌ 限流 | 不稳定 |
| Finnhub | ❌ | ❌ | ❌ | 免费版不支持历史数据 |

**问题**：所有提供Sector/Industry的免费数据源今天都不可用！

---

## 🌐 其他数据服务商调研

### 1. Polygon.io ⭐⭐⭐⭐

**官网**：https://polygon.io/

**免费计划**：
- ❌ **已取消免费计划**（2023年起）
- 最低付费：$29/月
- 提供完整的股票信息（含Sector/Industry）

**评价**：
- ✅ 数据质量高
- ✅ API设计优秀
- ❌ 无免费计划

---

### 2. IEX Cloud ⭐⭐⭐⭐

**官网**：https://iexcloud.io/

**免费计划**：
- ✅ 有免费计划（Launch）
- 额度：50,000 credits/月
- Company Info: 1 credit/调用
- 理论可获取：50,000只股票信息/月

**数据内容**：
- ✅ Company Info (含sector, industry, tags)
- ✅ Historical Prices
- ✅ Quote

**限制**：
- ⚠️ 需要信用卡验证
- ⚠️ Credits用完需升级

**评价**：⭐⭐⭐⭐⭐ **强烈推荐！**

---

### 3. EOD Historical Data ⭐⭐⭐

**官网**：https://eodhistoricaldata.com/

**免费计划**：
- ❌ 无真正免费计划
- 试用：20次API调用
- 最低付费：$19.99/月

**评价**：
- ✅ 数据完整
- ❌ 无免费计划

---

### 4. Marketstack ⭐⭐⭐

**官网**：https://marketstack.com/

**免费计划**：
- ✅ 1,000次API调用/月
- ✅ End-of-Day数据
- ❌ 不支持实时数据

**数据内容**：
- ✅ Historical Prices
- ⚠️ 不确定是否含Sector/Industry

---

### 5. Financial Modeling Prep ⭐⭐⭐⭐

**官网**：https://financialmodelingprep.com/

**免费计划**：
- ✅ 250次API调用/天
- ✅ Company Profile (含sector, industry)
- ✅ Historical Prices

**评价**：⭐⭐⭐⭐ **值得尝试！**

---

### 6. AKShare（国内）⭐⭐⭐

**GitHub**：https://github.com/akfamily/akshare

**特点**：
- ✅ 完全免费
- ✅ Python库
- ✅ 中国A股数据丰富
- ⚠️ 美股数据有限

**评价**：
- ✅ 适合A股
- ❌ 不适合美股

---

## 💡 推荐方案

### 方案1：IEX Cloud（最推荐）⭐⭐⭐⭐⭐

**注册IEX Cloud免费账户**

```bash
# 步骤：
1. 访问 https://iexcloud.io/
2. 注册账户（需要信用卡验证，但免费）
3. 获取API Token
4. 免费额度：50,000 credits/月
```

**优势**：
- ✅ 50,000次调用/月（足够！）
- ✅ 提供Sector和Industry
- ✅ 数据质量好
- ✅ API设计优秀

**集成工作量**：
- 需要1-2小时开发IEXCloudProvider
- 参考Alpha Vantage的实现

---

### 方案2：Financial Modeling Prep ⭐⭐⭐⭐

**注册FMP账户**

```bash
# 步骤：
1. 访问 https://financialmodelingprep.com/
2. 注册账户（无需信用卡）
3. 获取API Key
4. 免费额度：250次/天
```

**优势**：
- ✅ 250次/天（可以慢慢填充）
- ✅ 提供Sector和Industry
- ✅ 无需信用卡

**劣势**：
- ⚠️ 每天只能处理250只股票

---

### 方案3：组合使用（当前可行）

**今天立即可用的方案**：

```
Twelve Data (800次/天) - 获取K线数据
+ 
手动Sector/Industry映射表 - 补充分类信息
```

**实现方式**：
1. 用Twelve Data获取股票基本信息和K线
2. 维护一个简单的Sector映射表
3. 明天Alpha Vantage恢复后，逐步更新真实分类

---

### 方案4：测试数据（最快）⭐⭐⭐⭐⭐

**立即创建测试数据**

```bash
python scripts/create_test_stock_data.py
```

**包含**：
- 15-20只知名美股
- 完整的Sector/Industry
- 用于验证所有功能

**优势**：
- ✅ 立即可用
- ✅ 验证完整功能
- ✅ 明天再用真实数据

---

## 📋 对比总结

| 服务商 | 免费额度 | Sector/Industry | 需要信用卡 | 推荐度 |
|--------|---------|-----------------|-----------|--------|
| **IEX Cloud** | 50,000次/月 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **FMP** | 250次/天 | ✅ | ❌ | ⭐⭐⭐⭐ |
| Marketstack | 1,000次/月 | ❓ | ❌ | ⭐⭐⭐ |
| Alpha Vantage | 25次/天 | ✅ | ❌ | ⭐⭐⭐ |
| Twelve Data | 800次/天 | ❌ | ❌ | ⭐⭐⭐ |
| Polygon.io | 无免费 | ✅ | - | ❌ |
| EOD Historical | 无免费 | ✅ | - | ❌ |

---

## 🎯 具体行动建议

### 立即行动（今天）

**选项A：创建测试数据（5分钟）**
```bash
# 我帮你创建脚本
python scripts/create_test_stock_data.py
```
- 包含15-20只股票
- 验证所有功能
- 立即可用

**选项B：注册IEX Cloud（30分钟）**
```bash
# 步骤：
1. 注册 https://iexcloud.io/
2. 获取API Token
3. 我帮你集成IEXCloudProvider
```
- 需要信用卡（但免费）
- 50,000次/月
- 长期解决方案

**选项C：注册FMP（15分钟）**
```bash
# 步骤：
1. 注册 https://financialmodelingprep.com/
2. 获取API Key
3. 我帮你集成FMPProvider
```
- 无需信用卡
- 250次/天
- 中期解决方案

---

### 明天行动

**Alpha Vantage恢复后**：
- 每天处理75只股票
- 4天完成全部257只

---

## 💰 成本对比

| 方案 | 月成本 | 处理能力 | 适用场景 |
|------|--------|---------|---------|
| IEX Cloud Free | $0 | 50,000次/月 | ✅ **推荐** |
| FMP Free | $0 | 7,500次/月 | ✅ 可用 |
| Alpha Vantage × 3 | $0 | 2,250次/月 | ⚠️ 太少 |
| Twelve Data | $0 | 24,000次/月 | ❌ 无Sector |
| Polygon.io | $29 | 无限 | 💰 付费 |

---

## 🔍 数据质量评估

**最权威**：
1. IEX Cloud（交易所数据）⭐⭐⭐⭐⭐
2. Polygon.io（机构级）⭐⭐⭐⭐⭐
3. Alpha Vantage ⭐⭐⭐⭐
4. FMP ⭐⭐⭐⭐
5. Twelve Data ⭐⭐⭐

**建议**：
- 生产环境：IEX Cloud或Polygon.io
- 开发测试：FMP或Alpha Vantage
- 快速验证：测试数据

---

## 📝 总结

### 最佳组合策略

**短期（今天）**：
1. 创建测试数据验证功能
2. 或注册IEX Cloud/FMP

**中期（本周）**：
- 使用Alpha Vantage慢慢填充（75只/天）
- 或使用IEX Cloud快速完成

**长期（生产）**：
- 考虑IEX Cloud（50,000次/月免费）
- 或升级Polygon.io（$29/月无限）

---

## 🚀 下一步

你想：
1. ✅ 让我创建测试数据脚本？（5分钟）
2. ✅ 我帮你集成IEX Cloud？（需要你先注册）
3. ✅ 我帮你集成FMP？（需要你先注册）
4. ⏰ 等明天Alpha Vantage恢复？

**我的建议**：先创建测试数据，今天就能验证功能！🎉

