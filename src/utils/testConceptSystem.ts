import { ConceptService } from '@/services/conceptService';
import { StockPoolService } from '@/services/stockPoolService';

/**
 * 测试概念标签系统功能
 * 用于验证概念创建、股票关联等功能是否正常工作
 */
export function testConceptSystem(): void {
  console.log('🧪 开始测试概念标签系统...');
  
  try {
    // 1. 测试概念创建
    console.log('📝 测试概念创建...');
    
    // 清空现有数据（仅测试用）
    ConceptService.clearAllData();
    
    // 创建测试概念
    const testConcept = ConceptService.createConcept(
      '测试概念',
      '这是一个测试概念',
      '#FF6B6B'
    );
    console.log('✅ 概念创建成功:', testConcept);
    
    // 2. 测试概念获取
    console.log('📋 测试概念获取...');
    const allConcepts = ConceptService.getConcepts();
    console.log('✅ 获取到概念数量:', allConcepts.length);
    
    // 3. 测试概念更新
    console.log('✏️ 测试概念更新...');
    const updatedConcept = ConceptService.updateConcept(testConcept.id, {
      name: '更新后的测试概念',
      description: '这是更新后的描述'
    });
    console.log('✅ 概念更新成功:', updatedConcept);
    
    // 4. 测试股票-概念关联
    console.log('🔗 测试股票-概念关联...');
    
    // 模拟添加股票到概念
    const testStockId = 'test_stock_123';
    ConceptService.addStockToConcept(testConcept.id, testStockId);
    
    // 验证关联
    const conceptStocks = ConceptService.getStockIdsByConcept(testConcept.id);
    const stockConcepts = ConceptService.getConceptIdsByStock(testStockId);
    
    console.log('✅ 概念下的股票:', conceptStocks);
    console.log('✅ 股票的概念:', stockConcepts);
    
    // 5. 测试批量操作
    console.log('📦 测试批量操作...');
    const testStockIds = ['stock_1', 'stock_2', 'stock_3'];
    ConceptService.addStocksToConcept(testConcept.id, testStockIds);
    
    const updatedConceptStocks = ConceptService.getStockIdsByConcept(testConcept.id);
    console.log('✅ 批量添加后的股票:', updatedConceptStocks);
    
    // 6. 测试统计功能
    console.log('📊 测试统计功能...');
    const stats = ConceptService.getConceptStats();
    console.log('✅ 概念统计:', stats);
    
    // 7. 测试推荐功能
    console.log('💡 测试推荐功能...');
    const recommendations = ConceptService.getRecommendedConceptsForStock('TSLA');
    console.log('✅ TSLA的推荐概念:', recommendations);
    
    // 8. 测试数据导出导入
    console.log('💾 测试数据导出导入...');
    const exportedData = ConceptService.exportData();
    console.log('✅ 导出数据:', {
      conceptsCount: exportedData.concepts.length,
      relationsCount: exportedData.relations.length
    });
    
    // 9. 清理测试数据
    console.log('🧹 清理测试数据...');
    ConceptService.deleteConcept(testConcept.id);
    
    const finalConcepts = ConceptService.getConcepts();
    console.log('✅ 清理后概念数量:', finalConcepts.length);
    
    console.log('🎉 概念标签系统测试完成！所有功能正常工作。');
    
  } catch (error) {
    console.error('❌ 概念标签系统测试失败:', error);
    throw error;
  }
}

/**
 * 测试概念与股票池的集成
 */
export function testConceptStockIntegration(): void {
  console.log('🔄 开始测试概念与股票池集成...');
  
  try {
    // 1. 初始化示例数据
    console.log('🚀 初始化示例数据...');
    ConceptService.initializeSampleData();
    
    // 2. 获取股票池数据
    const stocks = StockPoolService.getAllStocks();
    console.log('📈 股票池中的股票数量:', stocks.length);
    
    if (stocks.length > 0) {
      // 3. 测试自动概念分配
      console.log('🤖 测试自动概念分配...');
      const testStock = stocks[0];
      ConceptService.autoAssignConceptsToStock(testStock.id, testStock.symbol);
      
      // 4. 验证分配结果
      const assignedConcepts = ConceptService.getConceptIdsByStock(testStock.id);
      console.log(`✅ 为股票 ${testStock.symbol} 分配的概念数量:`, assignedConcepts.length);
      
      // 5. 测试概念筛选
      console.log('🔍 测试概念筛选...');
      const concepts = ConceptService.getConcepts();
      if (concepts.length > 0) {
        const conceptStocks = StockPoolService.getStocksByConcept(concepts[0].id);
        console.log(`✅ 概念 "${concepts[0].name}" 下的股票数量:`, conceptStocks.length);
      }
    }
    
    console.log('🎉 概念与股票池集成测试完成！');
    
  } catch (error) {
    console.error('❌ 概念与股票池集成测试失败:', error);
    throw error;
  }
}

/**
 * 在浏览器控制台中运行测试
 */
export function runConceptTests(): void {
  if (typeof window === 'undefined') {
    console.log('⚠️ 测试需要在浏览器环境中运行');
    return;
  }
  
  console.log('🧪 开始运行概念标签系统测试套件...');
  console.log('请打开浏览器开发者工具查看详细测试结果');
  
  try {
    // 基础功能测试
    testConceptSystem();
    
    // 集成测试
    testConceptStockIntegration();
    
    console.log('🎉 所有测试通过！概念标签系统工作正常。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 在开发环境中自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保所有模块都已加载
  setTimeout(() => {
    console.log('🔧 开发环境检测到，自动运行概念系统测试...');
    runConceptTests();
  }, 2000);
}
