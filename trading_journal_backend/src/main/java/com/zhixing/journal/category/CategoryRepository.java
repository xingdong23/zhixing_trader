package com.zhixing.journal.category;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByParentId(String parentId);
    
    Category findByCategoryId(String categoryId);
}
