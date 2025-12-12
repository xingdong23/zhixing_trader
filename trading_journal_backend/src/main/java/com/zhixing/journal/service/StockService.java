package com.zhixing.journal.service;

import com.zhixing.journal.model.Stock;
import com.zhixing.journal.repository.StockRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StockService {

    private final StockRepository stockRepository;

    public StockService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    public List<Stock> importStocks(MultipartFile file) {
        List<Stock> stocks = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            // Futu CSV might contain BOM or non-standard headers, using DEFAULT with IgnoreHeaderCase
            // We assume headers are present.
            CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT
                    .builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreHeaderCase(true)
                    .setTrim(true)
                    .build());

            for (CSVRecord record : parser) {
                // Try to map fields flexibly
                String symbol = getUiSortSafe(record, "代码", "Symbol", "Code");
                String name = getUiSortSafe(record, "名称", "Name");
                
                if (symbol != null && !symbol.isEmpty()) {
                    // Normalize symbol (e.g., HK.00700 -> HK00700 or keep dots based on preference)
                    // Let's keep it as is for now, or maybe strip dots if standard is without.
                    // System standard seems to be just the string.
                    
                    Stock stock = stockRepository.findBySymbol(symbol).orElse(
                        Stock.builder().symbol(symbol).build()
                    );
                    stock.setName(name);
                    
                    // Try to parse sector/industry if available
                    String sector = getUiSortSafe(record, "所属行业", "Sector");
                    if (sector != null) stock.setSector(sector);

                    stocks.add(stock);
                }
            }
            return stockRepository.saveAll(stocks);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage(), e);
        }
    }
    
    // Helper to try multiple header names
    private String getUiSortSafe(CSVRecord record, String... headers) {
        for (String header : headers) {
            try {
                if (record.isMapped(header)) {
                    return record.get(header);
                }
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }
    
    public Stock createStock(Stock stock) {
        return stockRepository.save(stock);
    }
}
