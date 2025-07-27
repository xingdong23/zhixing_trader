import { Concept, ConceptStockRelation, Stock } from '@/types';
import { sampleConcepts, conceptStockMappings } from '@/data/sampleConcepts';

/**
 * 概念标签管理服务
 * 支持自定义概念的创建、编辑、删除和股票关联管理
 */
export class ConceptService {
  private static readonly CONCEPTS_KEY = 'zhixing_concepts';
  private static readonly CONCEPT_RELATIONS_KEY = 'zhixing_concept_relations';

  // ==================== 概念管理 ====================

  /**
   * 从数据库API获取所有概念
   */
  static async getConcepts(): Promise<Concept[]> {
    try {
      console.log('🔄 从数据库API获取概念数据...');
      const response = await fetch('http://localhost:3001/api/v1/concepts/');

      if (!response.ok) {
        console.warn('⚠️ 概念API请求失败，返回空数组');
        return [];
      }

      const result = await response.json();
      if (result.success && result.data.concepts) {
        const concepts = result.data.concepts.map((apiConcept: any) => ({
          id: String(apiConcept.id), // 确保ID是字符串类型
          name: apiConcept.name,
          description: apiConcept.description || '',
          category: apiConcept.category || 'other',
          stockCount: apiConcept.stock_count || 0,
          isActive: apiConcept.is_active !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        console.log(`✅ 从数据库获取到 ${concepts.length} 个概念`);
        return concepts;
      }

      console.warn('⚠️ 概念API返回格式不正确，返回空数组');
      return [];
    } catch (error) {
      console.error('❌ 获取概念数据失败:', error);
      return [];
    }
  }

  /**
   * 保存概念数据
   */
  static saveConcepts(concepts: Concept[]): void {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') return;

      localStorage.setItem(this.CONCEPTS_KEY, JSON.stringify(concepts));
    } catch (error) {
      console.error('保存概念数据失败:', error);
      throw new Error('保存概念数据失败');
    }
  }

  /**
   * 创建新概念
   */
  static createConcept(name: string, description?: string, color?: string): Concept {
    const concepts = this.getConcepts();
    
    // 检查名称是否已存在
    if (concepts.some(c => c.name === name)) {
      throw new Error(`概念"${name}"已存在`);
    }

    const newConcept: Concept = {
      id: `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      color: color || this.generateRandomColor(),
      stockIds: [],
      stockCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    concepts.push(newConcept);
    this.saveConcepts(concepts);
    return newConcept;
  }

  /**
   * 更新概念
   */
  static updateConcept(id: string, updates: Partial<Omit<Concept, 'id' | 'createdAt'>>): Concept {
    const concepts = this.getConcepts();
    const index = concepts.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('概念不存在');
    }

    // 如果更新名称，检查是否重复
    if (updates.name && updates.name !== concepts[index].name) {
      if (concepts.some(c => c.name === updates.name && c.id !== id)) {
        throw new Error(`概念"${updates.name}"已存在`);
      }
    }

    concepts[index] = {
      ...concepts[index],
      ...updates,
      updatedAt: new Date()
    };

    this.saveConcepts(concepts);
    return concepts[index];
  }

  /**
   * 删除概念
   */
  static deleteConcept(id: string): void {
    const concepts = this.getConcepts();
    const filteredConcepts = concepts.filter(c => c.id !== id);
    
    if (filteredConcepts.length === concepts.length) {
      throw new Error('概念不存在');
    }

    this.saveConcepts(filteredConcepts);
    
    // 同时删除相关的关联关系
    this.removeAllStocksFromConcept(id);
  }

  /**
   * 根据ID获取概念
   */
  static getConceptById(id: string): Concept | undefined {
    return this.getConcepts().find(c => c.id === id);
  }

  /**
   * 根据名称搜索概念
   */
  static searchConcepts(query: string): Concept[] {
    const concepts = this.getConcepts();
    const lowerQuery = query.toLowerCase();
    
    return concepts.filter(concept => 
      concept.name.toLowerCase().includes(lowerQuery) ||
      (concept.description && concept.description.toLowerCase().includes(lowerQuery))
    );
  }

  // ==================== 股票-概念关联管理 ====================

  /**
   * 从数据库API获取所有关联关系
   */
  static async getConceptRelations(): Promise<ConceptStockRelation[]> {
    try {
      console.log('🔄 从数据库API获取概念关联关系...');
      const response = await fetch('http://localhost:3001/api/v1/concepts/');

      if (!response.ok) {
        console.warn('⚠️ 概念关联API请求失败，返回空数组');
        return [];
      }

      const result = await response.json();
      if (result.success && result.data.concepts) {
        const relations: ConceptStockRelation[] = [];

        // 从概念数据中提取关联关系
        for (const concept of result.data.concepts) {
          if (concept.stocks && concept.stocks.length > 0) {
            for (const stock of concept.stocks) {
              relations.push({
                conceptId: concept.id,
                stockId: stock.stock_code,
                addedAt: new Date()
              });
            }
          }
        }

        console.log(`✅ 从数据库获取到 ${relations.length} 个概念关联关系`);
        return relations;
      }

      console.warn('⚠️ 概念关联API返回格式不正确，返回空数组');
      return [];
    } catch (error) {
      console.error('❌ 获取概念关联关系失败:', error);
      return [];
    }
  }

  /**
   * 保存关联关系
   */
  static saveConceptRelations(relations: ConceptStockRelation[]): void {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') return;

      localStorage.setItem(this.CONCEPT_RELATIONS_KEY, JSON.stringify(relations));
    } catch (error) {
      console.error('保存关联关系失败:', error);
      throw new Error('保存关联关系失败');
    }
  }

  /**
   * 添加股票到概念
   */
  static addStockToConcept(conceptId: string, stockId: string): void {
    const relations = this.getConceptRelations();
    
    // 检查关联是否已存在
    if (relations.some(r => r.conceptId === conceptId && r.stockId === stockId)) {
      return; // 已存在，不重复添加
    }

    const newRelation: ConceptStockRelation = {
      conceptId,
      stockId,
      addedAt: new Date()
    };

    relations.push(newRelation);
    this.saveConceptRelations(relations);
    
    // 更新概念的股票数量
    this.updateConceptStockCount(conceptId);
  }

  /**
   * 从概念中移除股票
   */
  static removeStockFromConcept(conceptId: string, stockId: string): void {
    const relations = this.getConceptRelations();
    const filteredRelations = relations.filter(
      r => !(r.conceptId === conceptId && r.stockId === stockId)
    );
    
    this.saveConceptRelations(filteredRelations);
    
    // 更新概念的股票数量
    this.updateConceptStockCount(conceptId);
  }

  /**
   * 批量添加股票到概念
   */
  static addStocksToConcept(conceptId: string, stockIds: string[]): void {
    const relations = this.getConceptRelations();
    const existingPairs = new Set(
      relations.map(r => `${r.conceptId}-${r.stockId}`)
    );

    const newRelations = stockIds
      .filter(stockId => !existingPairs.has(`${conceptId}-${stockId}`))
      .map(stockId => ({
        conceptId,
        stockId,
        addedAt: new Date()
      }));

    if (newRelations.length > 0) {
      relations.push(...newRelations);
      this.saveConceptRelations(relations);
      this.updateConceptStockCount(conceptId);
    }
  }

  /**
   * 移除概念的所有股票
   */
  static removeAllStocksFromConcept(conceptId: string): void {
    const relations = this.getConceptRelations();
    const filteredRelations = relations.filter(r => r.conceptId !== conceptId);
    this.saveConceptRelations(filteredRelations);
    this.updateConceptStockCount(conceptId);
  }

  /**
   * 获取概念下的所有股票ID
   */
  static async getStockIdsByConcept(conceptId: string): Promise<string[]> {
    const relations = await this.getConceptRelations();
    return relations
      .filter(r => r.conceptId === conceptId)
      .map(r => r.stockId);
  }

  /**
   * 获取股票关联的所有概念ID
   */
  static async getConceptIdsByStock(stockId: string): Promise<string[]> {
    const relations = await this.getConceptRelations();
    return relations
      .filter(r => r.stockId === stockId)
      .map(r => r.conceptId);
  }

  /**
   * 更新概念的股票数量
   */
  private static updateConceptStockCount(conceptId: string): void {
    const concepts = this.getConcepts();
    const concept = concepts.find(c => c.id === conceptId);
    
    if (concept) {
      const stockIds = this.getStockIdsByConcept(conceptId);
      concept.stockCount = stockIds.length;
      concept.stockIds = stockIds;
      concept.updatedAt = new Date();
      this.saveConcepts(concepts);
    }
  }

  /**
   * 生成随机颜色
   */
  private static generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 获取概念统计信息
   */
  static async getConceptStats(): Promise<{
    totalConcepts: number;
    totalRelations: number;
    avgStocksPerConcept: number;
    topConcepts: Array<{ name: string; stockCount: number }>;
  }> {
    const concepts = await this.getConcepts();
    const relations = await this.getConceptRelations();

    const totalConcepts = concepts.length;
    const totalRelations = relations.length;
    const avgStocksPerConcept = totalConcepts > 0 ? totalRelations / totalConcepts : 0;

    const topConcepts = concepts
      .sort((a, b) => b.stockCount - a.stockCount)
      .slice(0, 5)
      .map(c => ({ name: c.name, stockCount: c.stockCount }));

    return {
      totalConcepts,
      totalRelations,
      avgStocksPerConcept: Math.round(avgStocksPerConcept * 10) / 10,
      topConcepts
    };
  }

  /**
   * 清空所有概念数据
   */
  static clearAllData(): void {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') return;

      localStorage.removeItem(this.CONCEPTS_KEY);
      localStorage.removeItem(this.CONCEPT_RELATIONS_KEY);
    } catch (error) {
      console.error('清空概念数据失败:', error);
      throw new Error('清空概念数据失败');
    }
  }

  /**
   * 导出概念数据
   */
  static exportData(): {
    concepts: Concept[];
    relations: ConceptStockRelation[];
    exportedAt: Date;
  } {
    return {
      concepts: this.getConcepts(),
      relations: this.getConceptRelations(),
      exportedAt: new Date()
    };
  }

  /**
   * 导入概念数据
   */
  static importData(data: {
    concepts: Concept[];
    relations: ConceptStockRelation[];
  }): void {
    this.saveConcepts(data.concepts);
    this.saveConceptRelations(data.relations);
  }

  /**
   * 初始化示例概念数据
   * 如果没有概念数据，则创建示例数据
   */
  static initializeSampleData(): void {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') return;

    const existingConcepts = this.getConcepts();
    if (existingConcepts.length > 0) {
      return; // 已有数据，不需要初始化
    }

    try {
      // 创建示例概念
      const createdConcepts: Concept[] = [];

      for (const sampleConcept of sampleConcepts) {
        const concept = this.createConcept(
          sampleConcept.name,
          sampleConcept.description,
          sampleConcept.color
        );
        createdConcepts.push(concept);
      }

      console.log(`已创建 ${createdConcepts.length} 个示例概念`);

      // 注意：股票关联需要在有股票数据后再建立
      // 这个可以在StockPoolService中调用

    } catch (error) {
      console.error('初始化示例概念数据失败:', error);
    }
  }

  /**
   * 根据股票代码建立概念关联
   * 需要在股票池有数据后调用
   */
  static establishStockConceptRelations(availableStockSymbols: string[]): void {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') return;

    try {
      const concepts = this.getConcepts();
      let relationsCreated = 0;

      for (const concept of concepts) {
        const mappedSymbols = conceptStockMappings[concept.name] || [];
        const validSymbols = mappedSymbols.filter(symbol =>
          availableStockSymbols.includes(symbol)
        );

        if (validSymbols.length > 0) {
          // 这里需要根据symbol找到对应的stockId
          // 暂时跳过，等StockPoolService集成时再实现
          console.log(`概念"${concept.name}"可关联股票:`, validSymbols);
        }
      }

      if (relationsCreated > 0) {
        console.log(`已建立 ${relationsCreated} 个概念-股票关联关系`);
      }
    } catch (error) {
      console.error('建立概念-股票关联失败:', error);
    }
  }

  /**
   * 根据股票代码获取推荐概念
   */
  static getRecommendedConceptsForStock(symbol: string): string[] {
    const recommendedConcepts: string[] = [];

    for (const [conceptName, stockSymbols] of Object.entries(conceptStockMappings)) {
      if (stockSymbols.includes(symbol)) {
        recommendedConcepts.push(conceptName);
      }
    }

    return recommendedConcepts;
  }

  /**
   * 自动为股票添加推荐的概念标签
   */
  static autoAssignConceptsToStock(stockId: string, symbol: string): void {
    const recommendedConceptNames = this.getRecommendedConceptsForStock(symbol);
    const concepts = this.getConcepts();

    for (const conceptName of recommendedConceptNames) {
      const concept = concepts.find(c => c.name === conceptName);
      if (concept) {
        this.addStockToConcept(concept.id, stockId);
      }
    }
  }

  /**
   * 为概念生成颜色
   */
  private static generateColorForConcept(conceptName: string): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
    ];

    // 基于概念名称生成一致的颜色
    let hash = 0;
    for (let i = 0; i < conceptName.length; i++) {
      hash = conceptName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }
}
