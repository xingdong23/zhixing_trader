# 富途OpenAPI获取股票分类信息指南

## 💡 为什么选择富途？

**优势**：
1. ✅ **免费**：基础行情和股票信息免费
2. ✅ **完整**：提供美股/港股的Sector和Industry分类
3. ✅ **稳定**：富途是正规持牌券商，数据质量高
4. ✅ **无限制**：基础数据查询不限次数
5. ✅ **中文文档**：文档友好，易于使用

**劣势**：
1. ⚠️ 需要下载FutuOpenD客户端（约100MB）
2. ⚠️ 客户端需要一直运行
3. ⚠️ 需要富途牛牛账号（可免费注册）

---

## 📦 安装和配置

### 步骤1：安装Python SDK

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
pip install futu-api
```

### 步骤2：下载FutuOpenD客户端

**下载地址**：https://www.futunn.com/download/OpenAPI

**支持平台**：
- macOS（你当前系统）
- Windows
- Linux

### 步骤3：启动FutuOpenD

下载后启动FutuOpenD客户端，默认监听端口 `11111`

### 步骤4：注册富途牛牛账号（如果没有）

https://www.futunn.com/

---

## 🔧 API能力

### 1. 获取股票基本信息（含行业分类）

```python
from futu import *

# 连接FutuOpenD
quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)

# 获取股票基本信息
ret, data = quote_ctx.get_stock_basicinfo(
    market=Market.US,
    stock_type=SecurityType.STOCK,
    code_list=['AAPL', 'MSFT', 'GOOGL']
)

if ret == RET_OK:
    print(data)
    # 包含字段：
    # - name: 股票名称
    # - listing_date: 上市日期
    # - stock_id: 股票ID
    # - delisting: 是否退市
    # - main_contract: 主力合约
    # 但是不包含 sector/industry!
else:
    print('error:', data)

quote_ctx.close()
```

### 2. 获取板块列表（Sector分类）

```python
from futu import *

quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)

# 获取美股所有板块
ret, data = quote_ctx.get_plate_list(
    market=Market.US,
    plate_class=Plate.INDUSTRY  # 行业板块
)

if ret == RET_OK:
    print(data)
    # 包含：
    # - code: 板块代码
    # - plate_name: 板块名称
    # - plate_id: 板块ID
else:
    print('error:', data)

quote_ctx.close()
```

### 3. 获取板块成分股

```python
from futu import *

quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)

# 获取科技板块的成分股
ret, data = quote_ctx.get_plate_stock(
    plate_code='BK1009'  # 科技板块代码
)

if ret == RET_OK:
    print(data)
    # 包含：
    # - code: 股票代码
    # - lot_size: 每手股数
    # - stock_name: 股票名称
    # - stock_type: 股票类型
else:
    print('error:', data)

quote_ctx.close()
```

---

## 🎯 完整工作流程

**思路**：
1. 获取所有美股行业板块列表
2. 遍历每个板块，获取其成分股
3. 建立 `股票 -> 板块` 的映射关系
4. 保存到数据库

**预计耗时**：
- 约50-100个行业板块
- 每个板块查询约0.1秒
- 总计：5-10分钟完成全部257只股票

---

## 📝 完整脚本示例

我可以帮你创建一个完整的脚本：

```python
# scripts/init_stock_universe_with_futu.py

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from futu import *
from loguru import logger
from app.database import Database

def get_us_sectors_and_stocks():
    """获取美股所有板块及其成分股"""
    quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
    
    # 1. 获取所有行业板块
    ret, sectors_df = quote_ctx.get_plate_list(
        market=Market.US,
        plate_class=Plate.INDUSTRY
    )
    
    if ret != RET_OK:
        logger.error(f"获取板块列表失败: {sectors_df}")
        return {}
    
    stock_to_sector = {}
    
    # 2. 遍历每个板块，获取成分股
    for _, sector in sectors_df.iterrows():
        sector_code = sector['code']
        sector_name = sector['plate_name']
        
        logger.info(f"正在处理板块: {sector_name}")
        
        ret, stocks_df = quote_ctx.get_plate_stock(plate_code=sector_code)
        
        if ret == RET_OK:
            for _, stock in stocks_df.iterrows():
                stock_code = stock['code'].replace('US.', '')
                stock_name = stock['stock_name']
                
                if stock_code not in stock_to_sector:
                    stock_to_sector[stock_code] = {
                        'name': stock_name,
                        'sectors': []
                    }
                
                stock_to_sector[stock_code]['sectors'].append(sector_name)
    
    quote_ctx.close()
    return stock_to_sector

def save_to_database(stock_to_sector, seed_symbols):
    """保存到数据库"""
    db = Database()
    
    for symbol in seed_symbols:
        if symbol not in stock_to_sector:
            logger.warning(f"股票 {symbol} 未找到板块信息")
            continue
        
        info = stock_to_sector[symbol]
        sector = info['sectors'][0] if info['sectors'] else 'Unknown'
        
        # 保存到stocks表
        db.upsert_stock(
            code=symbol,
            name=info['name'],
            market='US',
            sector=sector
        )
        
        # 创建category
        category_id = db.add_category(
            name=sector,
            category_type='Sector',
            parent_id=None
        )
        
        # 建立关联
        db.add_category_stock_relation(
            category_id=category_id,
            stock_code=symbol
        )

if __name__ == "__main__":
    # 从种子文件读取股票列表
    seed_file = Path('data/us_stock_symbols.txt')
    symbols = [line.strip() for line in seed_file.read_text().splitlines() if line.strip()]
    
    logger.info(f"开始使用富途API获取 {len(symbols)} 只股票的板块信息...")
    
    stock_to_sector = get_us_sectors_and_stocks()
    
    logger.info(f"获取到 {len(stock_to_sector)} 只股票的板块信息")
    
    save_to_database(stock_to_sector, symbols)
    
    logger.info("✅ 完成！")
```

---

## ⚡ 下一步

**你需要做的**：

1. **安装SDK**：
   ```bash
   pip install futu-api
   ```

2. **下载FutuOpenD客户端**：
   https://www.futunn.com/download/OpenAPI

3. **启动FutuOpenD**

4. **运行测试**：
   ```bash
   python scripts/test_futu_connection.py
   ```

**我现在帮你创建测试脚本吗？**

---

## 🆚 对比其他方案

| 方案 | 可用性 | 速度 | 准确性 | 难度 |
|------|--------|------|--------|------|
| **富途API** | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Alpha Vantage | ❌ 今天用完 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| IEX Cloud | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 测试数据 | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**富途API是最均衡的选择！** 🎯


