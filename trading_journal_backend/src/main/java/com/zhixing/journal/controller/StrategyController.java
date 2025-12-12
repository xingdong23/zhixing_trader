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

    public StrategyController(StrategyRepository strategyRepository) {
        this.strategyRepository = strategyRepository;
    }

    @GetMapping
    public List<Strategy> listStrategies() {
        if (strategyRepository.count() == 0) {
            seedStrategies();
        }
        return strategyRepository.findAll();
    }

    @PostMapping("/{id}/execute")
    public Map<String, Object> executeStrategy(@PathVariable Long id) {
        // Mock execution
        Map<String, Object> response = new HashMap<>();
        response.put("executionId", UUID.randomUUID().toString());
        response.put("strategyId", id);
        response.put("status", "STARTED");
        response.put("message", "Strategy execution started successfully.");
        return response;
    }
    
    @PostMapping("/{id}/execute-async")
    public Map<String, Object> executeStrategyAsync(@PathVariable Long id) {
        return executeStrategy(id);
    }
    
    @GetMapping("/exec/status")
    public Map<String, Object> traceStatus(@RequestParam(name = "task_id", required = false) String taskId) {
         Map<String, Object> response = new HashMap<>();
         response.put("taskId", taskId);
         response.put("status", "RUNNING");
         response.put("progress", 45);
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
