package com.zhixing.journal.controller;

import com.zhixing.journal.model.Stock;
import com.zhixing.journal.repository.StockRepository;
import com.zhixing.journal.service.StockService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stocks")
@CrossOrigin(origins = "*")
public class StockController {

    private final StockRepository stockRepository;
    private final StockService stockService;

    public StockController(StockRepository stockRepository, StockService stockService) {
        this.stockRepository = stockRepository;
        this.stockService = stockService;
    }

    // Matching frontend: /api/v1/stocks/overview?page=1&page_size=200
    @GetMapping("/overview")
    public Page<Stock> listStocks(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int page_size
    ) {
        // Spring Data Page is 0-indexed, frontend usually 1-indexed
        int pageNo = page > 0 ? page - 1 : 0;
        Pageable pageable = PageRequest.of(pageNo, page_size);
        return stockRepository.findAll(pageable);
    }
    
    @PostMapping
    public Stock createStock(@RequestBody Stock stock) {
        return stockService.createStock(stock);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importStocks(@RequestParam("file") MultipartFile file) {
        List<Stock> imported = stockService.importStocks(file);
        return ResponseEntity.ok(Map.<String, Object>of(
            "message", "Successfully imported " + imported.size() + " stocks",
            "count", imported.size(),
            "success", true
        ));
    }
    
    // Helper to seed data if empty
    @PostMapping("/seed")
    public List<Stock> seedStocks() {
        if (stockRepository.count() == 0) {
            return stockRepository.saveAll(List.of(
                Stock.builder().symbol("AAPL").name("Apple Inc.").sector("Technology").industry("Consumer Electronics").build(),
                Stock.builder().symbol("MSFT").name("Microsoft Corp.").sector("Technology").industry("Software").build(),
                Stock.builder().symbol("GOOGL").name("Alphabet Inc.").sector("Communication Services").industry("Internet Content & Information").build(),
                Stock.builder().symbol("BTCUSDT").name("Bitcoin").sector("Crypto").industry("Currency").build(),
                Stock.builder().symbol("ETHUSDT").name("Ethereum").sector("Crypto").industry("Smart Contracts").build()
            ));
        }
        return stockRepository.findAll();
    }
}
