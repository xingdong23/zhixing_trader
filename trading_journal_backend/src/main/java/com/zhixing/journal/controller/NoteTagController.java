package com.zhixing.journal.controller;

import com.zhixing.journal.model.NoteTag;
import com.zhixing.journal.service.NoteService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/note-tags")
@CrossOrigin(origins = "*")
public class NoteTagController {

    private final NoteService noteService;

    public NoteTagController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<NoteTag> getAllTags() {
        return noteService.getAllTags();
    }

    @PostMapping
    public NoteTag createTag(@RequestBody NoteTag tag) {
        return noteService.createTag(tag);
    }
}
