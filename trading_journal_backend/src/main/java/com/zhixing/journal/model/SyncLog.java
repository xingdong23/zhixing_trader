package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String brokerName; // IBKR, LONGBRIDGE

    private String status; // SUCCESS, FAILURE, RUNNING

    private Integer recordsProcessed;

    private String message;

    @CreationTimestamp
    private LocalDateTime startTime;
    
    private LocalDateTime endTime;
}
