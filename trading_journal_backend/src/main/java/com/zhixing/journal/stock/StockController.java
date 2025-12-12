package com.zhixing.journal.stock;

import com.zhixing.journal.common.ApiResponse;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class StockController {
    private final StockService stockService;

    @GetMapping("/stocks/overview")
    public ApiResponse<Page<Stock>> getStocks(
            @RequestParam(required = false) String concept_name,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<Stock> stocks = stockService.getStocks(concept_name, keyword, pageable);
        return ApiResponse.success(stocks);
    }

    @GetMapping("/concepts/categories")
    public ApiResponse<Map<String, List<String>>> getCategories() {
        return ApiResponse.success(stockService.getConceptCategories());
    }
}
