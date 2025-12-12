package com.zhixing.journal.service;

import com.zhixing.journal.model.Note;
import com.zhixing.journal.model.NoteTag;
import com.zhixing.journal.model.NoteType;
import com.zhixing.journal.repository.NoteRepository;
import com.zhixing.journal.repository.NoteTagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    // Enhanced search with Specifications
    public List<Note> searchNotes(String query, NoteType type, List<Long> tagIds, Boolean isStarred, 
                                LocalDateTime startDate, LocalDateTime endDate) {
        return noteRepository.findAll((root, criteriaQuery, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();

            if (query != null && !query.isEmpty()) {
                String likePattern = "%" + query.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("title")), likePattern),
                    cb.like(cb.lower(root.get("content")), likePattern)
                ));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (isStarred != null) {
                predicates.add(cb.equal(root.get("isStarred"), isStarred));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            if (tagIds != null && !tagIds.isEmpty()) {
                predicates.add(root.join("tags").get("id").in(tagIds));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        });
    }

    public Note updateNote(Long id, Note updatedNote) {
        return noteRepository.findById(id)
            .map(note -> {
                note.setTitle(updatedNote.getTitle());
                note.setContent(updatedNote.getContent());
                note.setType(updatedNote.getType());
                note.setRelatedId(updatedNote.getRelatedId());
                note.setIsStarred(updatedNote.getIsStarred());
                
                if (updatedNote.getTags() != null) {
                     Set<NoteTag> processedTags = updatedNote.getTags().stream()
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
            })
            .orElseThrow(() -> new RuntimeException("Note not found with id " + id));
    }

    public Note toggleStar(Long id) {
        return noteRepository.findById(id)
            .map(note -> {
                note.setIsStarred(!Boolean.TRUE.equals(note.getIsStarred()));
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

    public NoteTag updateTag(Long id, NoteTag tagDetails) {
        return noteTagRepository.findById(id)
            .map(tag -> {
                tag.setName(tagDetails.getName());
                tag.setColor(tagDetails.getColor());
                return noteTagRepository.save(tag);
            })
            .orElseThrow(() -> new RuntimeException("Tag not found"));
    }

    public void deleteTag(Long id) {
        noteTagRepository.deleteById(id);
    }
}
