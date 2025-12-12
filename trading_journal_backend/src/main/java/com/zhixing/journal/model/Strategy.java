package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "strategies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Strategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    private StrategyType type;

    @Enumerated(EnumType.STRING)
    private StrategyStatus status;

    @Column(columnDefinition = "TEXT")
    private String parameters; // JSON string for parameters

    public enum StrategyType {
        MOMENTUM, MEAN_REVERSION, ARBITRAGE, OTHER
    }

    public enum StrategyStatus {
        ACTIVE, PAUSED, BACKTESTING, DEPRECATED
    }
}
