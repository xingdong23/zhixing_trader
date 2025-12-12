package com.zhixing.journal.controller;

import com.zhixing.journal.model.Stock;
import com.zhixing.journal.repository.StockRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stocks")
@CrossOrigin(origins = "*")
public class StockController {

    private final StockRepository stockRepository;

    public StockController(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    // Matching frontend: /api/v1/stocks/overview?page=1&page_size=200
    // Frontend likely expects a specific structure, but let's start with standard Page<Stock>
    
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
        return stockRepository.save(stock);
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
