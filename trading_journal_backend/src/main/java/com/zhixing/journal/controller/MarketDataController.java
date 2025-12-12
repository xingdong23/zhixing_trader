package com.zhixing.journal.controller;

import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/market-data")
@CrossOrigin(origins = "*")
public class MarketDataController {

    @GetMapping("/info/{symbol}")
    public Map<String, Object> getStockInfo(@PathVariable String symbol) {
        // Mock data for now
        Map<String, Object> info = new HashMap<>();
        info.put("symbol", symbol);
        info.put("price", 150.00);
        info.put("change", 2.5);
        info.put("changePercent", 1.67);
        info.put("volume", 1000000);
        info.put("marketCap", 2500000000L);
        return info;
    }

    @GetMapping("/klines/{symbol}")
    public List<Map<String, Object>> getKlines(
        @PathVariable String symbol,
        @RequestParam(defaultValue = "1d") String timeframe,
        @RequestParam(defaultValue = "30") int days
    ) {
        // Generate mock kline data
        List<Map<String, Object>> klines = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        double price = 100.0;
        
        for (int i = 0; i < days; i++) {
            LocalDateTime time = now.minusDays(days - i);
            double open = price;
            double close = price * (1 + (Math.random() - 0.5) * 0.05);
            double high = Math.max(open, close) * (1 + Math.random() * 0.02);
            double low = Math.min(open, close) * (1 - Math.random() * 0.02);
            
            Map<String, Object> candle = new HashMap<>();
            // Lightweight charts expects: time (YYYY-MM-DD), open, high, low, close
            candle.put("time", time.toLocalDate().toString());
            candle.put("open", open);
            candle.put("high", high);
            candle.put("low", low);
            candle.put("close", close);
            
            klines.add(candle);
            price = close;
        }
        return klines;
    }
}
