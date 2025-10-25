#!/bin/bash
# 健康检查脚本 - 检查程序是否正常运行

set -e

# 配置
WORK_DIR="/home/trader/bitcoin_trader"
PID_FILE="$WORK_DIR/trader.pid"
LOG_FILE="$WORK_DIR/logs/health_check.log"
POSITION_FILE="$WORK_DIR/position_state.json"
ALERT_WEBHOOK="YOUR_WEBHOOK_URL"  # 钉钉/企业微信webhook

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 发送告警
send_alert() {
    local message="$1"
    log "🚨 告警: $message"
    
    # 发送到钉钉/企业微信（需要配置webhook）
    if [ "$ALERT_WEBHOOK" != "YOUR_WEBHOOK_URL" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"交易程序告警: $message\"}}" \
            2>&1 | tee -a "$LOG_FILE"
    fi
}

# 检查进程是否存在
check_process() {
    if systemctl is-active --quiet bitcoin_trader; then
        log "✓ 进程运行正常"
        return 0
    else
        log "✗ 进程未运行"
        send_alert "交易程序进程已停止"
        return 1
    fi
}

# 检查日志更新时间
check_log_update() {
    local latest_log=$(ls -t "$WORK_DIR/logs/high_frequency_"*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        log "✗ 未找到日志文件"
        send_alert "未找到日志文件"
        return 1
    fi
    
    local last_modified=$(stat -c %Y "$latest_log" 2>/dev/null || stat -f %m "$latest_log")
    local current_time=$(date +%s)
    local diff=$((current_time - last_modified))
    
    # 如果日志超过5分钟未更新，可能有问题
    if [ $diff -gt 300 ]; then
        log "✗ 日志超过5分钟未更新"
        send_alert "日志超过5分钟未更新，程序可能卡死"
        return 1
    else
        log "✓ 日志更新正常 (${diff}秒前)"
        return 0
    fi
}

# 检查持仓文件
check_position() {
    if [ -f "$POSITION_FILE" ]; then
        local position=$(cat "$POSITION_FILE" | jq -r '.position')
        if [ "$position" != "null" ]; then
            log "⚠️  检测到持仓: $(cat $POSITION_FILE | jq -c '.position')"
            # 持仓存在时，更频繁地检查
            return 0
        else
            log "✓ 当前无持仓"
            return 0
        fi
    else
        log "✗ 持仓文件不存在"
        return 1
    fi
}

# 检查磁盘空间
check_disk_space() {
    local disk_usage=$(df -h "$WORK_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ $disk_usage -gt 90 ]; then
        log "✗ 磁盘空间不足: ${disk_usage}%"
        send_alert "磁盘空间不足: ${disk_usage}%"
        return 1
    else
        log "✓ 磁盘空间充足: ${disk_usage}%"
        return 0
    fi
}

# 检查内存使用
check_memory() {
    local mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    if [ $mem_usage -gt 90 ]; then
        log "⚠️  内存使用率高: ${mem_usage}%"
        # 不发送告警，只记录
        return 0
    else
        log "✓ 内存使用正常: ${mem_usage}%"
        return 0
    fi
}

# 主检查流程
main() {
    log "========== 开始健康检查 =========="
    
    local all_ok=true
    
    # 执行各项检查
    check_process || all_ok=false
    check_log_update || all_ok=false
    check_position || all_ok=false
    check_disk_space || all_ok=false
    check_memory || all_ok=false
    
    if [ "$all_ok" = true ]; then
        log "========== 健康检查通过 =========="
        exit 0
    else
        log "========== 健康检查发现问题 =========="
        exit 1
    fi
}

# 运行主函数
main
