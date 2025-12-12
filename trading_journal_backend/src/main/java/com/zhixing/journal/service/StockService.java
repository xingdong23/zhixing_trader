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

    /**
     * 批量导入股票 (支持 CSV)
     * 解析上传的 CSV 文件，自动识别中英文表头 (如 代码/Symbol, 名称/Name)。
     * 采用 upsert 逻辑：若股票已存在则更新，否则创建。
     */
    public List<Stock> importStocks(MultipartFile file) {
        List<Stock> stocks = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            // Futu CSV 可能包含 BOM 或非标准头，使用 IgnoreHeaderCase 配置
            CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT
                    .builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreHeaderCase(true)
                    .setTrim(true)
                    .build());

            for (CSVRecord record : parser) {
                // 灵活映射字段
                String symbol = getUiSortSafe(record, "代码", "Symbol", "Code");
                String name = getUiSortSafe(record, "名称", "Name");
                
                if (symbol != null && !symbol.isEmpty()) {
                    // 查找现存股票或新建
                    var stock = stockRepository.findBySymbol(symbol).orElse(
                        Stock.builder().symbol(symbol).build()
                    );
                    stock.setName(name);
                    
                    // 尝试解析行业信息
                    String sector = getUiSortSafe(record, "所属行业", "Sector");
                    if (sector != null) stock.setSector(sector);

                    stocks.add(stock);
                }
            }
            return stockRepository.saveAll(stocks);
        } catch (Exception e) {
            throw new RuntimeException("CSV 解析失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 安全获取 CSV 字段值 (支持多个备选表头)
     * 避免因表头不存在而抛出异常。
     */
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
