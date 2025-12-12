package com.zhixing.journal.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "wisdoms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wisdom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private String category; // e.g., discipline, psychology, etc.

    private Integer importance; // 1-5

    private String author;

    private String source;

    @Column(name = "tags_json", columnDefinition = "TEXT")
    private String tags; // Stored as comma-separated string or simple JSON

    private String notes;

    @Builder.Default
    private Boolean isActive = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
