package com.zhixing.journal.trade;

import com.zhixing.journal.common.ApiResponse;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
public class TradeController {
    private final TradeService tradeService;

    @GetMapping
    public ApiResponse<Page<Trade>> getTrades(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String side,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(tradeService.getTrades(symbol, status, side, pageable));
    }

    @PostMapping
    public ApiResponse<Trade> createTrade(@RequestBody Trade trade) {
        return ApiResponse.success(tradeService.createTrade(trade));
    }

    @PutMapping("/{id}")
    public ApiResponse<Trade> updateTrade(@PathVariable Long id, @RequestBody Trade trade) {
        return ApiResponse.success(tradeService.updateTrade(id, trade));
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStatistics() {
        return ApiResponse.success(tradeService.getStatistics());
    }
}
