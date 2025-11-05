"""
BacktestReport - 回测报告生成类

生成回测报告
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.engine import BacktestResult


class BacktestReport:
    """
    回测报告生成器
    
    生成HTML或PDF格式的回测报告
    """
    
    def __init__(self, result: "BacktestResult"):
        """
        初始化报告生成器
        
        Args:
            result: 回测结果对象
        """
        self.result = result
        
    def generate(self, output_path: str, format: str = "html") -> None:
        """
        生成报告
        
        Args:
            output_path: 输出文件路径
            format: 报告格式（html, pdf）
        """
        if format == "html":
            self._generate_html(output_path)
        elif format == "pdf":
            self._generate_pdf(output_path)
        else:
            raise ValueError(f"Unsupported format: {format}")
            
    def _generate_html(self, output_path: str) -> None:
        """生成HTML报告"""
        # TODO: 实现HTML报告生成
        html_content = self._create_html_content()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
    def _generate_pdf(self, output_path: str) -> None:
        """生成PDF报告"""
        # TODO: 实现PDF报告生成
        raise NotImplementedError("PDF report generation not implemented yet")
        
    def _create_html_content(self) -> str:
        """创建HTML内容"""
        metrics = self.result.metrics
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Backtest Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #333; }}
                .metric {{ margin: 10px 0; }}
                .metric-label {{ font-weight: bold; }}
                .positive {{ color: green; }}
                .negative {{ color: red; }}
            </style>
        </head>
        <body>
            <h1>Backtest Report</h1>
            <h2>Performance Metrics</h2>
            <div class="metric">
                <span class="metric-label">Total Return:</span>
                <span class="{'positive' if metrics.total_return > 0 else 'negative'}">
                    {metrics.total_return:.2%}
                </span>
            </div>
            <div class="metric">
                <span class="metric-label">Annual Return:</span>
                <span>{metrics.annual_return:.2%}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Sharpe Ratio:</span>
                <span>{metrics.sharpe_ratio:.2f}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Max Drawdown:</span>
                <span class="negative">{metrics.max_drawdown:.2%}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Win Rate:</span>
                <span>{metrics.win_rate:.2%}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Profit Factor:</span>
                <span>{metrics.profit_factor:.2f}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Total Trades:</span>
                <span>{metrics.total_trades}</span>
            </div>
        </body>
        </html>
        """
        
        return html
