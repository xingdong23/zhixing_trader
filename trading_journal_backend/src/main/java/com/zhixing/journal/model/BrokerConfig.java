package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "broker_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrokerConfig {

    @Id
    private String brokerName; // IBKR, LONGBRIDGE

    // IBKR specific
    private String host;
    private Integer port;
    private Integer clientId;

    // Longbridge specific
    private String appKey;
    private String appSecret; // In real prod, this should be encrypted
    private String accessToken;

    // Sync Settings
    @Builder.Default
    private Boolean autoSyncEnabled = false;
    
    private Integer syncIntervalMinutes; // e.g., 5, 15, 30, 60
    
    private String syncStartTime; // "09:00"
    private String syncEndTime;   // "16:00"

    private Boolean isConnected;
}
