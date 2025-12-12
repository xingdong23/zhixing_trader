package com.zhixing.journal.note;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NoteService {
    private final NoteRepository noteRepository;

    public Page<Note> getNotes(String type, String keyword, Boolean isStarred, Pageable pageable) {
        return noteRepository.findNotes(type, keyword, isStarred, pageable);
    }

    public Note createNote(Note note) {
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    public Note updateNote(Long id, Note noteDetails) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("未找到笔记"));
        
        note.setType(noteDetails.getType());
        note.setTitle(noteDetails.getTitle());
        note.setContent(noteDetails.getContent());
        note.setTags(noteDetails.getTags());
        note.setStarred(noteDetails.isStarred());
        note.setRelatedId(noteDetails.getRelatedId());
        note.setRelatedLabel(noteDetails.getRelatedLabel());
        note.setUpdatedAt(LocalDateTime.now());
        
        return noteRepository.save(note);
    }

    public void deleteNote(Long id) {
        if (!noteRepository.existsById(id)) {
            throw new RuntimeException("未找到笔记");
        }
        noteRepository.deleteById(id);
    }
}
