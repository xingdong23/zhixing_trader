package com.zhixing.journal.controller;

import com.zhixing.journal.model.Strategy;
import com.zhixing.journal.repository.StrategyRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/strategies")
@CrossOrigin(origins = "*")
public class StrategyController {

    private final StrategyRepository strategyRepository;
    private final com.zhixing.journal.service.StrategyExecutionService strategyExecutionService;

    public StrategyController(StrategyRepository strategyRepository, com.zhixing.journal.service.StrategyExecutionService strategyExecutionService) {
        this.strategyRepository = strategyRepository;
        this.strategyExecutionService = strategyExecutionService;
    }

    @GetMapping
    public List<Strategy> listStrategies() {
        if (strategyRepository.count() == 0) {
            seedStrategies();
        }
        return strategyRepository.findAll();
    }

    @PostMapping("/{id}/execute")
    public com.zhixing.journal.dto.StrategyExecutionResult executeStrategy(
            @PathVariable Long id,
            @RequestParam(defaultValue = "BTCUSDT") String symbol,
            @RequestParam(defaultValue = "15m") String timeframe) {
        return strategyExecutionService.executeStrategy(id, symbol, timeframe);
    }
    
    @PostMapping("/{id}/execute-async")
    public com.zhixing.journal.dto.StrategyExecutionResult executeStrategyAsync(
            @PathVariable Long id,
            @RequestParam(defaultValue = "BTCUSDT") String symbol,
            @RequestParam(defaultValue = "15m") String timeframe) {
        // For MVP, sync. Later use Async.
        return executeStrategy(id, symbol, timeframe);
    }
    
    @GetMapping("/exec/status")
    public Map<String, Object> traceStatus(@RequestParam(name = "task_id", required = false) String taskId) {
         Map<String, Object> response = new HashMap<>();
         response.put("taskId", taskId);
         response.put("status", "COMPLETED");
         response.put("progress", 100);
         return response;
    }

    @PostMapping("/seed")
    public List<Strategy> seedStrategies() {
        if (strategyRepository.count() == 0) {
            strategyRepository.saveAll(List.of(
                Strategy.builder()
                    .name("Macd Crossover")
                    .description("Classic momentum strategy based on MACD line crossing signal line.")
                    .type(Strategy.StrategyType.MOMENTUM)
                    .status(Strategy.StrategyStatus.ACTIVE)
                    .parameters("{\"fast\": 12, \"slow\": 26, \"signal\": 9}")
                    .build(),
                Strategy.builder()
                    .name("Bollinger Mean Reversion")
                    .description("Buy when price hits lower band, sell when hits upper band.")
                    .type(Strategy.StrategyType.MEAN_REVERSION)
                    .status(Strategy.StrategyStatus.BACKTESTING)
                    .parameters("{\"period\": 20, \"stdDev\": 2}")
                    .build()
            ));
        }
        return strategyRepository.findAll();
    }
}
