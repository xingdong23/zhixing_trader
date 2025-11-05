"""
快速测试版：初始化前20只股票
用于验证功能，完整版见 init_stock_universe_with_data_sources.py
"""
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 导入完整版的所有函数
from init_stock_universe_with_data_sources import *

# 覆盖main函数，只处理前20只股票
async def main():
    """主函数 - 快速测试版"""
    
    logger.info("=" * 60)
    logger.info("🚀 快速测试：初始化前20只股票")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # 步骤1: 获取股票代码
        logger.info("\n【步骤1】获取股票代码...")
        all_symbols = get_stocks_from_seed_file()
        
        if not all_symbols:
            logger.error("❌ 未能获取任何股票代码")
            return
        
        # 只取前20只
        symbols = all_symbols[:20]
        logger.info(f"✅ 测试集：前 {len(symbols)} 只股票")
        
        # 步骤2: 获取详细信息
        logger.info("\n【步骤2】使用Alpha Vantage获取详细信息...")
        logger.info(f"   预计时间: {len(symbols) * 12.5 / 60:.1f} 分钟")
        
        stocks = await fetch_stock_details_from_alpha_vantage(symbols)
        
        if not stocks:
            logger.error("❌ 没有符合条件的股票")
            return
        
        # 步骤3-6: 与完整版相同
        logger.info("\n【步骤3】构建分类树...")
        categories, relations = build_category_tree(stocks)
        
        logger.info("\n【步骤4】保存到数据库...")
        save_to_database(stocks, categories, relations)
        
        logger.info("\n【步骤5】保存到JSON文件...")
        save_to_json(stocks, categories, relations)
        
        logger.info("\n【步骤6】生成统计报告...")
        print_statistics(stocks, categories, relations)
        
        # 完成
        elapsed = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"✅ 快速测试完成！")
        logger.info(f"   股票数: {len(stocks)} 只")
        logger.info(f"   分类数: {len(categories)} 个")
        logger.info(f"   关联数: {len(relations)} 条")
        logger.info(f"   耗时: {elapsed/60:.1f} 分钟")
        logger.info("=" * 60)
        logger.info("\n💡 提示：验证通过后，运行完整版脚本处理所有257只股票")
        logger.info("   python scripts/init_stock_universe_with_data_sources.py")
    
    except Exception as e:
        logger.error(f"❌ 构建失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
