package com.zhixing.journal.dto;

import java.math.BigDecimal;

public record TradeStats(
    long totalTrades,
    long winningTrades,
    long losingTrades,
    BigDecimal winRate,
    BigDecimal totalPnl,
    BigDecimal averagePnl,
    BigDecimal profitFactor
) {}
