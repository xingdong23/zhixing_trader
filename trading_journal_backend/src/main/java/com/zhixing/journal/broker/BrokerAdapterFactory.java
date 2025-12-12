package com.zhixing.journal.broker;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BrokerAdapterFactory {

    private final Map<String, BrokerAdapter> adapters = new HashMap<>();

    public BrokerAdapterFactory(List<BrokerAdapter> adapterList) {
        for (BrokerAdapter adapter : adapterList) {
            adapters.put(adapter.getSupportedBrokerName().toUpperCase(), adapter);
        }
    }

    public BrokerAdapter getAdapter(String brokerName) {
        // Fallback to MOCK if not found, or handle null
        return adapters.getOrDefault(brokerName.toUpperCase(), adapters.get("MOCK"));
    }
}
