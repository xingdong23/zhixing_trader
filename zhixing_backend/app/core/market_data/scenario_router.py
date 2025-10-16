"""
场景化数据源路由器
根据不同使用场景（实时、历史、最近）智能选择最优数据源
"""
from typing import List, Optional, Dict
from loguru import logger

from app.core.interfaces import IMarketDataProvider, KLineData
from app.models import StockInfo
from .multi_provider import MultiProvider


# 场景配置
SCENARIO_CONFIGS = {
    # 实时数据场景 - 追求低延迟
    "realtime": {
        "description": "实时报价和盯盘，要求低延迟、高频更新",
        "sources": [
            {"name": "finnhub", "priority": 1, "weight": 60},      # 主力
            {"name": "twelvedata", "priority": 2, "weight": 30},   # 备用
            {"name": "yahoo", "priority": 3, "weight": 10},        # 兜底
        ],
        "exclude": ["alphavantage"],  # Alpha Vantage有15分钟延迟
        "max_latency": 2.0,  # 最大延迟2秒
        "cache_ttl": 5,  # 缓存5秒
        "use_case": ["盯盘", "日内交易", "实时监控"],
    },
    
    # 历史数据场景 - 追求数据完整性
    "historical": {
        "description": "历史回测和技术分析，要求数据完整、时间跨度长",
        "sources": [
            {"name": "alphavantage", "priority": 1, "weight": 40},  # 主力
            {"name": "twelvedata", "priority": 1, "weight": 40},    # 主力
            {"name": "yahoo", "priority": 2, "weight": 20},         # 备用
        ],
        "exclude": [],
        "min_data_points": 250,  # 至少250个数据点
        "cache_ttl": 86400,  # 缓存24小时（历史数据不常变）
        "use_case": ["策略回测", "技术分析", "趋势研究"],
    },
    
    # 最近数据场景 - 追求准确性和稳定性
    "recent": {
        "description": "最近数据查询，平衡延迟和准确性",
        "sources": [
            {"name": "twelvedata", "priority": 1, "weight": 35},    # 主力
            {"name": "finnhub", "priority": 1, "weight": 35},       # 主力
            {"name": "alphavantage", "priority": 2, "weight": 20},  # 备用
            {"name": "yahoo", "priority": 3, "weight": 10},         # 兜底
        ],
        "exclude": [],
        "verify_with_second": True,  # 关键数据双源验证
        "cache_ttl": 60,  # 缓存1分钟
        "use_case": ["策略执行", "订单决策", "风控检查"],
    },
    
    # 默认场景 - 均衡配置
    "default": {
        "description": "默认均衡配置，适用于一般场景",
        "sources": [
            {"name": "finnhub", "priority": 1, "weight": 40},
            {"name": "twelvedata", "priority": 1, "weight": 30},
            {"name": "alphavantage", "priority": 2, "weight": 15},
            {"name": "yahoo", "priority": 3, "weight": 15},
        ],
        "exclude": [],
        "cache_ttl": 300,  # 缓存5分钟
        "use_case": ["通用查询", "系统初始化", "数据同步"],
    },
}


class ScenarioRouter(IMarketDataProvider):
    """
    场景化数据源路由器
    
    根据使用场景自动选择最优的数据源组合
    
    使用示例:
        # 实时数据
        realtime = ScenarioRouter(scenario="realtime", providers_pool=all_providers)
        price = await realtime.get_latest_price("AAPL")
        
        # 历史数据
        historical = ScenarioRouter(scenario="historical", providers_pool=all_providers)
        data = await historical.get_stock_data("AAPL", "5y", "1d")
    """
    
    def __init__(
        self,
        scenario: str = "default",
        providers_pool: Dict[str, IMarketDataProvider] = None
    ):
        """
        初始化场景路由器
        
        Args:
            scenario: 场景名称 (realtime, historical, recent, default)
            providers_pool: 可用的数据源池 {name: provider}
        """
        self.scenario = scenario
        self.config = SCENARIO_CONFIGS.get(scenario, SCENARIO_CONFIGS["default"])
        self.providers_pool = providers_pool or {}
        
        # 创建场景专用的MultiProvider
        self.multi_provider = self._create_multi_provider()
        
        logger.info(
            f"[ScenarioRouter] 初始化场景: {scenario} - "
            f"{self.config['description']}"
        )
    
    def _create_multi_provider(self) -> MultiProvider:
        """根据场景配置创建MultiProvider"""
        # 过滤并排序数据源
        sources_config = self.config["sources"]
        exclude = set(self.config.get("exclude", []))
        
        # 构建providers列表
        providers_list = []
        
        for source_cfg in sources_config:
            name = source_cfg["name"]
            
            # 跳过排除的数据源
            if name in exclude:
                logger.debug(f"[ScenarioRouter] 排除数据源: {name}")
                continue
            
            # 从池中获取provider
            if name not in self.providers_pool:
                logger.warning(f"[ScenarioRouter] 数据源 {name} 不在池中")
                continue
            
            provider = self.providers_pool[name]
            priority = source_cfg["priority"]
            weight = source_cfg["weight"]
            
            providers_list.append((provider, name, priority, weight))
            logger.debug(
                f"[ScenarioRouter] 添加数据源: {name} "
                f"(优先级:{priority}, 权重:{weight})"
            )
        
        if not providers_list:
            raise ValueError(f"场景 {self.scenario} 没有可用的数据源")
        
        return MultiProvider(providers_list)
    
    async def get_stock_data(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> List[KLineData]:
        """
        获取股票数据（带场景优化）
        
        Args:
            symbol: 股票代码
            period: 时间范围
            interval: 时间间隔
            
        Returns:
            K线数据列表
        """
        logger.debug(
            f"[ScenarioRouter:{self.scenario}] 获取 {symbol} 数据 "
            f"({period}, {interval})"
        )
        
        # 使用场景专用的MultiProvider
        data = await self.multi_provider.get_stock_data(symbol, period, interval)
        
        # 场景特定的后处理
        if self.scenario == "historical":
            # 历史数据场景：检查数据点数量
            min_points = self.config.get("min_data_points", 0)
            if len(data) < min_points:
                logger.warning(
                    f"[ScenarioRouter:{self.scenario}] 数据点不足: "
                    f"{len(data)} < {min_points}"
                )
        
        elif self.scenario == "recent":
            # 最近数据场景：可选的双源验证
            if self.config.get("verify_with_second") and len(data) > 0:
                # TODO: 实现双源验证逻辑
                pass
        
        return data
    
    async def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        """获取股票信息"""
        return await self.multi_provider.get_stock_info(symbol)
    
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码"""
        return await self.multi_provider.validate_symbol(symbol)
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        period: str = "1mo",
        interval: str = "1d"
    ) -> dict:
        """批量获取股票数据"""
        return await self.multi_provider.get_multiple_stocks_data(
            symbols, period, interval
        )
    
    def get_scenario_info(self) -> dict:
        """获取场景信息"""
        return {
            "scenario": self.scenario,
            "description": self.config["description"],
            "sources": [s["name"] for s in self.config["sources"]],
            "excluded": self.config.get("exclude", []),
            "cache_ttl": self.config.get("cache_ttl", 0),
            "use_cases": self.config.get("use_case", []),
        }
    
    def get_statistics(self) -> dict:
        """获取数据源统计信息"""
        stats = self.multi_provider.get_statistics()
        stats["scenario"] = self.scenario
        stats["scenario_config"] = self.get_scenario_info()
        return stats
    
    def print_scenario_info(self):
        """打印场景信息"""
        info = self.get_scenario_info()
        
        print("\n" + "="*60)
        print(f"  场景: {info['scenario']}")
        print("="*60)
        print(f"描述: {info['description']}")
        print(f"\n数据源配置:")
        for source in info['sources']:
            print(f"  • {source}")
        
        if info['excluded']:
            print(f"\n排除的数据源:")
            for source in info['excluded']:
                print(f"  ✗ {source}")
        
        print(f"\n缓存策略: {info['cache_ttl']} 秒")
        
        print(f"\n适用场景:")
        for use_case in info['use_cases']:
            print(f"  → {use_case}")
        
        print("="*60)


def get_available_scenarios() -> List[str]:
    """获取所有可用的场景"""
    return list(SCENARIO_CONFIGS.keys())


def get_scenario_description(scenario: str) -> str:
    """获取场景描述"""
    config = SCENARIO_CONFIGS.get(scenario)
    if config:
        return config["description"]
    return "未知场景"


def print_all_scenarios():
    """打印所有可用场景"""
    print("\n" + "="*80)
    print("  可用场景列表")
    print("="*80)
    
    for scenario, config in SCENARIO_CONFIGS.items():
        print(f"\n📌 {scenario}:")
        print(f"   描述: {config['description']}")
        print(f"   数据源: {', '.join([s['name'] for s in config['sources']])}")
        print(f"   适用: {', '.join(config.get('use_case', []))}")
    
    print("\n" + "="*80)

