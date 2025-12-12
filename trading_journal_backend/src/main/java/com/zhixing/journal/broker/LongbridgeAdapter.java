package com.zhixing.journal.broker;

import com.zhixing.journal.model.BrokerConfig;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class LongbridgeAdapter implements BrokerAdapter {

    private boolean connected = false;
    private BrokerConfig currentConfig;

    @Override
    public boolean connect(BrokerConfig config) {
        // Validation
        if (config.getAppKey() == null || config.getAppSecret() == null) {
            throw new IllegalArgumentException("AppKey and AppSecret are required for Longbridge");
        }
        this.currentConfig = config;
        // In real impl: Initialize Longbridge SDK context here
        this.connected = true;
        return true;
    }

    @Override
    public boolean disconnect() {
        this.connected = false;
        // In real impl: Close SDK context
        return true;
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public Map<String, Object> syncData() {
        if (!connected) throw new IllegalStateException("Not connected to Longbridge");
        
        // Real impl: Call SDK to get assets, positions, orders
        Map<String, Object> result = new HashMap<>();
        result.put("message", "Synced with Longbridge (Simulated)");
        return result;
    }

    @Override
    public String getSupportedBrokerName() {
        return "LONGBRIDGE";
    }
}
