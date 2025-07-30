// 【知行交易】系统API服务

import { BaseApiClient } from './baseApi';
import { 
  SyncStatus, 
  DatabaseOperationResult, 
  HealthCheckResponse,
  SystemNotification
} from '../../types/api';
import { ApiResponse } from '../../types/api';

/**
 * 系统API服务类
 */
export class SystemApiService extends BaseApiClient {
  
  // ==================== 数据同步 ====================
  
  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<ApiResponse<SyncStatus>> {
    return this.get<SyncStatus>('/api/system/sync/status');
  }
  
  /**
   * 开始数据同步
   */
  async startSync(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/sync/start');
  }
  
  /**
   * 停止数据同步
   */
  async stopSync(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/sync/stop');
  }
  
  /**
   * 重置同步状态
   */
  async resetSync(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/sync/reset');
  }
  
  // ==================== 数据库管理 ====================
  
  /**
   * 初始化数据库
   */
  async initializeDatabase(): Promise<ApiResponse<DatabaseOperationResult>> {
    return this.post<DatabaseOperationResult>('/api/system/database/init');
  }
  
  /**
   * 清空数据库
   */
  async clearDatabase(): Promise<ApiResponse<DatabaseOperationResult>> {
    return this.post<DatabaseOperationResult>('/api/system/database/clear');
  }
  
  /**
   * 重建数据库
   */
  async rebuildDatabase(): Promise<ApiResponse<DatabaseOperationResult>> {
    return this.post<DatabaseOperationResult>('/api/system/database/rebuild');
  }
  
  /**
   * 备份数据库
   */
  async backupDatabase(): Promise<ApiResponse<{ filename: string; size: number }>> {
    return this.post<{ filename: string; size: number }>('/api/system/database/backup');
  }
  
  /**
   * 恢复数据库
   */
  async restoreDatabase(filename: string): Promise<ApiResponse<DatabaseOperationResult>> {
    return this.post<DatabaseOperationResult>('/api/system/database/restore', { filename });
  }
  
  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/database/stats');
  }
  
  /**
   * 执行数据库维护
   */
  async performDatabaseMaintenance(): Promise<ApiResponse<DatabaseOperationResult>> {
    return this.post<DatabaseOperationResult>('/api/system/database/maintenance');
  }
  
  // ==================== 系统健康检查 ====================
  
  /**
   * 系统健康检查
   */
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.get<HealthCheckResponse>('/api/system/health');
  }
  
  /**
   * 检查数据库连接
   */
  async checkDatabaseConnection(): Promise<ApiResponse<{ status: string; latency: number }>> {
    return this.get<{ status: string; latency: number }>('/api/system/health/database');
  }
  
  /**
   * 检查外部API连接
   */
  async checkExternalApiConnection(): Promise<ApiResponse<{ status: string; services: any }>> {
    return this.get<{ status: string; services: any }>('/api/system/health/external-api');
  }
  
  // ==================== 系统配置 ====================
  
  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/config');
  }
  
  /**
   * 更新系统配置
   */
  async updateSystemConfig(config: any): Promise<ApiResponse<any>> {
    return this.put<any>('/api/system/config', config);
  }
  
  /**
   * 重置系统配置
   */
  async resetSystemConfig(): Promise<ApiResponse<any>> {
    return this.post<any>('/api/system/config/reset');
  }
  
  // ==================== 系统日志 ====================
  
  /**
   * 获取系统日志
   */
  async getSystemLogs(
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit = 100,
    offset = 0
  ): Promise<ApiResponse<any[]>> {
    const params: any = { limit, offset };
    if (level) params.level = level;
    
    return this.get<any[]>('/api/system/logs', params);
  }
  
  /**
   * 清空系统日志
   */
  async clearSystemLogs(): Promise<ApiResponse<void>> {
    return this.delete<void>('/api/system/logs');
  }
  
  /**
   * 下载系统日志
   */
  async downloadSystemLogs(date?: string): Promise<ApiResponse<{ url: string }>> {
    const params: any = {};
    if (date) params.date = date;
    
    return this.get<{ url: string }>('/api/system/logs/download', params);
  }
  
  // ==================== 系统通知 ====================
  
  /**
   * 获取系统通知
   */
  async getSystemNotifications(
    unreadOnly = false,
    limit = 50
  ): Promise<ApiResponse<SystemNotification[]>> {
    return this.get<SystemNotification[]>('/api/system/notifications', {
      unreadOnly,
      limit
    });
  }
  
  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.put<void>(`/api/system/notifications/${id}/read`);
  }
  
  /**
   * 标记所有通知为已读
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.put<void>('/api/system/notifications/read-all');
  }
  
  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/system/notifications/${id}`);
  }
  
  /**
   * 清空所有通知
   */
  async clearAllNotifications(): Promise<ApiResponse<void>> {
    return this.delete<void>('/api/system/notifications');
  }
  
  // ==================== 系统性能 ====================
  
  /**
   * 获取系统性能指标
   */
  async getSystemMetrics(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/metrics');
  }
  
  /**
   * 获取内存使用情况
   */
  async getMemoryUsage(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/metrics/memory');
  }
  
  /**
   * 获取CPU使用情况
   */
  async getCpuUsage(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/metrics/cpu');
  }
  
  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/metrics/disk');
  }
  
  // ==================== 缓存管理 ====================
  
  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<ApiResponse<void>> {
    return this.delete<void>('/api/system/cache');
  }
  
  /**
   * 清空指定缓存
   */
  async clearCache(key: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/system/cache/${key}`);
  }
  
  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/system/cache/stats');
  }
  
  // ==================== 系统维护 ====================
  
  /**
   * 重启系统服务
   */
  async restartSystem(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/restart');
  }
  
  /**
   * 系统维护模式
   */
  async enableMaintenanceMode(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/maintenance/enable');
  }
  
  /**
   * 退出维护模式
   */
  async disableMaintenanceMode(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/system/maintenance/disable');
  }
  
  /**
   * 获取系统版本信息
   */
  async getSystemVersion(): Promise<ApiResponse<{ version: string; buildTime: string }>> {
    return this.get<{ version: string; buildTime: string }>('/api/system/version');
  }
}

// 创建系统API服务实例
export const systemApi = new SystemApiService();