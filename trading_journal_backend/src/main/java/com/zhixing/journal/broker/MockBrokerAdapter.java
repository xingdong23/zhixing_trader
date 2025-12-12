package com.zhixing.journal.broker;

import com.zhixing.journal.model.BrokerConfig;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class MockBrokerAdapter implements BrokerAdapter {

    private boolean connected = false;

    @Override
    public boolean connect(BrokerConfig config) {
        // Simulate network delay
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        this.connected = true;
        return true;
    }

    @Override
    public boolean disconnect() {
        this.connected = false;
        return true;
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public Map<String, Object> syncData() {
        if (!connected) {
            throw new IllegalStateException("Not connected");
        }
        Map<String, Object> result = new HashMap<>();
        result.put("positions", 5);
        result.put("orders", 12);
        result.put("accountBalance", 100000.00);
        return result;
    }

    @Override
    public String getSupportedBrokerName() {
        return "MOCK";
    }
}
