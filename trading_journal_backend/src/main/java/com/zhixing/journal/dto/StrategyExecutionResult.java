package com.zhixing.journal.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class StrategyExecutionResult {
    private String executionId;
    private Long strategyId;
    private String symbol;
    private int score; // 0-100
    private String signal; // BUY, SELL, HOLD
    private List<String> reasons;
    private Map<String, Object> technicalData; // e.g. {"macd": 1.2, "rsi": 65}
    private boolean success;
    private String message;
}
