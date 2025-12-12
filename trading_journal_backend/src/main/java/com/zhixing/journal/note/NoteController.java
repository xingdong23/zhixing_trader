package com.zhixing.journal.note;

import com.zhixing.journal.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteController {
    private final NoteService noteService;

    @GetMapping
    public ApiResponse<Page<Note>> getNotes(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean starred,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(noteService.getNotes(type, keyword, starred, pageable));
    }

    @PostMapping
    public ApiResponse<Note> createNote(@RequestBody Note note) {
        return ApiResponse.success(noteService.createNote(note));
    }

    @PutMapping("/{id}")
    public ApiResponse<Note> updateNote(@PathVariable Long id, @RequestBody Note note) {
        return ApiResponse.success(noteService.updateNote(id, note));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ApiResponse.success(null, "笔记已删除");
    }
}
