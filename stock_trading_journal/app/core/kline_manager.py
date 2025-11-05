"""
K线数据管理器
提供统一的K线数据访问接口，自动路由到对应的时间周期表
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.models import KLineTableManager
from loguru import logger


class KLineManager:
    """
    K线数据管理器
    
    提供统一的接口访问多个时间周期表，自动根据period路由到对应的表
    
    使用示例:
        manager = KLineManager(db_session)
        
        # 查询日线数据
        daily_data = manager.query_klines("AAPL", "1d", limit=100)
        
        # 查询5分钟数据
        min5_data = manager.query_klines("AAPL", "5m", limit=200)
        
        # 插入数据
        manager.insert_kline("AAPL", "1d", kline_data)
    """
    
    def __init__(self, session: Session):
        """
        初始化
        
        Args:
            session: 数据库会话
        """
        self.session = session
    
    def _get_model(self, period: str):
        """获取对应时间周期的表模型"""
        try:
            return KLineTableManager.get_model_by_period(period)
        except ValueError as e:
            logger.error(f"不支持的时间周期: {period}")
            raise
    
    def query_klines(
        self,
        code: str,
        period: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: Optional[int] = None,
        order_by_desc: bool = True
    ) -> List:
        """
        查询K线数据
        
        Args:
            code: 股票代码
            period: 时间周期，如 "1m", "5m", "1h", "1d"
            start_time: 开始时间
            end_time: 结束时间
            limit: 限制返回数量
            order_by_desc: 是否降序排列（最新的在前）
            
        Returns:
            K线数据列表
        """
        model = self._get_model(period)
        
        # 构建查询
        query = self.session.query(model).filter(model.code == code)
        
        # 添加时间范围过滤
        if start_time:
            query = query.filter(model.trade_time >= start_time)
        
        if end_time:
            query = query.filter(model.trade_time <= end_time)
        
        # 排序
        if order_by_desc:
            query = query.order_by(desc(model.trade_time))
        else:
            query = query.order_by(model.trade_time)
        
        # 限制数量
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_latest_kline(self, code: str, period: str):
        """
        获取最新的K线数据
        
        Args:
            code: 股票代码
            period: 时间周期
            
        Returns:
            最新的K线记录，如果不存在返回None
        """
        model = self._get_model(period)
        
        return self.session.query(model).filter(
            model.code == code
        ).order_by(
            desc(model.trade_time)
        ).first()
    
    def get_kline_by_time_key(self, code: str, period: str, time_key: str):
        """
        根据time_key获取K线数据
        
        Args:
            code: 股票代码
            period: 时间周期
            time_key: 时间标识
            
        Returns:
            K线记录，如果不存在返回None
        """
        model = self._get_model(period)
        
        return self.session.query(model).filter(
            and_(
                model.code == code,
                model.time_key == time_key
            )
        ).first()
    
    def insert_kline(self, code: str, period: str, kline_data: dict) -> bool:
        """
        插入K线数据
        
        Args:
            code: 股票代码
            period: 时间周期
            kline_data: K线数据字典
            
        Returns:
            是否成功
        """
        try:
            model = self._get_model(period)
            
            # 创建新记录
            kline = model(
                code=code,
                time_key=kline_data.get("time_key"),
                trade_time=kline_data.get("trade_time", datetime.utcnow()),
                open_price=kline_data["open_price"],
                close_price=kline_data["close_price"],
                high_price=kline_data["high_price"],
                low_price=kline_data["low_price"],
                volume=kline_data.get("volume"),
                turnover=kline_data.get("turnover"),
                change_rate=kline_data.get("change_rate"),
                amplitude=kline_data.get("amplitude"),
            )
            
            self.session.add(kline)
            self.session.commit()
            
            return True
        
        except Exception as e:
            logger.error(f"插入K线数据失败: {e}")
            self.session.rollback()
            return False
    
    def bulk_insert_klines(
        self,
        code: str,
        period: str,
        klines_data: List[dict],
        update_if_exists: bool = False
    ) -> int:
        """
        批量插入K线数据
        
        Args:
            code: 股票代码
            period: 时间周期
            klines_data: K线数据列表
            update_if_exists: 如果已存在是否更新
            
        Returns:
            成功插入的数量
        """
        if not klines_data:
            return 0
        
        try:
            model = self._get_model(period)
            inserted_count = 0
            
            for kline_data in klines_data:
                time_key = kline_data.get("time_key")
                
                # 检查是否已存在
                existing = None
                if time_key and update_if_exists:
                    existing = self.get_kline_by_time_key(code, period, time_key)
                
                if existing:
                    # 更新现有记录
                    existing.trade_time = kline_data.get("trade_time", existing.trade_time)
                    existing.open_price = kline_data.get("open_price", existing.open_price)
                    existing.close_price = kline_data.get("close_price", existing.close_price)
                    existing.high_price = kline_data.get("high_price", existing.high_price)
                    existing.low_price = kline_data.get("low_price", existing.low_price)
                    existing.volume = kline_data.get("volume", existing.volume)
                    existing.turnover = kline_data.get("turnover", existing.turnover)
                    existing.change_rate = kline_data.get("change_rate", existing.change_rate)
                    existing.amplitude = kline_data.get("amplitude", existing.amplitude)
                    inserted_count += 1
                
                else:
                    # 插入新记录
                    kline = model(
                        code=code,
                        time_key=time_key,
                        trade_time=kline_data.get("trade_time", datetime.utcnow()),
                        open_price=kline_data["open_price"],
                        close_price=kline_data["close_price"],
                        high_price=kline_data["high_price"],
                        low_price=kline_data["low_price"],
                        volume=kline_data.get("volume"),
                        turnover=kline_data.get("turnover"),
                        change_rate=kline_data.get("change_rate"),
                        amplitude=kline_data.get("amplitude"),
                    )
                    self.session.add(kline)
                    inserted_count += 1
            
            self.session.commit()
            logger.info(f"批量插入K线数据成功: {code} {period} {inserted_count}条")
            
            return inserted_count
        
        except Exception as e:
            logger.error(f"批量插入K线数据失败: {e}")
            self.session.rollback()
            return 0
    
    def delete_klines(
        self,
        code: str,
        period: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        """
        删除K线数据
        
        Args:
            code: 股票代码
            period: 时间周期
            start_time: 开始时间
            end_time: 结束时间
            
        Returns:
            删除的数量
        """
        try:
            model = self._get_model(period)
            
            # 构建删除条件
            query = self.session.query(model).filter(model.code == code)
            
            if start_time:
                query = query.filter(model.trade_time >= start_time)
            
            if end_time:
                query = query.filter(model.trade_time <= end_time)
            
            count = query.delete()
            self.session.commit()
            
            logger.info(f"删除K线数据: {code} {period} {count}条")
            return count
        
        except Exception as e:
            logger.error(f"删除K线数据失败: {e}")
            self.session.rollback()
            return 0
    
    def count_klines(
        self,
        code: str,
        period: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        """
        统计K线数据数量
        
        Args:
            code: 股票代码
            period: 时间周期
            start_time: 开始时间
            end_time: 结束时间
            
        Returns:
            数据数量
        """
        model = self._get_model(period)
        
        query = self.session.query(model).filter(model.code == code)
        
        if start_time:
            query = query.filter(model.trade_time >= start_time)
        
        if end_time:
            query = query.filter(model.trade_time <= end_time)
        
        return query.count()
    
    def get_all_codes_with_data(self, period: str) -> List[str]:
        """
        获取指定时间周期所有有数据的股票代码
        
        Args:
            period: 时间周期
            
        Returns:
            股票代码列表
        """
        model = self._get_model(period)
        
        result = self.session.query(model.code).distinct().all()
        
        return [row[0] for row in result]
    
    def get_statistics(self, period: str) -> dict:
        """
        获取指定时间周期的统计信息
        
        Args:
            period: 时间周期
            
        Returns:
            统计信息字典
        """
        model = self._get_model(period)
        table_name = KLineTableManager.get_table_name(period)
        
        # 总记录数
        total_count = self.session.query(model).count()
        
        # 股票数量
        stock_count = self.session.query(model.code).distinct().count()
        
        # 最早和最新时间
        earliest = self.session.query(model.trade_time).order_by(
            model.trade_time
        ).first()
        
        latest = self.session.query(model.trade_time).order_by(
            desc(model.trade_time)
        ).first()
        
        return {
            "period": period,
            "table_name": table_name,
            "total_records": total_count,
            "stock_count": stock_count,
            "earliest_time": earliest[0] if earliest else None,
            "latest_time": latest[0] if latest else None,
        }
    
    @staticmethod
    def get_supported_periods() -> List[str]:
        """获取所有支持的时间周期"""
        return KLineTableManager.get_supported_periods()
    
    @staticmethod
    def normalize_period(period: str) -> str:
        """规范化时间周期名称"""
        return KLineTableManager.normalize_period(period)

