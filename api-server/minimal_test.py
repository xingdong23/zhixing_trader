#!/usr/bin/env python3
"""
最小化测试服务器
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 创建FastAPI应用
app = FastAPI(
    title="知行交易 API 测试服务",
    description="最小化测试版本",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """根路径"""
    return {"message": "知行交易 API 测试服务运行中", "status": "ok"}

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "message": "API server is running"
        }
    }

@app.get("/api/test")
async def test_endpoint():
    """测试端点"""
    return {
        "success": True,
        "data": {
            "message": "测试端点正常工作",
            "features": [
                "FastAPI 服务器",
                "CORS 支持",
                "健康检查",
                "Yahoo Finance测试接口"
            ]
        }
    }

# 添加Yahoo Finance测试接口
@app.get("/api/test-yahoo/{symbol}")
async def test_yahoo_simple(
    symbol: str,
    period: str = "5d",
    interval: str = "1d"
):
    """简化的Yahoo Finance测试接口 - 支持多种时间维度"""
    try:
        import yfinance as yf
        from datetime import datetime

        # 获取股票数据
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)

        if data.empty:
            return {
                "success": False,
                "error": f"未能获取股票 {symbol} 的数据，period={period}, interval={interval}"
            }

        # 格式化数据
        records = []
        for timestamp, row in data.iterrows():
            # 根据interval决定时间格式
            if interval.endswith(('m', 'h')):
                # 小时或分钟数据，显示完整时间
                time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
                date_str = timestamp.strftime("%Y-%m-%d")
                time_only = timestamp.strftime("%H:%M:%S")
            else:
                # 日线数据，只显示日期
                time_str = timestamp.strftime("%Y-%m-%d")
                date_str = timestamp.strftime("%Y-%m-%d")
                time_only = "00:00:00"

            records.append({
                "datetime": time_str,
                "date": date_str,
                "time": time_only,
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume']),
                "change": round(float(row['Close'] - row['Open']), 2),
                "change_percent": round((float(row['Close'] - row['Open']) / float(row['Open'])) * 100, 2)
            })

        # 计算统计信息
        prices = [r["close"] for r in records]
        period_high = max(r["high"] for r in records)
        period_low = min(r["low"] for r in records)

        return {
            "success": True,
            "symbol": symbol.upper(),
            "request_params": {
                "period": period,
                "interval": interval,
                "data_type": "小时线" if interval.endswith(('m', 'h')) else "日线"
            },
            "data_summary": {
                "total_records": len(records),
                "date_range": {
                    "start": records[0]["datetime"] if records else None,
                    "end": records[-1]["datetime"] if records else None
                },
                "price_summary": {
                    "latest_price": records[-1]["close"] if records else None,
                    "period_high": period_high,
                    "period_low": period_low,
                    "period_change": round(records[-1]["close"] - records[0]["open"], 2) if len(records) > 1 else None,
                    "period_change_percent": round((records[-1]["close"] - records[0]["open"]) / records[0]["open"] * 100, 2) if len(records) > 1 else None
                }
            },
            "sample_data": {
                "first_3_records": records[:3],
                "last_3_records": records[-3:] if len(records) >= 3 else records
            },
            "all_data": records,  # 返回所有数据
            "test_time": datetime.now().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"获取数据失败: {str(e)}"
        }

@app.get("/api/test-yahoo-hourly/{symbol}")
async def test_yahoo_hourly(symbol: str):
    """专门测试小时线数据"""
    return await test_yahoo_simple(symbol, period="5d", interval="1h")

@app.get("/api/test-yahoo-minute/{symbol}")
async def test_yahoo_minute(symbol: str):
    """专门测试分钟线数据"""
    return await test_yahoo_simple(symbol, period="1d", interval="15m")

@app.get("/api/test-ema55/{symbol}")
async def test_ema55_strategy(symbol: str):
    """测试EMA55回踩企稳策略"""
    try:
        import yfinance as yf
        import numpy as np
        from datetime import datetime, timedelta

        # 获取足够的历史数据用于EMA55计算
        ticker = yf.Ticker(symbol)
        daily_data = ticker.history(period="6mo", interval="1d")  # 6个月日线
        hourly_data = ticker.history(period="30d", interval="1h")  # 30天小时线

        if daily_data.empty:
            return {
                "success": False,
                "error": f"未能获取股票 {symbol} 的数据"
            }

        # 计算EMA55
        closes = daily_data['Close'].values
        ema55 = _calculate_ema(closes, 55)

        # 获取最近的数据进行分析
        recent_data = daily_data.tail(60)  # 最近60天
        recent_ema55 = ema55[-60:] if len(ema55) >= 60 else ema55

        # 简化的EMA55回踩检测逻辑
        analysis_result = _analyze_ema55_pullback(recent_data, recent_ema55)

        return {
            "success": True,
            "symbol": symbol.upper(),
            "strategy": "EMA55回踩企稳策略",
            "analysis_result": analysis_result,
            "current_price": float(daily_data['Close'].iloc[-1]),
            "ema55_current": float(recent_ema55[-1]) if len(recent_ema55) > 0 else None,
            "data_summary": {
                "daily_records": len(daily_data),
                "hourly_records": len(hourly_data),
                "analysis_period": "最近60天"
            },
            "test_time": datetime.now().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"EMA55策略测试失败: {str(e)}"
        }

def _calculate_ema(prices, period):
    """计算EMA"""
    import numpy as np

    if len(prices) < period:
        return []

    # 简化的EMA计算
    multiplier = 2 / (period + 1)
    ema = [sum(prices[:period]) / period]  # 第一个值用SMA

    for price in prices[period:]:
        ema.append((price * multiplier) + (ema[-1] * (1 - multiplier)))

    return [np.nan] * (period - 1) + ema

def _analyze_ema55_pullback(daily_data, ema55):
    """简化的EMA55回踩分析"""
    import numpy as np

    try:
        if len(daily_data) < 30 or len(ema55) < 30:
            return {
                "matched": False,
                "score": 0,
                "reason": "数据不足"
            }

        closes = daily_data['Close'].values
        highs = daily_data['High'].values
        lows = daily_data['Low'].values

        # 1. 检测前期主升浪（最近30天内涨幅>20%）
        period_low = min(lows[-30:])
        period_high = max(highs[-30:])
        uptrend_gain = (period_high - period_low) / period_low

        if uptrend_gain < 0.20:
            return {
                "matched": False,
                "score": 30,
                "reason": f"前期涨幅不足20% (实际: {uptrend_gain:.1%})",
                "uptrend_gain": f"{uptrend_gain:.1%}"
            }

        # 2. 检测回踩EMA55
        current_price = closes[-1]
        current_ema55 = ema55[-1]

        if np.isnan(current_ema55):
            return {
                "matched": False,
                "score": 0,
                "reason": "EMA55计算失败"
            }

        distance_to_ema = abs(current_price - current_ema55) / current_ema55

        # 3. 检测企稳（最近5天波动<3%）
        recent_highs = highs[-5:]
        recent_lows = lows[-5:]
        recent_volatility = (max(recent_highs) - min(recent_lows)) / min(recent_lows)

        # 计算评分
        score = 50  # 基础分

        # 主升浪加分
        score += min(int(uptrend_gain * 100), 25)

        # 回踩距离加分（距离EMA55越近越好）
        if distance_to_ema <= 0.03:  # 3%以内
            score += 15
        elif distance_to_ema <= 0.05:  # 5%以内
            score += 10

        # 企稳加分
        if recent_volatility <= 0.03:  # 3%以内波动
            score += 15
        elif recent_volatility <= 0.05:  # 5%以内波动
            score += 10

        # 价格在EMA55之上加分
        if current_price > current_ema55:
            score += 5

        matched = score >= 70  # 70分以上认为匹配

        return {
            "matched": matched,
            "score": min(score, 100),
            "reason": "符合EMA55回踩企稳条件" if matched else "不完全符合条件",
            "details": {
                "uptrend_gain": f"{uptrend_gain:.1%}",
                "distance_to_ema55": f"{distance_to_ema:.1%}",
                "recent_volatility": f"{recent_volatility:.1%}",
                "price_vs_ema55": "上方" if current_price > current_ema55 else "下方",
                "current_price": round(current_price, 2),
                "ema55_value": round(current_ema55, 2)
            }
        }

    except Exception as e:
        return {
            "matched": False,
            "score": 0,
            "reason": f"分析错误: {str(e)}"
        }

@app.post("/api/sync/trigger")
async def trigger_data_sync_simple(force_full: bool = False):
    """简化的数据同步触发接口"""
    try:
        from datetime import datetime

        # 模拟数据同步过程
        sync_start = datetime.now()

        # 这里应该调用真实的数据同步服务
        # 暂时返回模拟结果

        return {
            "success": True,
            "message": "数据同步任务已启动",
            "sync_type": "full" if force_full else "incremental",
            "start_time": sync_start.isoformat(),
            "status": "started",
            "note": "这是简化版本，完整功能请使用完整后端服务"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"触发数据同步失败: {str(e)}"
        }

@app.get("/api/sync/status")
async def get_sync_status_simple():
    """简化的同步状态查询接口"""
    try:
        from datetime import datetime

        return {
            "success": True,
            "sync_status": {
                "is_syncing": False,
                "last_sync_time": None,
                "next_sync_time": None
            },
            "watchlist_count": 0,  # TODO: 从实际数据源获取
            "data_statistics": {
                "total_records": 0,
                "symbols": [],
                "timeframes": ["1d", "1h"]
            },
            "current_time": datetime.now().isoformat(),
            "note": "这是简化版本，完整功能请使用完整后端服务"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"获取同步状态失败: {str(e)}"
        }

@app.get("/api/v1/data/database/overview")
async def get_database_overview_simple():
    """简化的数据库概览接口"""
    try:
        from datetime import datetime, timedelta

        # 模拟数据库概览数据
        return {
            "success": True,
            "overview": {
                "total_stocks": 5,
                "total_kline_records": 12500,
                "symbols_with_data": 5,
                "supported_timeframes": ["1d", "1h"],
                "data_time_range": {
                    "earliest": (datetime.now() - timedelta(days=365)).isoformat(),
                    "latest": datetime.now().isoformat(),
                    "span_days": 365
                },
                "memory_usage": {
                    "total_records": 12500,
                    "estimated_memory_mb": 1.25,
                    "symbols_count": 5
                },
                "last_updated": datetime.now().isoformat()
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"获取数据库概览失败: {str(e)}"
        }

@app.get("/api/v1/data/database/stocks")
async def get_stocks_data_summary_simple():
    """简化的股票数据汇总接口"""
    try:
        from datetime import datetime, timedelta

        # 模拟股票数据
        mock_stocks = [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "industry": "Technology",
                "total_records": 3000,
                "timeframe_data": {
                    "1d": {
                        "count": 250,
                        "date_range": {
                            "start": (datetime.now() - timedelta(days=250)).isoformat(),
                            "end": datetime.now().isoformat()
                        },
                        "latest_price": 213.88
                    },
                    "1h": {
                        "count": 2750,
                        "date_range": {
                            "start": (datetime.now() - timedelta(days=30)).isoformat(),
                            "end": datetime.now().isoformat()
                        }
                    }
                },
                "data_freshness": {
                    "1d": True,
                    "1h": True
                },
                "in_watchlist": True
            },
            {
                "symbol": "TSLA",
                "name": "Tesla Inc.",
                "industry": "Automotive",
                "total_records": 2800,
                "timeframe_data": {
                    "1d": {
                        "count": 230,
                        "latest_price": 248.50
                    },
                    "1h": {
                        "count": 2570
                    }
                },
                "data_freshness": {
                    "1d": True,
                    "1h": False
                },
                "in_watchlist": True
            },
            {
                "symbol": "MSFT",
                "name": "Microsoft Corp.",
                "industry": "Technology",
                "total_records": 2900,
                "timeframe_data": {
                    "1d": {
                        "count": 240,
                        "latest_price": 510.06
                    },
                    "1h": {
                        "count": 2660
                    }
                },
                "data_freshness": {
                    "1d": True,
                    "1h": True
                },
                "in_watchlist": True
            }
        ]

        return {
            "success": True,
            "stocks": mock_stocks,
            "summary": {
                "total_symbols": len(mock_stocks),
                "total_records": sum(s["total_records"] for s in mock_stocks),
                "fresh_data_count": sum(1 for s in mock_stocks if s["data_freshness"]["1d"]),
                "stale_data_count": sum(1 for s in mock_stocks if not s["data_freshness"]["1d"])
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"获取股票数据汇总失败: {str(e)}"
        }

@app.get("/api/v1/data/database/quality")
async def get_data_quality_report_simple():
    """简化的数据质量报告接口"""
    try:
        from datetime import datetime

        return {
            "success": True,
            "quality_report": {
                "overall_score": 85.5,
                "total_symbols": 5,
                "issues_count": 2,
                "stale_data_count": 1,
                "incomplete_data_count": 1,
                "quality_issues": [
                    "股票 TSLA 的小时线数据超过2小时未更新",
                    "股票 GOOGL 的日线数据不足30天"
                ],
                "recommendations": [
                    "建议对 1 只股票进行数据同步",
                    "建议进行全量数据同步以获取完整历史数据"
                ],
                "generated_at": datetime.now().isoformat()
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"生成数据质量报告失败: {str(e)}"
        }

if __name__ == "__main__":
    print("🚀 启动最小化测试服务器...")
    uvicorn.run(
        "minimal_test:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
