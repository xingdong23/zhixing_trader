package com.zhixing.journal.service;

import com.zhixing.journal.dto.TradeStats;
import com.zhixing.journal.model.Trade;
import com.zhixing.journal.repository.TradeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class StatsService {

    private final TradeRepository tradeRepository;

    public StatsService(TradeRepository tradeRepository) {
        this.tradeRepository = tradeRepository;
    }

    public TradeStats getGlobalStats() {
        // Only consider CLOSED trades for stats
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

        BigDecimal winRate = BigDecimal.valueOf(winningTrades)
                .divide(BigDecimal.valueOf(totalTrades), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        BigDecimal averagePnl = totalPnl.divide(BigDecimal.valueOf(totalTrades), 2, RoundingMode.HALF_UP);

        BigDecimal profitFactor = BigDecimal.ZERO;
        if (grossLoss.compareTo(BigDecimal.ZERO) > 0) {
            profitFactor = grossProfit.divide(grossLoss, 2, RoundingMode.HALF_UP);
        } else if (grossProfit.compareTo(BigDecimal.ZERO) > 0) {
            // Infinite profit factor if no losses, can represent with a large number or handle specifically
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
}
