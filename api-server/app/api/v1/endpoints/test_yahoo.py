"""
Yahoo Finance数据测试接口
专门用于测试和验证Yahoo Finance数据输出
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from loguru import logger

from ....core.market_data.yahoo_provider import YahooFinanceProvider

router = APIRouter()

# 创建Yahoo Finance提供者实例
yahoo_provider = YahooFinanceProvider(rate_limit_delay=0.1)


@router.get("/test-stock/{symbol}")
async def test_yahoo_stock_data(
    symbol: str,
    period: str = Query("1mo", description="时间周期: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max"),
    interval: str = Query("1d", description="数据间隔: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo"),
    include_info: bool = Query(True, description="是否包含股票基本信息")
) -> Dict[str, Any]:
    """
    测试Yahoo Finance股票数据获取
    
    Args:
        symbol: 股票代码 (如: AAPL, MSFT, TSLA)
        period: 时间周期
        interval: 数据间隔
        include_info: 是否包含股票基本信息
    
    Returns:
        包含K线数据、基本信息和数据质量分析的完整响应
    """
    try:
        logger.info(f"🔍 测试Yahoo Finance数据: {symbol}, period={period}, interval={interval}")
        
        # 1. 获取K线数据
        kline_data = await yahoo_provider.get_stock_data(symbol, period, interval)
        
        if not kline_data:
            raise HTTPException(
                status_code=404, 
                detail=f"未能获取股票 {symbol} 的数据，请检查股票代码是否正确"
            )
        
        # 2. 数据质量分析
        data_analysis = _analyze_data_quality(kline_data)
        
        # 3. 获取股票基本信息（如果需要）
        stock_info = None
        if include_info:
            stock_info = await yahoo_provider.get_stock_info(symbol)
        
        # 4. 格式化K线数据
        formatted_klines = []
        for i, kline in enumerate(kline_data):
            formatted_klines.append({
                "index": i + 1,
                "datetime": kline.datetime.isoformat(),
                "date": kline.datetime.strftime("%Y-%m-%d"),
                "time": kline.datetime.strftime("%H:%M:%S") if interval.endswith(('m', 'h')) else "00:00:00",
                "open": round(kline.open, 4),
                "high": round(kline.high, 4),
                "low": round(kline.low, 4),
                "close": round(kline.close, 4),
                "volume": kline.volume,
                "symbol": kline.symbol,
                # 计算一些基本指标
                "change": round(kline.close - kline.open, 4),
                "change_percent": round((kline.close - kline.open) / kline.open * 100, 2),
                "range": round(kline.high - kline.low, 4),
                "range_percent": round((kline.high - kline.low) / kline.low * 100, 2)
            })
        
        # 5. 构建响应
        response = {
            "success": True,
            "request_info": {
                "symbol": symbol.upper(),
                "period": period,
                "interval": interval,
                "request_time": datetime.now().isoformat(),
                "data_source": "Yahoo Finance"
            },
            "data_summary": {
                "total_records": len(kline_data),
                "date_range": {
                    "start": kline_data[0].datetime.isoformat() if kline_data else None,
                    "end": kline_data[-1].datetime.isoformat() if kline_data else None,
                    "days_span": (kline_data[-1].datetime - kline_data[0].datetime).days if len(kline_data) > 1 else 0
                },
                "price_summary": {
                    "latest_price": kline_data[-1].close if kline_data else None,
                    "period_high": max(k.high for k in kline_data) if kline_data else None,
                    "period_low": min(k.low for k in kline_data) if kline_data else None,
                    "period_change": round(kline_data[-1].close - kline_data[0].open, 4) if len(kline_data) > 1 else None,
                    "period_change_percent": round((kline_data[-1].close - kline_data[0].open) / kline_data[0].open * 100, 2) if len(kline_data) > 1 else None
                }
            },
            "data_quality": data_analysis,
            "stock_info": stock_info,
            "kline_data": formatted_klines[:10],  # 只返回前10条详细数据
            "sample_data": {
                "first_record": formatted_klines[0] if formatted_klines else None,
                "last_record": formatted_klines[-1] if formatted_klines else None,
                "middle_record": formatted_klines[len(formatted_klines)//2] if formatted_klines else None
            }
        }
        
        logger.info(f"✅ 成功获取 {symbol} 数据: {len(kline_data)} 条记录")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 测试Yahoo Finance数据失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"获取数据时发生错误: {str(e)}"
        )


@router.get("/validate-symbol/{symbol}")
async def validate_stock_symbol(symbol: str) -> Dict[str, Any]:
    """
    验证股票代码是否有效
    """
    try:
        logger.info(f"🔍 验证股票代码: {symbol}")
        
        is_valid = await yahoo_provider.validate_symbol(symbol)
        
        response = {
            "success": True,
            "symbol": symbol.upper(),
            "is_valid": is_valid,
            "validation_time": datetime.now().isoformat(),
            "message": f"股票代码 {symbol.upper()} {'有效' if is_valid else '无效'}"
        }
        
        if is_valid:
            # 如果有效，获取基本信息
            stock_info = await yahoo_provider.get_stock_info(symbol)
            response["stock_info"] = stock_info
        
        return response
        
    except Exception as e:
        logger.error(f"❌ 验证股票代码失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"验证股票代码时发生错误: {str(e)}"
        )


@router.get("/compare-intervals/{symbol}")
async def compare_data_intervals(
    symbol: str,
    base_period: str = Query("5d", description="基础时间周期")
) -> Dict[str, Any]:
    """
    比较不同时间间隔的数据
    """
    try:
        logger.info(f"🔍 比较 {symbol} 不同时间间隔的数据")
        
        intervals = ["1d", "1h", "15m"] if base_period in ["5d", "1mo"] else ["1d"]
        
        comparison_data = {}
        
        for interval in intervals:
            try:
                data = await yahoo_provider.get_stock_data(symbol, base_period, interval)
                
                if data:
                    comparison_data[interval] = {
                        "record_count": len(data),
                        "date_range": {
                            "start": data[0].datetime.isoformat(),
                            "end": data[-1].datetime.isoformat()
                        },
                        "price_range": {
                            "high": max(k.high for k in data),
                            "low": min(k.low for k in data),
                            "latest": data[-1].close
                        },
                        "sample_records": [
                            {
                                "datetime": data[0].datetime.isoformat(),
                                "close": data[0].close
                            },
                            {
                                "datetime": data[-1].datetime.isoformat(), 
                                "close": data[-1].close
                            }
                        ]
                    }
                else:
                    comparison_data[interval] = {"error": "无数据"}
                    
            except Exception as e:
                comparison_data[interval] = {"error": str(e)}
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "base_period": base_period,
            "comparison_time": datetime.now().isoformat(),
            "intervals_data": comparison_data
        }
        
    except Exception as e:
        logger.error(f"❌ 比较数据间隔失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"比较数据时发生错误: {str(e)}"
        )


def _analyze_data_quality(kline_data: List) -> Dict[str, Any]:
    """分析数据质量"""
    if not kline_data:
        return {"status": "no_data", "issues": ["没有数据"]}
    
    issues = []
    warnings = []
    
    # 检查数据完整性
    for i, kline in enumerate(kline_data):
        # 价格逻辑检查
        if kline.high < kline.low:
            issues.append(f"第{i+1}条: 最高价({kline.high})小于最低价({kline.low})")
        
        if kline.high < max(kline.open, kline.close):
            issues.append(f"第{i+1}条: 最高价({kline.high})小于开盘价或收盘价")
        
        if kline.low > min(kline.open, kline.close):
            issues.append(f"第{i+1}条: 最低价({kline.low})大于开盘价或收盘价")
        
        # 价格合理性检查
        if kline.open <= 0 or kline.close <= 0:
            issues.append(f"第{i+1}条: 价格小于等于0")
        
        if kline.volume < 0:
            issues.append(f"第{i+1}条: 成交量小于0")
        
        # 异常波动检查
        if i > 0:
            prev_close = kline_data[i-1].close
            change_percent = abs(kline.close - prev_close) / prev_close
            if change_percent > 0.5:  # 50%以上变化
                warnings.append(f"第{i+1}条: 价格变化异常大({change_percent:.1%})")
    
    # 时间顺序检查
    for i in range(1, len(kline_data)):
        if kline_data[i].datetime <= kline_data[i-1].datetime:
            issues.append(f"第{i+1}条: 时间顺序错误")
    
    # 数据连续性检查
    gaps = []
    for i in range(1, len(kline_data)):
        time_diff = kline_data[i].datetime - kline_data[i-1].datetime
        if time_diff.days > 7:  # 超过7天的间隔
            gaps.append(f"第{i}到{i+1}条之间有{time_diff.days}天间隔")
    
    status = "excellent"
    if issues:
        status = "poor"
    elif warnings or gaps:
        status = "good"
    
    return {
        "status": status,
        "total_records": len(kline_data),
        "issues": issues,
        "warnings": warnings,
        "gaps": gaps,
        "quality_score": max(0, 100 - len(issues) * 20 - len(warnings) * 5),
        "summary": f"数据质量{status}, 发现{len(issues)}个问题, {len(warnings)}个警告"
    }
