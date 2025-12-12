package com.zhixing.journal.service;

import com.zhixing.journal.dto.TradeStats;
import com.zhixing.journal.model.Trade;
import com.zhixing.journal.repository.TradeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final TradeRepository tradeRepository;

    public StatsService(TradeRepository tradeRepository) {
        this.tradeRepository = tradeRepository;
    }

    /**
     * 获取全局统计数据
     * 计算总交易数、胜率、平均盈亏、总盈亏、盈亏比等核心指标。
     */
    public TradeStats getGlobalStats() {
        // 只统计已平仓 (CLOSED) 的交易
        List<Trade> trades = tradeRepository.findByStatus(Trade.TradeStatus.CLOSED);

        long totalTrades = trades.size();
        if (totalTrades == 0) {
            return new TradeStats(0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        long winningTrades = 0;
        long losingTrades = 0;
        BigDecimal totalPnl = BigDecimal.ZERO;
        BigDecimal grossProfit = BigDecimal.ZERO;
        BigDecimal grossLoss = BigDecimal.ZERO;

        for (Trade trade : trades) {
            BigDecimal pnl = trade.getPnl();
            if (pnl == null) continue;

            totalPnl = totalPnl.add(pnl);

            if (pnl.compareTo(BigDecimal.ZERO) > 0) {
                winningTrades++;
                grossProfit = grossProfit.add(pnl);
            } else if (pnl.compareTo(BigDecimal.ZERO) < 0) {
                losingTrades++;
                grossLoss = grossLoss.add(pnl.abs());
            }
        }

        // 计算胜率 (百分比)
        BigDecimal winRate = BigDecimal.ZERO;
        if (totalTrades > 0) {
            winRate = BigDecimal.valueOf(winningTrades)
                    .divide(BigDecimal.valueOf(totalTrades), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // 平均盈亏
        BigDecimal averagePnl = totalPnl.divide(BigDecimal.valueOf(totalTrades), 2, RoundingMode.HALF_UP);

        // 盈亏比 (Profit Factor) = 总盈利 / 总亏损
        BigDecimal profitFactor = BigDecimal.ZERO;
        if (grossLoss.compareTo(BigDecimal.ZERO) > 0) {
            profitFactor = grossProfit.divide(grossLoss, 2, RoundingMode.HALF_UP);
        } else if (grossProfit.compareTo(BigDecimal.ZERO) > 0) {
            // 无亏损时的处理 (理论无穷大，这里用 999 标记)
            profitFactor = BigDecimal.valueOf(999); 
        }

        return new TradeStats(
                totalTrades,
                winningTrades,
                losingTrades,
                winRate,
                totalPnl,
                averagePnl,
                profitFactor
        );
    }

    /**
     * 获取资金曲线数据 (Equity Curve)
     * 按平仓时间排序，计算每日累计盈亏。
     */
    public List<Map<String, Object>> getEquityCurve() {
        var closedTrades = tradeRepository.findByStatus(Trade.TradeStatus.CLOSED).stream()
                .filter(t -> t.getExitTime() != null)
                .sorted(Comparator.comparing(Trade::getExitTime))
                .collect(Collectors.toList());

        // 按日期聚合 PnL
        Map<LocalDate, BigDecimal> dailyPnL = new TreeMap<>();
        
        for (Trade t : closedTrades) {
            LocalDate date = t.getExitTime().toLocalDate();
            BigDecimal pnl = t.getPnl() != null ? t.getPnl() : BigDecimal.ZERO;
            dailyPnL.merge(date, pnl, BigDecimal::add);
        }

        List<Map<String, Object>> curve = new ArrayList<>();
        BigDecimal runningTotal = BigDecimal.ZERO;
        
        // 生成累计数据点
        for (Map.Entry<LocalDate, BigDecimal> entry : dailyPnL.entrySet()) {
            runningTotal = runningTotal.add(entry.getValue());
            Map<String, Object> point = new HashMap<>();
            point.put("date", entry.getKey().toString());
            point.put("cumulativePnL", runningTotal);
            point.put("dailyPnL", entry.getValue());
            curve.add(point);
        }
        
        return curve;
    }
}
