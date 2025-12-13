"""
V15 多实例监控 API 服务器

提供 REST API 和 Web 界面来管理 V15 实例
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from dataclasses import asdict

from live.instance_manager import InstanceManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='static')
CORS(app)

# 全局实例管理器
manager = InstanceManager(
    config_file=str(Path(__file__).parent.parent / "instances.json")
)


# ==================== 页面路由 ====================

@app.route('/')
def index():
    """监控首页"""
    return send_from_directory('static', 'dashboard.html')


# ==================== API 路由 ====================

@app.route('/api/summary')
def get_summary():
    """获取汇总信息"""
    return jsonify(manager.get_summary())


@app.route('/api/instances')
def get_instances():
    """获取所有实例"""
    statuses = manager.get_all_status()
    return jsonify([asdict(s) for s in statuses])


@app.route('/api/instances', methods=['POST'])
def create_instance():
    """创建实例"""
    data = request.json
    symbol = data.get('symbol', 'DOGE/USDT:USDT')
    capital = float(data.get('capital', 100))
    dry_run = data.get('dry_run', True)
    
    instance_id = manager.create_instance(symbol, capital, dry_run)
    return jsonify({"id": instance_id, "success": True})


@app.route('/api/instances/<instance_id>', methods=['DELETE'])
def delete_instance(instance_id):
    """删除实例"""
    success = manager.delete_instance(instance_id)
    return jsonify({"success": success})


@app.route('/api/instances/<instance_id>/start', methods=['POST'])
def start_instance(instance_id):
    """启动实例"""
    success = manager.start_instance(instance_id)
    return jsonify({"success": success})


@app.route('/api/instances/<instance_id>/stop', methods=['POST'])
def stop_instance(instance_id):
    """停止实例"""
    close_position = request.args.get('close_position', 'false').lower() == 'true'
    success = manager.stop_instance(instance_id, close_position=close_position)
    return jsonify({"success": success})


@app.route('/api/instances/<instance_id>')
def get_instance(instance_id):
    """获取实例详情"""
    status = manager.get_instance_status(instance_id)
    if status:
        return jsonify(asdict(status))
    return jsonify({"error": "Instance not found"}), 404


@app.route('/api/instances/<instance_id>/trades')
def get_trades(instance_id):
    """获取实例的交易记录"""
    try:
        from db.database import db
        trades = db.get_trades(instance_id)
        # 转换 Decimal 为 float
        for t in trades:
            for k, v in t.items():
                if hasattr(v, '__float__'):
                    t[k] = float(v)
                elif hasattr(v, 'isoformat'):
                    t[k] = v.isoformat() if v else None
        return jsonify(trades)
    except Exception as e:
        logger.error(f"获取交易记录失败: {e}")
        return jsonify([])


# ==================== 启动 ====================

def main():
    """启动服务器"""
    import argparse
    parser = argparse.ArgumentParser(description="V15 监控服务器")
    parser.add_argument("--host", default="0.0.0.0", help="绑定地址")
    parser.add_argument("--port", type=int, default=5015, help="端口")
    parser.add_argument("--debug", action="store_true", help="调试模式")
    args = parser.parse_args()
    
    logger.info(f"启动 V15 监控服务器: http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)


if __name__ == '__main__':
    main()
