package com.zhixing.journal.trade;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TradeService {
    private final TradeRepository tradeRepository;

    public Page<Trade> getTrades(String symbol, String status, String side, Pageable pageable) {
        return tradeRepository.findTrades(symbol, status, side, pageable);
    }

    public Trade createTrade(Trade trade) {
        trade.setCreatedAt(LocalDateTime.now());
        trade.setUpdatedAt(LocalDateTime.now());
        if (trade.getStatus() == null) {
            trade.setStatus("pending");
        }
        return tradeRepository.save(trade);
    }

    public Trade updateTrade(Long id, Trade tradeDetails) {
        Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("未找到交易记录"));

        trade.setSymbol(tradeDetails.getSymbol());
        trade.setStatus(tradeDetails.getStatus());
        trade.setEntryPrice(tradeDetails.getEntryPrice());
        trade.setExitPrice(tradeDetails.getExitPrice());
        trade.setQuantity(tradeDetails.getQuantity());
        trade.setStopLoss(tradeDetails.getStopLoss());
        trade.setTakeProfit(tradeDetails.getTakeProfit());
        trade.setNetPnl(tradeDetails.getNetPnl());
        trade.setPnlPercent(tradeDetails.getPnlPercent());
        trade.setExitDate(tradeDetails.getExitDate());
        trade.setNotes(tradeDetails.getNotes());
        trade.setUpdatedAt(LocalDateTime.now());

        return tradeRepository.save(trade);
    }

    public Map<String, Object> getStatistics() {
        List<Trade> allTrades = tradeRepository.findAll();
        List<Trade> activeTrades = tradeRepository.findAllByStatus("active");
        List<Trade> closedTrades = tradeRepository.findAllByStatus("closed");

        long totalTrades = allTrades.size();
        long activeCount = activeTrades.size();
        
        BigDecimal totalPnl = closedTrades.stream()
                .map(t -> t.getNetPnl() != null ? t.getNetPnl() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long winningTrades = closedTrades.stream()
                .filter(t -> t.getNetPnl() != null && t.getNetPnl().compareTo(BigDecimal.ZERO) > 0)
                .count();

        double winRate = closedTrades.isEmpty() ? 0.0 : (double) winningTrades / closedTrades.size() * 100;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTrades", totalTrades);
        stats.put("activeTrades", activeCount);
        stats.put("totalPnl", totalPnl);
        stats.put("winRate", BigDecimal.valueOf(winRate).setScale(2, RoundingMode.HALF_UP));

        return stats;
    }
}
