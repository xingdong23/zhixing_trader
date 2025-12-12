package com.zhixing.journal.broker;

import com.zhixing.journal.model.BrokerConfig;
import java.util.Map;

public interface BrokerAdapter {
    /**
     * Initialize connection with the broker using provided config.
     */
    boolean connect(BrokerConfig config);

    /**
     * Disconnect from the broker.
     */
    boolean disconnect();

    /**
     * Check if currently connected.
     */
    boolean isConnected();
    
    /**
     * Sync positions, orders, and account data.
     * Returns a summary map of synced items info.
     */
    Map<String, Object> syncData();
    
    /**
     * Get the broker name this adapter supports (e.g. "IBKR", "LONGBRIDGE")
     */
    String getSupportedBrokerName();
}
