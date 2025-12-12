package com.zhixing.journal.repository;

import com.zhixing.journal.model.Note;
import com.zhixing.journal.model.NoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByType(NoteType type);
    List<Note> findByTypeAndRelatedId(NoteType type, String relatedId);
}
