package com.zhixing.journal.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, Long> {

    @Query("SELECT n FROM Note n WHERE " +
           "(:type IS NULL OR n.type = :type) AND " +
           "(:keyword IS NULL OR n.title LIKE %:keyword% OR n.content LIKE %:keyword%) AND " +
           "(:isStarred IS NULL OR n.isStarred = :isStarred)")
    Page<Note> findNotes(@Param("type") String type, 
                         @Param("keyword") String keyword, 
                         @Param("isStarred") Boolean isStarred, 
                         Pageable pageable);
}
