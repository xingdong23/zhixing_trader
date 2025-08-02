#!/usr/bin/env python3
import requests
import json

def test_api():
    # 测试获取股票列表
    response = requests.get('http://127.0.0.1:8000/api/v1/stocks/')
    print(f'GET /api/v1/stocks/ - Status: {response.status_code}')
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success') and 'data' in result:
            stocks = result['data']['stocks']
            print(f'返回 {len(stocks)} 只股票')
            
            if stocks:
                stock = stocks[0]
                print(f'第一只股票: {stock.get("symbol")} - {stock.get("name")}')
                print(f'字段: {list(stock.keys())}')
                print(f'确认没有 fundamental_tags 字段: {"fundamental_tags" not in stock}')
                
                # 测试更新股票
                symbol = stock['symbol']
                update_data = {
                    'market_cap': 'mid',
                    'watch_level': 'medium',
                    'notes': '测试更新 - 已彻底移除 fundamental_tags 字段'
                }
                
                update_response = requests.put(f'http://127.0.0.1:8000/api/v1/stocks/{symbol}', 
                                             json=update_data)
                print(f'PUT /api/v1/stocks/{symbol} - Status: {update_response.status_code}')
                
                if update_response.status_code == 200:
                    updated_result = update_response.json()
                    if updated_result.get('success'):
                        updated_stock = updated_result['data']
                        print(f'更新成功: {updated_stock.get("name")}')
                        print(f'确认更新后没有 fundamental_tags 字段: {"fundamental_tags" not in updated_stock}')
                        print(f'market_cap: {updated_stock.get("market_cap")}')
                        print(f'watch_level: {updated_stock.get("watch_level")}')
                    else:
                        print(f'更新失败: {updated_result}')
                else:
                    print(f'更新失败: {update_response.text}')
    else:
        print(f'获取股票列表失败: {response.text}')

if __name__ == '__main__':
    test_api()