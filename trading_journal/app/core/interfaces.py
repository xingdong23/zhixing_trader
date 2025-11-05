"""
核心接口定义
定义系统的抽象接口，提高扩展性和可测试性
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import dataclass


@dataclass
class KLineData:
    """K线数据结构"""
    datetime: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    symbol: str = ""


@dataclass
class AnalysisResult:
    """技术分析结果"""
    matched: bool
    score: int
    reasons: List[str]
    technical_details: Optional[str] = None
    confidence: str = "low"
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None


@dataclass
class SelectionResult:
    """选股结果"""
    strategy_id: int
    stock_symbol: str
    execution_time: datetime
    score: float
    confidence: str
    reasons: List[str]
    suggested_action: str
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    current_price: Optional[float] = None
    technical_details: Optional[str] = None
    risk_level: int = 3


class IMarketDataProvider(ABC):
    """市场数据提供者接口"""
    
    @abstractmethod
    async def get_stock_data(self, symbol: str, period: str, interval: str) -> List[KLineData]:
        """获取股票K线数据"""
        pass
    
    @abstractmethod
    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取股票基本信息"""
        pass
    
    @abstractmethod
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码是否有效"""
        pass


class ITechnicalAnalyzer(ABC):
    """技术分析器接口"""
    
    @abstractmethod
    def calculate_sma(self, prices: List[float], period: int) -> List[float]:
        """计算简单移动平均线"""
        pass
    
    @abstractmethod
    def calculate_ema(self, prices: List[float], period: int) -> List[float]:
        """计算指数移动平均线"""
        pass
    
    @abstractmethod
    def analyze_stock(self, symbol: str, daily_data: List[KLineData], 
                     hourly_data: List[KLineData], strategy_type: str) -> AnalysisResult:
        """分析股票"""
        pass


class IStrategy(ABC):
    """策略接口"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """策略名称"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """策略描述"""
        pass
    
    @abstractmethod
    async def execute(self, stock_data: Dict[str, List[KLineData]]) -> List[SelectionResult]:
        """执行策略"""
        pass
    
    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证策略配置"""
        pass


class IStrategyEngine(ABC):
    """策略引擎接口"""
    
    @abstractmethod
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行单个策略"""
        pass
    
    @abstractmethod
    async def execute_all_strategies(self) -> Dict[str, List[SelectionResult]]:
        """执行所有启用的策略"""
        pass
    
    @abstractmethod
    def register_strategy(self, strategy: IStrategy) -> None:
        """注册策略"""
        pass


class IStockRepository(ABC):
    """股票数据仓库接口"""
    
    @abstractmethod
    async def get_all_stocks(self) -> List[Any]:
        """获取所有股票"""
        pass
    
    @abstractmethod
    async def get_stock_by_symbol(self, symbol: str) -> Optional[Any]:
        """根据代码获取股票"""
        pass
    
    @abstractmethod
    async def save_stock(self, stock_data: Dict[str, Any]) -> int:
        """保存股票信息"""
        pass


class IKLineRepository(ABC):
    """K线数据仓库接口"""
    
    @abstractmethod
    async def get_kline_data(self, symbol: str, timeframe: str, 
                           start_date: datetime, end_date: datetime) -> List[Any]:
        """获取K线数据"""
        pass
    
    @abstractmethod
    async def save_kline_data(self, kline_data: Dict[str, Any]) -> bool:
        """保存K线数据"""
        pass
    
    @abstractmethod
    async def cleanup_old_data(self, cutoff_date: datetime) -> int:
        """清理过期数据"""
        pass


class IStrategyRepository(ABC):
    """策略仓库接口"""
    
    @abstractmethod
    async def get_all_strategies(self) -> List[Any]:
        """获取所有策略"""
        pass
    
    @abstractmethod
    async def get_enabled_strategies(self) -> List[Any]:
        """获取启用的策略"""
        pass
    
    @abstractmethod
    async def save_strategy(self, strategy_data: Dict[str, Any]) -> int:
        """保存策略"""
        pass


class ISelectionResultRepository(ABC):
    """选股结果仓库接口"""
    
    @abstractmethod
    async def save_result(self, result: SelectionResult) -> int:
        """保存选股结果"""
        pass
    
    @abstractmethod
    async def get_latest_results(self, strategy_id: Optional[int] = None) -> List[Any]:
        """获取最新结果"""
        pass


class INotificationService(ABC):
    """通知服务接口"""
    
    @abstractmethod
    async def send_selection_notification(self, results: List[SelectionResult]) -> bool:
        """发送选股通知"""
        pass


class IScheduler(ABC):
    """调度器接口"""
    
    @abstractmethod
    async def start(self) -> None:
        """启动调度器"""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """停止调度器"""
        pass
    
    @abstractmethod
    async def schedule_task(self, task_name: str, cron_expression: str, 
                          task_func: callable) -> None:
        """调度任务"""
        pass
