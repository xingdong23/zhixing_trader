package com.zhixing.journal.controller;

import com.zhixing.journal.model.Trade;
import com.zhixing.journal.service.TradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @GetMapping
    public List<Trade> getAllTrades() {
        return tradeService.getAllTrades();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Trade> getTradeById(@PathVariable Long id) {
        return tradeService.getTradeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Trade createTrade(@RequestBody Trade trade) {
        // Ensure status is initialized if not provided, though @PrePersist handles it too
        if (trade.getStatus() == null) {
            trade.setStatus(Trade.TradeStatus.OPEN);
        }
        return tradeService.createTrade(trade);
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<Trade> closeTrade(@PathVariable Long id, 
                                            @RequestParam BigDecimal exitPrice,
                                            @RequestParam(required = false) LocalDateTime exitTime) {
        if (exitTime == null) {
            exitTime = LocalDateTime.now();
        }
        try {
            Trade closedTrade = tradeService.closeTrade(id, exitPrice, exitTime);
            return ResponseEntity.ok(closedTrade);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrade(@PathVariable Long id) {
        tradeService.deleteTrade(id);
        return ResponseEntity.noContent().build();
    }
}
