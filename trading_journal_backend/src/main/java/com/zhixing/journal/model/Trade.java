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

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private LocalDateTime entryTime;

    private LocalDateTime exitTime;

    private BigDecimal pnl; // Profit and Loss

    private String notes;

    @Enumerated(EnumType.STRING)
    private TradeStatus status; // OPEN, CLOSED

    public enum Direction {
        LONG, SHORT
    }

    public enum TradeStatus {
        OPEN, CLOSED
    }
    
    @PrePersist
    public void prePersist() {
        if (this.status == null) {
            this.status = TradeStatus.OPEN;
        }
    }
}
