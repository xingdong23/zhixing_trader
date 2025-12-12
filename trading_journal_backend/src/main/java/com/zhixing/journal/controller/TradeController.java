package com.zhixing.journal.controller;

import com.zhixing.journal.model.Trade;
import com.zhixing.journal.service.TradeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/trades")
@CrossOrigin(origins = "*")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @PostMapping("/plan")
    public ResponseEntity<Trade> createTradePlan(
            @RequestBody Trade trade,
            @RequestParam(required = false) Long accountId) {
        return ResponseEntity.ok(tradeService.createTradePlan(trade, accountId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Trade> updateTrade(@PathVariable Long id, @RequestBody Trade trade) {
        return ResponseEntity.ok(tradeService.updateTrade(id, trade));
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<Trade> executeTrade(
            @PathVariable Long id,
            @RequestParam BigDecimal entryPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime entryTime) {
        return ResponseEntity.ok(tradeService.executeTrade(id, entryPrice, entryTime));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<Trade> closeTrade(
            @PathVariable Long id,
            @RequestParam BigDecimal exitPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime exitTime) {
        return ResponseEntity.ok(tradeService.closeTrade(id, exitPrice, exitTime));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Trade> getTrade(@PathVariable Long id) {
        return ResponseEntity.ok(tradeService.getTrade(id));
    }

    @GetMapping
    public Page<Trade> searchTrades(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size,
            @RequestParam(defaultValue = "entryTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        int pageNo = page > 0 ? page - 1 : 0;
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(pageNo, page_size, sort);
        
        return tradeService.searchTrades(symbol, status, startDate, endDate, pageable);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrade(@PathVariable Long id) {
        tradeService.deleteTrade(id);
        return ResponseEntity.noContent().build();
    }
}
