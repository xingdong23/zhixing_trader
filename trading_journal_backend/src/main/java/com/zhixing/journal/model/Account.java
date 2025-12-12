package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String broker; // e.g. "IBKR", "Longbridge"
    
    private String accountNumber; 
    
    private String type; // "CASH", "MARGIN"
    
    private String status; // "ACTIVE", "INACTIVE"

    private BigDecimal balance;

    private BigDecimal initialBalance;

    private String currency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    private List<Trade> trades;
}
