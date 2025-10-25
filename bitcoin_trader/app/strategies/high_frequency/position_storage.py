"""
持仓持久化存储模块
用于在程序重启后恢复持仓信息
"""

import json
import os
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class PositionStorage:
    """持仓存储管理器"""
    
    def __init__(self, storage_file: str = "position_state.json"):
        """
        初始化持仓存储
        
        Args:
            storage_file: 存储文件路径
        """
        self.storage_file = storage_file
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        """确保存储文件存在"""
        if not os.path.exists(self.storage_file):
            self.save_position(None)
    
    def save_position(self, position: Optional[Dict[str, Any]]):
        """
        保存持仓信息到文件
        
        Args:
            position: 持仓信息字典，None表示无持仓
        """
        try:
            data = {
                "position": position,
                "last_update": datetime.now().isoformat(),
                "version": "1.0"
            }
            
            # 转换datetime对象为字符串
            if position and "entry_time" in position:
                position["entry_time"] = position["entry_time"].isoformat()
            
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"持仓信息已保存: {position}")
            
        except Exception as e:
            logger.error(f"保存持仓信息失败: {e}")
    
    def load_position(self) -> Optional[Dict[str, Any]]:
        """
        从文件加载持仓信息
        
        Returns:
            持仓信息字典，如果无持仓则返回None
        """
        try:
            if not os.path.exists(self.storage_file):
                logger.info("持仓文件不存在，返回空持仓")
                return None
            
            with open(self.storage_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            position = data.get("position")
            
            # 转换字符串为datetime对象
            if position and "entry_time" in position:
                position["entry_time"] = datetime.fromisoformat(position["entry_time"])
            
            if position:
                logger.info(f"成功加载持仓信息: {position}")
            else:
                logger.info("当前无持仓")
            
            return position
            
        except Exception as e:
            logger.error(f"加载持仓信息失败: {e}")
            return None
    
    def clear_position(self):
        """清空持仓信息"""
        self.save_position(None)
        logger.info("持仓信息已清空")
    
    def get_position_summary(self) -> Dict[str, Any]:
        """
        获取持仓摘要信息
        
        Returns:
            持仓摘要字典
        """
        position = self.load_position()
        
        if not position:
            return {
                "has_position": False,
                "message": "当前无持仓"
            }
        
        return {
            "has_position": True,
            "side": position.get("side"),
            "entry_price": position.get("entry_price"),
            "amount": position.get("amount"),
            "stop_loss": position.get("stop_loss"),
            "take_profit": position.get("take_profit"),
            "entry_time": position.get("entry_time"),
            "message": f"{position.get('side')} 持仓，入场价: {position.get('entry_price')}"
        }
