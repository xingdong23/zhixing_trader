package com.zhixing.journal.controller;

import com.zhixing.journal.dto.TradeStats;
import com.zhixing.journal.service.StatsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final StatsService statsService;

    public AnalyticsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/overview")
    public TradeStats getOverview() {
        return statsService.getGlobalStats();
    }

    @GetMapping("/equity-curve")
    public List<Map<String, Object>> getEquityCurve() {
        return statsService.getEquityCurve();
    }
}
