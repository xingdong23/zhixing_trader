import { Concept, ConceptStockRelation, Stock } from '@/types';

/**
 * 支持自定义概念的创建、编辑、删除和股票关联管理
 */
export class ConceptService {
  // ==================== 概念管理 ====================

  /**
   * 从数据库API获取所有概念
   */
  static async getConcepts(): Promise<Concept[]> {
    try {
      const response = await fetch('http://localhost:8000/api/v1/concepts/');

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
          color: ConceptService.generateColorForConcept(apiConcept.name),
          stockIds: (apiConcept.stocks || []).map((stock: any) => String(stock.id)), // 从关联股票中提取ID
          stockCount: apiConcept.stock_count || 0,
          createdAt: new Date(apiConcept.created_at || Date.now()),
          updatedAt: new Date(apiConcept.updated_at || Date.now())
        }));
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
   * 创建新概念
   */
  static async createConcept(name: string, description?: string, color?: string): Promise<Concept> {
    try {
      // 调用后端API创建概念
      const response = await fetch('http://localhost:8000/api/v1/concepts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          category: 'other'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建概念失败');
      }

      const result = await response.json();
      if (result.success && result.data) {
        const apiConcept = result.data;
        const newConcept: Concept = {
          id: String(apiConcept.id),
          name: apiConcept.name,
          description: apiConcept.description || '',
          color: color || this.generateColorForConcept(apiConcept.name),
          stockIds: [], // 新创建的概念暂时没有关联股票
          stockCount: apiConcept.stock_count || 0,
          createdAt: new Date(apiConcept.created_at || Date.now()),
          updatedAt: new Date(apiConcept.updated_at || Date.now())
        };

        // 概念已通过API保存到后端数据库
        return newConcept;
      }

      throw new Error('API返回格式不正确');
    } catch (error) {
      console.error('创建概念失败:', error);
      throw error;
    }
  }

  /**
   * 更新概念
   */
  static async updateConcept(id: string, updates: Partial<Omit<Concept, 'id' | 'createdAt'>>): Promise<Concept> {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/concepts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          description: updates.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '更新概念失败');
      }

      const result = await response.json();
      if (result.success && result.data.concept) {
        const updatedConcept = result.data.concept;
        return {
          id: String(updatedConcept.id),
          name: updatedConcept.name,
          description: updatedConcept.description || '',
          color: this.generateColorForConcept(updatedConcept.name),
          stockIds: [],
          stockCount: updatedConcept.stock_count || 0,
          createdAt: new Date(updatedConcept.created_at),
          updatedAt: new Date(updatedConcept.updated_at)
        };
      }

      throw new Error('更新概念失败');
    } catch (error) {
      console.error('❌ 更新概念失败:', error);
      throw error;
    }
  }

  /**
   * 删除概念
   */
  static async deleteConcept(id: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/concepts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '删除概念失败');
      }

      console.log(`✅ 概念 ${id} 删除成功`);
    } catch (error) {
      console.error('❌ 删除概念失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取概念
   */
  static async getConceptById(id: string): Promise<Concept | undefined> {
    const concepts = await this.getConcepts();
    return concepts.find(c => c.id === id);
  }

  /**
   * 根据名称搜索概念
   */
  static async searchConcepts(query: string): Promise<Concept[]> {
    const concepts = await this.getConcepts();
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
      const response = await fetch('http://localhost:8000/api/v1/concepts/');

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
   * 从概念中移除股票
   */
  static async removeStockFromConcept(conceptId: string, stockId: string): Promise<void> {
    // 使用API版本移除股票
    await this.removeStockFromConceptAPI(conceptId, stockId);
  }

  /**
   * 添加股票到概念 (API版本)
   */
  static async addStocksToConceptAPI(conceptId: string, stockIds: string[]): Promise<void> {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/concepts/${conceptId}/stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_ids: stockIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '添加股票到概念失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '添加股票到概念失败');
      }
    } catch (error) {
      console.error('添加股票到概念失败:', error);
      throw error;
    }
  }

  /**
   * 从概念中移除股票 (API版本)
   */
  static async removeStockFromConceptAPI(conceptId: string, stockId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/concepts/${conceptId}/stocks/${stockId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '移除股票关联失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '移除股票关联失败');
      }
    } catch (error) {
      console.error('移除股票关联失败:', error);
      throw error;
    }
  }



  /**
   * 移除概念的所有股票
   */
  static async removeAllStocksFromConcept(conceptId: string): Promise<void> {
    // 获取概念下的所有股票ID
    const stockIds = await this.getStockIdsByConcept(conceptId);
    
    // 逐个移除股票（使用API）
    for (const stockId of stockIds) {
      await this.removeStockFromConceptAPI(conceptId, stockId);
    }
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
   * 注意：现在股票数量由后端API自动计算和维护，无需手动更新
   */
  private static async updateConceptStockCount(conceptId: string): Promise<void> {
    // 股票数量现在由后端API自动计算和维护
    // 当添加或移除股票时，后端会自动更新概念的股票数量
    console.log(`概念 ${conceptId} 的股票数量将由后端API自动更新`);
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
   * 导出概念数据
   */
  static async exportData(): Promise<{
    concepts: Concept[];
    relations: ConceptStockRelation[];
    exportedAt: Date;
  }> {
    return {
      concepts: await this.getConcepts(),
      relations: await this.getConceptRelations(),
      exportedAt: new Date()
    };
  }

  /**
   * 初始化示例概念数据
   * 如果没有概念数据，则创建示例数据
   */
  static async initializeSampleData(): Promise<void> {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') return;

    const existingConcepts = await this.getConcepts();
    if (existingConcepts.length > 0) {
      return; // 已有数据，不需要初始化
    }

    try {
      // 创建示例概念
      const createdConcepts: Concept[] = [];

      
      const sampleConcepts = [
        { name: "新能源汽车", description: "电动汽车、混合动力汽车等新能源汽车相关概念", color: "#4CAF50" },
        { name: "人工智能", description: "AI技术、机器学习、深度学习相关概念", color: "#2196F3" },
        { name: "5G通信", description: "5G网络建设、通信设备相关概念", color: "#FF9800" }
      ];      for (const sampleConcept of sampleConcepts) {
        const concept = await this.createConcept(
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
   * 为概念生成颜色
   */
  private static generateColorForConcept(conceptName: string): string {
    // 预定义的颜色列表
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
      '#EC4899', // pink-500
      '#6366F1', // indigo-500
      '#14B8A6', // teal-500
      '#A855F7', // purple-500
      '#22C55E', // green-500
      '#F43F5E', // rose-500
      '#8B5A2B', // brown
      '#6B7280'  // gray-500
    ];

    // 使用概念名称的哈希值来选择颜色，确保相同名称总是得到相同颜色
    let hash = 0;
    for (let i = 0; i < conceptName.length; i++) {
      const char = conceptName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  }
}
