"""
完整的股票池初始化脚本（使用配置的数据源）
使用 Alpha Vantage + Twelve Data 获取股票信息和分类

功能：
1. 从种子文件获取股票代码
2. 使用Alpha Vantage获取详细信息（包括Sector、Industry）
3. 自动创建分类层级（Sector → Industry）
4. 建立股票与分类的关联关系
5. 填充 stocks、categories、category_stock_relations 三个表
"""
import sys
from pathlib import Path
import time
import asyncio
from collections import defaultdict
from datetime import datetime

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from loguru import logger
from sqlalchemy import create_engine, text
from app.config import settings
from app.core.market_data import AlphaVantageProvider


def get_stocks_from_seed_file():
    """从种子文件获取股票代码"""
    
    seed_file = project_root / 'data' / 'us_stock_symbols.txt'
    
    if not seed_file.exists():
        logger.warning(f"种子文件不存在: {seed_file}")
        return []
    
    all_symbols = set()
    
    logger.info(f"从种子文件读取: {seed_file}")
    
    with open(seed_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            symbols = [s.strip().upper() for s in line.split(',') if s.strip()]
            all_symbols.update(symbols)
    
    logger.info(f"✅ 从种子文件获取: {len(all_symbols)} 只股票")
    return list(all_symbols)


async def fetch_stock_details_from_alpha_vantage(symbols, batch_size=50):
    """
    使用Alpha Vantage获取股票详细信息
    
    Alpha Vantage的OVERVIEW端点提供：
    - Symbol, Name, Sector, Industry
    - MarketCapitalization, 52WeekHigh/Low
    - PERatio, EPS等
    """
    
    # 使用3个Alpha Vantage账户轮换
    api_keys = [
        settings.alpha_vantage_api_key_1 or settings.alpha_vantage_api_key,
        settings.alpha_vantage_api_key_2,
        settings.alpha_vantage_api_key_3,
    ]
    api_keys = [k for k in api_keys if k]  # 过滤掉空的key
    
    if not api_keys:
        logger.error("没有可用的Alpha Vantage API Key")
        return []
    
    logger.info(f"使用 {len(api_keys)} 个Alpha Vantage账户")
    
    providers = [AlphaVantageProvider(api_key=key, rate_limit_delay=12.0) for key in api_keys]
    
    stocks_with_details = []
    total = len(symbols)
    current_provider_idx = 0
    
    logger.info(f"开始获取 {total} 只股票的详细信息...")
    logger.info(f"筛选条件: 市值 $500M-$10B")
    
    for i, symbol in enumerate(symbols, 1):
        try:
            clean_symbol = symbol.strip().upper()
            if not clean_symbol or '.' in clean_symbol:
                continue
            
            # 轮换使用不同的provider
            provider = providers[current_provider_idx % len(providers)]
            current_provider_idx += 1
            
            # 获取股票基本信息
            stock_info = await provider.get_stock_info(clean_symbol)
            
            if not stock_info:
                logger.debug(f"跳过 {clean_symbol}: 无法获取基本信息")
                continue
            
            # 提取关键信息
            market_cap = float(stock_info.get('market_cap', 0))
            sector = stock_info.get('sector', 'Unknown') or 'Unknown'
            industry = stock_info.get('industry', 'Unknown') or 'Unknown'
            name = stock_info.get('name', clean_symbol)
            
            # 筛选条件：市值5亿-100亿美元
            if 500_000_000 <= market_cap <= 10_000_000_000:
                stock_data = {
                    'code': clean_symbol,
                    'name': name[:200],
                    'market': 'US',
                    'sector': sector[:50],
                    'industry': industry[:100],
                    'market_cap': round(market_cap / 1_000_000, 2),  # 百万美元
                    'current_price': 0,  # 暂不获取价格
                    'exchange': stock_info.get('exchange', 'Unknown'),
                    'country': 'US',
                }
                stocks_with_details.append(stock_data)
                logger.debug(f"✅ {clean_symbol}: {sector} / {industry}")
            else:
                logger.debug(f"跳过 {clean_symbol}: 市值不符合 (${market_cap/1e9:.2f}B)")
            
            # 进度显示
            if i % batch_size == 0:
                logger.info(f"进度: {i}/{total} ({i*100//total}%), 已筛选: {len(stocks_with_details)} 只")
                logger.info(f"   使用API Key轮换策略，避免单个账户限流")
            
            # 限流（每个key每分钟5次，12秒1次）
            await asyncio.sleep(12.5)
        
        except Exception as e:
            logger.debug(f"跳过 {symbol}: {str(e)[:100]}")
            continue
    
    logger.info(f"✅ 获取完成: {len(stocks_with_details)}/{total} 只股票符合条件")
    return stocks_with_details


def normalize_category_id(name: str) -> str:
    """
    将分类名称转换为category_id
    例如: "Healthcare" -> "healthcare", "Oil & Gas" -> "oil_gas"
    """
    return name.lower().replace(' ', '_').replace('&', 'and').replace('-', '_').replace(',', '')


def build_category_tree(stocks):
    """
    从股票信息构建分类树
    
    结构:
    - Sector (Level 0)
      - Industry (Level 1)
    
    Returns:
        tuple: (categories_list, relations_list)
    """
    logger.info("构建分类树...")
    
    # 收集所有的 Sector 和 Industry
    sector_industries = defaultdict(set)
    
    for stock in stocks:
        sector = stock['sector']
        industry = stock['industry']
        if sector and sector != 'Unknown':
            sector_industries[sector].add(industry if industry != 'Unknown' else 'Other')
    
    categories = []
    relations = []
    
    # 创建 Sector 分类（Level 0）
    for sector_name in sorted(sector_industries.keys()):
        sector_id = normalize_category_id(sector_name)
        
        categories.append({
            'category_id': sector_id,
            'name': sector_name,
            'parent_id': None,
            'path': f'/{sector_id}',
            'level': 0,
            'sort_order': 0,
            'icon': get_sector_icon(sector_name),
            'color': get_sector_color(sector_name),
            'description': f'{sector_name} sector stocks',
            'is_active': True,
            'is_custom': False,
        })
        
        # 创建 Industry 分类（Level 1）
        industries = sorted(sector_industries[sector_name])
        for idx, industry_name in enumerate(industries):
            industry_id = f"{sector_id}_{normalize_category_id(industry_name)}"
            
            categories.append({
                'category_id': industry_id,
                'name': industry_name,
                'parent_id': sector_id,
                'path': f'/{sector_id}/{industry_id}',
                'level': 1,
                'sort_order': idx,
                'icon': '📊',
                'color': get_sector_color(sector_name),
                'description': f'{industry_name} in {sector_name}',
                'is_active': True,
                'is_custom': False,
            })
    
    logger.info(f"✅ 创建了 {len(categories)} 个分类")
    logger.info(f"   - Sectors: {len(sector_industries)}")
    logger.info(f"   - Industries: {len(categories) - len(sector_industries)}")
    
    # 建立股票与分类的关联关系
    for stock in stocks:
        sector = stock['sector']
        industry = stock['industry']
        code = stock['code']
        
        if sector and sector != 'Unknown':
            sector_id = normalize_category_id(sector)
            
            # 关联到 Sector（次要分类）
            relations.append({
                'category_id': sector_id,
                'stock_code': code,
                'weight': 1.0,
                'is_primary': False,
                'notes': f'Sector: {sector}',
            })
            
            # 关联到 Industry（主要分类）
            if industry and industry != 'Unknown':
                industry_name = industry
            else:
                industry_name = 'Other'
            
            industry_id = f"{sector_id}_{normalize_category_id(industry_name)}"
            relations.append({
                'category_id': industry_id,
                'stock_code': code,
                'weight': 1.0,
                'is_primary': True,
                'notes': f'Industry: {industry_name}',
            })
    
    logger.info(f"✅ 创建了 {len(relations)} 条关联关系")
    
    return categories, relations


def get_sector_icon(sector: str) -> str:
    """为不同板块分配图标"""
    icons = {
        'Technology': '💻',
        'Healthcare': '🏥',
        'Financial Services': '💰',
        'Financials': '💰',
        'Consumer Cyclical': '🛒',
        'Consumer Defensive': '🥫',
        'Industrials': '🏭',
        'Energy': '⚡',
        'Utilities': '💡',
        'Real Estate': '🏠',
        'Basic Materials': '⛏️',
        'Communication Services': '📡',
        'Communications': '📡',
    }
    return icons.get(sector, '📊')


def get_sector_color(sector: str) -> str:
    """为不同板块分配颜色"""
    colors = {
        'Technology': '#4299e1',
        'Healthcare': '#48bb78',
        'Financial Services': '#ed8936',
        'Financials': '#ed8936',
        'Consumer Cyclical': '#9f7aea',
        'Consumer Defensive': '#38b2ac',
        'Industrials': '#667eea',
        'Energy': '#f56565',
        'Utilities': '#ecc94b',
        'Real Estate': '#ed64a6',
        'Basic Materials': '#a0aec0',
        'Communication Services': '#4299e1',
        'Communications': '#4299e1',
    }
    return colors.get(sector, '#718096')


def save_to_database(stocks, categories, relations):
    """保存所有数据到数据库"""
    
    if not stocks:
        logger.warning("没有股票需要保存")
        return
    
    try:
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            logger.info("\n【保存到数据库】")
            
            # 1. 保存股票信息
            logger.info(f"1️⃣ 保存 {len(stocks)} 只股票...")
            
            stocks_for_db = []
            for s in stocks:
                stocks_for_db.append({
                    'code': s['code'],
                    'name': s['name'],
                    'market': s['market'],
                    'market_cap': 'small',
                    'lot_size': 1,
                    'sec_type': 'STOCK',
                    'is_active': True,
                })
            
            df_stocks = pd.DataFrame(stocks_for_db)
            df_stocks.to_sql(
                'stocks',
                engine,
                if_exists='append',
                index=False,
                method='multi',
                chunksize=100
            )
            logger.info(f"   ✅ 股票保存完成")
            
            # 2. 保存分类
            logger.info(f"2️⃣ 保存 {len(categories)} 个分类...")
            df_categories = pd.DataFrame(categories)
            
            now = datetime.utcnow()
            df_categories['created_at'] = now
            df_categories['updated_at'] = now
            df_categories['stock_count'] = 0
            df_categories['total_stock_count'] = 0
            
            df_categories.to_sql(
                'categories',
                engine,
                if_exists='append',
                index=False,
                method='multi',
                chunksize=100
            )
            logger.info(f"   ✅ 分类保存完成")
            
            # 3. 保存关联关系
            logger.info(f"3️⃣ 保存 {len(relations)} 条关联关系...")
            df_relations = pd.DataFrame(relations)
            
            df_relations['created_at'] = now
            df_relations['updated_at'] = now
            
            df_relations.to_sql(
                'category_stock_relations',
                engine,
                if_exists='append',
                index=False,
                method='multi',
                chunksize=200
            )
            logger.info(f"   ✅ 关联关系保存完成")
            
            # 4. 更新分类的股票数量统计
            logger.info(f"4️⃣ 更新分类统计...")
            conn.execute(text("""
                UPDATE categories c
                SET stock_count = (
                    SELECT COUNT(DISTINCT stock_code)
                    FROM category_stock_relations r
                    WHERE r.category_id = c.category_id
                )
            """))
            conn.commit()
            logger.info(f"   ✅ 统计更新完成")
        
        logger.info(f"✅ 所有数据已保存到数据库")
    
    except Exception as e:
        logger.error(f"保存到数据库失败: {e}")
        import traceback
        traceback.print_exc()
        raise


def save_to_json(stocks, categories, relations):
    """保存到JSON文件（备份）"""
    
    import json
    from pathlib import Path
    
    try:
        data_dir = project_root / 'data'
        data_dir.mkdir(exist_ok=True)
        
        with open(data_dir / 'us_stocks.json', 'w', encoding='utf-8') as f:
            json.dump(stocks, f, indent=2, ensure_ascii=False)
        
        with open(data_dir / 'us_categories.json', 'w', encoding='utf-8') as f:
            json.dump(categories, f, indent=2, ensure_ascii=False)
        
        with open(data_dir / 'us_category_relations.json', 'w', encoding='utf-8') as f:
            json.dump(relations, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ JSON文件已保存到 {data_dir}")
    
    except Exception as e:
        logger.error(f"保存JSON失败: {e}")


def print_statistics(stocks, categories, relations):
    """打印统计信息"""
    
    from collections import Counter
    
    logger.info("\n" + "=" * 60)
    logger.info("📊 数据统计报告")
    logger.info("=" * 60)
    
    # 股票统计
    logger.info(f"\n【股票】")
    logger.info(f"  总数: {len(stocks)} 只")
    
    sectors = Counter(s['sector'] for s in stocks)
    logger.info(f"\n【板块分布】Top 10:")
    for sector, count in sectors.most_common(10):
        logger.info(f"  {sector:30s}: {count:3d} 只")
    
    # 分类统计
    logger.info(f"\n【分类】")
    logger.info(f"  总数: {len(categories)} 个")
    level_0 = sum(1 for c in categories if c['level'] == 0)
    level_1 = sum(1 for c in categories if c['level'] == 1)
    logger.info(f"  - Sectors (Level 0): {level_0}")
    logger.info(f"  - Industries (Level 1): {level_1}")
    
    # 关联关系统计
    logger.info(f"\n【关联关系】")
    logger.info(f"  总数: {len(relations)} 条")
    primary = sum(1 for r in relations if r['is_primary'])
    secondary = len(relations) - primary
    logger.info(f"  - 主要分类: {primary}")
    logger.info(f"  - 次要分类: {secondary}")
    
    # 市值统计
    market_caps = [s['market_cap'] for s in stocks]
    logger.info(f"\n【市值范围】")
    logger.info(f"  最小: ${min(market_caps):.1f}M")
    logger.info(f"  最大: ${max(market_caps):.1f}M")
    logger.info(f"  平均: ${sum(market_caps)/len(market_caps):.1f}M")
    logger.info(f"  中位数: ${sorted(market_caps)[len(market_caps)//2]:.1f}M")
    
    # 随机样本
    import random
    samples = random.sample(stocks, min(5, len(stocks)))
    logger.info(f"\n【随机样本】")
    for s in samples:
        logger.info(f"  {s['code']:6s} | {s['name']:30s} | {s['sector']:20s} | ${s['market_cap']:.0f}M")
    
    logger.info("=" * 60 + "\n")


async def main():
    """主函数"""
    
    logger.info("=" * 60)
    logger.info("🚀 开始构建美股股票池（使用Alpha Vantage）")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # 步骤1: 获取股票代码
        logger.info("\n【步骤1】获取股票代码...")
        symbols = get_stocks_from_seed_file()
        
        if not symbols:
            logger.error("❌ 未能获取任何股票代码")
            logger.info("💡 提示：请编辑 data/us_stock_symbols.txt 添加股票代码")
            return
        
        # 步骤2: 获取详细信息（使用Alpha Vantage）
        logger.info("\n【步骤2】使用Alpha Vantage获取股票详细信息...")
        logger.info("⚠️  注意：Alpha Vantage限流严格（5次/分钟），预计耗时较长")
        logger.info(f"   预计时间: {len(symbols) * 12.5 / 60:.1f} 分钟")
        
        stocks = await fetch_stock_details_from_alpha_vantage(symbols)
        
        if not stocks:
            logger.error("❌ 没有符合条件的股票")
            return
        
        # 步骤3: 构建分类树
        logger.info("\n【步骤3】构建分类树...")
        categories, relations = build_category_tree(stocks)
        
        # 步骤4: 保存到数据库
        logger.info("\n【步骤4】保存到数据库...")
        save_to_database(stocks, categories, relations)
        
        # 步骤5: 保存到JSON（备份）
        logger.info("\n【步骤5】保存到JSON文件...")
        save_to_json(stocks, categories, relations)
        
        # 步骤6: 打印统计
        logger.info("\n【步骤6】生成统计报告...")
        print_statistics(stocks, categories, relations)
        
        # 完成
        elapsed = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"✅ 股票池构建完成！")
        logger.info(f"   股票数: {len(stocks)} 只")
        logger.info(f"   分类数: {len(categories)} 个")
        logger.info(f"   关联数: {len(relations)} 条")
        logger.info(f"   耗时: {elapsed/60:.1f} 分钟")
        logger.info("=" * 60)
    
    except Exception as e:
        logger.error(f"❌ 构建失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

