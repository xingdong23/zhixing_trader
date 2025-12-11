package com.zhixing.journal.controller;

import com.zhixing.journal.dto.TradeStats;
import com.zhixing.journal.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class AnalyticsController {

    private final StatsService statsService;

    public AnalyticsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/overview")
    public TradeStats getOverview() {
        return statsService.getGlobalStats();
    }
}
