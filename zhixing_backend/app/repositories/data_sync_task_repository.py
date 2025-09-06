"""
数据同步任务Repository
负责数据同步任务的数据库操作
"""
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import sessionmaker
from sqlalchemy import desc, and_, or_
from loguru import logger

from ..database import get_db
from ..models import DataSyncTaskDB


class DataSyncTaskRepository:
    """数据同步任务数据访问层"""
    
    def __init__(self):
        self.db = next(get_db())
    
    async def create_task(
        self, 
        task_type: str, 
        force_full_sync: bool = False,
        target_symbols: Optional[List[str]] = None,
        trigger_source: str = 'manual'
    ) -> str:
        """
        创建新的数据同步任务
        
        Args:
            task_type: 任务类型 (full, incremental, specific)
            force_full_sync: 是否强制全量同步
            target_symbols: 目标股票列表
            trigger_source: 触发源 (manual, scheduled, auto)
        
        Returns:
            任务ID
        """
        try:
            task_id = str(uuid.uuid4())
            
            task = DataSyncTaskDB(
                task_id=task_id,
                task_type=task_type,
                trigger_source=trigger_source,
                status='pending',
                progress=0.0,
                force_full_sync=force_full_sync,
                target_symbols=json.dumps(target_symbols) if target_symbols else None,
                start_time=datetime.utcnow()
            )
            
            self.db.add(task)
            self.db.commit()
            self.db.refresh(task)
            
            logger.info(f"创建数据同步任务: {task_id}, 类型: {task_type}")
            return task_id
            
        except Exception as e:
            logger.error(f"创建数据同步任务失败: {e}")
            self.db.rollback()
            raise
    
    async def get_task(self, task_id: str) -> Optional[DataSyncTaskDB]:
        """根据任务ID获取任务"""
        try:
            task = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.task_id == task_id
            ).first()
            
            if task and task.target_symbols:
                # 解析JSON字符串
                try:
                    task.target_symbols = json.loads(task.target_symbols)
                except:
                    task.target_symbols = None
            
            return task
            
        except Exception as e:
            logger.error(f"获取数据同步任务失败: {e}")
            return None
    
    async def update_task(
        self, 
        task_id: str, 
        status: Optional[str] = None,
        progress: Optional[float] = None,
        processed_stocks: Optional[int] = None,
        success_stocks: Optional[int] = None,
        failed_stocks: Optional[int] = None,
        daily_records: Optional[int] = None,
        hourly_records: Optional[int] = None,
        end_time: Optional[datetime] = None,
        duration_seconds: Optional[float] = None,
        result_summary: Optional[Dict[str, Any]] = None,
        error_details: Optional[Dict[str, Any]] = None,
        sync_details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        更新数据同步任务
        
        Returns:
            是否更新成功
        """
        try:
            task = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.task_id == task_id
            ).first()
            
            if not task:
                logger.warning(f"未找到数据同步任务: {task_id}")
                return False
            
            # 更新字段
            if status is not None:
                task.status = status
            if progress is not None:
                task.progress = progress
            if processed_stocks is not None:
                task.processed_stocks = processed_stocks
            if success_stocks is not None:
                task.success_stocks = success_stocks
            if failed_stocks is not None:
                task.failed_stocks = failed_stocks
            if daily_records is not None:
                task.daily_records = daily_records
            if hourly_records is not None:
                task.hourly_records = hourly_records
            if end_time is not None:
                task.end_time = end_time
            if duration_seconds is not None:
                task.duration_seconds = duration_seconds
            if result_summary is not None:
                task.result_summary = json.dumps(result_summary, ensure_ascii=False)
            if error_details is not None:
                task.error_details = json.dumps(error_details, ensure_ascii=False)
            if sync_details is not None:
                task.sync_details = json.dumps(sync_details, ensure_ascii=False)
            
            task.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(task)
            
            logger.debug(f"更新数据同步任务: {task_id}, 状态: {status}, 进度: {progress}")
            return True
            
        except Exception as e:
            logger.error(f"更新数据同步任务失败: {e}")
            self.db.rollback()
            return False
    
    async def get_running_tasks(self) -> List[DataSyncTaskDB]:
        """获取正在运行的任务列表"""
        try:
            tasks = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.status.in_(['pending', 'running'])
            ).order_by(desc(DataSyncTaskDB.created_at)).all()
            
            # 解析JSON字段
            for task in tasks:
                if task.target_symbols:
                    try:
                        task.target_symbols = json.loads(task.target_symbols)
                    except:
                        task.target_symbols = None
                        
                if task.result_summary:
                    try:
                        task.result_summary = json.loads(task.result_summary)
                    except:
                        task.result_summary = None
                        
                if task.error_details:
                    try:
                        task.error_details = json.loads(task.error_details)
                    except:
                        task.error_details = None
                        
                if task.sync_details:
                    try:
                        task.sync_details = json.loads(task.sync_details)
                    except:
                        task.sync_details = None
            
            return tasks
            
        except Exception as e:
            logger.error(f"获取运行中任务失败: {e}")
            return []
    
    async def get_recent_tasks(self, limit: int = 10) -> List[DataSyncTaskDB]:
        """获取最近的任务列表"""
        try:
            tasks = self.db.query(DataSyncTaskDB).order_by(
                desc(DataSyncTaskDB.created_at)
            ).limit(limit).all()
            
            # 解析JSON字段
            for task in tasks:
                if task.target_symbols:
                    try:
                        task.target_symbols = json.loads(task.target_symbols)
                    except:
                        task.target_symbols = None
                        
                if task.result_summary:
                    try:
                        task.result_summary = json.loads(task.result_summary)
                    except:
                        task.result_summary = None
                        
                if task.error_details:
                    try:
                        task.error_details = json.loads(task.error_details)
                    except:
                        task.error_details = None
                        
                if task.sync_details:
                    try:
                        task.sync_details = json.loads(task.sync_details)
                    except:
                        task.sync_details = None
            
            return tasks
            
        except Exception as e:
            logger.error(f"获取最近任务失败: {e}")
            return []
    
    async def set_task_total_stocks(self, task_id: str, total_stocks: int) -> bool:
        """设置任务的总股票数量"""
        try:
            task = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.task_id == task_id
            ).first()
            
            if not task:
                return False
            
            task.total_stocks = total_stocks
            task.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"设置任务总股票数量失败: {e}")
            self.db.rollback()
            return False
    
    async def increment_processed_stocks(
        self, 
        task_id: str, 
        success: bool = True,
        daily_count: int = 0,
        hourly_count: int = 0
    ) -> bool:
        """增加已处理股票数量"""
        try:
            task = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.task_id == task_id
            ).first()
            
            if not task:
                return False
            
            task.processed_stocks = (task.processed_stocks or 0) + 1
            
            if success:
                task.success_stocks = (task.success_stocks or 0) + 1
            else:
                task.failed_stocks = (task.failed_stocks or 0) + 1
            
            task.daily_records = (task.daily_records or 0) + daily_count
            task.hourly_records = (task.hourly_records or 0) + hourly_count
            
            # 计算进度
            if task.total_stocks and task.total_stocks > 0:
                task.progress = (task.processed_stocks / task.total_stocks) * 100
            
            task.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"增加已处理股票数量失败: {e}")
            self.db.rollback()
            return False
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        try:
            task = self.db.query(DataSyncTaskDB).filter(
                DataSyncTaskDB.task_id == task_id
            ).first()
            
            if not task:
                return False
            
            task.status = 'cancelled'
            task.end_time = datetime.utcnow()
            
            if task.start_time:
                task.duration_seconds = (task.end_time - task.start_time).total_seconds()
            
            task.updated_at = datetime.utcnow()
            
            self.db.commit()
            logger.info(f"取消数据同步任务: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"取消数据同步任务失败: {e}")
            self.db.rollback()
            return False
    
    async def cleanup_old_tasks(self, days_to_keep: int = 30) -> int:
        """清理旧任务记录"""
        try:
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            deleted = self.db.query(DataSyncTaskDB).filter(
                and_(
                    DataSyncTaskDB.created_at < cutoff_date,
                    DataSyncTaskDB.status.in_(['completed', 'failed', 'cancelled'])
                )
            ).delete()
            
            self.db.commit()
            
            logger.info(f"清理了 {deleted} 个旧的数据同步任务记录")
            return deleted
            
        except Exception as e:
            logger.error(f"清理旧任务记录失败: {e}")
            self.db.rollback()
            return 0
