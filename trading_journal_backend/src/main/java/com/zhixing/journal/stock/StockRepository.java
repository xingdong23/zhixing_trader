package com.zhixing.journal.stock;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockRepository extends JpaRepository<Stock, Long> {
    
    @Query("SELECT s FROM Stock s JOIN s.concepts c WHERE c = :concept")
    Page<Stock> findByConcept(@Param("concept") String concept, Pageable pageable);

    @Query("SELECT s FROM Stock s WHERE s.name LIKE %:keyword% OR s.symbol LIKE %:keyword%")
    Page<Stock> search(@Param("keyword") String keyword, Pageable pageable);
}
