package com.zhixing.journal.controller;

import com.zhixing.journal.model.BrokerConfig;
import com.zhixing.journal.model.SyncLog;
import com.zhixing.journal.repository.BrokerConfigRepository;
import com.zhixing.journal.repository.SyncLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/brokers")
@CrossOrigin(origins = "*")
public class BrokerConfigController {

    private final BrokerConfigRepository brokerConfigRepository;
    private final SyncLogRepository syncLogRepository;
    private final com.zhixing.journal.broker.BrokerAdapterFactory brokerAdapterFactory;

    public BrokerConfigController(BrokerConfigRepository brokerConfigRepository, SyncLogRepository syncLogRepository, com.zhixing.journal.broker.BrokerAdapterFactory brokerAdapterFactory) {
        this.brokerConfigRepository = brokerConfigRepository;
        this.syncLogRepository = syncLogRepository;
        this.brokerAdapterFactory = brokerAdapterFactory;
    }

    @GetMapping("/{name}")
    public ResponseEntity<BrokerConfig> getBrokerConfig(@PathVariable String name) {
        return brokerConfigRepository.findById(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(BrokerConfig.builder().brokerName(name).isConnected(false).build()));
    }

    @PostMapping
    public BrokerConfig saveBrokerConfig(@RequestBody BrokerConfig config) {
        return brokerConfigRepository.save(config);
    }

    @PostMapping("/{name}/connect")
    public ResponseEntity<Map<String, Object>> connectBroker(@PathVariable String name) {
        return brokerConfigRepository.findById(name)
            .map(config -> {
                boolean success = brokerAdapterFactory.getAdapter(name).connect(config);
                config.setIsConnected(success);
                brokerConfigRepository.save(config);
                return ResponseEntity.ok(Map.<String, Object>of("message", success ? "Connected successfully" : "Connection failed", "success", success));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{name}/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectBroker(@PathVariable String name) {
        return brokerConfigRepository.findById(name)
            .map(config -> {
                brokerAdapterFactory.getAdapter(name).disconnect();
                config.setIsConnected(false);
                brokerConfigRepository.save(config);
                return ResponseEntity.ok(Map.<String, Object>of("message", "Disconnected", "success", true));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{name}/sync")
    public ResponseEntity<Map<String, Object>> syncBroker(@PathVariable String name) {
        try {
            var adapter = brokerAdapterFactory.getAdapter(name);
            if (!adapter.isConnected()) {
                // Try auto-reconnect if config exists? For now, just error.
                 return ResponseEntity.badRequest().body(Map.of("message", "Broker is not connected", "success", false));
            }
            
            Map<String, Object> syncResult = adapter.syncData();
            int records = 0; // Extract from result if available, e.g. syncResult.get("records")
            
            SyncLog log = SyncLog.builder()
                .brokerName(name)
                .status("SUCCESS")
                .recordsProcessed(records)
                .message("Sync completed: " + syncResult.toString())
                .endTime(LocalDateTime.now())
                .build();
            syncLogRepository.save(log);
            
            return ResponseEntity.ok(Map.<String, Object>of(
                "message", "Sync completed", 
                "details", syncResult, 
                "success", true
            ));
        } catch (Exception e) {
             SyncLog log = SyncLog.builder()
                .brokerName(name)
                .status("FAILURE")
                .message("Sync failed: " + e.getMessage())
                .endTime(LocalDateTime.now())
                .build();
            syncLogRepository.save(log);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage(), "success", false));
        }
    }

    @GetMapping("/logs")
    public List<SyncLog> getAllLogs() {
        return syncLogRepository.findAllByOrderByStartTimeDesc();
    }
}
