package com.zhixing.journal.repository;

import com.zhixing.journal.model.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {
    List<SyncLog> findByBrokerNameOrderByStartTimeDesc(String brokerName);
    List<SyncLog> findAllByOrderByStartTimeDesc();
}
