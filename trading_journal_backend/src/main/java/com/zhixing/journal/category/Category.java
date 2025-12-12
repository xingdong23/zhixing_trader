package com.zhixing.journal.category;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonProperty("category_id")
    private String categoryId; // 唯一字符串ID

    private String name;
    
    @JsonProperty("parent_id")
    private String parentId;
    
    private String path;
    
    private Integer level;
    
    private String icon;
    
    private String color;

    // 不直接映射父子关系，通过 parentId 逻辑处理，或根据需求建立 @ManyToOne 关系
    // 为简单起见，这里按前端需求返回树形结构可能需要 Service 层组装
}
