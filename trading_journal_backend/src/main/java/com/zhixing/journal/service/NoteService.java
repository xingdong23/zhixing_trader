package com.zhixing.journal.service;

import com.zhixing.journal.model.Note;
import com.zhixing.journal.model.NoteTag;
import com.zhixing.journal.model.NoteType;
import com.zhixing.journal.repository.NoteRepository;
import com.zhixing.journal.repository.NoteTagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class NoteService {

    private final NoteRepository noteRepository;
    private final NoteTagRepository noteTagRepository;

    public NoteService(NoteRepository noteRepository, NoteTagRepository noteTagRepository) {
        this.noteRepository = noteRepository;
        this.noteTagRepository = noteTagRepository;
    }

    public List<Note> getAllNotes() {
        return noteRepository.findAll();
    }

    public List<Note> getNotesByType(NoteType type) {
        return noteRepository.findByType(type);
    }

    public List<Note> getNotesByTypeAndRelatedId(NoteType type, String relatedId) {
        return noteRepository.findByTypeAndRelatedId(type, relatedId);
    }

    public Note createNote(Note note) {
        // Handle tags: fetch existing ones or create new ones
        if (note.getTags() != null && !note.getTags().isEmpty()) {
            Set<NoteTag> processedTags = note.getTags().stream()
                .map(tag -> {
                    if (tag.getId() != null) {
                        return noteTagRepository.findById(tag.getId()).orElse(tag);
                    } else if (tag.getName() != null) {
                        return noteTagRepository.findByName(tag.getName())
                            .orElseGet(() -> noteTagRepository.save(tag));
                    }
                    return tag;
                })
                .collect(Collectors.toSet());
            note.setTags(processedTags);
        }
        return noteRepository.save(note);
    }

    public Note updateNote(Long id, Note updatedNote) {
        return noteRepository.findById(id)
            .map(note -> {
                note.setTitle(updatedNote.getTitle());
                note.setContent(updatedNote.getContent());
                note.setType(updatedNote.getType());
                note.setRelatedId(updatedNote.getRelatedId());
                // For simplicity, replacing tags entirely. Real-world might want merge logic.
                // Re-using logic from create for tag handling could be better extracted.
                return noteRepository.save(note);
            })
            .orElseThrow(() -> new RuntimeException("Note not found with id " + id));
    }

    public void deleteNote(Long id) {
        noteRepository.deleteById(id);
    }
    
    // Tag related methods
    public List<NoteTag> getAllTags() {
        return noteTagRepository.findAll();
    }
    
    public NoteTag createTag(NoteTag tag) {
        return noteTagRepository.save(tag);
    }
}
