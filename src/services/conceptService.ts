import { Concept, ConceptStockRelation } from '@/types';
import { apiGet, apiPost, apiPut, apiDelete, API_ENDPOINTS } from '@/utils/api';

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
      const response = await apiGet(API_ENDPOINTS.CONCEPTS);

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
          // 后端返回的字段为 stock_code，这里统一存储为字符串的股票代码
          stockIds: (apiConcept.stocks || []).map((stock: any) => String(stock.stock_code).toUpperCase()),
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
      const response = await apiPost(API_ENDPOINTS.CONCEPTS, {
        name,
        description,
        category: 'other'
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
      const response = await apiPut(`${API_ENDPOINTS.CONCEPTS}/${id}`, {
        name: updates.name,
        description: updates.description
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
      const response = await apiDelete(`${API_ENDPOINTS.CONCEPTS}/${id}`);

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
// ==================== 股票-概念关联管理 ====================

  /**
   * 从数据库API获取所有关联关系
   */
  static async getConceptRelations(): Promise<ConceptStockRelation[]> {
    try {
      console.log('🔄 从数据库API获取概念关联关系...');
      const response = await apiGet(API_ENDPOINTS.CONCEPTS);

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
                conceptId: String(concept.id), // 统一为字符串，避免与前端概念ID类型不一致
                stockId: String(stock.stock_code).toUpperCase(), // 统一为大写股票代码，便于与 Stock.symbol 匹配
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
      const response = await apiPost(`${API_ENDPOINTS.CONCEPTS}/${conceptId}/stocks`, {
        stock_ids: stockIds
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
      const response = await apiDelete(`${API_ENDPOINTS.CONCEPTS}/${conceptId}/stocks/${stockId}`);

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
