package com.zhixing.journal.category;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public List<CategoryNode> getCategoryTree() {
        List<Category> allCategories = categoryRepository.findAll();
        // 将扁平列表转换为树形结构
        return buildTree(allCategories);
    }

    private List<CategoryNode> buildTree(List<Category> categories) {
        Map<String, CategoryNode> nodeMap = categories.stream()
                .map(CategoryNode::fromEntity)
                .collect(Collectors.toMap(CategoryNode::getCategoryId, node -> node));

        List<CategoryNode> roots = new ArrayList<>();

        for (CategoryNode node : nodeMap.values()) {
            String parentId = node.getParentId();
            if (parentId == null || parentId.equals("none") || !nodeMap.containsKey(parentId)) {
                roots.add(node);
            } else {
                CategoryNode parent = nodeMap.get(parentId);
                parent.getChildren().add(node);
                // 简单更新父节点统计数据 (mock or real logic)
                parent.setTotalStockCount(parent.getTotalStockCount() + node.getStockCount());
            }
        }
        return roots;
    }

    public Category createCategory(Category category) {
        if (category.getCategoryId() == null) {
            category.setCategoryId(UUID.randomUUID().toString());
        }
        // 计算层级和路径
        if (category.getParentId() != null && !category.getParentId().equals("none")) {
            Category parent = categoryRepository.findByCategoryId(category.getParentId());
            if (parent != null) {
                category.setLevel(parent.getLevel() + 1);
                category.setPath(parent.getPath() + "/" + category.getName());
            } else {
                category.setLevel(0);
                category.setPath(category.getName());
            }
        } else {
            category.setLevel(0);
            category.setPath(category.getName());
        }
        return categoryRepository.save(category);
    }
    
    public void deleteCategory(String categoryId) {
       Category category = categoryRepository.findByCategoryId(categoryId);
       if (category != null) {
           // 简单实现：删除自己。实际可能需要级联删除子分类
           categoryRepository.delete(category);
       }
    }
}
