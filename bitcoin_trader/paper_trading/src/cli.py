"""
命令行工具
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from tabulate import tabulate

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from database import get_db
from okx_connector import get_okx
import logging

logging.basicConfig(level=logging.WARNING)


def show_status():
    """显示系统状态"""
    db = get_db()
    okx = get_okx()
    
    # 获取账户余额
    balance = db.get_latest_balance()
    if not balance:
        print("❌ 未找到账户信息")
        return
    
    # 获取持仓
    position = db.get_position(Config.SYMBOL)
    
    # 获取当前价格
    current_price = okx.get_current_price(Config.SYMBOL)
    
    print("\n" + "=" * 80)
    print("📊 系统状态")
    print("=" * 80)
    print(f"💰 账户余额: {balance['total_equity']:.2f} USDT")
    print(f"   可用余额: {balance['available_balance']:.2f} USDT")
    print(f"   已用保证金: {balance.get('margin_used', 0):.2f} USDT")
    print(f"   未实现盈亏: {balance.get('unrealized_pnl', 0):+.2f} USDT")
    print(f"   总盈亏: {balance.get('total_pnl', 0):+.2f} USDT ({balance.get('total_pnl_percent', 0):+.2f}%)")
    
    if position:
        print(f"\n📈 当前持仓:")
        print(f"   方向: {position['side']}")
        print(f"   入场价: {position['entry_price']:.2f}")
        print(f"   当前价: {current_price:.2f}")
        print(f"   数量: {position['amount']:.4f}")
        print(f"   未实现盈亏: {position.get('unrealized_pnl', 0):+.2f} ({position.get('unrealized_pnl_percent', 0):+.2f}%)")
    else:
        print(f"\n📭 当前无持仓")
        print(f"   当前价格: {current_price:.2f}")
    
    print("=" * 80 + "\n")


def show_balance():
    """显示余额历史"""
    db = get_db()
    
    sql = """
    SELECT timestamp, total_equity, total_pnl, total_pnl_percent
    FROM account_balance
    ORDER BY timestamp DESC
    LIMIT 10
    """
    
    balances = db.fetch_all(sql)
    
    if not balances:
        print("❌ 未找到余额记录")
        return
    
    headers = ['时间', '总权益', '总盈亏', '收益率%']
    rows = []
    
    for b in balances:
        rows.append([
            b['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(b['timestamp'], datetime) else b['timestamp'],
            f"{b['total_equity']:.2f}",
            f"{b.get('total_pnl', 0):+.2f}",
            f"{b.get('total_pnl_percent', 0):+.2f}%"
        ])
    
    print("\n" + "=" * 80)
    print("💰 余额历史 (最近10条)")
    print("=" * 80)
    print(tabulate(rows, headers=headers, tablefmt='simple'))
    print("=" * 80 + "\n")


def show_positions():
    """显示持仓"""
    db = get_db()
    
    position = db.get_position(Config.SYMBOL)
    
    if not position:
        print("\n📭 当前无持仓\n")
        return
    
    print("\n" + "=" * 80)
    print("📈 当前持仓")
    print("=" * 80)
    print(f"交易对: {position['symbol']}")
    print(f"方向: {position['side']}")
    print(f"入场价: {position['entry_price']:.2f}")
    print(f"当前价: {position.get('current_price', 0):.2f}")
    print(f"数量: {position['amount']:.4f}")
    print(f"未实现盈亏: {position.get('unrealized_pnl', 0):+.2f} ({position.get('unrealized_pnl_percent', 0):+.2f}%)")
    print(f"止损: {position.get('stop_loss', 0):.2f}")
    print(f"止盈: {position.get('take_profit', 0):.2f}")
    print(f"入场时间: {position['entry_time']}")
    print("=" * 80 + "\n")


def show_history(limit=10):
    """显示交易历史"""
    db = get_db()
    
    sql = f"""
    SELECT entry_time, exit_time, side, entry_price, exit_price, 
           pnl_amount, pnl_percent, exit_reason
    FROM orders
    WHERE status = 'CLOSED'
    ORDER BY exit_time DESC
    LIMIT {limit}
    """
    
    orders = db.fetch_all(sql)
    
    if not orders:
        print("\n❌ 暂无交易历史\n")
        return
    
    headers = ['入场时间', '出场时间', '方向', '入场价', '出场价', '盈亏', '盈亏%', '原因']
    rows = []
    
    for o in orders:
        rows.append([
            o['entry_time'].strftime('%m-%d %H:%M') if isinstance(o['entry_time'], datetime) else str(o['entry_time'])[:16],
            o['exit_time'].strftime('%m-%d %H:%M') if o.get('exit_time') and isinstance(o['exit_time'], datetime) else str(o.get('exit_time', ''))[:16],
            o['side'],
            f"{o['entry_price']:.2f}",
            f"{o.get('exit_price', 0):.2f}",
            f"{o.get('pnl_amount', 0):+.2f}",
            f"{o.get('pnl_percent', 0):+.2f}%",
            o.get('exit_reason', '')
        ])
    
    print("\n" + "=" * 120)
    print(f"📜 交易历史 (最近{limit}笔)")
    print("=" * 120)
    print(tabulate(rows, headers=headers, tablefmt='simple'))
    print("=" * 120 + "\n")


def show_today():
    """显示今日统计"""
    db = get_db()
    
    today = datetime.now().date()
    
    # 获取今日订单
    sql = """
    SELECT COUNT(*) as total,
           SUM(CASE WHEN pnl_amount > 0 THEN 1 ELSE 0 END) as wins,
           SUM(CASE WHEN pnl_amount < 0 THEN 1 ELSE 0 END) as losses,
           SUM(pnl_amount) as total_pnl,
           SUM(fees) as total_fees
    FROM orders
    WHERE DATE(exit_time) = ?
    AND status = 'CLOSED'
    """ if Config.DB_TYPE == 'sqlite' else """
    SELECT COUNT(*) as total,
           SUM(CASE WHEN pnl_amount > 0 THEN 1 ELSE 0 END) as wins,
           SUM(CASE WHEN pnl_amount < 0 THEN 1 ELSE 0 END) as losses,
           SUM(pnl_amount) as total_pnl,
           SUM(fees) as total_fees
    FROM orders
    WHERE DATE(exit_time) = %s
    AND status = 'CLOSED'
    """
    
    stats = db.fetch_one(sql, (today,))
    
    print("\n" + "=" * 80)
    print(f"📊 今日统计 ({today})")
    print("=" * 80)
    
    if stats and stats['total'] > 0:
        win_rate = stats['wins'] / stats['total'] * 100 if stats['total'] > 0 else 0
        print(f"交易次数: {stats['total']}")
        print(f"盈利次数: {stats['wins']}")
        print(f"亏损次数: {stats['losses']}")
        print(f"胜率: {win_rate:.2f}%")
        print(f"总盈亏: {stats.get('total_pnl', 0):+.2f} USDT")
        print(f"总手续费: {stats.get('total_fees', 0):.2f} USDT")
    else:
        print("今日暂无交易")
    
    print("=" * 80 + "\n")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("\n使用方法:")
        print("  python cli.py status      # 查看当前状态")
        print("  python cli.py balance     # 查看余额历史")
        print("  python cli.py positions   # 查看持仓")
        print("  python cli.py history     # 查看交易历史")
        print("  python cli.py today       # 查看今日统计")
        print()
        return
    
    command = sys.argv[1]
    
    try:
        if command == 'status':
            show_status()
        elif command == 'balance':
            show_balance()
        elif command == 'positions':
            show_positions()
        elif command == 'history':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            show_history(limit)
        elif command == 'today':
            show_today()
        else:
            print(f"❌ 未知命令: {command}")
    
    except Exception as e:
        print(f"❌ 执行失败: {e}")


if __name__ == '__main__':
    main()
