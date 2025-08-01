// 【知行交易】应用服务
// 处理应用状态、用户设置、通知和会话管理

import { 
  AppState,
  AppModule,
  AppNotification,
  UserSettings,
  AppStats,
  UIState,
  SessionInfo,
  ApiResponse
} from '../../types';
import { BaseService, ServiceError } from '../core/base.service';

// ==================== 应用服务接口 ====================

/** 通知查询参数 */
export interface NotificationQueryParams {
  type?: string;                      // 通知类型
  isRead?: boolean;                   // 是否已读
  priority?: 'low' | 'medium' | 'high'; // 优先级
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  limit?: number;                     // 限制数量
}

/** 创建通知数据 */
export interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

/** 应用统计查询参数 */
export interface AppStatsQueryParams {
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  module?: AppModule;                 // 模块
  includeDetails?: boolean;           // 包含详细信息
}

/** 用户活动记录 */
export interface UserActivity {
  id: string;
  action: string;
  module: AppModule;
  details?: Record<string, any>;
  timestamp: string;
  duration?: number;
  success: boolean;
}

/** 系统健康检查结果 */
export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  services: {
    database: 'up' | 'down' | 'slow';
    api: 'up' | 'down' | 'slow';
    cache: 'up' | 'down' | 'slow';
    external: 'up' | 'down' | 'slow';
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  lastCheck: string;
}

// ==================== 应用服务实现 ====================

export class AppService extends BaseService {

  constructor() {
    super('AppService');
  }

  // ==================== 应用状态管理 ====================

  /** 获取应用状态 */
  async getAppState(): Promise<ApiResponse<AppState>> {
    try {
      this.logServiceCall('getAppState', '/app/state');
      return await this.http.get<AppState>('/app/state');
    } catch (error) {
      this.handleServiceError(error, '获取应用状态');
    }
  }

  /** 更新应用状态 */
  async updateAppState(updates: Partial<AppState>): Promise<ApiResponse<AppState>> {
    try {
      this.logServiceCall('updateAppState', '/app/state', updates);
      return await this.http.patch<AppState>('/app/state', updates);
    } catch (error) {
      this.handleServiceError(error, '更新应用状态');
    }
  }

  /** 切换当前模块 */
  async switchModule(module: AppModule): Promise<ApiResponse<AppState>> {
    try {
      if (!Object.values(AppModule).includes(module)) {
        throw ServiceError.validationError('无效的应用模块');
      }
      
      this.logServiceCall('switchModule', '/app/module', { module });
      return await this.http.post<AppState>('/app/module', { module });
    } catch (error) {
      this.handleServiceError(error, '切换应用模块');
    }
  }

  /** 获取UI状态 */
  async getUIState(): Promise<ApiResponse<UIState>> {
    try {
      this.logServiceCall('getUIState', '/app/ui-state');
      return await this.http.get<UIState>('/app/ui-state');
    } catch (error) {
      this.handleServiceError(error, '获取UI状态');
    }
  }

  /** 更新UI状态 */
  async updateUIState(updates: Partial<UIState>): Promise<ApiResponse<UIState>> {
    try {
      this.logServiceCall('updateUIState', '/app/ui-state', updates);
      return await this.http.patch<UIState>('/app/ui-state', updates);
    } catch (error) {
      this.handleServiceError(error, '更新UI状态');
    }
  }

  // ==================== 用户设置管理 ====================

  /** 获取用户设置 */
  async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    try {
      this.logServiceCall('getUserSettings', '/app/settings');
      return await this.http.get<UserSettings>('/app/settings');
    } catch (error) {
      this.handleServiceError(error, '获取用户设置');
    }
  }

  /** 更新用户设置 */
  async updateUserSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    try {
      this.validateUserSettings(settings);
      this.logServiceCall('updateUserSettings', '/app/settings', settings);
      
      return await this.http.put<UserSettings>('/app/settings', settings);
    } catch (error) {
      this.handleServiceError(error, '更新用户设置');
    }
  }

  /** 重置用户设置 */
  async resetUserSettings(): Promise<ApiResponse<UserSettings>> {
    try {
      this.logServiceCall('resetUserSettings', '/app/settings/reset');
      return await this.http.post<UserSettings>('/app/settings/reset');
    } catch (error) {
      this.handleServiceError(error, '重置用户设置');
    }
  }

  /** 导出用户设置 */
  async exportUserSettings(): Promise<ApiResponse<{ settings: UserSettings; exportTime: string }>> {
    try {
      this.logServiceCall('exportUserSettings', '/app/settings/export');
      return await this.http.get('/app/settings/export');
    } catch (error) {
      this.handleServiceError(error, '导出用户设置');
    }
  }

  /** 导入用户设置 */
  async importUserSettings(settings: UserSettings): Promise<ApiResponse<UserSettings>> {
    try {
      this.validateUserSettings(settings);
      this.logServiceCall('importUserSettings', '/app/settings/import', settings);
      
      return await this.http.post<UserSettings>('/app/settings/import', settings);
    } catch (error) {
      this.handleServiceError(error, '导入用户设置');
    }
  }

  // ==================== 通知管理 ====================

  /** 获取通知列表 */
  async getNotifications(params?: NotificationQueryParams): Promise<ApiResponse<AppNotification[]>> {
    try {
      const queryParams = this.buildQueryParams(params || {});
      this.logServiceCall('getNotifications', `/app/notifications${queryParams}`);
      
      return await this.http.get<AppNotification[]>(`/app/notifications${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取通知列表');
    }
  }

  /** 根据ID获取通知 */
  async getNotificationById(id: string): Promise<ApiResponse<AppNotification>> {
    try {
      this.validateId(id, '通知ID');
      this.logServiceCall('getNotificationById', `/app/notifications/${id}`);
      
      return await this.http.get<AppNotification>(`/app/notifications/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取通知详情');
    }
  }

  /** 创建通知 */
  async createNotification(data: CreateNotificationData): Promise<ApiResponse<AppNotification>> {
    try {
      this.validateRequired(data, ['type', 'title', 'message']);
      this.validateNotificationData(data);
      this.logServiceCall('createNotification', '/app/notifications', data);
      
      return await this.http.post<AppNotification>('/app/notifications', data);
    } catch (error) {
      this.handleServiceError(error, '创建通知');
    }
  }

  /** 标记通知为已读 */
  async markNotificationAsRead(id: string): Promise<ApiResponse<AppNotification>> {
    try {
      this.validateId(id, '通知ID');
      this.logServiceCall('markNotificationAsRead', `/app/notifications/${id}/read`);
      
      return await this.http.patch<AppNotification>(`/app/notifications/${id}/read`);
    } catch (error) {
      this.handleServiceError(error, '标记通知为已读');
    }
  }

  /** 批量标记通知为已读 */
  async markNotificationsAsRead(ids: string[]): Promise<ApiResponse<{ updated: number }>> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw ServiceError.validationError('通知ID列表不能为空');
      }
      
      this.logServiceCall('markNotificationsAsRead', '/app/notifications/batch/read', { ids });
      return await this.http.post('/app/notifications/batch/read', { ids });
    } catch (error) {
      this.handleServiceError(error, '批量标记通知为已读');
    }
  }

  /** 删除通知 */
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '通知ID');
      this.logServiceCall('deleteNotification', `/app/notifications/${id}`);
      
      return await this.http.delete<void>(`/app/notifications/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除通知');
    }
  }

  /** 清空所有通知 */
  async clearAllNotifications(): Promise<ApiResponse<{ deleted: number }>> {
    try {
      this.logServiceCall('clearAllNotifications', '/app/notifications/clear');
      return await this.http.delete('/app/notifications/clear');
    } catch (error) {
      this.handleServiceError(error, '清空所有通知');
    }
  }

  /** 获取未读通知数量 */
  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      this.logServiceCall('getUnreadNotificationCount', '/app/notifications/unread/count');
      return await this.http.get<{ count: number }>('/app/notifications/unread/count');
    } catch (error) {
      this.handleServiceError(error, '获取未读通知数量');
    }
  }

  // ==================== 应用统计 ====================

  /** 获取应用统计 */
  async getAppStats(params?: AppStatsQueryParams): Promise<ApiResponse<AppStats>> {
    try {
      const queryParams = this.buildQueryParams(params || {});
      this.logServiceCall('getAppStats', `/app/stats${queryParams}`);
      
      return await this.http.get<AppStats>(`/app/stats${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取应用统计');
    }
  }

  /** 记录用户活动 */
  async recordUserActivity(
    action: string,
    module: AppModule,
    details?: Record<string, any>
  ): Promise<ApiResponse<UserActivity>> {
    try {
      if (!action || action.trim().length === 0) {
        throw ServiceError.validationError('用户活动动作不能为空');
      }
      
      const data = { action: action.trim(), module, details };
      this.logServiceCall('recordUserActivity', '/app/activity', data);
      
      return await this.http.post<UserActivity>('/app/activity', data);
    } catch (error) {
      this.handleServiceError(error, '记录用户活动');
    }
  }

  /** 获取用户活动历史 */
  async getUserActivityHistory(
    params?: {
      module?: AppModule;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<UserActivity[]>> {
    try {
      const queryParams = this.buildQueryParams(params || {});
      this.logServiceCall('getUserActivityHistory', `/app/activity${queryParams}`);
      
      return await this.http.get<UserActivity[]>(`/app/activity${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取用户活动历史');
    }
  }

  // ==================== 会话管理 ====================

  /** 获取会话信息 */
  async getSessionInfo(): Promise<ApiResponse<SessionInfo>> {
    try {
      this.logServiceCall('getSessionInfo', '/app/session');
      return await this.http.get<SessionInfo>('/app/session');
    } catch (error) {
      this.handleServiceError(error, '获取会话信息');
    }
  }

  /** 刷新会话 */
  async refreshSession(): Promise<ApiResponse<SessionInfo>> {
    try {
      this.logServiceCall('refreshSession', '/app/session/refresh');
      return await this.http.post<SessionInfo>('/app/session/refresh');
    } catch (error) {
      this.handleServiceError(error, '刷新会话');
    }
  }

  /** 结束会话 */
  async endSession(): Promise<ApiResponse<void>> {
    try {
      this.logServiceCall('endSession', '/app/session/end');
      return await this.http.post<void>('/app/session/end');
    } catch (error) {
      this.handleServiceError(error, '结束会话');
    }
  }

  // ==================== 系统管理 ====================

  /** 系统健康检查 */
  async healthCheck(): Promise<ApiResponse<HealthCheckResult>> {
    try {
      this.logServiceCall('healthCheck', '/app/health');
      return await this.http.get<HealthCheckResult>('/app/health');
    } catch (error) {
      this.handleServiceError(error, '系统健康检查');
    }
  }

  /** 获取系统信息 */
  async getSystemInfo(): Promise<ApiResponse<{
    version: string;
    buildTime: string;
    environment: string;
    features: string[];
    dependencies: Record<string, string>;
  }>> {
    try {
      this.logServiceCall('getSystemInfo', '/app/info');
      return await this.http.get('/app/info');
    } catch (error) {
      this.handleServiceError(error, '获取系统信息');
    }
  }

  /** 清理缓存 */
  async clearCache(type?: 'all' | 'api' | 'user' | 'static'): Promise<ApiResponse<{ cleared: string[] }>> {
    try {
      const params = type ? { type } : {};
      const queryParams = this.buildQueryParams(params);
      this.logServiceCall('clearCache', `/app/cache/clear${queryParams}`);
      
      return await this.http.post(`/app/cache/clear${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '清理缓存');
    }
  }

  /** 备份数据 */
  async backupData(
    options?: {
      includeSettings?: boolean;
      includeUserData?: boolean;
      includeLogs?: boolean;
      format?: 'json' | 'csv';
    }
  ): Promise<ApiResponse<{ backupId: string; downloadUrl: string; size: number }>> {
    try {
      this.logServiceCall('backupData', '/app/backup', options);
      return await this.http.post('/app/backup', options || {});
    } catch (error) {
      this.handleServiceError(error, '备份数据');
    }
  }

  // ==================== 私有方法 ====================

  /** 验证用户设置 */
  private validateUserSettings(settings: Partial<UserSettings>): void {
    if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme.mode)) {
      throw ServiceError.validationError('无效的主题模式');
    }

    // 注释掉riskLevel检查，因为TradingSettings中没有这个属性
    // if (settings.trading?.riskLevel && !['conservative', 'moderate', 'aggressive'].includes(settings.trading.riskLevel)) {
    //   throw ServiceError.validationError('无效的风险等级');
    // }

    // 注释掉defaultQuantity检查，因为TradingSettings中没有这个属性
    // if (settings.trading?.defaultQuantity && settings.trading.defaultQuantity <= 0) {
    //   throw ServiceError.validationError('默认交易数量必须大于0');
    // }

    if (settings.trading?.maxPositionSize && settings.trading.maxPositionSize <= 0) {
      throw ServiceError.validationError('最大持仓数量必须大于0');
    }

    // 注释掉refreshInterval检查，因为DataSettings中没有这个属性
    // if (settings.data?.refreshInterval && settings.data.refreshInterval < 1000) {
    //   throw ServiceError.validationError('刷新间隔不能小于1秒');
    // }
  }

  /** 验证通知数据 */
  private validateNotificationData(data: CreateNotificationData): void {
    if (data.title.length < 1 || data.title.length > 100) {
      throw ServiceError.validationError('通知标题长度应在1-100个字符之间');
    }

    if (data.message.length < 1 || data.message.length > 500) {
      throw ServiceError.validationError('通知消息长度应在1-500个字符之间');
    }

    if (data.actionUrl && !/^https?:\/\/.+/.test(data.actionUrl)) {
      throw ServiceError.validationError('无效的操作链接格式');
    }

    if (data.actionText && (data.actionText.length < 1 || data.actionText.length > 20)) {
      throw ServiceError.validationError('操作文本长度应在1-20个字符之间');
    }
  }
}

// ==================== 导出 ====================

export const appService = new AppService();
export default appService;