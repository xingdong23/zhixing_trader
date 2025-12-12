package com.zhixing.journal.repository;

import com.zhixing.journal.model.BrokerConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BrokerConfigRepository extends JpaRepository<BrokerConfig, String> {
}
