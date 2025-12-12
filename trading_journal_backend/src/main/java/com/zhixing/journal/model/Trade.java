package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id") // Nullable for now to support existing tests/data, or make nullable=false if we migrate data
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Account account;

    @Column(nullable = false)
    private String symbol; // e.g., BTCUSDT, AAPL

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction; // LONG, SHORT

    @Column(nullable = false)
    private BigDecimal entryPrice;

    private BigDecimal exitPrice;
    
    // --- Plan & Risk Management ---
    private BigDecimal stopLoss;
    private BigDecimal takeProfit;
    private BigDecimal riskAmount; // Calculated risk value
    private BigDecimal positionSizeRel; // % of account balance
    private BigDecimal rMultiple; // Realized R
    private BigDecimal plannedRR; // Planned Risk/Reward
    
    // --- 6-Step Wizard Data ---
    @Column(columnDefinition = "TEXT")
    private String trendAnalysis; // JSON: { timeframe: "D1", trend: "UP" ... }
    
    @Column(columnDefinition = "TEXT")
    private String keyLevels; // JSON: { support: 100, resistance: 120 }
    
    @Column(columnDefinition = "TEXT")
    private String entryTrigger; // JSON or Text: "Breakout", "Pullback"
    
    @Column(columnDefinition = "TEXT")
    private String technicalConditions; // JSON: High-level indicators

    // --- Execution ---
    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private LocalDateTime entryTime;

    private LocalDateTime exitTime;

    private BigDecimal pnl; // Profit and Loss
    
    @Column(columnDefinition = "TEXT")
    private String notes; // General notes
    
    @Column(columnDefinition = "TEXT")
    private String entryReason;
    
    @Column(columnDefinition = "TEXT")
    private String exitReason;
    
    @Column(columnDefinition = "TEXT")
    private String violations; // JSON List of violations
    
    private Integer reviewRating; // 1-5

    @Enumerated(EnumType.STRING)
    private TradeStatus status; // PLANNING, PENDING, ACTIVE, CLOSED, CANCELLED

    public enum Direction {
        LONG, SHORT
    }

    public enum TradeStatus {
        PLANNING, PENDING_ENTRY, ACTIVE, CLOSED, CANCELLED
    }
    
    @PrePersist
    public void prePersist() {
        if (this.status == null) {
            this.status = TradeStatus.PLANNING;
        }
    }
}
