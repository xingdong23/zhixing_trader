"""
统一日志管理模块
提供标准化的日志配置和管理功能
"""

import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path


class LoggerManager:
    """日志管理器"""
    
    # 日志级别映射
    LEVEL_MAP = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    def __init__(self, log_dir: str = "logs"):
        """
        初始化日志管理器
        
        Args:
            log_dir: 日志目录路径
        """
        self.log_dir = Path(log_dir)
        self._ensure_log_dir()
    
    def _ensure_log_dir(self):
        """确保日志目录存在"""
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建子目录
        (self.log_dir / "strategy").mkdir(exist_ok=True)
        (self.log_dir / "trading").mkdir(exist_ok=True)
        (self.log_dir / "system").mkdir(exist_ok=True)
        (self.log_dir / "error").mkdir(exist_ok=True)
    
    def get_logger(
        self, 
        name: str,
        log_file: str = None,
        level: str = "INFO",
        console: bool = True,
        file_handler_type: str = "rotating"
    ) -> logging.Logger:
        """
        获取配置好的logger
        
        Args:
            name: logger名称
            log_file: 日志文件名（不含路径）
            level: 日志级别
            console: 是否输出到控制台
            file_handler_type: 文件处理器类型 ('rotating' 或 'timed')
        
        Returns:
            配置好的logger对象
        """
        logger = logging.getLogger(name)
        logger.setLevel(self.LEVEL_MAP.get(level, logging.INFO))
        
        # 避免重复添加handler
        if logger.handlers:
            return logger
        
        # 日志格式
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # 控制台输出
        if console:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(self.LEVEL_MAP.get(level, logging.INFO))
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        # 文件输出
        if log_file:
            log_path = self.log_dir / log_file
            
            if file_handler_type == "rotating":
                # 按大小轮转（每个文件最大10MB，保留5个备份）
                file_handler = RotatingFileHandler(
                    log_path,
                    maxBytes=10*1024*1024,
                    backupCount=5,
                    encoding='utf-8'
                )
            else:
                # 按时间轮转（每天一个文件，保留30天）
                file_handler = TimedRotatingFileHandler(
                    log_path,
                    when='midnight',
                    interval=1,
                    backupCount=30,
                    encoding='utf-8'
                )
            
            file_handler.setLevel(self.LEVEL_MAP.get(level, logging.INFO))
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def get_strategy_logger(self, strategy_name: str, level: str = "INFO") -> logging.Logger:
        """
        获取策略专用logger
        
        Args:
            strategy_name: 策略名称
            level: 日志级别
        
        Returns:
            策略logger
        """
        today = datetime.now().strftime("%Y%m%d")
        log_file = f"strategy/{strategy_name}_{today}.log"
        return self.get_logger(
            name=f"strategy.{strategy_name}",
            log_file=log_file,
            level=level,
            console=True,
            file_handler_type="timed"
        )
    
    def get_trading_logger(self, level: str = "INFO") -> logging.Logger:
        """
        获取交易专用logger
        
        Args:
            level: 日志级别
        
        Returns:
            交易logger
        """
        today = datetime.now().strftime("%Y%m%d")
        log_file = f"trading/trades_{today}.log"
        return self.get_logger(
            name="trading",
            log_file=log_file,
            level=level,
            console=True,
            file_handler_type="timed"
        )
    
    def get_error_logger(self) -> logging.Logger:
        """
        获取错误专用logger（只记录ERROR及以上级别）
        
        Returns:
            错误logger
        """
        today = datetime.now().strftime("%Y%m%d")
        log_file = f"error/errors_{today}.log"
        return self.get_logger(
            name="error",
            log_file=log_file,
            level="ERROR",
            console=True,
            file_handler_type="timed"
        )
    
    def get_system_logger(self, level: str = "INFO") -> logging.Logger:
        """
        获取系统日志logger
        
        Args:
            level: 日志级别
        
        Returns:
            系统logger
        """
        today = datetime.now().strftime("%Y%m%d")
        log_file = f"system/system_{today}.log"
        return self.get_logger(
            name="system",
            log_file=log_file,
            level=level,
            console=True,
            file_handler_type="timed"
        )


# 全局日志管理器实例
_logger_manager = None


def get_logger_manager(log_dir: str = "logs") -> LoggerManager:
    """
    获取全局日志管理器实例（单例模式）
    
    Args:
        log_dir: 日志目录
    
    Returns:
        LoggerManager实例
    """
    global _logger_manager
    if _logger_manager is None:
        _logger_manager = LoggerManager(log_dir)
    return _logger_manager


# 便捷函数
def get_strategy_logger(strategy_name: str, level: str = "INFO") -> logging.Logger:
    """获取策略logger的便捷函数"""
    return get_logger_manager().get_strategy_logger(strategy_name, level)


def get_trading_logger(level: str = "INFO") -> logging.Logger:
    """获取交易logger的便捷函数"""
    return get_logger_manager().get_trading_logger(level)


def get_error_logger() -> logging.Logger:
    """获取错误logger的便捷函数"""
    return get_logger_manager().get_error_logger()


def get_system_logger(level: str = "INFO") -> logging.Logger:
    """获取系统logger的便捷函数"""
    return get_logger_manager().get_system_logger(level)
