package com.zhixing.journal.trade;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {
    
    @Query("SELECT t FROM Trade t WHERE " +
           "(:symbol IS NULL OR t.symbol LIKE %:symbol%) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:side IS NULL OR t.side = :side)")
    Page<Trade> findTrades(@Param("symbol") String symbol, 
                           @Param("status") String status, 
                           @Param("side") String side, 
                           Pageable pageable);

    // For statistics
    List<Trade> findAllByStatus(String status);
}
