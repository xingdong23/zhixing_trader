package com.zhixing.journal.note;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notes")
@Data
@NoArgsConstructor
public class Note {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // trade, idea, research, review, lesson, plan
    private String type;
    
    private String title;
    
    private String content; // 建议支持 markdown
    
    @ElementCollection
    private List<String> tags = new ArrayList<>();
    
    private boolean isStarred;
    
    private String relatedId;    // 关联ID（如股票代码、交易ID）
    private String relatedLabel; // 关联标签
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
