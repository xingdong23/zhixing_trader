"""
飞书通知模块
"""
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class FeishuNotifier:
    """
    飞书 Webhook 通知器
    """
    
    def __init__(self, webhook_url: str):
        """
        Args:
            webhook_url: 飞书机器人 Webhook URL
        """
        self.webhook_url = webhook_url
        self.enabled = bool(webhook_url and "YOUR_" not in webhook_url)
    
    def send(self, title: str, content: str) -> bool:
        """
        发送文本消息
        
        Args:
            title: 消息标题
            content: 消息内容
            
        Returns:
            是否发送成功
        """
        if not self.enabled:
            logger.debug(f"Feishu notification skipped (disabled): {title}")
            return False
        
        payload = {
            "msg_type": "text",
            "content": {
                "text": f"【{title}】\n{content}"
            }
        }
        
        try:
            resp = requests.post(self.webhook_url, json=payload, timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                if result.get('StatusCode') == 0 or result.get('code') == 0:
                    logger.info(f"Feishu notification sent: {title}")
                    return True
                else:
                    logger.warning(f"Feishu API error: {result}")
                    return False
            else:
                logger.warning(f"Feishu HTTP error: {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Feishu notification: {e}")
            return False
    
    def send_rich(self, title: str, elements: list) -> bool:
        """
        发送富文本消息 (卡片消息)
        
        Args:
            title: 卡片标题
            elements: 卡片元素列表
        """
        if not self.enabled:
            return False
        
        payload = {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {
                        "tag": "plain_text",
                        "content": title
                    }
                },
                "elements": elements
            }
        }
        
        try:
            resp = requests.post(self.webhook_url, json=payload, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send rich Feishu notification: {e}")
            return False
    
    def send_trade_signal(
        self,
        action: str,
        symbol: str,
        price: float,
        reason: str = "",
        dry_run: bool = False
    ) -> bool:
        """
        发送交易信号通知
        
        Args:
            action: 'open_long', 'close_long', 'stop_loss', 'trailing_stop'
            symbol: 交易对
            price: 价格
            reason: 原因说明
            dry_run: 是否是观察模式
        """
        mode_tag = "🔍 [观察模式] " if dry_run else ""
        
        emoji_map = {
            'open_long': '🚀',
            'close_long': '💰',
            'stop_loss': '🛑',
            'trailing_stop': '💹'
        }
        
        action_map = {
            'open_long': '开多仓',
            'close_long': '平多仓',
            'stop_loss': '止损平仓',
            'trailing_stop': '移动止盈'
        }
        
        emoji = emoji_map.get(action, '📊')
        action_text = action_map.get(action, action)
        
        content = f"""{mode_tag}{emoji} {action_text}
交易对: {symbol}
价格: {price}
{f'原因: {reason}' if reason else ''}"""
        
        return self.send(f"V11 交易信号", content)
    
    def send_heartbeat(
        self,
        symbol: str,
        current_price: float,
        position_info: Optional[dict] = None,
        balance: Optional[dict] = None,
        dry_run: bool = False
    ) -> bool:
        """
        发送心跳报告
        """
        mode = "观察" if dry_run else "实盘"
        
        pos_status = "无持仓"
        pnl_str = "N/A"
        
        if position_info and position_info.get('entry_price'):
            pos_status = "持仓中"
            entry = position_info['entry_price']
            pnl_pct = (current_price - entry) / entry * 100
            pnl_str = f"{pnl_pct:+.2f}%"
        
        balance_str = ""
        if balance:
            balance_str = f"\n💰 余额: {balance.get('total', 0):.2f} USDT"
        
        content = f"""币种: {symbol}
当前价: {current_price}
持仓: {pos_status}
浮盈: {pnl_str}{balance_str}
状态: ✅ 运行正常
模式: {mode}"""
        
        return self.send("💓 V11 心跳报告", content)
    
    def send_account_sync(
        self,
        symbol: str,
        balance: dict,
        position: Optional[dict] = None,
        current_price: float = 0,
        dry_run: bool = False
    ) -> bool:
        """
        发送账户同步通知
        """
        mode_tag = "[观察模式] " if dry_run else ""
        
        pos_section = f"""📊 交易对: {symbol}
📈 当前价: {current_price}
📦 持仓: 无"""
        
        if position:
            entry = position.get('entry_price', 0)
            contracts = position.get('contracts', 0)
            pnl = position.get('unrealized_pnl', 0)
            leverage = position.get('leverage', 10)
            
            if entry and current_price:
                pnl_pct = (current_price - entry) / entry * 100
            else:
                pnl_pct = 0
            
            pos_section = f"""📊 交易对: {symbol}
📈 当前价: {current_price}
🎯 开仓价: {entry}
📦 持仓量: {contracts}
⚡ 杠杆: {leverage}x
💹 浮盈: {pnl:.2f} USDT ({pnl_pct:+.2f}%)"""
        
        content = f"""{mode_tag}✅ 交易所连接成功

━━━ 账户信息 ━━━
💰 总余额: {balance.get('total', 0):.2f} USDT
💵 可用: {balance.get('free', 0):.2f} USDT
🔒 占用: {balance.get('used', 0):.2f} USDT

━━━ 持仓信息 ━━━
{pos_section}"""
        
        title = "🔄 同步账户 (有持仓)" if position else "🔄 同步账户 (无持仓)"
        return self.send(title, content)
