package com.zhixing.journal.controller;

import com.zhixing.journal.model.Note;
import com.zhixing.journal.model.NoteType;
import com.zhixing.journal.service.NoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
@CrossOrigin(origins = "*") // Allow frontend access
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<Note> listNotes(
        @RequestParam(required = false) NoteType type,
        @RequestParam(required = false) String relatedId
    ) {
        if (type != null && relatedId != null) {
            return noteService.getNotesByTypeAndRelatedId(type, relatedId);
        } else if (type != null) {
            return noteService.getNotesByType(type);
        }
        return noteService.getAllNotes();
    }

    @PostMapping
    public Note createNote(@RequestBody Note note) {
        return noteService.createNote(note);
    }

    @PutMapping("/{id}")
    public Note updateNote(@PathVariable Long id, @RequestBody Note note) {
        return noteService.updateNote(id, note);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ResponseEntity.ok().build();
    }
}
