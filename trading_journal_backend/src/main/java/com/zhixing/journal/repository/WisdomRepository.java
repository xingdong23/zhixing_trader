package com.zhixing.journal.repository;

import com.zhixing.journal.model.Wisdom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WisdomRepository extends JpaRepository<Wisdom, Long> {
    List<Wisdom> findByIsActiveTrue();
    List<Wisdom> findByCategory(String category);
}
