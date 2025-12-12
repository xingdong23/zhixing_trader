package com.zhixing.journal.repository;

import com.zhixing.journal.model.NoteTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NoteTagRepository extends JpaRepository<NoteTag, Long> {
    Optional<NoteTag> findByName(String name);
}
