package com.zhixing.journal.trade;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trades")
@Data
@NoArgsConstructor
public class Trade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;
    private String name;
    
    // 交易方向：long (做多), short (做空)
    private String side;
    
    // 状态：pending (挂单), active (持仓), closed (平仓), cancelled (取消)
    private String status;

    private BigDecimal entryPrice;
    private BigDecimal exitPrice;
    
    private BigDecimal quantity;
    
    private BigDecimal stopLoss;
    private BigDecimal takeProfit;
    
    private BigDecimal netPnl;
    private BigDecimal pnlPercent;
    
    private LocalDateTime entryDate;
    private LocalDateTime exitDate;
    
    private String notes; // 简单的备注或 JSON 引用
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
