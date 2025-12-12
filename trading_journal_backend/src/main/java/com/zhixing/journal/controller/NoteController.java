package com.zhixing.journal.controller;

import com.zhixing.journal.model.Note;
import com.zhixing.journal.model.NoteType;
import com.zhixing.journal.service.NoteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<Note> getAllNotes(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) NoteType type,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) Boolean isStarred,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        return noteService.searchNotes(query, type, tagIds, isStarred, startDate, endDate);
    }

    @PostMapping
    public Note createNote(@RequestBody Note note) {
        return noteService.createNote(note);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Note> updateNote(@PathVariable Long id, @RequestBody Note note) {
        return ResponseEntity.ok(noteService.updateNote(id, note));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/{id}/star")
    public ResponseEntity<Note> toggleStar(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.toggleStar(id));
    }
}
