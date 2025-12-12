package com.zhixing.journal.stock;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StockService {
    private final StockRepository stockRepository;

    public Page<Stock> getStocks(String conceptName, String keyword, Pageable pageable) {
        if (conceptName != null && !conceptName.isEmpty()) {
            return stockRepository.findByConcept(conceptName, pageable);
        }
        if (keyword != null && !keyword.isEmpty()) {
            return stockRepository.search(keyword, pageable);
        }
        return stockRepository.findAll(pageable);
    }

    public Map<String, List<String>> getConceptCategories() {
        Map<String, List<String>> categories = new HashMap<>();
        // Mock数据，未来可从数据库获取
        categories.put("industry", List.of("科技", "能源", "金融", "医疗"));
        categories.put("fundamentals", List.of("高增长", "低估值", "蓝筹"));
        categories.put("custom", List.of("我的自选", "近期异动"));
        return categories;
    }
}
