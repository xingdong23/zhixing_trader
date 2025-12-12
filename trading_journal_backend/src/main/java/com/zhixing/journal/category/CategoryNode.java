package com.zhixing.journal.category;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class CategoryNode {
    private Long id;
    
    @JsonProperty("category_id")
    private String categoryId;
    
    private String name;
    
    @JsonProperty("parent_id")
    private String parentId;
    
    private String path;
    
    private Integer level;
    
    private String icon;
    
    private String color;
    
    @JsonProperty("stock_count")
    private int stockCount;
    
    @JsonProperty("total_stock_count")
    private int totalStockCount;
    
    private List<CategoryNode> children = new ArrayList<>();

    public static CategoryNode fromEntity(Category category) {
        CategoryNode node = new CategoryNode();
        node.setId(category.getId());
        node.setCategoryId(category.getCategoryId());
        node.setName(category.getName());
        node.setParentId(category.getParentId());
        node.setPath(category.getPath());
        node.setLevel(category.getLevel());
        node.setIcon(category.getIcon());
        node.setColor(category.getColor());
        // mock counts
        node.setStockCount(0);
        node.setTotalStockCount(0);
        return node;
    }
}
