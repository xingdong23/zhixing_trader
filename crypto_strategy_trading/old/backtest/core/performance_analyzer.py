"""
性能分析器 - 优雅地分析回测结果
"""

from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class PerformanceAnalyzer:
    """性能分析器"""
    
    @staticmethod
    def print_report(result: Dict[str, Any]):
        """
        打印回测报告
        
        Args:
            result: 回测结果字典
        """
        summary = result['summary']
        
        print("\n" + "="*80)
        print("📊 回测报告")
        print("="*80)
        
        # 资金概况
        print("\n【资金概况】")
        print(f"  初始资金:     {summary['initial_capital']:>12.2f} USDT")
        print(f"  最终资金:     {summary['final_capital']:>12.2f} USDT")
        print(f"  总盈亏:       {summary['total_pnl']:>+12.2f} USDT")
        print(f"  总收益率:     {summary['total_return']:>+12.2f}%")
        print(f"  最大回撤:     {summary['max_drawdown']:>12.2f}%")
        print(f"  累计手续费:   {summary.get('total_fees', 0):>12.2f} USDT ({summary.get('fee_ratio', 0):.2f}%)")
        
        # 交易统计
        print("\n【交易统计】")
        print(f"  总交易次数:   {summary['total_trades']:>12}")
        print(f"  盈利次数:     {summary['winning_trades']:>12}")
        print(f"  亏损次数:     {summary['losing_trades']:>12}")
        print(f"  胜率:         {summary['win_rate']:>12.2f}%")
        
        # 盈亏分析
        print("\n【盈亏分析】")
        print(f"  平均盈利:     {summary['avg_win']:>+12.2f} USDT")
        print(f"  平均亏损:     {summary['avg_loss']:>+12.2f} USDT")
        print(f"  盈亏比:       {summary['profit_factor']:>12.2f}")
        print(f"  平均持仓:     {summary['avg_holding_time']:>12.1f} 分钟")
        
        # 交易明细
        if result.get('trades'):
            print("\n【交易明细】（最近10笔）")
            print(f"{'时间':<20} {'方向':<6} {'入场':<10} {'出场':<10} {'盈亏':<12} {'类型':<15}")
            print("-" * 80)
            
            for trade in result['trades'][-10:]:
                time_str = trade['exit_time'].strftime('%Y-%m-%d %H:%M')
                side = trade['side'].upper()
                entry = f"{trade['entry_price']:.2f}"
                exit_p = f"{trade['exit_price']:.2f}"
                pnl = f"{trade['pnl_amount']:+.2f}"
                exit_type = trade['exit_type']
                
                print(f"{time_str:<20} {side:<6} {entry:<10} {exit_p:<10} {pnl:<12} {exit_type:<15}")
        
        print("\n" + "="*80)
        
        # 评级
        PerformanceAnalyzer._print_rating(summary)
    
    @staticmethod
    def _print_rating(summary: Dict[str, Any]):
        """打印策略评级"""
        print("\n【策略评级】")
        
        score = 0
        comments = []
        
        # 收益率评分
        if summary['total_return'] > 10:
            score += 30
            comments.append("✓ 收益率优秀 (>10%)")
        elif summary['total_return'] > 5:
            score += 20
            comments.append("○ 收益率良好 (5-10%)")
        elif summary['total_return'] > 0:
            score += 10
            comments.append("△ 收益率一般 (0-5%)")
        else:
            comments.append("✗ 收益率为负")
        
        # 胜率评分
        if summary['win_rate'] > 60:
            score += 25
            comments.append("✓ 胜率优秀 (>60%)")
        elif summary['win_rate'] > 50:
            score += 15
            comments.append("○ 胜率良好 (50-60%)")
        elif summary['win_rate'] > 40:
            score += 5
            comments.append("△ 胜率一般 (40-50%)")
        else:
            comments.append("✗ 胜率偏低 (<40%)")
        
        # 盈亏比评分
        if summary['profit_factor'] > 2:
            score += 25
            comments.append("✓ 盈亏比优秀 (>2.0)")
        elif summary['profit_factor'] > 1.5:
            score += 15
            comments.append("○ 盈亏比良好 (1.5-2.0)")
        elif summary['profit_factor'] > 1:
            score += 5
            comments.append("△ 盈亏比一般 (1.0-1.5%)")
        else:
            comments.append("✗ 盈亏比偏低 (<1.0)")
        
        # 回撤评分
        if summary['max_drawdown'] < 10:
            score += 20
            comments.append("✓ 回撤控制优秀 (<10%)")
        elif summary['max_drawdown'] < 20:
            score += 10
            comments.append("○ 回撤控制良好 (10-20%)")
        elif summary['max_drawdown'] < 30:
            score += 5
            comments.append("△ 回撤控制一般 (20-30%)")
        else:
            comments.append("✗ 回撤过大 (>30%)")
        
        # 总评
        if score >= 80:
            rating = "A+ 优秀"
        elif score >= 70:
            rating = "A  良好"
        elif score >= 60:
            rating = "B+ 中等偏上"
        elif score >= 50:
            rating = "B  中等"
        elif score >= 40:
            rating = "C  及格"
        else:
            rating = "D  需要优化"
        
        print(f"\n  综合评分: {score}/100")
        print(f"  策略评级: {rating}")
        print("\n  评价详情:")
        for comment in comments:
            print(f"    {comment}")
        
        print("\n" + "="*80)
    
    @staticmethod
    def save_to_file(result: Dict[str, Any], filename: str = "backtest_result.txt"):
        """
        保存回测结果到文件
        
        Args:
            result: 回测结果
            filename: 文件名
        """
        import json
        from datetime import datetime
        
        # 转换datetime为字符串
        def convert_datetime(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=convert_datetime)
        
        logger.info(f"✓ 回测结果已保存到: {filename}")
