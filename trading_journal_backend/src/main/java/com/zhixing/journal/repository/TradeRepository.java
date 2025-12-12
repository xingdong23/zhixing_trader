package com.zhixing.journal.repository;

import com.zhixing.journal.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long>, JpaSpecificationExecutor<Trade> {
    List<Trade> findBySymbol(String symbol);
    List<Trade> findByStatus(Trade.TradeStatus status);
}
