"""
V15 多实例管理器

管理多个 V15 复利引擎实例，支持：
- 动态启动/停止实例
- 状态查询和同步
- 持久化配置
"""
import json
import logging
import threading
import time
from pathlib import Path
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


@dataclass
class InstanceConfig:
    """实例配置"""
    id: str
    symbol: str
    capital: float
    dry_run: bool = True
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()


@dataclass
class InstanceStatus:
    """实例状态"""
    id: str
    symbol: str
    capital: float
    current_capital: float
    withdrawn: float
    total_value: float
    roi_pct: float
    position: Optional[str]  # None, "long", "short"
    position_pnl_pct: float
    is_running: bool
    last_update: str


class InstanceManager:
    """
    V15 多实例管理器
    
    管理多个 V15 复利引擎实例
    """
    
    def __init__(self):
        self.instances: Dict[str, dict] = {}  # id -> {config, runner, thread, status}
        self._lock = threading.Lock()
        
        # 从数据库加载配置
        self._load_config()
        
        logger.info(f"InstanceManager 初始化: {len(self.instances)} 个实例")
    
    def _load_config(self) -> None:
        """从数据库加载实例配置"""
        try:
            from db.database import db
            db_instances = db.get_all_instances()
            
            for inst in db_instances:
                instance_id = inst['id']
                config = InstanceConfig(
                    id=instance_id,
                    symbol=inst['symbol'],
                    capital=float(inst['capital']),
                    dry_run=bool(inst.get('dry_run', 1)),
                    created_at=str(inst.get('created_at', ''))
                )
                self.instances[instance_id] = {
                    "config": config,
                    "runner": None,
                    "thread": None,
                    "status": InstanceStatus(
                        id=instance_id,
                        symbol=config.symbol,
                        capital=config.capital,
                        current_capital=config.capital,
                        withdrawn=0,
                        total_value=config.capital,
                        roi_pct=0,
                        position=None,
                        position_pnl_pct=0,
                        is_running=inst.get('status') == 'running',
                        last_update=str(inst.get('created_at', ''))
                    )
                }
            logger.info(f"从数据库加载 {len(db_instances)} 个实例")
        except Exception as e:
            logger.error(f"从数据库加载配置失败: {e}")
            # 回退到 JSON 文件
            if self.config_file.exists():
                try:
                    data = json.loads(self.config_file.read_text())
                    for cfg in data.get("instances", []):
                        config = InstanceConfig(**cfg)
                        self.instances[config.id] = {
                            "config": config,
                            "runner": None,
                            "thread": None,
                            "status": None
                        }
                except Exception as e2:
                    logger.error(f"加载 JSON 配置失败: {e2}")
    

    
    def create_instance(self, symbol: str, capital: float, dry_run: bool = True) -> str:
        """
        创建新实例
        
        Args:
            symbol: 交易对 (如 DOGE/USDT:USDT)
            capital: 初始资金
            dry_run: 是否观察模式
            
        Returns:
            实例 ID
        """
        instance_id = str(uuid.uuid4())[:8]
        config = InstanceConfig(
            id=instance_id,
            symbol=symbol,
            capital=capital,
            dry_run=dry_run
        )
        
        with self._lock:
            self.instances[instance_id] = {
                "config": config,
                "runner": None,
                "thread": None,
                "status": InstanceStatus(
                    id=instance_id,
                    symbol=symbol,
                    capital=capital,
                    current_capital=capital,
                    withdrawn=0,
                    total_value=capital,
                    roi_pct=0,
                    position=None,
                    position_pnl_pct=0,
                    is_running=False,
                    last_update=datetime.now().isoformat()
                )
            }
            
            # 保存到数据库
            try:
                from db.database import db
                db.save_instance(instance_id, symbol, capital, dry_run)
            except Exception as e:
                logger.error(f"保存实例到数据库失败: {e}")
        
        logger.info(f"创建实例: {instance_id} - {symbol} - {capital}U")
        return instance_id
    
    def delete_instance(self, instance_id: str) -> bool:
        """删除实例"""
        with self._lock:
            if instance_id not in self.instances:
                return False
            
            inst = self.instances[instance_id]
            if inst["runner"]:
                inst["runner"].stop()
            
            del self.instances[instance_id]
            
            # 从数据库删除
            try:
                from db.database import db
                db.delete_instance(instance_id)
                db.delete_instance_state(instance_id)  # 删除状态数据
            except Exception as e:
                logger.error(f"从数据库删除实例失败: {e}")
        
        logger.info(f"删除实例: {instance_id}")
        return True
    
    def start_instance(self, instance_id: str) -> bool:
        """启动实例"""
        with self._lock:
            if instance_id not in self.instances:
                return False
            
            inst = self.instances[instance_id]
            if inst["runner"] and inst["thread"] and inst["thread"].is_alive():
                return True  # 已在运行
            
            config = inst["config"]
            
            # 延迟导入避免循环依赖
            from core.exchange import ExchangeClient
            from strategies.momentum_v11 import TurboEngineV15
            from notifications.feishu import FeishuNotifier
            from config.settings import settings
            from live.runner_v15 import LiveRunnerV15
            
            exchange = ExchangeClient(
                exchange_name='okx',
                api_key=settings.OKX_API_KEY,
                secret=settings.OKX_SECRET,
                password=settings.OKX_PASSPHRASE
            )
            strategy = TurboEngineV15()
            notifier = FeishuNotifier(settings.FEISHU_WEBHOOK_URL)
            
            runner = LiveRunnerV15(
                strategy=strategy,
                exchange=exchange,
                symbol=config.symbol,
                notifier=notifier,
                instance_id=instance_id,
                dry_run=config.dry_run,
                initial_capital=config.capital,
            )
            
            # 启动线程
            thread = threading.Thread(
                target=self._run_instance,
                args=(instance_id, runner),
                daemon=True
            )
            thread.start()
            
            inst["runner"] = runner
            inst["thread"] = thread
            inst["status"].is_running = True
            
            # 更新数据库状态
            try:
                from db.database import db
                db.update_instance_status(instance_id, 'running')
            except Exception as e:
                logger.error(f"更新数据库状态失败: {e}")
        
        logger.info(f"启动实例: {instance_id}")
        return True
    
    def _run_instance(self, instance_id: str, runner) -> None:
        """运行实例（在线程中）"""
        try:
            runner.run()
        except Exception as e:
            logger.error(f"实例 {instance_id} 运行错误: {e}")
        finally:
            with self._lock:
                if instance_id in self.instances:
                    self.instances[instance_id]["status"].is_running = False
                    
                    # 更新数据库状态
                    try:
                        from db.database import db
                        db.update_instance_status(instance_id, 'stopped')
                    except Exception as e:
                        logger.error(f"更新数据库状态失败: {e}")
    
    def stop_instance(self, instance_id: str, close_position: bool = False) -> bool:
        """
        停止实例
        
        Args:
            instance_id: 实例 ID
            close_position: 是否先平仓再停止
        """
        with self._lock:
            if instance_id not in self.instances:
                return False
            
            inst = self.instances[instance_id]
            
            # 如果需要平仓且有运行中的 runner
            if close_position and inst["runner"]:
                try:
                    # 检查是否有持仓并平仓
                    if inst["runner"].state_manager and inst["runner"].state_manager.has_position():
                        current_price = inst["runner"].exchange.get_current_price(inst["config"].symbol)
                        inst["runner"].close_position(current_price, reason="manual_stop")
                        logger.info(f"实例 {instance_id} 已平仓")
                except Exception as e:
                    logger.error(f"平仓失败: {e}")
            
            if inst["runner"]:
                inst["runner"].stop()
            if inst["status"]:
                inst["status"].is_running = False
            
            # 更新数据库状态
            try:
                from db.database import db
                db.update_instance_status(instance_id, 'stopped')
            except Exception as e:
                logger.error(f"更新数据库状态失败: {e}")
        
        logger.info(f"停止实例: {instance_id} (平仓: {close_position})")
        return True
    
    def get_instance_status(self, instance_id: str) -> Optional[InstanceStatus]:
        """获取实例状态"""
        with self._lock:
            if instance_id not in self.instances:
                return None
            
            inst = self.instances[instance_id]
            status = inst["status"]
            
            # 更新状态
            if inst["runner"] and inst["runner"].money_manager:
                mm = inst["runner"].money_manager
                mm_status = mm.get_status()
                status.current_capital = mm_status["capital"]
                status.withdrawn = mm_status["total_withdrawn"]
                status.total_value = mm_status["total_value"]
                status.roi_pct = (status.total_value - status.capital) / status.capital * 100
                status.last_update = datetime.now().isoformat()
                
                if inst["runner"].state_manager.has_position():
                    status.position = inst["runner"].state_manager.get_position()
                else:
                    status.position = None
            
            return status
    
    def get_all_status(self) -> List[InstanceStatus]:
        """获取所有实例状态"""
        statuses = []
        for instance_id in list(self.instances.keys()):
            status = self.get_instance_status(instance_id)
            if status:
                statuses.append(status)
        return statuses
    
    def get_summary(self) -> dict:
        """获取汇总信息"""
        statuses = self.get_all_status()
        
        total_capital = sum(s.capital for s in statuses)
        total_value = sum(s.total_value for s in statuses)
        total_withdrawn = sum(s.withdrawn for s in statuses)
        running_count = sum(1 for s in statuses if s.is_running)
        
        return {
            "total_instances": len(statuses),
            "running_instances": running_count,
            "total_capital": total_capital,
            "total_value": total_value,
            "total_withdrawn": total_withdrawn,
            "total_roi_pct": (total_value - total_capital) / total_capital * 100 if total_capital > 0 else 0
        }
