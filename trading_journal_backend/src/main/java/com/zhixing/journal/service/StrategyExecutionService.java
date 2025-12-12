package com.zhixing.journal.service;

import com.zhixing.journal.dto.StrategyExecutionResult;
import com.zhixing.journal.model.Strategy;
import com.zhixing.journal.repository.StrategyRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class StrategyExecutionService {

    private final StrategyRepository strategyRepository;

    public StrategyExecutionService(StrategyRepository strategyRepository) {
        this.strategyRepository = strategyRepository;
    }

    /**
     * 执行策略 (模拟逻辑)
     * 根据策略ID和参数，模拟计算并返回评分、信号和技术指标。
     */
    public StrategyExecutionResult executeStrategy(Long strategyId, String symbol, String timeframe) {
        var strategy = strategyRepository.findById(strategyId)
                .orElseThrow(() -> new RuntimeException("策略未找到 (Strategy not found)"));

        // 在真实系统中，此处会动态加载策略脚本并执行
        // MVP 阶段：基于策略类型运行模拟逻辑
        
        return simulateExecution(strategy, symbol, timeframe);
    }

    private StrategyExecutionResult simulateExecution(Strategy strategy, String symbol, String timeframe) {
        String executionId = UUID.randomUUID().toString();
        List<String> reasons = new ArrayList<>();
        Map<String, Object> techData = new HashMap<>();
        int score;
        String signal;

        if (strategy.getType() == Strategy.StrategyType.MOMENTUM) {
            // 模拟 MACD 策略逻辑
            double macd = Math.random() * 2 - 1; // -1 to 1
            double signalLine = Math.random() * 2 - 1;
            techData.put("macd", macd);
            techData.put("signalLine", signalLine);
            
            if (macd > signalLine) {
                score = 85;
                signal = "BUY";
                reasons.add("MACD 金叉 (MACD > Signal)");
                reasons.add(timeframe + " 周期动能强劲");
            } else {
                score = 30;
                signal = "SELL";
                reasons.add("MACD 死叉 (MACD < Signal)");
                reasons.add("趋势转弱");
            }
        } else if (strategy.getType() == Strategy.StrategyType.MEAN_REVERSION) {
            // 模拟 布林带策略逻辑
            double price = 100 + Math.random() * 10;
            double lowerBand = 102;
            double upperBand = 108;
            techData.put("price", price);
            techData.put("lowerBand", lowerBand);
            techData.put("upperBand", upperBand);
            
            if (price <= lowerBand) {
                score = 90;
                signal = "BUY";
                reasons.add("触及布林下轨 (Lower Band)");
                reasons.add("超卖区域");
            } else if (price >= upperBand) {
                score = 80;
                signal = "SELL";
                reasons.add("触及布林上轨 (Upper Band)");
                reasons.add("超买区域");
            } else {
                score = 50;
                signal = "HOLD";
                reasons.add("价格处于布林带区间内");
            }
        } else {
            score = 0;
            signal = "NEUTRAL";
            reasons.add("未知策略类型");
        }

        return StrategyExecutionResult.builder()
                .executionId(executionId)
                .strategyId(strategy.getId())
                .symbol(symbol)
                .score(score)
                .signal(signal)
                .reasons(reasons)
                .technicalData(techData)
                .success(true)
                .message("策略执行成功")
                .build();
    }
}
