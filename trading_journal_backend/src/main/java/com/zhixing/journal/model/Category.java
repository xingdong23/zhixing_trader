package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String categoryId; // Frontend often uses string IDs like "sector_tech"

    @Enumerated(EnumType.STRING)
    private CategoryType type;

    private String parentId; // For tree structure, optional, refers to another categoryId

    public enum CategoryType {
        SECTOR, CONCEPT, INDUSTRY
    }
}
