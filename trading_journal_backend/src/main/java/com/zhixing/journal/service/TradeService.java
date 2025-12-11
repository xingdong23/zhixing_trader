package com.zhixing.journal.service;

import com.zhixing.journal.model.Trade;
import com.zhixing.journal.repository.TradeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TradeService {

    private final TradeRepository tradeRepository;

    public TradeService(TradeRepository tradeRepository) {
        this.tradeRepository = tradeRepository;
    }

    public List<Trade> getAllTrades() {
        return tradeRepository.findAll();
    }

    public Optional<Trade> getTradeById(Long id) {
        return tradeRepository.findById(id);
    }

    public Trade createTrade(Trade trade) {
        return tradeRepository.save(trade);
    }

    public Trade closeTrade(Long id, BigDecimal exitPrice, LocalDateTime exitTime) {
        Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trade not found"));
        
        trade.setExitPrice(exitPrice);
        trade.setExitTime(exitTime);
        trade.setStatus(Trade.TradeStatus.CLOSED);

        // Simple PnL calculation (can be enhanced for fees, etc.)
        BigDecimal priceDiff;
        if (trade.getDirection() == Trade.Direction.LONG) {
            priceDiff = exitPrice.subtract(trade.getEntryPrice());
        } else {
            priceDiff = trade.getEntryPrice().subtract(exitPrice);
        }
        trade.setPnl(priceDiff.multiply(trade.getQuantity()));

        return tradeRepository.save(trade);
    }

    public void deleteTrade(Long id) {
        tradeRepository.deleteById(id);
    }
}
