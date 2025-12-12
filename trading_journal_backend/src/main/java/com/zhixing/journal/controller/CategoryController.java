package com.zhixing.journal.controller;

import com.zhixing.journal.model.Category;
import com.zhixing.journal.repository.CategoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/categories")
@CrossOrigin(origins = "*")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<Category> listCategories() {
        if (categoryRepository.count() == 0) {
            seedCategories();
        }
        return categoryRepository.findAll();
    }
    
    @GetMapping("/{id}")
    public Category getCategory(@PathVariable String id) {
        // Here id could be Long ID or String categoryId. Frontend seems to use IDs.
        // Trying to resolve by categoryId first if it's a string, else try parsing Long.
        // Frontend example: api/v1/categories/${categoryId} where categoryId is likely a string from the heatmap
        return categoryRepository.findByCategoryId(id)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
    }

    @GetMapping("/heatmap/data")
    public List<Map<String, Object>> getHeatmapData() {
        // Mock data for tree map / heatmap
        // Structure usually: { name: "Technology", value: 100, children: [...] } or flat list with parents
        
        List<Map<String, Object>> data = new ArrayList<>();
        
        // Mocking a sector
        Map<String, Object> tech = new HashMap<>();
        tech.put("name", "Technology");
        tech.put("value", 120);
        tech.put("change", 2.5); // Percentage change
        
        Map<String, Object> finance = new HashMap<>();
        finance.put("name", "Finance");
        finance.put("value", 80);
        finance.put("change", -1.2);
        
        data.add(tech);
        data.add(finance);
        
        return data;
    }
    
    @GetMapping("/heatmap/config")
    public Map<String, Object> getHeatmapConfig() {
         Map<String, Object> config = new HashMap<>();
         config.put("colorScale", "red-green");
         return config;
    }

    @PostMapping("/seed")
    public List<Category> seedCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.saveAll(List.of(
                Category.builder().name("Technology").categoryId("sector_tech").type(Category.CategoryType.SECTOR).build(),
                Category.builder().name("Finance").categoryId("sector_finance").type(Category.CategoryType.SECTOR).build(),
                Category.builder().name("Semiconductor").categoryId("ind_semi").type(Category.CategoryType.INDUSTRY).parentId("sector_tech").build(),
                Category.builder().name("Software").categoryId("ind_soft").type(Category.CategoryType.INDUSTRY).parentId("sector_tech").build(),
                Category.builder().name("Banks").categoryId("ind_bank").type(Category.CategoryType.INDUSTRY).parentId("sector_finance").build()
            ));
        }
        return categoryRepository.findAll();
    }
}
